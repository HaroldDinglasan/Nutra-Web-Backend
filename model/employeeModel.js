// Fetches Full name from AVLI SecuritySystemUser table
const { sql, poolPromise } = require("../connectionHelper/db");

// Get Employee Full Names from AVLI Database
const getEmployees = async () => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .query("SELECT FullName FROM AVLI.dbo.SecuritySystemUser"); // Cross-database query
    return result.recordset;
  } catch (error) {
    console.error("❌ Error fetching employees:", error);
    throw error;
  }
};

module.exports = { getEmployees };
