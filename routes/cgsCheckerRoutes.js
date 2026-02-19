const express = require("express");
const { getStockCheckersFromDB, getRequestorByPrfId, getPrfAndStockDetails, isAlreadyChecked, getLatestStockCheckByPrfId, approveStock, rejectStock,  } = require("../model/cgsCheckerService");
const { sendStockAvailableToRequestor, sendStockNotAvailableToRequestor} = require("../lib/email-service")

const router = express.Router();


// GET /api/get-stock-checkers
// Fetches the 3 fixed stock checkers from Users_Info table
// Returns their email addresses and full names
router.get("/get-stock-checkers", async (req, res) => {
  try {
    console.log("[v0] Fetching stock checkers from database...");

    const stockCheckers = await getStockCheckersFromDB();

    if (!stockCheckers || stockCheckers.length === 0) {
      console.warn("[v0] No stock checkers found in database");
      return res.status(404).json({
        success: false,
        message: "Stock checkers not found in database",
        recipients: [],
      });
    }

    console.log("[v0] Stock checkers retrieved:", stockCheckers);

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

// APPROVE FROM EMAIL CLICK
router.get("/cgs-stock/approve", async (req, res) => {
  try {
    const { 
      prfId, 
      stockCode,
      stockName, 
      checkerName,
      notedBy,
    } = req.query;

    if (!prfId || !stockCode) {
      return res.send("<h2>Invalid approval link.</h2>");
    }

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

    const stockLog = await getLatestStockCheckByPrfId(prfId, stockCode);
    const verifiedByFromDb = stockLog?.verifiedBy || "IM Stock Checker";

    // Send Email to Requestor
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


// REJECT FROM EMAIL CLICK
router.get("/cgs-stock/reject", async (req, res) => {
  try {
    const { 
      prfId, 
      stockCode, 
      stockName, 
      notedBy, 
      verifiedBy, 
      reason } = req.query;

    if (!prfId || !stockCode) {
      return res.send("<h2>Invalid rejection link.</h2>");
    }

    const already = await isAlreadyChecked(prfId, stockCode);
    if (already) {
      return res.send("<h2>This stock item was already verified by another checker.</h2>");
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


// APPROVE FROM SYSTEM PAGE (React POST)
router.post("/cgs-stock/approve", async (req, res) => {
  try {
    const {
      prfId,
      stockCode,
      stockName,
      notedBy,
      verifiedBy,
    } = req.body;

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

    await approveStock({
      prfId,
      stockCode,
      stockName,
      notedBy,
      verifiedBy,
    });

    const stockLog = await getLatestStockCheckByPrfId(prfId, stockCode);
    const verifiedByFromDb = stockLog?.verifiedBy || "IM Stock Checker";

    // Send email to requestor
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


// REJECT FROM SYSTEM PAGE (React POST)
router.post("/cgs-stock/reject", async (req, res) => {
  try {
    const { 
      prfId, 
      stockCode, 
      stockName, 
      notedBy, 
      verifiedBy, 
      reason 
    } = req.body;

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
