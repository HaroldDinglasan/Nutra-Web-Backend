const { sql, poolPurchaseRequest } = require("../connectionHelper/db")

// Fetch PRF List with StockName, QTY, UOM, and dateNeeded from PRFTABLE_DETAILS
const getPrfList = async () => {
  try {
    const pool = await poolPurchaseRequest
    const result = await pool.request().query(`
        SELECT 
          p.prfId, 
          p.prfNo, 
          p.preparedBy, 
          p.prfDate, 
          p.isCancel AS prfIsCancel,  
          d.StockName,
          d.Id,
          d.status,
          d.isDelivered, 
          d.isPending,
          d.QTY as quantity,
          d.UOM as unit,
          d.dateNeeded,
          d.isCancel as detailsIsCancel
        FROM PRFTABLE p
        LEFT OUTER JOIN PRFTABLE_DETAILS d ON p.prfId = d.PrfId
        GROUP BY p.prfId, p.prfNo, p.preparedBy, p.prfDate, p.isCancel, d.StockName, d.Id, d.status, d.isDelivered, d.isPending, d.QTY, d.UOM, d.dateNeeded, d.isCancel
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
          d.StockName,
          d.QTY as quantity,
          d.UOM as unit,
          d.dateNeeded,
          d.status,
          d.isDelivered,
          d.isPending,
          d.isCancel as detailsIsCancel
        FROM PRFTABLE p
        LEFT OUTER JOIN PRFTABLE_DETAILS d ON p.prfId = d.PrfId
        WHERE p.preparedBy = @username
        GROUP BY p.prfId, p.prfNo, p.preparedBy, p.prfDate, p.isCancel, d.StockName, d.QTY, d.UOM, d.dateNeeded, d.status, d.isDelivered, d.isPending, d.isCancel
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
          prfDate,
          isCancel,
          departmentId
        FROM PRFTABLE
        WHERE prfId = @prfId
      `);

    if (headerResult.recordset.length === 0) {
      return null; // No PRF found
    }

    const prfHeader = headerResult.recordset[0];

    // Get PRF details — Note: PrfId is a UNIQUEIDENTIFIER, not an Int
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

module.exports = { getPrfList, getPrfListByUser, getPrfByNumber}
