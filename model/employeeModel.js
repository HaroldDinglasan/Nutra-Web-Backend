
const { sql, poolAVLI } = require("../connectionHelper/db")

// Get Employee Full Names and Oids from AVLI Database
const getEmployees = async () => {
  try {
    const pool = await poolAVLI
    const result = await pool.request().query("SELECT Oid, FullName FROM SecuritySystemUser ORDER BY FullName") // Cross-database query
    return result.recordset
  } catch (error) {
    console.error("❌ Error fetching employees:", error)
    throw error
  }
}

// Get Employee by Oid from AVLI Database
const getEmployeeByOid = async (oid) => {
  try {
    const pool = await poolAVLI
    const result = await pool
      .request()
      .input("oid", sql.UniqueIdentifier, oid)
      .query("SELECT Oid, FullName FROM SecuritySystemUser WHERE Oid = @oid")
    return result.recordset[0] || null
  } catch (error) {
    console.error("❌ Error fetching employee by Oid:", error)
    throw error
  }
}

module.exports = { getEmployees, getEmployeeByOid }
