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
        SET 
          isDelivered = 1, 
          isPending = 0, 
          status = 'Received'
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

// Dito nag uupdate si admin para sa remarks na PRFTABLE_DETAILS
const updateRemarksService = async (id, remarks, dateDelivered, assignedTo) => {
  try {
    const pool = await poolPurchaseRequest;

    // 1️⃣ Update PRFTABLE_DETAILS (remarks + date)
    await pool
      .request()
      .input("Id", sql.Int, id)
      .input("Remarks", sql.VarChar(sql.MAX), remarks)
      .input("DateDelivered", sql.DateTime, dateDelivered)
      .query(`
        UPDATE PRFTABLE_DETAILS
        SET 
          remarks = @Remarks,
          DateDelivered = @DateDelivered
        WHERE Id = @Id
      `);

    // 2️⃣ Update PRFTABLE (assignedTo)
    await pool
      .request()
      .input("Id", sql.Int, id)
      .input("AssignedTo", sql.VarChar(100), assignedTo)
      .query(`
        UPDATE P
        SET P.assignedTo = @AssignedTo
        FROM PRFTABLE P
        INNER JOIN PRFTABLE_DETAILS D ON P.prfId = D.PrfId
        WHERE D.Id = @Id
      `);

    return { success: true };
  } catch (error) {
    console.error("Error in updateRemarksService:", error);
    throw error;
  }
};

const getRemarksByIdService = async (Id) => {
  try {
    const pool = await poolPurchaseRequest;
    const result = await pool
      .request()
      .input("Id", sql.Int, Id)
      .query("SELECT remarks, DateDelivered FROM PRFTABLE_DETAILS WHERE Id = @Id");
    return result.recordset[0] || null;
  } catch (error) {
    console.error("Error fetching remarks:", error);
    throw error;
  }
};

const getIsDeliveredListService = async () => {
  try {
    const pool = await poolPurchaseRequest

    const result = await pool.request().query(`
        SELECT 
            P.prfId,
            P.prfNo,
            P.prfDate,
            P.preparedBy,
            P.assignedTo,
            D.Id,
            D.StockId,
            D.StockCode,
            D.StockName,
            D.UOM AS unit,
            D.QTY AS quantity,
            D.isDelivered,
            D.remarks
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

module.exports = { markAsReceivedService, getIsDeliveredListService, updateRemarksService, getRemarksByIdService }
