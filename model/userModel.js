const { sql, poolPurchaseRequest } = require("../connectionHelper/db");

// Register Users in PurchaseRequest Database
const registerEmployee = async (departmentType, fullName, username, password) => {
  try {
    const pool = await poolPurchaseRequest;
    const result = await pool
      .request()
      .input("departmentType", sql.NVarChar, departmentType)
      .input("fullName", sql.NVarChar, fullName)
      .input("username", sql.NVarChar, username)
      .input("password", sql.NVarChar, password)
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
      .input("password", sql.NVarChar, password)
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

// Login User
const loginUser = async (username, password) => {
  try {
    const pool = await poolPurchaseRequest;
    const result = await pool
      .request()
      .input("username", sql.NVarChar, username)
      .input("password", sql.NVarChar, password)
      .query(`
        SELECT userID, username FROM Login 
        WHERE username = @username AND password = @password;
      `);

    if (result.recordset.length === 0) {
      return { message: "Invalid username or password!" };
    }

    return { message: "Login successful!", user: result.recordset[0] };
  } catch (error) {
    console.error("❌ Error logging in:", error);
    throw error;
  }
};

module.exports = { registerEmployee, loginUser };
