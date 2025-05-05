const { poolPurchaseRequest } = require("../connectionHelper/db")

const searchPrfByNumber = async (prfNo) => {
  try {
    const pool = await poolPurchaseRequest

    // Remove "No. " prefix if it exists
    let searchPrfNo = prfNo
    if (prfNo.startsWith("No. ")) {
      searchPrfNo = prfNo.substring(4) // Remove the first 4 characters ("No. ")
    }

    console.log(`Searching for PRF with number: ${searchPrfNo}`)

    // First, get the PRF header information and prfId
    const headerResult = await pool
      .request()
      .input("prfNo", searchPrfNo)
      .query(`
        SELECT prfId, prfNo, prfDate, preparedBy, departmentId, isCancel AS prfIsCancel, cancelCount
        FROM PRFTABLE 
        WHERE prfNo = @prfNo
      `)

    console.log(`Header query result count: ${headerResult.recordset.length}`)

    if (headerResult.recordset.length === 0) {
      return { found: false, message: "PRF not found" }
    }

    const prfHeader = headerResult.recordset[0]
    const prfId = prfHeader.prfId
    const isCancel = prfHeader.prfIsCancel // Grab the isCancel field to determine the cancel status
    const cancelCount = prfHeader.cancelCount || 0 // Get cancel count, default to 0 if null

    console.log(`Found PRF with ID: ${prfId}, isCancel: ${isCancel}, cancelCount: ${cancelCount}`)

    // Next, get the PRF details using the prfId
    const detailsResult = await pool
      .request()
      .input("prfId", prfId)
      .query(`
        SELECT 
          StockCode, 
          StockName, 
          QTY as quantity, 
          UOM as unit, 
          DateNeeded as dateNeeded, 
          Purpose as purpose,
          Description as description
        FROM PRFTABLE_DETAILS 
        WHERE PrfId = @prfId
      `)

    console.log(`Details query result count: ${detailsResult.recordset.length}`)

    // Check if fully cancelled (either by isCancel flag or by cancel count)
    const isFullyCancelled = isCancel === 1 || cancelCount >= 3

    // Return both the header and details information, including cancellation status
    return {
      found: true,
      header: {
        ...prfHeader,
        isFullyCancelled: isFullyCancelled, // Add explicit flag for UI
      },
      details: detailsResult.recordset,
      isCancel,
      cancelCount,
      isFullyCancelled,
    }
  } catch (error) {
    console.error("Database error in searchPrfByNumber:", error)
    throw new Error("Failed to search PRF: " + error.message)
  }
}

module.exports = { searchPrfByNumber }
