const { poolPurchaseRequest } = require("../connectionHelper/db")
const sql = require("mssql")

const markAsReceivedService = async (Id) => {
  try {
    const pool = await poolPurchaseRequest

    const result = await pool
      .request()
      .input("Id", sql.Int, Id)
      .query(`
        UPDATE PRFTABLE_DETAILS
        SET isDelivered = 1, isPending = 0, status = 'Received'
        WHERE Id = @Id
      `);

    return {
      success: true,
      message: "Stock item marked as received",
    }
  } catch (error) {
    console.error("Error in markAsReceivedService:", error)
    throw error
  }
}


const getIsDeliveredListService = async () => {
  try {
    const pool = await poolPurchaseRequest

    const result = await pool.request().query(`
        SELECT 
            P.prfId,
            P.prfNo,
            P.prfDate,
            P.preparedBy,
            D.Id,
            D.StockId,
            D.StockCode,
            D.StockName,
            D.UOM AS unit,
            D.QTY AS quantity,
            D.isDelivered
        FROM PRFTABLE P
        INNER JOIN PRFTABLE_DETAILS D ON P.prfId = D.PrfId
        WHERE D.isDelivered = 1
        ORDER BY P.prfDate DESC
        `)
    return result.recordset
  } catch (error) {
    console.error("Error in getIsDeliveredList:", error)
    throw error
  }
}

module.exports = { markAsReceivedService, getIsDeliveredListService }
