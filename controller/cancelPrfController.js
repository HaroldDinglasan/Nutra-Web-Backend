const { cancelPrf } = require("../model/cancelPrfModel")

const cancelPrfController = async (req, res) => {
  try {
    const { prfId } = req.body

    if (!prfId) {
      return res.status(400).json({ message: "PRF ID is required" })
    }

    const result = await cancelPrf(prfId)

    if (result.success) {
      res.json(result)
    } else {
      res.status(400).json({ message: result.message })
    }
  } catch (error) {
    console.error("Error in cancelPrfController:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

module.exports = { cancelPrfController }
