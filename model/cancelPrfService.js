// Import database connection pool
const { poolPurchaseRequest } = require("../connectionHelper/db")

// Import mssql package to handle SQL Server data types
const sql = require("mssql")

// CANCEL PRF FUNCTION
const cancelPrf = async (prfId) => {
  try {
    // Get database connection pool
    const pool = await poolPurchaseRequest

    // Get PRF date and cancel status from database
    const prfResult = await pool
      .request()
      .input("prfId", sql.UniqueIdentifier, prfId)
      .query(`
        SELECT prfDate, isCancel
        FROM PRFTABLE 
        WHERE prfId = @prfId
      `)
    
    // If PRF ID does not exist
    if (prfResult.recordset.length === 0) {
      return { success: false, message: "PRF not found" }
    }

    // Store PRF data
    const prfData = prfResult.recordset[0]


    // If PRF is already cancelled, stop the process
    if (prfData.isCancel === 1) {
      return { success: false, message: "PRF is already cancelled" }
    }

    // Convert PRF date and current date to Date objects
    const prfDate = new Date(prfData.prfDate)
    const currentDate = new Date()

    // Check if PRF date and today are the same day
    const isSameDay =
      prfDate.getFullYear() === currentDate.getFullYear() &&
      prfDate.getMonth() === currentDate.getMonth() &&
      prfDate.getDate() === currentDate.getDate()

    // If not the same day, cancellation is not allowed
    if (!isSameDay) {
      return { 
        success: false, 
        message: "PRF can only be cancelled on the same day it was created" 
      }
    }

    // Update PRF and mark it as cancelled
    const updateResult = await pool
      .request()
      .input("prfId", sql.UniqueIdentifier, prfId)
      .query(`
        UPDATE PRFTABLE 
        SET isCancel = 1
        WHERE prfId = @prfId 
      `)

    // If no rows were updated, something went wrong
    if (updateResult.rowsAffected[0] === 0) {
      return { success: false, message: "PRF was modified by another user. Please refresh and try again." }
    }

    // Success response
    return {
      success: true,
      message: "PRF canceled successfully",
      isCancel: 1
    }
  } catch (error) {
    console.error("Database error in cancelPrf:", error)
    throw new Error("Failed to cancel PRF: " + error.message)
  }
}

// UN-CANCEL PRF FUNCTION
const uncancelPrf = async (prfId) => {
  try {

    // Get database connection pool
    const pool = await poolPurchaseRequest

    // Get PRF date and cancel status
    const prfResult = await pool
      .request()
      .input("prfId", sql.UniqueIdentifier, prfId)
      .query(`
        SELECT prfDate, isCancel
        FROM PRFTABLE 
        WHERE prfId = @prfId
      `)
    
    // If PRF does not exist
    if (prfResult.recordset.length === 0) {
      return { success: false, message: "PRF not found" }
    }

    const prfData = prfResult.recordset[0]

    // Check if PRF is actually cancelled
    if (Number(prfData.isCancel) !== 1) {
      return { 
        success: false, 
        message: "PRF is not marked as cancelled in the database" 
      }
    }

    // Check if uncancellation is on the same day
    const prfDate = new Date(prfData.prfDate)
    const currentDate = new Date()

    // Check if today is the same day PRF was created
    const isSameDay =
      prfDate.getFullYear() === currentDate.getFullYear() &&
      prfDate.getMonth() === currentDate.getMonth() &&
      prfDate.getDate() === currentDate.getDate()

    // If not same day, uncancel is not allowed
    if (!isSameDay) {
      return { 
        success: false, 
        message: "PRF can only be uncancelled on the same day it was created" 
      }
    }

    // Update PRF and remove cancel flag
    const updateResult = await pool
      .request()
      .input("prfId", sql.UniqueIdentifier, prfId)
      .query(`
        UPDATE PRFTABLE 
        SET isCancel = 0
        WHERE prfId = @prfId 
      `)

    // If update failed
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
    
      // If verification query returns data
    if (verifyResult.recordset.length > 0) {
      const isCancel = Number(verifyResult.recordset[0].isCancel)
      
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

// Export functions so they can be used in controllers
module.exports = { cancelPrf, uncancelPrf }