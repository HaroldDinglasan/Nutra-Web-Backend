const express = require("express");
const { getStockCheckersFromDB } = require("../model/cgsCheckerService");

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

module.exports = router;
