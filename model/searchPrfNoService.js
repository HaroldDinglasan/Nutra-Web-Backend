const { poolPurchaseRequest } = require("../connectionHelper/db")

// Search PRF using PRF Number
const searchPrfByNumber = async (prfNo) => {
  try {
    const pool = await poolPurchaseRequest

    // Step 1: Remove "No. " prefix if user included it (ex: "No. 2024-001")
    let searchPrfNo = prfNo
    if (prfNo.startsWith("No. ")) {
      searchPrfNo = prfNo.substring(4) // Remove the first 4 characters ("No. ")
    }

    // Step 2: Get PRF header information from PRFTABLE
    const headerResult = await pool
      .request()
      .input("prfNo", searchPrfNo)
      .query(`
        SELECT 
          prfId, 
          prfNo, 
          prfDate, 
          preparedBy, 
          departmentId, 
          isCancel, 
          checkedBy, 
          approvedBy, 
          receivedBy, 
          departmentCharge
        FROM PRFTABLE 
        WHERE prfNo = @prfNo
      `)

      // If PRF not found
      if (headerResult.recordset.length === 0) {
        return { found: false, message: "PRF not found" }
      }

    const prfHeader = headerResult.recordset[0]
    const prfId = prfHeader.prfId

    // Convert isCnacel into number (0 or 1)
    const isCancel = Number(prfHeader.isCancel)

    // Step 3: Get PRF item details musing prfId
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

    // Step 4: Check if PRF was created today
    const prfDate = new Date(prfHeader.prfDate)
    const currentDate = new Date()

    const isSameDay =
      prfDate.getFullYear() === currentDate.getFullYear() &&
      prfDate.getMonth() === currentDate.getMonth() &&
      prfDate.getDate() === currentDate.getDate()

    // Step 5: Check if PRF is fully cancelled
    const isFullyCancelled = isCancel === 1

    // Return header + details + approval names + status flags
    return {
      found: true,

      // PRF Header Information
      header: {
        ...prfHeader,
        prfIsCancel: isCancel,
        isCancel: isCancel,
        isFullyCancelled: isFullyCancelled,
        isSameDay: isSameDay,
      },

      // PRF Item Details
      details: detailsResult.recordset,

      // Approval Names
      approvalNames: {
        checkedByUser: prfHeader.checkedBy || "",
        approvedByUser: prfHeader.approvedBy || "",
        receivedByUser: prfHeader.receivedBy || "",
      },

      // Extra Flags (for Frontend logic)
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
