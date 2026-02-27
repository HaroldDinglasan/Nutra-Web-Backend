const { getUomCodesByStockId } = require("../model/UomService");

// Fetch UOMCodes by StockId
const fetchUomCodesByStockId = async (req, res) => {
  try {
    const { stockId } = req.params

    if (!stockId) {
      return res.status(400).json({ message: "StockId is required" })
    }
    console.log(`Controller: Fetching UOMCodes for StockId: ${stockId}`)
    const uomCodes = await getUomCodesByStockId(stockId)
    console.log(`Controller: Returning ${uomCodes.length} UOMCodes`)

    res.status(200).json(uomCodes)
  } catch (error) {
    console.error(`Error in fetchUomCodesByStockId: ${error.message}`)
    res.status(500).json({ message: "Error fetching UOMCodes by StockId", error: error.message })
  }
}

module.exports = { fetchUomCodesByStockId }
