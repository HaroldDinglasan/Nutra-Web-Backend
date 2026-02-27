const { getStocks } = require("../model/stockService");

const fetchStocks = async (req, res) => {
  try {
    const stocks = await getStocks();
    res.json(stocks); // Send data to frontend
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stocks" });
  }
};

module.exports = { fetchStocks };
