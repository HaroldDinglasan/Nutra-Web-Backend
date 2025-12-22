const express = require("express")
const { sendApprovalNotifications } = require("../lib/email-service")
const { getApprovalById } = require("../model/approvalModel")
const { getPrfById, getPrfByNumber, getLatestPrfByUser, getPrfWithDepartment } = require("../model/prfDataModel")
const { getEmployeeByOid } = require("../model/employeeModel")
const { sql, poolPurchaseRequest } = require("../connectionHelper/db")

const router = express.Router()

// Function para kunin yung mga fullname ng mga Approvers
// Para magdisplay ng fixed sa Outlook email notification
const getPrfApproverNames = async (prfId) => {
  try {
    const pool = await poolPurchaseRequest
    const result = await pool
      .request()
      .input("prfId", sql.UniqueIdentifier, prfId)
      .query(`
        SELECT checkedBy, approvedBy, receivedBy 
        FROM PRFTABLE 
        WHERE prfId = @prfId
      `)

    if (result.recordset.length > 0) {
      const names = result.recordset[0]
      return {
        checkedBy: names.checkedBy || "N/A",
        approvedBy: names.approvedBy || "N/A",
        receivedBy: names.receivedBy || "N/A",
      }
    }
    return { checkedBy: "N/A", approvedBy: "N/A", receivedBy: "N/A" }
  } catch (error) {
    console.error("[v0] Error fetching PRF approver names:", error)
    return { checkedBy: "N/A", approvedBy: "N/A", receivedBy: "N/A" }
  }
}

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
        departmentCharge: dbPrfData.departmentCharge || dbPrfData.departmentType, // <CHANGE> Pass departmentCharge from database
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

    const prfApproverNames = prfId ? await getPrfApproverNames(prfId) : null

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
      CheckedByFullName: prfApproverNames?.checkedBy || checkedByName || "N/A", // dinagdag para hindi mawala ang fullnames sa Outlook notification
      ApprovedByFullName: prfApproverNames?.approvedBy || approvedByName || "N/A",
      ReceivedByFullName: prfApproverNames?.receivedBy || receivedByName || "N/A",
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
        departmentCharge: dbPrfData.departmentCharge || dbPrfData.departmentType, // <CHANGE> Pass departmentCharge from database
        company: company || "NutraTech Biopharma, Inc",
        replyTo: senderEmail,
        CheckedByFullName: prfApproverNames?.checkedBy || checkedByName || "N/A", // dinagdag para hindi mawala ang fullnames sa Outlook notification
        ApprovedByFullName: prfApproverNames?.approvedBy || approvedByName || "N/A",
        ReceivedByFullName: prfApproverNames?.receivedBy || receivedByName || "N/A",
      }
      console.log("🔗 Using merged PRF data:", prfData)
    }

    const results = await sendApprovalNotifications(
      approvalData,
      prfData,
      senderEmail,      
      smtpPassword,     
      ["checkBy"] // sa checkBy user lang muna unang mag nonotif ang Outlook notification
    );

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
