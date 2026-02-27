// Import database connection
const { poolPurchaseRequest } = require("../connectionHelper/db")
const sql = require("mssql")

// Mark Stock item as Received
const markAsReceivedService = async (Id) => {
  try {
    // Connect to PurchaseRequest database
    const pool = await poolPurchaseRequest

    // Update PRFTABLE_DETAILS
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

// Updates Remarks (Admin side)
const updateRemarksService = async (id, remarks, partialDeliver, dateDelivered, assignedTo) => {
  try {
    const pool = await poolPurchaseRequest;

    // Step 1: Update PRFTABLE_DETAILS (remarks + date + partialDeliver)
    // Save
    // - remarks
    // - partial delivery
    // - delivery date
    await pool
      .request()
      .input("Id", sql.Int, id)
      .input("Remarks", sql.VarChar(sql.MAX), remarks)
      .input("PartialDeliver", sql.VarChar(sql.MAX), partialDeliver)
      .input("DateDelivered", sql.DateTime, dateDelivered)
      .query(`
        UPDATE PRFTABLE_DETAILS
        SET 
          remarks = @Remarks,
          partialDeliver = @PartialDeliver,
          DateDelivered = @DateDelivered
        WHERE Id = @Id
      `);

    // Step 2: Update PRFTABLE (assignedTo)
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

// Gte Remarks (For displaying in modal)
const getRemarksByIdService = async (Id) => {
  try {
    const pool = await poolPurchaseRequest;

    // Get remarks, partial delivery, and delivery date
    const result = await pool
      .request()
      .input("Id", sql.Int, Id)
      .query(`SELECT 
        remarks, 
        partialDeliver, 
        DateDelivered 
      FROM PRFTABLE_DETAILS 
      WHERE Id = @Id
    `);
    return result.recordset[0] || null;
  } catch (error) {
    console.error("Error fetching remarks:", error);
    throw error;
  }
};

// Get all Delivered stock items
const getIsDeliveredListService = async () => {
  try {
    const pool = await poolPurchaseRequest

    // JOIN PRFTABLE and PRFTABLE_DETAILS
    // Get all items where isDelivered = 1
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
