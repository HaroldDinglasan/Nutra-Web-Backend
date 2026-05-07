const { poolPurchaseRequest } = require("../connectionHelper/db");
  
const getPendingCheckedBy = async (fullName) => {
  const pool = await poolPurchaseRequest;

  const result = await pool.request()
    .input("fullName", fullName)
    .query(`
      SELECT 
        p.prfId,
        p.prfNo,
        p.preparedBy,
        p.projectCode,
        d.StockName,
        d.QTY,
        d.UOM
      FROM PRFTABLE p
      LEFT JOIN PRFTABLE_DETAILS d 
        ON p.prfId = d.PrfId
      WHERE 
        p.checkedBy = @fullName
        AND p.checkedBy_Status IS NULL
        AND p.isReject = 0
        AND p.isCancel = 0
    `);

  return result.recordset;
};

module.exports = { getPendingCheckedBy };