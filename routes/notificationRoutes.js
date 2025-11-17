const express = require("express")
const { sendApprovalNotifications } = require("../lib/email-service")
const { getApprovalById } = require("../model/approvalModel")
const { getPrfById, getPrfByNumber, getLatestPrfByUser, getPrfWithDepartment } = require("../model/prfDataModel")
const { getEmployeeByOid } = require("../model/employeeModel")

const router = express.Router()

// Send notifications for a specific approval
router.post("/notifications/send/:approvalId", async (req, res) => {
  try {
    const { approvalId } = req.params
    const { prfId, prfNo, preparedBy, company, senderEmail, smtpPassword } = req.body

    // Kinukuha yung approval data
    const approvalData = await getApprovalById(approvalId)

    if (!approvalData) {
      return res.status(404).json({
        success: false,
        message: "Approval assignment not found",
      })
    }

    // Fetch yung full name gamit Oid (CheckedById, ApprovedById, ReceivedById)
    // galing sa employeeModel (getEmployeeByOid)
    const checkedBy = approvalData.CheckedById ? await getEmployeeByOid(approvalData.CheckedById) : null
    const approvedBy = approvalData.ApprovedById ? await getEmployeeByOid(approvalData.ApprovedById) : null
    const receivedBy = approvalData.ReceivedById ? await getEmployeeByOid(approvalData.ReceivedById) : null

    // Initialize PRF data with provided values
    let prfData = {
      prfNo: prfNo || "New PRF",
      prfId: prfId || null,
      prfDate: null,
      preparedBy: preparedBy || "System User",
      departmentType: "N/A",
      company: company || "NutraTech Biopharma, Inc",
      replyTo: senderEmail,
      CheckedByFullName: checkedBy?.FullName || "N/A",
      ApprovedByFullName: approvedBy?.FullName || "N/A",
      ReceivedByFullName: receivedBy?.FullName || "N/A",
    }

    // Try to get PRF data from database (priority: by prfId → prfNo → latest by user)
    let dbPrfData = null

    if (prfId) {
      try {
        dbPrfData = await getPrfWithDepartment(prfId)
        console.log("✅ Found PRF data by ID:", dbPrfData)
      } catch (error) {
        console.error("❌ Error fetching PRF data by ID:", error)
      }
    } else if (prfNo) {
      try {
        const basicPrfData = await getPrfByNumber(prfNo)
        if (basicPrfData) {
          dbPrfData = await getPrfWithDepartment(basicPrfData.prfId)
          console.log("✅ Found PRF data by number:", dbPrfData)
        }
      } catch (error) {
        console.error("❌ Error fetching PRF data by number:", error)
      }
    } else if (preparedBy) {
      try {
        const basicPrfData = await getLatestPrfByUser(preparedBy)
        if (basicPrfData) {
          dbPrfData = await getPrfWithDepartment(basicPrfData.prfId)
          console.log("✅ Found latest PRF data for user:", dbPrfData)
        }
      } catch (error) {
        console.error("❌ Error fetching latest PRF data for user:", error)
      }
    }

    // If we found PRF data in the database, use it
    if (dbPrfData) {
      prfData = {
        ...prfData, // dinagdag 
        prfId: dbPrfData.prfId,
        prfNo: dbPrfData.prfNo,
        prfDate: dbPrfData.prfDate,
        preparedBy: dbPrfData.preparedBy,
        departmentId: dbPrfData.departmentId,
        departmentType: dbPrfData.departmentType,
        company: company || "NutraTech Biopharma, Inc",
        replyTo: senderEmail,
        CheckedByFullName: checkedBy?.FullName || "N/A",
        ApprovedByFullName: approvedBy?.FullName || "N/A",
        ReceivedByFullName: receivedBy?.FullName || "N/A",
      }
    }

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

// Send notifications directly from form data - Ito yung route na ginamit para sa pagsave ng PRF
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
      checkedByName, // dinagdag 
      approvedByName, // dinagdag
      receivedByName, // dinagdag
      senderEmail,
      smtpPassword,
    } = req.body

    console.log("📦 Received PRF Data:", { prfId, prfNo, preparedBy, company })

    // Inclue email at full name
    const approvalData = {
      CheckedByEmail: checkedByEmail,
      ApprovedByEmail: approvedByEmail,
      ReceivedByEmail: receivedByEmail,
      CheckedByFullName: checkedByName || "N/A", 
      ApprovedByFullName: approvedByName || "N/A", 
      ReceivedByFullName: receivedByName || "N/A", 
    }

    // Initialize PRF data with provided values
    let prfData = {
      prfNo: prfNo || "New PRF",
      preparedBy: preparedBy || "System User",
      company: company || "NutraTech Biopharma, Inc",
      replyTo: senderEmail,
      CheckedByFullName: checkedByName || "N/A",
      ApprovedByFullName: approvedByName || "N/A",
      ReceivedByFullName: receivedByName || "N/A",
    }

    // Try to get PRF data from database (priority: by prfId → prfNo → latest by user)
    let dbPrfData = null

    if (prfId) {
      try {
        dbPrfData = await getPrfWithDepartment(prfId)
        console.log("✅ Found PRF data by ID:", dbPrfData)
      } catch (error) {
        console.error("❌ Error fetching PRF data by ID:", error)
      }
    } else if (prfNo) {
      try {
        const basicPrfData = await getPrfByNumber(prfNo)
        if (basicPrfData) {
          dbPrfData = await getPrfWithDepartment(basicPrfData.prfId)
          console.log("✅ Found PRF data by number:", dbPrfData)
        }
      } catch (error) {
        console.error("❌ Error fetching PRF data by number:", error)
      }
    } else if (preparedBy) {
      try {
        const basicPrfData = await getLatestPrfByUser(preparedBy)
        if (basicPrfData) {
          dbPrfData = await getPrfWithDepartment(basicPrfData.prfId)
          console.log("✅ Found latest PRF data for user:", dbPrfData)
        }
      } catch (error) {
        console.error("❌ Error fetching latest PRF data for user:", error)
      }
    }

    // Kapag may nakita PRF data sa database, mag merge
    if (dbPrfData) {
      prfData = {
        ...prfData,
        prfId: dbPrfData.prfId,
        prfNo: dbPrfData.prfNo,
        prfDate: dbPrfData.prfDate,
        preparedBy: dbPrfData.preparedBy,
        departmentId: dbPrfData.departmentId,
        departmentType: dbPrfData.departmentType,
        company: company || "NutraTech Biopharma, Inc",
        replyTo: senderEmail,
        CheckedByFullName: checkedByName || "N/A",
        ApprovedByFullName: approvedByName || "N/A",
        ReceivedByFullName: receivedByName || "N/A",
      }
      console.log("🔗 Using merged PRF data:", prfData)
    }

    // Final log bago magsend ang email
    console.log("✉️ Final PRF data before sending emails:", prfData)

    // Send notifications - pass both approvalData (for emails) and prfData (for template content)
    const results = await sendApprovalNotifications(approvalData, prfData, senderEmail, smtpPassword)

    res.status(200).json({
      success: true,
      data: results,
      message: "Notifications sent successfully",
    })
  } catch (error) {
    console.error(" Error sending notifications:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send notifications",
    })
  }
})

module.exports = router
