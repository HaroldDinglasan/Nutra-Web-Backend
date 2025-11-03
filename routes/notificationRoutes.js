const express = require("express")
const { sendApprovalNotifications } = require("../lib/email-service")
const { getApprovalById } = require("../model/approvalModel")
const { getPrfById, getPrfByNumber, getLatestPrfByUser, getPrfWithDepartment } = require("../model/prfDataModel")

const router = express.Router()

// Send notifications for a specific approval
router.post("/notifications/send/:approvalId", async (req, res) => {
  try {
    const { approvalId } = req.params
    const { prfId, prfNo, preparedBy, company, senderEmail, smtpPassword } = req.body

    // Get approval data
    const approvalData = await getApprovalById(approvalId)

    if (!approvalData) {
      return res.status(404).json({
        success: false,
        message: "Approval assignment not found",
      })
    }

    // Initialize PRF data with provided values
    let prfData = {
      prfNo: prfNo || "New PRF",
      preparedBy: preparedBy || "System User",
      company: company || "NutraTech Biopharma, Inc",
      replyTo: senderEmail,
    }

    // Get PRF data from database in this priority:
    // 1. By prfId if provided
    let dbPrfData = null

    if (prfId) {
      try {
        dbPrfData = await getPrfWithDepartment(prfId)
        console.log("Found PRF data by ID:", dbPrfData)
      } catch (error) {
        console.error("Error fetching PRF data by ID:", error)
      }
    } else if (prfNo) {
      try {
        const basicPrfData = await getPrfByNumber(prfNo)
        if (basicPrfData) {
          dbPrfData = await getPrfWithDepartment(basicPrfData.prfId)
          console.log("Found PRF data by number:", dbPrfData)
        }
      } catch (error) {
        console.error("Error fetching PRF data by number:", error)
      }
    }

    // If we found PRF data in the database, use it
    if (dbPrfData) {
      prfData = {
        prfId: dbPrfData.prfId,
        prfNo: dbPrfData.prfNo,
        prfDate: dbPrfData.prfDate,
        preparedBy: dbPrfData.preparedBy,
        departmentId: dbPrfData.departmentId,
        departmentName: dbPrfData.departmentName,
        company: company || "NutraTech Biopharma, Inc",
        replyTo: senderEmail,
      }
    }

    // Send notifications
    const results = await sendApprovalNotifications(approvalData, prfData, senderEmail, smtpPassword)

    res.status(200).json({
      success: true,
      data: results,
      message: "Notifications sent successfully",
    })
  } catch (error) {
    console.error("Error sending notifications:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send notifications",
    })
  }
})

// Send notifications directly from form data - THIS IS THE ROUTE USED BY PRF SAVE
router.post("/notifications/send-direct", async (req, res) => {
  try {
    const {
      prfId,
      prfNo,
      preparedBy,
      company,
      checkedByEmail,
      approvedByEmail,
      receivedByEmail,
      senderEmail,
      smtpPassword,
    } = req.body

    console.log("PRF Data:", { prfId, prfNo, preparedBy, company })

    // Create approval data structure
    const approvalData = {
      CheckedByEmail: checkedByEmail,
      ApprovedByEmail: approvedByEmail,
      ReceivedByEmail: receivedByEmail,
    }

    // Initialize PRF data with provided values
    let prfData = {
      prfNo: prfNo || "New PRF",
      preparedBy: preparedBy || "System User",
      company: company || "NutraTech Biopharma, Inc",
      replyTo: senderEmail,
    }

    // Try to get PRF data from database in this priority:
    // 1. By prfId if provided
    // 2. By prfNo if provided
    // 3. Latest PRF for the preparer if preparedBy is provided
    let dbPrfData = null

    if (prfId) {
      try {
        dbPrfData = await getPrfWithDepartment(prfId)
        console.log("Found PRF data by ID:", dbPrfData)
      } catch (error) {
        console.error("Error fetching PRF data by ID:", error)
      }
    } else if (prfNo) {
      try {
        const basicPrfData = await getPrfByNumber(prfNo)
        if (basicPrfData) {
          dbPrfData = await getPrfWithDepartment(basicPrfData.prfId)
          console.log("Found PRF data by number:", dbPrfData)
        }
      } catch (error) {
        console.error("Error fetching PRF data by number:", error)
      }
    } else if (preparedBy) {
      try {
        const basicPrfData = await getLatestPrfByUser(preparedBy)
        if (basicPrfData) {
          dbPrfData = await getPrfWithDepartment(basicPrfData.prfId)
          console.log("Found latest PRF data for user:", dbPrfData)
        }
      } catch (error) {
        console.error("Error fetching latest PRF data for user:", error)
      }
    }

    // If we found PRF data in the database, use it
    if (dbPrfData) {
      prfData = {
        prfId: dbPrfData.prfId,
        prfNo: dbPrfData.prfNo,
        prfDate: dbPrfData.prfDate,
        preparedBy: dbPrfData.preparedBy,
        departmentId: dbPrfData.departmentId,
        departmentName: dbPrfData.departmentName,
        company: company || "NutraTech Biopharma, Inc",
        replyTo: senderEmail,
      }
      console.log("Using PRF data from database:", prfData)
    }

    // Send notifications
    console.log("Final PRF data before sending emails:", prfData)
    const results = await sendApprovalNotifications(approvalData, prfData, senderEmail, smtpPassword)

    res.status(200).json({
      success: true,
      data: results,
      message: "Notifications sent successfully",
    })
  } catch (error) {
    console.error("Error sending notifications:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send notifications",
    })
  }
})



module.exports = router
