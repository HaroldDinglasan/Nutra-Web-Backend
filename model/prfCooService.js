const { poolPurchaseRequest } = require("../connectionHelper/db");
  
const getPendingPrfsForCOO = async () => {
  try {
    const pool = await poolPurchaseRequest;

    const result = await pool.request().query(`
      SELECT 
        p.prfId,
        p.prfNo,
        p.prfDate,
        p.preparedBy,
        p.approvedBy,
        p.approvedBy_Status,
        p.isReject,
        p.isCancel,
        p.projectCode,
        d.StockName,
        d.QTY,
        d.UOM
      FROM PRFTABLE p
      LEFT JOIN PRFTABLE_DETAILS d 
        ON p.prfId = d.PrfId
      WHERE 
        p.approvedBy = 'Andrea Kathleen D. Castillo'
        AND (p.approvedBy_Status IS NULL OR p.approvedBy_Status = 'PENDING')
        AND p.isReject = 0
        AND p.isCancel = 0
      ORDER BY p.prfDate DESC
    `); 

    return result.recordset;

  } catch (error) {
    console.error("Error fetching pending PRFs:", error);
    throw error;
  }
};

module.exports = { getPendingPrfsForCOO };