const { approvePrfByHeads, rejectPrfByHeads } = require("../model/approveOrRejectPrfService")
const { sendApprovalNotifications, sendEmail } = require("../lib/email-service")
const { getPrfWithDepartment } = require("../model/prfDataService")
const { getEmployeeByOid } = require("../model/employeeService")
const { sql, poolPurchaseRequest } = require("../connectionHelper/db")

const getApprovalFlowDetails = async (prfId) => {
  try {
    const pool = await poolPurchaseRequest

    const prfResult = await pool
      .request()
      .input("prfId", sql.UniqueIdentifier, prfId)
      .query(`SELECT UserID FROM PRFTABLE WHERE prfId = @prfId`)

    if (!prfResult.recordset.length) return null

    const userId = prfResult.recordset[0].UserID

    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(`
        SELECT 
          CheckedByEmail,
          WloSecondCheckedByEmail,
          ApprovedByEmail,
          ReceivedByEmail,
          CheckedById,
          SecondCheckedById,
          ApprovedById,
          ReceivedById
        FROM AssignedApprovals
        WHERE UserID = @userId AND ApplicType = 'PRF'
      `)

    return result.recordset[0] || null
  } catch (err) {
    console.error("Error getting approval flow:", err)
    return null
  }
}

// Get requestor (PREPARED BY) email
const getRequestorEmail = async (prfId) => {
  try {
    // Connection to database
    const pool = await poolPurchaseRequest
    // Get requestor email and name
    const result = await pool
      .request()
      .input("prfId", sql.UniqueIdentifier, prfId)
      .query(`
        SELECT U.outlookEmail, P.preparedBy
        FROM PRFTABLE P
        LEFT JOIN Users_Info U ON P.UserID = U.userID
        WHERE P.prfId = @prfId
      `)

    // Return email and name if found
    if (result.recordset.length > 0) {
      return {
        email: result.recordset[0].outlookEmail,
        name: result.recordset[0].preparedBy,
      }
    }
    return null
  } catch (error) {
    console.error(" Error fetching requestor email:", error.message)
    return null
  }
}

// Get Approver details (ApprovedBy)
const getApproverDetails = async (prfId) => {
  try {
    const pool = await poolPurchaseRequest

    // Get UserID and PRF No from PRFTABLE
    const prfResult = await pool
      .request()
      .input("prfId", sql.UniqueIdentifier, prfId)
      .query(`SELECT UserID, prfNo FROM PRFTABLE WHERE prfId = @prfId`)

    if (prfResult.recordset.length === 0) {
      console.error(" PRF not found for ID:", prfId)
      return null
    }

    const userId = prfResult.recordset[0].UserID
    const prfNo = prfResult.recordset[0].prfNo

    console.log(" Looking for approvals - PRF:", prfNo, "UserID:", userId)

    if (!userId) {
      console.error(" UserID is NULL for PRF:", prfId)
      return null
    }

    // Get ApprovedBy email and ID from AssignedApprovals
    const approvalsResult = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(`
        SELECT 
          ApprovedByEmail,
          ApprovedById
        FROM AssignedApprovals 
        WHERE UserID = @userId AND ApplicType = 'PRF'
      `)

    if (approvalsResult.recordset.length === 0) {
      console.error(" No approvals found for UserID:", userId)
      return null
    }

    const approvalData = approvalsResult.recordset[0]
    console.log(" Found approval record with ApprovedByEmail:", approvalData.ApprovedByEmail)

    // Get full name of approver
    const approvedByEmployee = approvalData.ApprovedById ? await getEmployeeByOid(approvalData.ApprovedById) : null

    console.log(" ApprovedBy employee:", approvedByEmployee?.FullName || "NOT FOUND")

    if (!approvalData.ApprovedByEmail) {
      console.warn("  WARNING: ApprovedByEmail is NULL for UserID:", userId)
    }

    return {
      approvedByEmail: approvalData.ApprovedByEmail,
      approvedByName: approvedByEmployee?.FullName || "N/A",
      approvedById: approvalData.ApprovedById,
      userId,
    }
  } catch (error) {
    console.error(" Error in getApproverDetails:", error.message)
    return null
  }
}

