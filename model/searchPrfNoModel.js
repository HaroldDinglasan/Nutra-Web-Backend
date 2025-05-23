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
        SELECT prfId, prfNo, prfDate, preparedBy, departmentId, isCancel
        FROM PRFTABLE 
        WHERE prfNo = @prfNo
      `)

    // console.log(`Header query result count: ${headerResult.recordset.length}`)

    if (headerResult.recordset.length === 0) {
      return { found: false, message: "PRF not found" }
    }

    const prfHeader = headerResult.recordset[0]
    const prfId = prfHeader.prfId
    
    // Convert isCancel to a number to ensure consistent type
    const isCancel = Number(prfHeader.isCancel)
    // console.log(`Found PRF with ID: ${prfId}, isCancel: ${isCancel}, type: ${typeof isCancel}`)

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

    // console.log(`Details query result count: ${detailsResult.recordset.length}`)

    // Check if it's the same day as the PRF was created
    const prfDate = new Date(prfHeader.prfDate)
    const currentDate = new Date()
    const isSameDay =
      prfDate.getFullYear() === currentDate.getFullYear() &&
      prfDate.getMonth() === currentDate.getMonth() &&
      prfDate.getDate() === currentDate.getDate()

    // A PRF is fully cancelled ONLY if isCancel = 1 in the database
    const isFullyCancelled = isCancel === 1

    console.log(
      `PRF date: ${prfDate}, Current date: ${currentDate}, Is same day: ${isSameDay}, Is fully cancelled: ${isFullyCancelled}`,
    )

    // Return both the header and details information, including cancellation status
    return {
      found: true,
      header: {
        ...prfHeader,
        prfIsCancel: isCancel, 
        isCancel: isCancel, 
        isFullyCancelled: isFullyCancelled, // Only true if explicitly cancelled in DB
        isSameDay: isSameDay, // Add flag to indicate if it's the same day
      },
      details: detailsResult.recordset,
      isCancel: isCancel, 
      isFullyCancelled,
      isSameDay,
    }
  } catch (error) {
    console.error("Database error in searchPrfByNumber:", error)
    throw new Error("Failed to search PRF: " + error.message)
  }
}

module.exports = { searchPrfByNumber }