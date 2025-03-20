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
        INSERT INTO Users (departmentType, fullName, username, password, isActive, createAt) 
        VALUES (@departmentType, @fullName, @username, @password, 1, GETDATE());
      `);

    return { message: "User registered successfully!", result };
  } catch (error) {
    console.error("❌ Error registering employee:", error);
    throw error;
  }
};

module.exports = { registerEmployee };