// Get Receiver details (ReceivedBy)
const getReceiverDetails = async (prfId) => {
  try {
    const pool = await poolPurchaseRequest

    // Get UserID and PRF No from PRFTABLE
    const prfResult = await pool
      .request()
      .input("prfId", sql.UniqueIdentifier, prfId)
      .query(`SELECT UserID, prfNo FROM PRFTABLE WHERE prfId = @prfId`)

    if (prfResult.recordset.length === 0) {
      console.error(" PRF not found for ID:", prfId)
      return null
    }

    const userId = prfResult.recordset[0].UserID
    const prfNo = prfResult.recordset[0].prfNo

    console.log(" Looking for approvals - PRF:", prfNo, "UserID:", userId)

    if (!userId) {
      console.error(" UserID is NULL for PRF:", prfId)
      return null
    }

    // Get ReceivedBy email and ID from AssignedApprovals
    const approvalsResult = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(`
        SELECT 
          ReceivedByEmail,
          ReceivedById
        FROM AssignedApprovals 
        WHERE UserID = @userId AND ApplicType = 'PRF'
      `)

    if (approvalsResult.recordset.length === 0) {
      console.error(" No approvals found for UserID:", userId)
      return null
    }

    const approvalData = approvalsResult.recordset[0]
    console.log(" Found approval record with ReceivedByEmail:", approvalData.ReceivedByEmail)

    // Get full name of receiver
    const receivedByEmployee = approvalData.ReceivedById ? await getEmployeeByOid(approvalData.ReceivedById) : null
    console.log(" ReceivedBy employee:", receivedByEmployee?.FullName || "NOT FOUND")

    if (!approvalData.ReceivedByEmail) {
      console.warn(" WARNING: ReceivedByEmail is NULL for UserID:", userId)
    }

    return {
      receivedByEmail: approvalData.ReceivedByEmail,
      receivedByName: receivedByEmployee?.FullName || "N/A",
      receivedById: approvalData.ReceivedById,
      userId,
    }
  } catch (error) {
    console.error(" Error in getReceiverDetails:", error.message)
    return null
  }
}

