const { markAsReceivedService, getIsDeliveredListService, getRemarksByIdService, updateRemarksService  } = require("../model/markAsReceivedService")
const { sendEmail } = require("../lib/email-service")
const { getPrfWithDepartment } = require("../model/prfDataService")
const { sql, poolPurchaseRequest } = require("../connectionHelper/db")

// Get the email and name of the requestor (Prepared By)
const getRequestorEmail = async (prfId) => {
  try {
    const pool = await poolPurchaseRequest

    // Query PRF table to get requestor email and name
    const result = await pool
      .request()
      .input("prfId", sql.UniqueIdentifier, prfId)
      .query(`
        SELECT 
          U.outlookEmail, 
          P.preparedBy
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
    console.error("Error fetching requestor email:", error.message)
    return null
  }
}

// Send delivery notification to requestor
const sendDeliveryNotification = async (req, res) => {
  try {
    const { prfId } = req.params
    const { userFullName, senderEmail, smtpPassword } = req.body

    console.log("[v0] Delivery notification endpoint called for Item ID:", prfId)

    if (!prfId) {
      return res.status(400).json({
        success: false,
        message: "Item ID is required",
      })
    }

    const pool = await poolPurchaseRequest

    // Get PRF and stock item details using item ID
    const result = await pool
      .request()
      .input("itemId", sql.Int, parseInt(prfId))
      .query(`
        SELECT 
          P.prfNo,
          P.prfId,
          P.preparedBy,
          D.StockName,
          D.Id,
          U.outlookEmail
        FROM PRFTABLE P
        INNER JOIN PRFTABLE_DETAILS D ON P.prfId = D.PrfId
        LEFT JOIN Users_Info U ON P.UserID = U.userID
        WHERE D.Id = @itemId
      `)

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Item or Stock details not found",
      })
    }

    const prfData = result.recordset[0]
    const stockName = prfData.StockName || "Item"
    const requestorEmail = prfData.outlookEmail

    if (!requestorEmail) {
      return res.status(400).json({
        success: false,
        message: "Requestor email not found",
      })
    }

    console.log("[v0] Sending delivery notification to:", requestorEmail)
    console.log("[v0] Stock Name:", stockName)
    console.log("[v0] PRF Number:", prfData.prfNo)

    // Send the email with StockName
    const notificationResult = await sendEmail(
      requestorEmail,
      "prfDelivered",
      {
        prfNo: prfData.prfNo,
        prfId: prfData.prfId,
        preparedBy: prfData.preparedBy,
        ReceivedByFullName: userFullName || "Admin",
        company: prfData.company || "NutraTech Biopharma, Inc",
        stockName: stockName,
      },
      senderEmail,
      smtpPassword
    )

    if (notificationResult.success) {
      console.log("[v0] Successfully sent delivery notification")
      return res.status(200).json({
        success: true,
        message: "Delivery notification sent successfully",
      })
    } else {
      console.error("[v0] Failed to send notification:", notificationResult.error)
      return res.status(500).json({
        success: false,
        message: "Failed to send notification",
        error: notificationResult.error,
      })
    }
  } catch (error) {
    console.error("[v0] Error in delivery notification:", error.message)
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Mark a stock item as received
const markAsReceived = async (req, res) => {
  const { Id } = req.params

  try {
    // Update item status to received
    const result = await markAsReceivedService(Id)

    res.status(200).json({
      message: "Stock item marked as received successfully",
      data: result,
    })
  } catch (error) {
    console.error("Error marking item as received:", error)
    res.status(500).json({
      error: "Failed to mark item as received",
      details: error.message,
    })
  }
}

// Update remarks, delivery date, and assigned user
const updateRemarks = async (req, res) => {
  try {
    const { Id } = req.params;
    const { remarks, partialDeliver, dateDelivered, assignedTo } = req.body;

    if (!Id) {
      return res.status(400).json({ message: "Missing remarks or ID" });
    }

    // Allow empty remarks and Date Delivered
    const safeRemarks = remarks && remarks.trim() !== ""? remarks : null;
    const safePartialDeliver = partialDeliver && partialDeliver.trim() !== ""? partialDeliver : null;
    const safeDateDelivered = dateDelivered || null;

    const affected = await updateRemarksService(Id, safeRemarks, safePartialDeliver, safeDateDelivered, assignedTo);

    if (affected === 0) {
      return res.status(404).json({ message: "Record not found" });
    }

    res.status(200).json({ message: "Remarks updated successfully!" });
  } catch (error) {
    console.error("Error updating remarks:", error);
    res.status(500).json({ message: "Error updating remarks", error: error.message });
  }
};

// Get list of all delivered items
const getDeliveredList = async (req, res) => {
  try {

    const list = await getIsDeliveredListService()

    res.status(200).json({
      message: "Delivered list fetched successfully",
      data: list,
    })
  } catch (error) {
    console.error("Error fetching delivered list:", error)
    res.status(500).json({
      error: "Failed to fetch delivered list",
      details: error.message,
    })
  }
}

// Get remarks for a specific item by ID
const getRemarksById = async (req, res) => {
  try {

    const remarks = await getRemarksByIdService(req.params.Id)
    
    if (remarks) res.json(remarks);
    else res.status(404).json({ message: "No remarks found" });
  } catch (error) {
    console.error("Error fetching remarks:", error);
    res.status(500).json({ error: "Failed to fetch remarks" });
  }
}

module.exports = 
{ markAsReceived, 
  getDeliveredList, 
  getRemarksById, 
  updateRemarks, 
  getRequestorEmail, 
  sendDeliveryNotification }
