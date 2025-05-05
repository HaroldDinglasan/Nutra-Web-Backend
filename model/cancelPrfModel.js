const { poolPurchaseRequest } = require("../connectionHelper/db")
const sql = require("mssql")

const cancelPrf = async (prfId) => {
  try {
    const pool = await poolPurchaseRequest

    // First, get the current PRF data to check date and cancel count
    const prfResult = await pool
      .request()
      .input("prfId", sql.UniqueIdentifier, prfId)
      .query(`
        SELECT prfDate, isCancel, ISNULL(cancelCount, 0) as cancelCount
        FROM PRFTABLE 
        WHERE prfId = @prfId
      `)

    if (prfResult.recordset.length === 0) {
      return { success: false, message: "PRF not found" }
    }

    const prfData = prfResult.recordset[0]

    // Check if PRF is already cancelled
    if (prfData.isCancel === 1) {
      return { success: false, message: "PRF is already cancelled" }
    }

    // Check if cancel count exceeds limit
    if (prfData.cancelCount >= 3) {
      return { success: false, message: "Cancel limit exceeded (maximum 3 cancellations allowed)" }
    }

    // Check if cancellation is on the same day
    const prfDate = new Date(prfData.prfDate)
    const currentDate = new Date()

    // Compare year, month, and day
    const isSameDay =
      prfDate.getFullYear() === currentDate.getFullYear() &&
      prfDate.getMonth() === currentDate.getMonth() &&
      prfDate.getDate() === currentDate.getDate()

    if (!isSameDay) {
      return { success: false, message: "PRF can only be cancelled on the same day it was created" }
    }

    // Use transaction for atomicity
    const transaction = new sql.Transaction(await pool)
    await transaction.begin()

    try {
      // Update PRFTABLE with optimistic locking
      const updateResult = await transaction
        .request()
        .input("prfId", sql.UniqueIdentifier, prfId)
        .input("cancelCount", sql.Int, prfData.cancelCount)
        .query(`
          UPDATE PRFTABLE 
          SET isCancel = CASE WHEN ISNULL(cancelCount, 0) + 1 >= 3 THEN 1 ELSE isCancel END, 
              cancelCount = ISNULL(cancelCount, 0) + 1
          WHERE prfId = @prfId 
          AND (cancelCount = @cancelCount OR cancelCount IS NULL)
        `)

      // Check if update was successful (affected rows should be 1)
      if (updateResult.rowsAffected[0] === 0) {
        // Optimistic locking failed - someone else modified the record
        await transaction.rollback()
        return { success: false, message: "PRF was modified by another user. Please refresh and try again." }
      }

      // If this is the third cancellation, also cancel the details
      if (prfData.cancelCount + 1 >= 3) {
        await transaction
          .request()
          .input("prfId", sql.UniqueIdentifier, prfId)
          .query(`
            UPDATE PRFTABLE_DETAILS 
            SET isCancel = 1 
            WHERE PrfId = @prfId
          `)
      }

      // Commit the transaction
      await transaction.commit()

      return {
        success: true,
        message: "PRF canceled successfully",
        newCancelCount: prfData.cancelCount + 1,
        isFullyCancelled: prfData.cancelCount + 1 >= 3,
      }
    } catch (error) {
      // Rollback in case of error
      await transaction.rollback()
      throw error
    }
  } catch (error) {
    console.error("Database error in cancelPrf:", error)
    throw new Error("Failed to cancel PRF: " + error.message)
  }
}

module.exports = { cancelPrf }
