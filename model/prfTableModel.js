const { poolPurchaseRequest } = require("../connectionHelper/db")

// Function to save PRF header information
const savePrfHeader = async (prfData) => {
  try {
    // Get the connection pool
    const pool = await poolPurchaseRequest

    // Check if a PRF with this prfNo already exists to avoid duplicates
    const checkResult = await pool
      .request()
      .input("prfNo", prfData.prfNo)
      .query(`
        SELECT id FROM PRFTABLE WHERE prfNo = @prfNo
      `)

    // If PRF already exists, return its ID
    if (checkResult.recordset.length > 0) {
      console.log("PRF already exists, returning existing ID")
      return checkResult.recordset[0].id
    }

    // Insert PRF header data
    const result = await pool
      .request()
      .input("departmentId", prfData.departmentId)
      .input("prfNo", prfData.prfNo)
      .input("prfDate", prfData.prfDate)
      .input("preparedBy", prfData.preparedBy) // This will be the fullName from Users_Info
      .query(`
        INSERT INTO PRFTABLE (departmentId, prfNo, prfDate, preparedBy)
        VALUES (@departmentId, @prfNo, @prfDate, @preparedBy);
        SELECT SCOPE_IDENTITY() AS id;
      `)

    return result.recordset[0].id
  } catch (error) {
    console.error("Database error:", error)
    throw new Error("Failed to save PRF header data: " + error.message)
  }
}

module.exports = { savePrfHeader }

