const sql = require("mssql")
const { poolPurchaseRequest } = require("../connectionHelper/db")

const uncancelPrf = async (prfId) => {
  try {
    const pool = await poolPurchaseRequest

    // First, get the current PRF data to check date and cancel status
    const prfResult = await pool
      .request()
      .input("prfId", sql.UniqueIdentifier, prfId)
      .query(`
        SELECT prfDate, isCancel
        FROM PRFTABLE 
        WHERE prfId = @prfId
      `)

    if (prfResult.recordset.length === 0) {
      return { success: false, message: "PRF not found" }
    }

    const prfData = prfResult.recordset[0]
    console.log("PRF data before uncancelling:", prfData)
    console.log("isCancel value:", prfData.isCancel)
    console.log("isCancel type:", typeof prfData.isCancel)

    // Check if PRF is not cancelled - FIXED COMPARISON
    // Use loose equality (==) instead of strict equality (===) to handle type differences
    if (Number(prfData.isCancel) !== 1) {
      return { success: false, message: "PRF is not marked as cancelled in the database" }
    }

    // Check if uncancellation is on the same day
    const prfDate = new Date(prfData.prfDate)
    const currentDate = new Date()

    // Compare year, month, and day
    const isSameDay =
      prfDate.getFullYear() === currentDate.getFullYear() &&
      prfDate.getMonth() === currentDate.getMonth() &&
      prfDate.getDate() === currentDate.getDate()

    if (!isSameDay) {
      return { success: false, message: "PRF can only be uncancelled on the same day it was created" }
    }

    // Update PRFTABLE - set isCancel to 0
    const updateResult = await pool
      .request()
      .input("prfId", sql.UniqueIdentifier, prfId)
      .query(`
        UPDATE PRFTABLE 
        SET isCancel = 0
        WHERE prfId = @prfId 
      `)

    // Check if update was successful (affected rows should be 1)
    if (updateResult.rowsAffected[0] === 0) {
      return { success: false, message: "PRF was modified by another user. Please refresh and try again." }
    }

    // Verify the update was successful
    const verifyResult = await pool
      .request()
      .input("prfId", sql.UniqueIdentifier, prfId)
      .query(`
        SELECT isCancel
        FROM PRFTABLE 
        WHERE prfId = @prfId
      `)

    if (verifyResult.recordset.length > 0) {
      // Convert to number to ensure consistent comparison
      const isCancel = Number(verifyResult.recordset[0].isCancel)
      console.log("After update - isCancel value:", isCancel)
      
      if (isCancel === 0) {
        return {
          success: true,
          message: "PRF uncancelled successfully",
          isCancel: 0,
        }
      } else {
        return {
          success: false,
          message: "Failed to update PRF status in the database. Please try again.",
        }
      }
    } else {
      return {
        success: false,
        message: "Failed to verify PRF status after update.",
      }
    }
  } catch (error) {
    console.error("Database error in uncancelPrf:", error)
    throw new Error("Failed to uncancel PRF: " + error.message)
  }
}

module.exports = {
  uncancelPrf,
}