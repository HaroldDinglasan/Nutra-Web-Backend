// Import needed libraries
const express = require("express");
const axios = require("axios");

const { getStockCheckersFromDB, getRequestorByPrfId, getPrfAndStockDetails, isAlreadyChecked, getLatestStockCheckByPrfId, approveStock, rejectStock,  } = require("../model/cgsCheckerService");
const { sendStockAvailableToRequestor, sendStockNotAvailableToRequestor} = require("../lib/email-service")

const router = express.Router();


// GET /api/get-stock-checkers
// Fetches the 3 fixed stock checkers from Users_Info table
// Returns their email addresses and full names
router.get("/get-stock-checkers", async (req, res) => {
  try {

    // Get stock checkers from DB
    const stockCheckers = await getStockCheckersFromDB();

    if (!stockCheckers || stockCheckers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Stock checkers not found in database",
        recipients: [],
      });
    }

    return res.status(200).json({
      success: true,
      message: `Found ${stockCheckers.length} stock checkers`,
      recipients: stockCheckers,
    });
  } catch (error) {
    console.error("[v0] Error fetching stock checkers:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch stock checkers: " + error.message,
      recipients: [],
    });
  }
});

// APPROVE FROM EMAIL CLICK (When user clicks approve in Outlook)
router.get("/cgs-stock/approve", async (req, res) => {
  try {

    // Get values from URL (query parameters)
    const { prfId, stockCode, stockName, checkerName, notedBy} = req.query;

    // Check if link is valid
    if (!prfId || !stockCode) {
      return res.send("<h2>Invalid approval link.</h2>");
    }

    // Check if already approved or rejected
    const already = await isAlreadyChecked(prfId, stockCode);
    if (already) {
      return res.status(400).json({
        message: "This stock item was already verified by another checker.",
      });
    }

    // Insert into CGS_StockCheckLog
    await approveStock({ 
      prfId, 
      stockCode,
      stockName,
      notedBy,
      verifiedBy 
    });

    // Get latest stock log to know who verified it 
    const stockLog = await getLatestStockCheckByPrfId(prfId, stockCode);
    const verifiedByFromDb = stockLog?.verifiedBy || "IM Stock Checker";

    // Get requestor information
    const requestor = await getRequestorByPrfId(prfId);
    const details = await getPrfAndStockDetails(prfId, stockCode);

    // If requestor has email, send notification
    if (requestor?.outlookEmail) {

      try {
        const { sql, poolPurchaseRequest } = require("../connectionHelper/db");
        const pool = await poolPurchaseRequest;

        const prfUserResult = await pool
          .request()
          .input("prfId", sql.UniqueIdentifier, prfId)
          .query(`
            SELECT UserId, checkedBy, approvedBy, receivedBy
            FROM PRFTABLE 
            WHERE prfId = @prfId
          `);

        const prfRecord = prfUserResult.recordset[0];
        const prfUserId = prfRecord?.UserId;

        if (prfUserId) {

          const approversResult = await pool
            .request()
            .input("userId", sql.Int, prfUserId)
            .query(`
              SELECT CheckedByEmail, ApprovedByEmail, ReceivedByEmail
              FROM AssignedApprovals
              WHERE UserID = @userId
              AND ApplicType = 'PRF'
            `);

          const approvers = approversResult.recordset[0] || {};

          if (approvers.CheckedByEmail) {

            const notificationPayload = {
              prfId,
              prfNo: details?.prfNo || "",
              preparedBy: requestor?.preparedBy || "System User",
              company: "NutraTech Biopharma, Inc",
              checkedByEmail: approvers.CheckedByEmail,
              checkedByName: prfRecord?.checkedBy || "CheckedBy",
              approvedByEmail: approvers.ApprovedByEmail || "",
              approvedByName: prfRecord?.approvedBy || "ApprovedBy",
              receivedByEmail: approvers.ReceivedByEmail || "",
              receivedByName: prfRecord?.receivedBy || "ReceivedBy",
              senderEmail: process.env.SMTP_USER,
              smtpPassword: process.env.SMTP_PASSWORD,
            };

            await axios.post(
              "http://localhost:5000/api/notifications/send-direct",
              notificationPayload
            );

            console.log("✅ CheckBy notification sent (EMAIL CLICK FLOW)");
          }
        }

      } catch (err) {
        console.error("❌ Failed sending checkBy notification (EMAIL FLOW):", err);
      }

      // SEND EMAIL TO REQUESTOR (STOCK AVAILABLE)
      await sendStockAvailableToRequestor({
        toEmail: requestor.outlookEmail,
        preparedBy: requestor.preparedBy,
        stockCode,
        stockName: details?.stockName || stockName || "",
        prfNo: details?.prfNo || "",
        company: "NutraTech Biopharma, Inc",
        verifiedBy: verifiedByFromDb,
      });
    }

    return res.status(200).json({
      message: "Stock approved and logged successfully",
    });

   } catch (error) {
    console.error("[v0] Approve (POST) error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
});


// REJECT FROM EMAIL (When user clicks reject in Outlook)
router.get("/cgs-stock/reject", async (req, res) => {
  try {
    const { prfId, stockCode, stockName, notedBy, verifiedBy, reason } = req.query;

    // Check link validity
    if (!prfId || !stockCode) {
      return res.send("<h2>Invalid rejection link.</h2>");
    }

    // Prevent double approval / rejection
    const already = await isAlreadyChecked(prfId, stockCode);
    if (already) {
      return res.send("<h2>This stock item was already verified by another checker.</h2>");
    }

    const finalReason = reason || "Stock not available";

    // Insert into CGS_StockCheckLog
    await rejectStock({
      prfId,
      stockCode,
      stockName,
      notedBy,
      verifiedBy,
      rejectionReason: finalReason,
    });

    // Get requestor details
    const stockLog = await getLatestStockCheckByPrfId(prfId, stockCode);
    const verifiedByFromDb = stockLog?.verifiedBy || "IM Stock Checker";

    const requestor = await getRequestorByPrfId(prfId);
    const details = await getPrfAndStockDetails(prfId, stockCode);

    // SEND REJECTION EMAIL
    if (requestor?.outlookEmail) {
      await sendStockNotAvailableToRequestor({
        toEmail: requestor.outlookEmail,
        preparedBy: requestor.preparedBy,
        stockCode,
        stockName: details?.stockName || "",
        prfNo: details?.prfNo || "",
        company: "NutraTech Biopharma, Inc",
        reason: finalReason,
        verifiedBy: verifiedByFromDb,
      });
    } else {
      console.warn("[v0] No requestor email found for PRF:", prfId);
    }

    return res.send("<h2>❌ Stock marked as NOT AVAILABLE.</h2>");
  } catch (error) {
    console.error("[v0] Reject error:", error);
    return res.send("<h2>Error processing rejection.</h2>");
  }
});


// APPROVE FROM STOCK APPROVE AVAILABILITY.JSX
router.post("/cgs-stock/approve", async (req, res) => {
  try {
    const { prfId, stockCode, stockName, notedBy, verifiedBy } = req.body;

    // Validate request
    if (!prfId || !stockCode) {
      return res.status(400).json({
        message: "Invalid request data",
      });
    }

    // Prevent double verification
    const already = await isAlreadyChecked(prfId, stockCode);
    if (already) {
      return res.status(400).json({
        message: "This stock item was already verified.",
      });
    }

    // Save Approval
    await approveStock({
      prfId,
      stockCode,
      stockName,
      notedBy,
      verifiedBy,
    });

    const stockLog = await getLatestStockCheckByPrfId(prfId, stockCode);
    const verifiedByFromDb = stockLog?.verifiedBy || "IM Stock Checker";

    // SEND EMAIL TO REQUESTOR
    const requestor = await getRequestorByPrfId(prfId);
    const details = await getPrfAndStockDetails(prfId, stockCode);

    if (requestor?.outlookEmail) {
      await sendStockAvailableToRequestor({
        toEmail: requestor.outlookEmail,
        preparedBy: requestor.preparedBy,
        stockCode,
        stockName: details?.stockName || stockName || "",
        prfNo: details?.prfNo || "",
        company: "NutraTech Biopharma, Inc",
        verifiedBy: verifiedByFromDb,
      });
      console.log("[v0] ✅ Stock approved notification sent to requestor:", requestor.outlookEmail);
    }

    // AFTER requestor notification is sent, NOW send notification to checkBy person
    console.log("[v0] Now sending notification to checkBy person...");
    try {
      const { sql, poolPurchaseRequest } = require("../connectionHelper/db");
      
      const pool = await poolPurchaseRequest;
      
      // First, get the UserID from PRFTABLE to find the AssignedApprovals record
      const prfUserResult = await pool
        .request()
        .input("prfId", sql.UniqueIdentifier, prfId)
        .query(`
          SELECT UserId, checkedBy, approvedBy, receivedBy
          FROM PRFTABLE 
          WHERE prfId = @prfId
        `);
      
      const prfRecord = prfUserResult.recordset[0];
      const prfUserId = prfRecord?.UserId;
      
      if (!prfUserId) {
        console.warn("[v0] No UserId found in PRFTABLE for PRF:", prfId);
        // Don't return here - allow stock approval to succeed but skip checkBy notification
      } else {
        // Get approver emails from AssignedApprovals table
        const approversResult = await pool
          .request()
          .input("userId", sql.Int, prfUserId)
          .query(`
            SELECT 
              CheckedByEmail,
              ApprovedByEmail,
              ReceivedByEmail
            FROM AssignedApprovals 
            WHERE UserID = @userId 
            AND ApplicType = 'PRF'
          `);
        
        const approvers = approversResult.recordset[0] || {};
        
        console.log("[v0] Approver emails found from AssignedApprovals:", {
          checkedByEmail: approvers.CheckedByEmail,
          approvedByEmail: approvers.ApprovedByEmail,
          receivedByEmail: approvers.ReceivedByEmail,
          prfCheckedBy: prfRecord?.checkedBy,
          prfApprovedBy: prfRecord?.approvedBy,
          prfReceivedBy: prfRecord?.receivedBy,
        });
        
        // Validate that we have at least the checkBy email
        if (!approvers.CheckedByEmail) {
          console.warn("[v0] No CheckedByEmail found in AssignedApprovals for UserID:", prfUserId);
        } else {
          // Send checkBy notification through the send-direct endpoint
          try {
            const notificationPayload = {
              prfId,
              prfNo: details?.prfNo || "",
              preparedBy: requestor?.preparedBy || "System User",
              company: "NutraTech Biopharma, Inc",
              checkedByEmail: approvers.CheckedByEmail,
              checkedByName: prfRecord?.checkedBy || "CheckedBy",
              approvedByEmail: approvers.ApprovedByEmail || "",
              approvedByName: prfRecord?.approvedBy || "ApprovedBy",
              receivedByEmail: approvers.ReceivedByEmail || "",
              receivedByName: prfRecord?.receivedBy || "ReceivedBy",
              senderEmail: process.env.SMTP_USER,
              smtpPassword: process.env.SMTP_PASSWORD,
            };
            
            console.log("[v0] Sending checkBy notification with payload:", notificationPayload);
            
            const response = await axios.post("http://localhost:5000/api/notifications/send-direct", notificationPayload);
            
            if (response.data.success) {
              console.log("[v0] ✅ Notification sent to checkBy person after requestor notification");
            } else {
              console.error("[v0] API returned error:", response.data);
            }
          } catch (axiosError) {
            console.error("[v0] ⚠️ Axios error sending checkBy notification:", {
              message: axiosError.message,
              status: axiosError.response?.status,
              data: axiosError.response?.data,
            });
          }
        }
      }
    } catch (checkByError) {
      console.error("[v0] ⚠️ Error sending checkBy notification:", checkByError.message);
      console.error("[v0] Stack trace:", checkByError.stack);
      // Don't fail the entire approval if checkBy notification fails
    }

    return res.status(200).json({
      message: "Stock approved successfully",
    });

  } catch (error) {
    console.error("POST approve error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
});


// REJECT FROM STOCK APPROVE AVAILABILITY.JSX
router.post("/cgs-stock/reject", async (req, res) => {
  try {
    const { prfId, stockCode, stockName, notedBy, verifiedBy, reason } = req.body;

    if (!prfId || !stockCode) {
      return res.status(400).json({
        message: "Invalid request data",
      });
    }

    const already = await isAlreadyChecked(prfId, stockCode);
    if (already) {
      return res.status(400).json({
        message: "This stock item was already verified.",
      });
    }

    const finalReason = reason || "Stock not available";

    await rejectStock({
      prfId,
      stockCode,
      stockName,
      notedBy,
      verifiedBy,
      rejectionReason: finalReason,
    });

    const stockLog = await getLatestStockCheckByPrfId(prfId, stockCode);
    const verifiedByFromDb = stockLog?.verifiedBy || "IM Stock Checker";

    const requestor = await getRequestorByPrfId(prfId);
    const details = await getPrfAndStockDetails(prfId, stockCode);

    if (requestor?.outlookEmail) {
      await sendStockNotAvailableToRequestor({
        toEmail: requestor.outlookEmail,
        preparedBy: requestor.preparedBy,
        stockCode,
        stockName: details?.stockName || "",
        prfNo: details?.prfNo || "",
        company: "NutraTech Biopharma, Inc",
        reason: finalReason,
        verifiedBy: verifiedByFromDb,

      });
    } else {
      console.warn("[v0] No requestor email found for PRF:", prfId);
    }

    return res.send("<h2>❌ Stock marked as NOT AVAILABLE.</h2>");
  } catch (error) {
    console.error("[v0] Reject error:", error);
    return res.send("<h2>Error processing rejection.</h2>");
  }
});




module.exports = router;
