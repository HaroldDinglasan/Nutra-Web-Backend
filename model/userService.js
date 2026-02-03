const { NVarChar } = require("mssql")
const { sql, poolPurchaseRequest } = require("../connectionHelper/db")

// Check if user already exists
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

    // Get the number of matching users
    const count = result.recordset[0].count

    return count > 0
  } catch (error) {
    console.error("❌ Error checking user existence:", error)
    throw error
  }
}

// Register Users in PurchaseRequest Database (Plain Text Passwords)
const registerEmployee = async (departmentType, departmentId, fullName, username, password, outlookEmail) => {
  try {
    
    // Check if username or full name already exists
    const userExists = await checkUserExists(username, fullName)

    if (userExists) {
      return { success: false, message: "User already exists" }
    }

    // Assign departmentid based on department type
    let deptId
    switch (departmentType) {

      case "PRODUCTION":
        deptId = 1
      break

      case "CGS":
        deptId = 2
      break

      case "CMD":
        deptId = 3
      break

      case "AUDIT": 
        deptId = 4
      break
     
      case "LEGAL":
        deptId = 5
      break

      case "Approvers":
        deptId = 6
      break

      case "LEGAL":
        deptId = 7
      break

      case "FINANCE":
        deptId = 8
      break

      case "HR":
        deptId = 9
      break

      case "MARKETING":
        deptId = 10
      break

      case "REGULATORY":
        deptId = 11
      break

      case "PURCHASING":
        deptId = 12
      break

      case "WLO":
        deptId = 13
      break

      case "ENGINEERING":
        deptId = 14
      break

      case "SALES":
        deptId = 15
      break

      case "CORPLAN":
        deptId = 16
      break

      case "IT":
        deptId = 17
      break

      case "WLO":
        deptId = 18
      break

      case "MMD":
        deptId = 19
      break

      default:
        deptId = null
    }

    const pool = await poolPurchaseRequest

    // Insert user data into Users_Info table
    const result = await pool
      .request()
      .input("departmentType", sql.NVarChar, departmentType)
      .input("fullName", sql.NVarChar, fullName)
      .input("username", sql.NVarChar, username)
      .input("password", sql.NVarChar, password)
      .input("departmentId", sql.Int, deptId)
      .input("outlookEmail", sql.NVarChar, outlookEmail || null)
      .query(`
        INSERT INTO Users_Info (departmentType, fullName, username, password, isActive, createAt, departmentId, outlookEmail) 
        OUTPUT INSERTED.userID
        VALUES (@departmentType, @fullName, @username, @password, 1, GETDATE(), @departmentId, @outlookEmail);
      `)
    
    // Get the newly created user ID
    const userID = result.recordset[0].userID

    // Insert into login credentials into Login table
    await pool
      .request()
      .input("userID", sql.Int, userID)
      .input("username", sql.NVarChar, username)
      .input("password", sql.NVarChar, password)
      .query(`
        INSERT INTO Login (userID, username, password)
        VALUES (@userID, @username, @password);
      `)

    return { success: true, message: "User registered successfully!", userID }
  } catch (error) {
    console.error("❌ Error registering employee:", error)
    throw error
  }
}

// Login User
// Checks username and password
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
          U.departmentId,
          U.outlookEmail
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
