const { sql, poolPurchaseRequest } = require("../connectionHelper/db")

// Get all PRF (with header + details information)
const getPrfList = async () => {
  try {
    const pool = await poolPurchaseRequest

    // Join PRFTABLE (header) and PRFTABLE_DETAILS (items)
    const result = await pool.request()
      .query(`
        SELECT 
          p.prfId, 
          p.prfNo, 
          p.preparedBy, 
          p.prfDate, 
          p.isCancel AS prfIsCancel,  
          p.isReject,                 
          p.assignedTo,
          p.approvedBy,
          p.approvedBy_Status,
          p.receivedBy_Status,
          p.checkedBy_Status,
          d.StockName,
          d.Id,
          d.status,
          d.isDelivered, 
          d.isPending,
          d.QTY as quantity,
          d.UOM as unit,
          d.dateNeeded,
          d.DateDelivered,
          d.isCancel as detailsIsCancel
        FROM PRFTABLE p
        LEFT OUTER JOIN PRFTABLE_DETAILS d ON p.prfId = d.PrfId
        GROUP BY 
        p.prfId, p.prfNo, p.preparedBy, p.prfDate, 
        p.isCancel, p.isReject, p.assignedTo, 
        p.approvedBy, p.approvedBy_Status, 
        p.receivedBy_Status, p.checkedBy_Status, 
        d.StockName, d.Id, d.status, d.isDelivered, 
        d.DateDelivered, d.isPending, d.QTY, d.UOM, d.dateNeeded,
        d.isCancel
        ORDER BY p.prfDate DESC
      `)

    return result.recordset
  } catch (error) {
    console.error("❌ Error fetching PRF List:", error)
    throw error
  }
}

// Get PRF created by a specific user
const getPrfListByUser = async (username) => {
  try {
    const pool = await poolPurchaseRequest

    const result = await pool
      .request()
      .input("username", sql.VarChar, username)
      .query(`
        SELECT 
          p.prfId, 
          p.prfNo, 
          p.preparedBy, 
          p.prfDate, 
          p.isCancel AS prfIsCancel,
          p.isReject,                 
          p.assignedTo,
          p.approvedBy,
          p.approvedBy_Status,
          p.receivedBy_Status,
          p.checkedBy_Status,
          d.StockName,
          d.QTY as quantity,
          d.UOM as unit,
          d.dateNeeded,
          d.status,
          d.isDelivered,
          d.DateDelivered,
          d.isPending,
          d.isCancel as detailsIsCancel
        FROM PRFTABLE p
        LEFT OUTER JOIN PRFTABLE_DETAILS d ON p.prfId = d.PrfId
        WHERE p.preparedBy = @username
        GROUP BY 
        p.prfId, p.prfNo, p.preparedBy, 
        p.prfDate, p.isCancel, p.isReject, 
        p.assignedTo, p.approvedBy, 
        p.approvedBy_Status, p.receivedBy_Status, 
        p.checkedBy_Status, d.StockName, 
        d.QTY, d.UOM, d.dateNeeded, d.status, 
        d.isDelivered, d.DateDelivered,
        d.isPending, d.isCancel
        ORDER BY p.prfDate DESC
      `)

    // console.log(`Found ${result.recordset.length} PRFs for user: ${username}`)

    return result.recordset
  } catch (error) {
    console.error("❌ Error fetching PRF List by user:", error)
    throw error
  }
}

// Get ONE PRF (header + all its details)
const getPrfByNumber = async (prfId) => {
  try {
    const pool = await poolPurchaseRequest;

    // Step 1: Get PRF header information
    const headerResult = await pool
      .request()
      .input("prfId", sql.UniqueIdentifier, prfId)
      .query(`
        SELECT TOP 1 
          prfId,
          prfNo,
          preparedBy,
          approvedBy_Status,
          receivedBy_Status,
          checkedBy_Status,
          prfDate,
          isCancel,
          isReject,       
          assignedTo,
          departmentId
        FROM PRFTABLE
        WHERE prfId = @prfId
      `);

    if (headerResult.recordset.length === 0) {
      return null; // No PRF found
    }

    const prfHeader = headerResult.recordset[0];

    // Step 2: Get all PRF item details
    const detailsResult = await pool
      .request()
      .input("prfId", sql.UniqueIdentifier, prfHeader.prfId)
      .query(`
        SELECT 
          Id,
          StockCode,
          StockName,
          QTY AS quantity,
          UOM AS unit,
          DateNeeded,
          DateDelivered,    
          Purpose,
          Description,
          status,
          remarks,
          isDelivered,
          isPending,
          isCancel
        FROM PRFTABLE_DETAILS
        WHERE PrfId = @prfId
      `);

    return {
      header: prfHeader,
      details: detailsResult.recordset,
    };
  } catch (error) {
    console.error("❌ Error fetching PRF by number:", error);
    throw error;
  }
};

// Check and update PRF status (used when requestor logs in again)
const updatePrfListStatus = async (prfId) => {
  try {
    const pool = await poolPurchaseRequest

    // Get approval + cancel + reject status
    const prfResult = await pool
      .request()
      .input("prfId", sql.UniqueIdentifier, prfId)
      .query(`
        SELECT 
          approvedBy_Status,
          receivedBy_Status,
          isCancel,
          isReject                      
        FROM PRFTABLE
        WHERE prfId = @prfId
      `)

    if (prfResult.recordset.length === 0) {
      return { success: false, error: "PRF not found" }
    }

    const prf = prfResult.recordset[0]
    let status = "Pending" // Default status

    if (prf.isReject === 1) {
      status = "Rejected"
    } 
    else if (prf.isCancel === 1 || prf.isCancel === true) { 
      status = "Cancelled"
    } 
    else if (prf.approvedBy_Status && prf.approvedBy_Status.trim().toUpperCase() === "APPROVED") {
      status = "Approved"
    }

    return {
      success: true,
      status: status,
      approvedBy_Status: prf.approvedBy_Status,
      data: prf,
    }
  } catch (error) {
    console.error("Error updating PRF list status:", error.message)
    return {
      success: false,
      error: error.message,
    }
  }
}

module.exports = { getPrfList, getPrfListByUser, getPrfByNumber, updatePrfListStatus}
