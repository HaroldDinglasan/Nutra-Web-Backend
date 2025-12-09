const { sql, poolPurchaseRequest } = require("../connectionHelper/db")

// approve or reject prf status based on assigned check, approve or received
const approvePrfByHeads = async (prfId, actionType, userFullName) => {
  try {
    const pool = await poolPurchaseRequest

    const normalizedActionType = actionType.toLowerCase()

    // Map action type to column names
    const columnMapping = {
      check: {
        dateTimeColumn: "checkedByDateTime",
        statusColumn: "checkedBy_Status",
        nameColumn: "checkedBy",
      },
      approve: {
        dateTimeColumn: "approvedByDateTime",
        statusColumn: "approvedBy_Status",
        nameColumn: "approvedBy",
      },
      receive: {
        dateTimeColumn: "receivedByDateTime",
        statusColumn: "receivedBy_Status",
        nameColumn: "receivedBy",
      },
    }

    const mapping = columnMapping[normalizedActionType]
    if (!mapping) {
      throw new Error(`Invalid action type: ${actionType}. Expected 'check', 'approve', or 'receive'.`)
    }

    const query = `
      UPDATE PRFTABLE 
      SET 
        ${mapping.dateTimeColumn} = GETDATE(),
        ${mapping.statusColumn} = @status,
        ${mapping.nameColumn} = @userFullName
      WHERE prfId = @prfId
    `

    console.log("[v0] Executing approval query:", {
      prfId,
      actionType: normalizedActionType,
      userFullName,
      dateTime: "GETDATE() (SQL Server Current Date/Time)",
    })

    const result = await pool
      .request()
      .input("prfId", sql.UniqueIdentifier, prfId)
      .input("status", sql.VarChar, "APPROVED")
      .input("userFullName", sql.VarChar, userFullName || "System User")
      .query(query)

    const rowsAffected = result.rowsAffected[0] || 0
    console.log("[v0] Query result - Rows affected:", rowsAffected)

    if (rowsAffected === 0) {
      throw new Error(`No PRF record found with ID: ${prfId}`)
    }

    return {
      success: true,
      message: `PRF ${normalizedActionType} status updated successfully`,
      data: {
        prfId,
        actionType: normalizedActionType,
        status: "APPROVED",
        userFullName,
        rowsAffected,
      },
    }
  } catch (error) {
    console.error("[v0] Error updating PRF approval status:", error.message, error.stack)
    return {
      success: false,
      error: error.message,
    }
  }
}

const rejectPrfByHeads = async (prfId, userFullName) => {
  try {
    const pool = await poolPurchaseRequest

    const query = `
      UPDATE PRFTABLE 
      SET 
        isCancel = 1
      WHERE prfId = @prfId
    `

    console.log(" Executing rejection query:", {
      prfId,
      userFullName,
      isCancel: 1,
    })

    const result = await pool.request().input("prfId", sql.UniqueIdentifier, prfId).query(query)

    const rowsAffected = result.rowsAffected[0] || 0
    console.log(" Query result - Rows affected:", rowsAffected)

    if (rowsAffected === 0) {
      throw new Error(`No PRF record found with ID: ${prfId}`)
    }

    return {
      success: true,
      message:`PRF rejected successfully`,
      data: {
        prfId,
        isCancel: 1,
        userFullName,
        rowsAffected,
      },
    }
  } catch (error) {
    console.error(" Error rejecting PRF:", error.message, error.stack)
    return {
      success: false,
      error: error.message,
    }
  }
}



module.exports = { approvePrfByHeads, rejectPrfByHeads }
