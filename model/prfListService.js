const { sql, poolPurchaseRequest } = require("../connectionHelper/db")

// Fetch PRF List with StockName, QTY, UOM, and dateNeeded from PRFTABLE_DETAILS
const getPrfList = async () => {
  try {
    const pool = await poolPurchaseRequest
    const result = await pool.request()
      .query(`
        SELECT 
          p.prfId, 
          p.prfNo, 
          p.preparedBy, 
          p.prfDate, 
          p.isCancel AS prfIsCancel,  
          p.isReject,                 -- ✅ Added
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
        p.isCancel, p.isReject, p.approvedBy, p.approvedBy_Status, 
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

// Update the getPrfListByUser function to properly match the preparedBy field with the username
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
          p.isReject,                 -- ✅ Added
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
        p.prfDate, p.isCancel, p.isReject, p.approvedBy, 
        p.approvedBy_Status, p.receivedBy_Status, 
        p.checkedBy_Status, d.StockName, 
        d.QTY, d.UOM, d.dateNeeded, d.status, 
        d.isDelivered, d.DateDelivered,
        d.isPending, d.isCancel
        ORDER BY p.prfDate DESC
      `)

    console.log(`Found ${result.recordset.length} PRFs for user: ${username}`)

    return result.recordset
  } catch (error) {
    console.error("❌ Error fetching PRF List by user:", error)
    throw error
  }
}

// Fetch a single PRF header and its details by prfId
const getPrfByNumber = async (prfId) => {
  try {
    const pool = await poolPurchaseRequest;

    // Get PRF header
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
          isReject,       -- ✅ Added
          departmentId
        FROM PRFTABLE
        WHERE prfId = @prfId
      `);

    if (headerResult.recordset.length === 0) {
      return null; // No PRF found
    }

    const prfHeader = headerResult.recordset[0];

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
          DateDelivered,     -- ✅ Added
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

// ensures the status in Purchase List is updated when requestor logs back in
const updatePrfListStatus = async (prfId) => {
  try {
    const pool = await poolPurchaseRequest

    // Get the current PRF data to check approval status
    const prfResult = await pool
      .request()
      .input("prfId", sql.UniqueIdentifier, prfId)
      .query(`
        SELECT 
          approvedBy_Status,
          receivedBy_Status,
          isCancel,
          isReject            -- ✅ Added           
        FROM PRFTABLE
        WHERE prfId = @prfId
      `)

    if (prfResult.recordset.length === 0) {
      return { success: false, error: "PRF not found" }
    }

    const prf = prfResult.recordset[0]
    let status = "Pending"

    if (prf.isReject === 1) {
      status = "Rejected"
    } else if (prf.isCancel === 1 || prf.isCancel === true) { 
      status = "Cancelled"
    } else if (prf.approvedBy_Status && prf.approvedBy_Status.trim().toUpperCase() === "APPROVED") {
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
