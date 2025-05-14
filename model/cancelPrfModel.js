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
      // Update PRFTABLE - increment cancelCount but don't enforce a limit
      const updateResult = await transaction
        .request()
        .input("prfId", sql.UniqueIdentifier, prfId)
        .query(`
          UPDATE PRFTABLE 
          SET cancelCount = ISNULL(cancelCount, 0) + 1
          WHERE prfId = @prfId 
        `)

      // Check if update was successful (affected rows should be 1)
      if (updateResult.rowsAffected[0] === 0) {
        await transaction.rollback()
        return { success: false, message: "PRF was modified by another user. Please refresh and try again." }
      }

      // Get the new cancel count
      const newCancelCountResult = await transaction
        .request()
        .input("prfId", sql.UniqueIdentifier, prfId)
        .query(`
          SELECT ISNULL(cancelCount, 0) as cancelCount
          FROM PRFTABLE 
          WHERE prfId = @prfId
        `)

      const newCancelCount = newCancelCountResult.recordset[0].cancelCount

      // Commit the transaction
      await transaction.commit()

      return {
        success: true,
        message: "PRF canceled successfully",
        newCancelCount: newCancelCount,
        isFullyCancelled: false, // No concept of "fully cancelled" with unlimited cancellations
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
