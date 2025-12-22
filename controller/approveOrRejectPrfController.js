
const { approvePrfByHeads, rejectPrfByHeads } = require("../model/approveOrRejectPrfService")
const { sendApprovalNotifications, sendEmail } = require("../lib/email-service")
const { getPrfWithDepartment } = require("../model/prfDataModel")
const { getEmployeeByOid } = require("../model/employeeModel")
const { sql, poolPurchaseRequest } = require("../connectionHelper/db")

// Kinukuha yung outlook email ng requestor 
const getRequestorEmail = async (prfId) => {
  try {
    const pool = await poolPurchaseRequest
    const result = await pool
      .request()
      .input("prfId", sql.UniqueIdentifier, prfId)
      .query(`
        SELECT U.outlookEmail, P.preparedBy
        FROM PRFTABLE P
        LEFT JOIN Users_Info U ON P.UserID = U.userID
        WHERE P.prfId = @prfId
      `)

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

// Kinukuha Approver Details para i send sa Outlook Notification using UserID
const getApproverDetails = async (prfId) => {
  try {
    const pool = await poolPurchaseRequest

    // Get UserID from PRFTABLE
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

    // Get approval assignments from AssignedApprovals
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

    // Kinukuha yung employee full name for ApprovedBy
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

// Kinukuha Receiver Details para i send sa Outlook Notification using UserID
const getReceiverDetails = async (prfId) => {
  try {
    const pool = await poolPurchaseRequest
    console.log(" getReceiverDetails called for prfId:", prfId)

    // Get UserID from PRFTABLE
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

    // Get approval assignments from AssignedApprovals
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

    // Get employee full name for ReceivedBy
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

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error,
      })
    }

    console.log(" PRF approval status updated successfully")

    // Step 2: After checkBy is confirmed, send notification to approveBy and requestor
    if (actionType.toLowerCase() === "check") {
      console.log(" CHECK action detected - attempting to send approveBy and requestor notifications")

      try {
        // Kinukuha yung approval details
        const approverDetails = await getApproverDetails(prfId)
        console.log(" Approver details retrieved:", approverDetails)

        if (!approverDetails) {
          console.warn(" Could not retrieve approver details")
          return res.status(200).json({
            success: true,
            message: result.message,
            data: result.data,
          })
        }

        if (!approverDetails.approvedByEmail) {
          console.warn(" No approveBy email found:", approverDetails)
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
          ApprovedByEmail: approverDetails.approvedByEmail,
          ApprovedByFullName: approverDetails.approvedByName,
        }

        console.log(" Sending approveBy email to:", {
          email: approverDetails.approvedByEmail,
          name: approverDetails.approvedByName,
          prfNo: prfData.prfNo,
        })

        // Send notification to approveBy user
        const notificationResult = await sendApprovalNotifications(
          approvalDataForNotification,
          {
            prfNo: prfData.prfNo,
            prfId: prfData.prfId,
            prfDate: prfData.prfDate,
            preparedBy: prfData.preparedBy,
            departmentCharge: prfData.departmentCharge || prfData.departmentType, // <CHANGE> Pass departmentCharge to email
            company: prfData.company || "NutraTech Biopharma, Inc",
            CheckedByFullName: checkedByName || prfData.checkedBy || userFullName || "N/A",
            ApprovedByFullName: approvedByName || approverDetails.approvedByName || "N/A",
            ReceivedByFullName: receivedByName || prfData.receivedBy || "N/A",
          },
          senderEmail,
          smtpPassword,
          ["approveBy"],
        )

        console.log(" ApproveBy notification result:", notificationResult)

        if (notificationResult.approveBy?.success) {
          console.log(" Successfully sent approveBy email to:", approverDetails.approvedByEmail)
        } else {
          console.warn(" Failed to send approveBy notification:", notificationResult.approveBy?.error)
        }
        
        // Eto yung part na nagsesent ng Outlook notifcation sa Requestor or nag prepare ng PRF
        const requestorDetails = await getRequestorEmail(prfId)
        if (requestorDetails && requestorDetails.email) {
          console.log(" Sending 'prfChecked' notification to requestor:", requestorDetails.email)

          const prfCheckedNotification = await sendEmail(
            requestorDetails.email,
            "prfChecked",
            {
              prfNo: prfData.prfNo,
              prfId: prfData.prfId,
              preparedBy: requestorDetails.name,
              CheckedByFullName: checkedByName || userFullName || "N/A",
              ApprovedByFullName: approverDetails.approvedByName || "N/A",
              company: prfData.company || "NutraTech Biopharma, Inc",
            },
            senderEmail,
            smtpPassword,
          )

          if (prfCheckedNotification.success) {
            console.log(" Successfully sent prfChecked notification to requestor")
          } else {
            console.warn(" Failed to send prfChecked notification:", prfCheckedNotification.error)
          }
        } else {
          console.warn(" Could not retrieve requestor email for check notification")
        }
      } catch (notificationError) {
        console.error(" Error sending check notifications:", notificationError.message)
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
            departmentCharge: prfData.departmentCharge || prfData.departmentType, // <CHANGE> Pass departmentCharge to email
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

const rejectPrfController = async (req, res) => {
  try {
    const { prfId } = req.params
    const { userFullName } = req.body

    if (!prfId) {
      return res.status(400).json({
        success: false,
        message: "PRF ID is required",
      })
    }

    const result = await rejectPrfByHeads(prfId, userFullName)

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
      })
    } else {
      res.status(500).json({
        success: false,
        message: result.error,
      })
    }
  } catch (error) {
    console.error("Error in rejection endpoint:", error.message)
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

module.exports = { approvePrfController, rejectPrfController }