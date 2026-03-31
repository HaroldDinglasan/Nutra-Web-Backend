const { getStocks } = require("../model/stockService");

const fetchStocks = async (req, res) => {
  try {
    const { company } = req.query; // ✅ GET COMPANY

    console.log("📌 Company received:", company); // debug

    const stocks = await getStocks(company); // ✅ PASS COMPANY

    res.json(stocks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stocks" });
  }
};

module.exports = { fetchStocks };
