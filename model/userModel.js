const { sql, poolPurchaseRequest } = require("../connectionHelper/db");

// Register Users in PurchaseRequest Database (Plain Text Passwords)
const registerEmployee = async (departmentType, fullName, username, password) => {
  try {
    const pool = await poolPurchaseRequest;
    const result = await pool
      .request()
      .input("departmentType", sql.NVarChar, departmentType)
      .input("fullName", sql.NVarChar, fullName)
      .input("username", sql.NVarChar, username)
      .input("password", sql.NVarChar, password) // No hashing
      .query(`
        INSERT INTO Users_Info (departmentType, fullName, username, password, isActive, createAt) 
        OUTPUT INSERTED.userID
        VALUES (@departmentType, @fullName, @username, @password, 1, GETDATE());
      `);

    const userID = result.recordset[0].userID;

    // Insert into Login table
    await pool
      .request()
      .input("userID", sql.Int, userID)
      .input("username", sql.NVarChar, username)
      .input("password", sql.NVarChar, password) // No hashing
      .query(`
        INSERT INTO Login (userID, username, password)
        VALUES (@userID, @username, @password);
      `);

    return { message: "User registered successfully!", userID };
  } catch (error) {
    console.error("❌ Error registering employee:", error);
    throw error;
  }
};

// Login User (Plain Text Authentication)
const loginUser = async (username, password) => {
  try {
    const pool = await poolPurchaseRequest;
    const result = await pool
      .request()
      .input("username", sql.NVarChar, username)
      .input("password", sql.NVarChar, password)
      .query(`
        SELECT 
          L.userID, 
          L.username, 
          U.fullName, 
          U.departmentType
        FROM Login L
        INNER JOIN Users_Info U ON L.userID = U.userID
        WHERE L.username = @username AND L.password = @password;
      `);

    if (result.recordset.length === 0) {
      return { message: "Invalid username or password!", success: false };
    }

    return { message: "Login successful!", success: true, user: result.recordset[0] };
  } catch (error) {
    console.error("❌ Error logging in:", error);
    throw error;
  }
};



module.exports = { registerEmployee, loginUser };
