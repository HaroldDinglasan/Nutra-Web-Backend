// Import database connection
const { sql, poolPurchaseRequest } = require("../connectionHelper/db")

// Approve PRF (Check / Approve / Receive)
const approvePrfByHeads = async (prfId, actionType, userFullName) => {
  try {
    // Connect to PurchaseRequest database
    const pool = await poolPurchaseRequest

    // Convert actionType to lowercase (check, approve, receive)
    const normalizedActionType = actionType.toLowerCase()

    // Step 1: Get approval setup from AssignedApprovals table
    // This checks who are assigned as checker, second checker, approver
    const approvalSetup = await pool.request()
      .input("prfId", sql.UniqueIdentifier, prfId)
      .query(`
          SELECT 
            AA.CheckedById,
            AA.SecondCheckedById,
            AA.WloSecondCheckedByEmail,
            AA.ApprovedById
        FROM AssignedApprovals AA
        INNER JOIN PRFTABLE P ON P.UserID = AA.UserID
        WHERE P.prfId = @prfId
        AND AA.ApplicType = 'PRF'
      `)

    const setup = approvalSetup.recordset[0]

    // If no approval setup found, stop process
    if (!setup) throw new Error("Approval setup not found.")

    // Step 2: Check if this is First Check or Second Check
    let isSecondChecker = false

    // If action is "check" and there is a second checker assigned
    if (normalizedActionType === "check" && setup.SecondCheckedById) {

      // Check if first checker already approved
      const checkStatus = await pool.request()
        .input("prfId", sql.UniqueIdentifier, prfId)
        .query(`
          SELECT checkedByDateTime, secondCheckedByDateTime
          FROM PRFTABLE
          WHERE prfId = @prfId
        `)

      const prfStatus = checkStatus.recordset[0]
      
      // If first checker already checked AND second checker hasn't checked yet -> this IS the second checker
      if (prfStatus.checkedByDateTime && !prfStatus.secondCheckedByDateTime) {
        isSecondChecker = true
      }
      
      console.log("[v0] Check Status Analysis:", {
        prfId,
        hasSecondChecker: !!setup.SecondCheckedById,
        checkedByDateTime: prfStatus.checkedByDateTime,
        secondCheckedByDateTime: prfStatus.secondCheckedByDateTime,
        isSecondChecker
      })
    }

    
    // Step 3: Column Mapping (Dynamic)
    // Depending on actionType, update different columns
    const columnMapping = {
      check: isSecondChecker
        ? {
            dateTimeColumn: "secondCheckedByDateTime",
            statusColumn: "secondCheckedBy_Status",
            nameColumn: "secondCheckedBy",
          }
        : {
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

    // If invalid actionType
    if (!mapping) {
      throw new Error(`Invalid action type: ${actionType}`)
    }

    // Step 4: Update PRFTABLE
    const query = `
      UPDATE PRFTABLE 
      SET 
        ${mapping.dateTimeColumn} = GETDATE(),
        ${mapping.statusColumn} = @status,
        ${mapping.nameColumn} = @userFullName
      WHERE prfId = @prfId
    `

    await pool.request()
      .input("prfId", sql.UniqueIdentifier, prfId)
      .input("status", sql.VarChar, "APPROVED")
      .input("userFullName", sql.VarChar, userFullName || "System User")
      .query(query)

    // Step 5: Log detailed info before returning
    console.log("[v0] Approval Result:", {
      prfId,
      actionType: normalizedActionType,
      isSecondChecker,
      hasSecondChecker: !!setup.SecondCheckedById,
      secondCheckerEmail: setup.WloSecondCheckedByEmail,
      secondCheckedById: setup.SecondCheckedById,
    })

    // Step 5:  Return result to controller
    return {
      success: true,
      isSecondChecker,
      hasSecondChecker: !!setup.SecondCheckedById,
      secondCheckerEmail: setup.WloSecondCheckedByEmail || null,
      message: isSecondChecker
        ? "Second check completed"
        : setup.SecondCheckedById
          ? "First check completed — route to second checker"
          : "Check completed",
    }

  } catch (error) {
    console.error("Approval error:", error)
    return { success: false, error: error.message }
  }
}

// REJECT PRF
const rejectPrfByHeads = async (prfId, userFullName, rejectionReason) => {
  try {
    const pool = await poolPurchaseRequest

    console.log(" rejectPrfByHeads input parameters:", {
      prfId,
      userFullName,
      rejectionReason,
      rejectionReasonType: typeof rejectionReason,
      rejectionReasonLength: rejectionReason ? rejectionReason.length : 0,
    })

    // Update PRFTABLE: mark as rejected and save reason
    const query = `
      UPDATE PRFTABLE 
      SET 
        isReject = 1,
        rejectionReason = @rejectionReason
      WHERE prfId = @prfId
    `

    console.log(" Executing rejection query:", {
      prfId,
      userFullName,
      rejectionReason,
      isReject: 1,
    })

    const request = pool.request()
    request.input("prfId", sql.UniqueIdentifier, prfId)

    // If no reason provided, default message
    request.input("rejectionReason", sql.VarChar(sql.MAX), rejectionReason && rejectionReason.trim() ? rejectionReason : "No reason provided")

    const result = await request.query(query)

    const rowsAffected = result.rowsAffected[0] || 0

    // If no record updated -> PRF not found
    if (rowsAffected === 0) {
      throw new Error(`No PRF record found with ID: ${prfId}`)
    }

    // Return success result
    return {
      success: true,
      message:`PRF rejected successfully`,
      data: {
        prfId,
        isReject: 1,
        rejectionReason,
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
