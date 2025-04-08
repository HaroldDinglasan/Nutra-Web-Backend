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
          d.QTY as quantity,
          d.UOM as unit,
          d.dateNeeded,
          d.isCancel as detailsIsCancel
        FROM PRFTABLE p
        LEFT OUTER JOIN PRFTABLE_DETAILS d ON p.prfId = d.PrfId
        GROUP BY p.prfId, p.prfNo, p.preparedBy, p.prfDate, p.isCancel, d.StockName, d.QTY, d.UOM, d.dateNeeded, d.isCancel
        ORDER BY p.prfDate DESC
      `)

    return result.recordset
  } catch (error) {
    console.error("❌ Error fetching PRF List:", error)
    throw error
  }
}

module.exports = { getPrfList }
