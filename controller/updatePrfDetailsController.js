const { updatePrfDetails } = require("../model/updatePrfDetailsModel");

const updatePrf = async (req, res) => {
  try {
    const { prfId, details } = req.body

    if (!prfId || !details || !Array.isArray(details)) {
      return res.status(400).json({ message: "PRF ID and details array are required" })
    }

    const result = await updatePrfDetails(prfId, details)

    if (!result.success) {
      return res.status(403).json({ message: result.message })
    }

    res.json(result)
  } catch (error) {
    console.error("Error updating PRF details:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
}


module.exports = { updatePrf };