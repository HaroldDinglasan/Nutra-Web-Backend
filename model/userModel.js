const { sql, poolPurchaseRequest } = require("../connectionHelper/db")

// Check if user already exists by username or fullName
const checkUserExists = async (username, fullName) => {
  try {
    const pool = await poolPurchaseRequest
    const result = await pool
      .request()
      .input("username", sql.NVarChar, username)
      .input("fullName", sql.NVarChar, fullName)
      .query(`
        SELECT COUNT(*) as count
        FROM Users_Info 
        WHERE LOWER(LTRIM(RTRIM(username))) = LOWER(LTRIM(RTRIM(@username))) 
           OR LOWER(LTRIM(RTRIM(fullName))) = LOWER(LTRIM(RTRIM(@fullName)))
      `)

    const count = result.recordset[0].count

    return count > 0
  } catch (error) {
    console.error("❌ Error checking user existence:", error)
    throw error
  }
}

// Register Users in PurchaseRequest Database (Plain Text Passwords)
const registerEmployee = async (departmentType, departmentId, fullName, username, password) => {
  try {
    
    // Check if user already exists
    const userExists = await checkUserExists(username, fullName)
   
    if (userExists) {
      return {
        success: false,
        message: "User already exists",
      }
    }

    // Determine departmentId based on departmentType
    let departmentId
    switch (departmentType) {
      case "Human Resource":
        departmentId = 1
        break
      case "Information Technology":
        departmentId = 2
        break
      case "Finance":
        departmentId = 3
        break
      case "Marketing":
        departmentId = 4
        break
      case "Purchasing":
        departmentId = 5
        break
      case "Production":
        departmentId = 6
        break
      case "Corplan":
        departmentId = 7
        break
      default:
        departmentId = null
    }

    const pool = await poolPurchaseRequest
    const result = await pool
      .request()
      .input("departmentType", sql.NVarChar, departmentType)
      .input("fullName", sql.NVarChar, fullName)
      .input("username", sql.NVarChar, username)
      .input("password", sql.NVarChar, password)
      .input("departmentId", sql.Int, departmentId)
      .query(`
        INSERT INTO Users_Info (departmentType, fullName, username, password, isActive, createAt, departmentId) 
        OUTPUT INSERTED.userID
        VALUES (@departmentType, @fullName, @username, @password, 1, GETDATE(), @departmentId);
      `)

    const userID = result.recordset[0].userID
    console.log("✅ User created with ID:", userID)

    // Insert into Login table
    await pool
      .request()
      .input("userID", sql.Int, userID)
      .input("username", sql.NVarChar, username)
      .input("password", sql.NVarChar, password)
      .query(`
        INSERT INTO Login (userID, username, password)
        VALUES (@userID, @username, @password);
      `)

    return {
      success: true,
      message: "User registered successfully!",
      userID,
    }
  } catch (error) {
    console.error("❌ Error registering employee:", error)
    throw error
  }
}

// Login User (Plain Text Authentication)
const loginUser = async (username, password) => {
  try {
    const pool = await poolPurchaseRequest
    const result = await pool
      .request()
      .input("username", sql.NVarChar, username)
      .input("password", sql.NVarChar, password)
      .query(`
        SELECT 
          L.userID, 
          L.username, 
          U.fullName, 
          U.departmentType,
          U.departmentId
        FROM Login L
        INNER JOIN Users_Info U ON L.userID = U.userID
        WHERE L.username = @username AND L.password = @password;
      `)

    if (result.recordset.length === 0) {
      return { message: "Invalid username or password!", success: false }
    }

    return { message: "Login successful!", success: true, user: result.recordset[0] }
  } catch (error) {
    console.error("❌ Error logging in:", error)
    throw error
  }
}

module.exports = { registerEmployee, loginUser, checkUserExists }
