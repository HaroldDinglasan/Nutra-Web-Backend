const express = require("express");
const router = express.Router();
const { fetchStocks } = require("../controller/stockController");

// Define API endpoint to get stock data
router.get("/stocks", fetchStocks);

module.exports = router;