// MAIN CONTROLLER: APPROVE PRF 
// Handles check, approve, and receive actions 
const approvePrfController = async (req, res) => {
  try {
    const { prfId } = req.params
    const { actionType, userFullName, senderEmail, smtpPassword, checkedByName, approvedByName, receivedByName } = req.body

    if (!prfId || !actionType) {
      return res.status(400).json({
        success: false,
        message: "PRF ID and action type are required",
      })
    }

    // Step 1: Update PRF approval status
    const result = await approvePrfByHeads(prfId, actionType, userFullName)

    // Get PRF details early (we will reuse it)
    const prfData = await getPrfWithDepartment(prfId)
    const isWLO = prfData?.departmentCharge === "WLO"

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error,
      })
    }

    console.log(" PRF approval status updated successfully")

    // Step 2: After checkBy is confirmed, send notification to approveBy and requestor
    if (actionType.toLowerCase() === "check") {

      const approvalFlow = await getApprovalFlowDetails(prfId)
      if (!approvalFlow) {
        return res.status(200).json({ success: true })
      }

      // 🔵 IF FIRST CHECKER (has second checker configured)
      if (result.hasSecondChecker && !result.isSecondChecker) {

        console.log(" First check completed → sending to second checker")

        // Para mag display sa outlook notification messages
        await sendEmail(
          result.secondCheckerEmail,
          "checkBy",
          {
            prfNo: prfData.prfNo,
            prfId: prfData.prfId,
            prfDate: prfData.prfDate,
            preparedBy: prfData.preparedBy,
            departmentCharge: prfData.departmentCharge || prfData.departmentType,
            company: "NutraTech Biopharma, Inc",
            CheckedByFullName: prfData.secondCheckedBy, // ✅ FIXED
            ApprovedByFullName: prfData.approvedBy,
            ReceivedByFullName: prfData.receivedBy,
          },
          senderEmail,
          smtpPassword
        )

        return res.status(200).json({ success: true })
      }

      // 🔵 IF SECOND CHECKER
      if (result.isSecondChecker) {

        console.log(" Second check completed → notifying requestor and sending to approver")

        // 1️⃣ Notify REQUESTOR that PRF is CHECKED
        const requestorDetails = await getRequestorEmail(prfId)

        if (requestorDetails && requestorDetails.email) {
          await sendEmail(
            requestorDetails.email,
            "prfChecked",
            {
              prfNo: prfData.prfNo,
              prfId: prfData.prfId,
              preparedBy: requestorDetails.name,
              CheckedByFullName: userFullName || "N/A",
              ApprovedByFullName: prfData.approvedBy || "N/A",
              ReceivedByFullName: prfData.receivedBy || "N/A",
              company: prfData.company || "NutraTech Biopharma, Inc",
            },
            senderEmail,
            smtpPassword
          )

          console.log(" Successfully notified requestor (prfChecked)")
        }

        // 2️⃣ Notify APPROVED BY (next approver)
        await sendEmail(
          approvalFlow.ApprovedByEmail,
          "approveBy",
          {
            prfNo: prfData.prfNo,
            prfId: prfData.prfId,
            prfDate: prfData.prfDate,
            preparedBy: prfData.preparedBy,
            departmentCharge: prfData.departmentCharge || prfData.departmentType,
            company: prfData.company || "NutraTech Biopharma, Inc",
            CheckedByFullName: prfData.checkedBy || "N/A",
            ApprovedByFullName: prfData.approvedBy || "N/A",
            ReceivedByFullName: prfData.receivedBy || "N/A",
          },
          senderEmail,
          smtpPassword
        )

        console.log(" Successfully sent approveBy notification")

        return res.status(200).json({ success: true })
      }

      // 🔵 NORMAL DEPARTMENT (no second checker)
      if (!result.hasSecondChecker) {

        console.log(" Normal department → notifying requestor and sending to approver")

        // 1️⃣ Notify REQUESTOR (prfChecked)
        const requestorDetails = await getRequestorEmail(prfId)

        if (requestorDetails && requestorDetails.email) {
          await sendEmail(
            requestorDetails.email,
            "prfChecked",
            {
              prfNo: prfData.prfNo,
              prfId: prfData.prfId,
              preparedBy: requestorDetails.name,
              CheckedByFullName: userFullName || "N/A",
              ApprovedByFullName: prfData.approvedBy || "N/A",
              ReceivedByFullName: prfData.receivedBy || "N/A",
              company: prfData.company || "NutraTech Biopharma, Inc",
            },
            senderEmail,
            smtpPassword
          )

          console.log(" Successfully notified requestor (prfChecked)")
        }

        // 2️⃣ Notify APPROVED BY
        await sendEmail(
          approvalFlow.ApprovedByEmail,
          "approveBy",
          {
            prfNo: prfData.prfNo,
            prfId: prfData.prfId,
            prfDate: prfData.prfDate,
            preparedBy: prfData.preparedBy,
            departmentCharge: prfData.departmentCharge || prfData.departmentType,
            company: prfData.company || "NutraTech Biopharma, Inc",
            CheckedByFullName: prfData.checkedBy || "N/A",
            ApprovedByFullName: prfData.approvedBy || "N/A",
            ReceivedByFullName: prfData.receivedBy || "N/A",
          },
          senderEmail,
          smtpPassword
        )

        console.log(" Successfully sent approveBy notification")

        return res.status(200).json({ success: true })
      }
    }

    // Step 2.5: After approveBy is confirmed, send notification to receivedBy AND requestor
    if (actionType.toLowerCase() === "approve") {
      console.log(" APPROVE action detected - attempting to send receivedBy and requestor notifications")
      try {
        // Get receiver details
        const receiverDetails = await getReceiverDetails(prfId)
        console.log(" Receiver details retrieved:", receiverDetails)

        if (!receiverDetails) {
          console.warn(" Could not retrieve receiver details")
          return res.status(200).json({
            success: true,
            message: result.message,
            data: result.data,
          })
        }

        if (!receiverDetails.receivedByEmail) {
          console.warn(" No receivedBy email found:", receiverDetails)
          return res.status(200).json({
            success: true,
            message: result.message,
            data: result.data,
          })
        }

        // Get PRF details for email
        const prfData = await getPrfWithDepartment(prfId)
        if (!prfData) {
          console.warn(" Could not fetch PRF data for notification")
          return res.status(200).json({
            success: true,
            message: result.message,
            data: result.data,
          })
        }

        // Approval data for notification
        const approvalDataForNotification = {
          ReceivedByEmail: receiverDetails.receivedByEmail,
          ReceivedByFullName: receiverDetails.receivedByName,
        }

        console.log(" Sending receivedBy email to:", {
          email: receiverDetails.receivedByEmail,
          name: receiverDetails.receivedByName,
          prfNo: prfData.prfNo,
        })

        // Send notification to receivedBy user
        const notificationResult = await sendApprovalNotifications(
          approvalDataForNotification,
          {
            prfNo: prfData.prfNo,
            prfId: prfData.prfId,
            prfDate: prfData.prfDate,
            preparedBy: prfData.preparedBy,
            departmentCharge: prfData.departmentCharge || prfData.departmentType, // Pass departmentCharge to email
            company: prfData.company || "NutraTech Biopharma, Inc",
            CheckedByFullName: checkedByName || prfData.checkedBy || "N/A",
            ApprovedByFullName: approvedByName || userFullName || "N/A",
            ReceivedByFullName: receivedByName || receiverDetails.receivedByName || "N/A",
          },
          senderEmail,
          smtpPassword,
          ["receiveBy"],
        )

        console.log(" ReceiveBy notification result:", notificationResult)
        if (notificationResult.receiveBy?.success) {
          console.log(" Successfully sent receivedBy email to:", receiverDetails.receivedByEmail)
        } else {
          console.warn(" Failed to send receivedBy notification:", notificationResult.receiveBy?.error)
        }

        // Ito yung part na magsesend ng notification kay Requestor na approve na ang kanyang PRF
        const requestorDetails = await getRequestorEmail(prfId)
        if (requestorDetails && requestorDetails.email) {
          console.log(" Sending 'prfApproved' notification to requestor:", requestorDetails.email)

          const prfApprovedNotification = await sendEmail(
            requestorDetails.email,
            "prfApproved",
            {
              prfNo: prfData.prfNo,
              prfId: prfData.prfId,
              preparedBy: requestorDetails.name,
              ApprovedByFullName: userFullName || "N/A",
              ReceivedByFullName: receiverDetails.receivedByName || "N/A",
              company: prfData.company || "NutraTech Biopharma, Inc",
            },
            senderEmail,
            smtpPassword,
          )

          if (prfApprovedNotification.success) {
            console.log(" Successfully sent prfApproved notification to requestor")
          } else {
            console.warn(" Failed to send prfApproved notification:", prfApprovedNotification.error)
          }
        } else {
          console.warn(" Could not retrieve requestor email for approve notification")
        }
      } catch (notificationError) {
        console.error(" Error sending approve notifications:", notificationError.message)
      }
    }

    if (actionType.toLowerCase() === "receive") {
      console.log(" RECEIVE action detected - attempting to send requestor notification")
      try {
        // Get PRF details for email
        const prfData = await getPrfWithDepartment(prfId)
        if (!prfData) {
          console.warn(" Could not fetch PRF data for notification")
          return res.status(200).json({
            success: true,
            message: result.message,
            data: result.data,
          })
        }

        // Ito yung part na nagsend notification sa requestor kapag yung item ay received na
        const requestorDetails = await getRequestorEmail(prfId)
        if (requestorDetails && requestorDetails.email) {
          console.log(" Sending 'prfReceived' notification to requestor:", requestorDetails.email)

          const prfReceivedNotification = await sendEmail(
            requestorDetails.email,
            "prfReceived",
            {
              prfNo: prfData.prfNo,
              prfId: prfData.prfId,
              preparedBy: requestorDetails.name,
              ReceivedByFullName: userFullName || "N/A",
              company: prfData.company || "NutraTech Biopharma, Inc",
            },
            senderEmail,
            smtpPassword,
          )

          if (prfReceivedNotification.success) {
            console.log(" Successfully sent prfReceived notification to requestor")
          } else {
            console.warn(" Failed to send prfReceived notification:", prfReceivedNotification.error)
          }
        } else {
          console.warn(" Could not retrieve requestor email for receive notification")
        }
      } catch (notificationError) {
        console.error(" Error sending receive notifications:", notificationError.message)
      }
    }

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    })
  } catch (error) {
    console.error("Error in approval endpoint:", error.message)
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Controller for rejecting a PRF and sending notification to the requestor 
const rejectPrfController = async (req, res) => {
  try {
    // Get PRF ID from URL and other data from request body
    const { prfId } = req.params
    const { userFullName, rejectionReason, senderEmail, smtpPassword } = req.body

    // Log received data for debugging
    console.log(" Reject controller received:", {
      prfId,
      userFullName,
      rejectionReason,
      bodyKeys: Object.keys(req.body),
    })

    // Check if PRF ID is provided
    if (!prfId) {
      return res.status(400).json({
        success: false,
        message: "PRF ID is required",
      })
    }

    // Update PRF status to rejected in the database
    const result = await rejectPrfByHeads(prfId, userFullName, rejectionReason)

    if (result.success) {
      // Try to send rejection email notification
      try {

        // Get PRF details for email
        const prfData = await getPrfWithDepartment(prfId)
        if (!prfData) {
          console.warn(" Could not fetch PRF data for rejection notification")
          return res.status(200).json({
            success: true,
            message: result.message,
            data: result.data,
          })
        }

        // Get requestor email and name
        const requestorDetails = await getRequestorEmail(prfId)
        if (requestorDetails && requestorDetails.email) {
          console.log(" Sending 'prfRejected' notification to requestor:", requestorDetails.email)

          // Send rejection email to requestor 
          const prfRejectedNotification = await sendEmail(
            requestorDetails.email,
            "prfRejected",
            {
              prfNo: prfData.prfNo,
              prfId: prfData.prfId,
              preparedBy: requestorDetails.name,
              rejectionReason: rejectionReason,
              rejectedByFullName: userFullName || "N/A",
              company: prfData.company || "NutraTech Biopharma, Inc",
            },
            senderEmail,
            smtpPassword,
          )

          // Log result of email sending
          if (prfRejectedNotification.success) {
            console.log(" Successfully sent prfRejected notification to requestor")
          } else {
            console.warn(" Failed to send prfRejected notification:", prfRejectedNotification.error)
          }
        } else {
          console.warn(" Could not retrieve requestor email for rejection notification")
        }
      } catch (notificationError) {
        // Catch email/notification errors but still return success for rejection
        console.error(" Error sending rejection notification:", notificationError.message)
      }

      // Return success response for PRF rejection
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
      })
    } else {
      // If database reject failed
      res.status(500).json({
        success: false,
        message: result.error,
      })
    }
  } catch (error) {
    // Catch any unexpected errors in the controller
    console.error(" Error in rejection endpoint:", error.message, error.stack)
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

module.exports = { approvePrfController, rejectPrfController }