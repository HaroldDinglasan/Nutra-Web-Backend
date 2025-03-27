const { savePrfHeader } = require("../model/prfTableModel")

// Controller to handle saving PRF header data
const savePrf = async (req, res) => {
  try {
    const prfHeader = req.body

    // Save PRF header
    const prfId = await savePrfHeader(prfHeader)

    res.status(200).json({
      success: true,
      message: "PRF header saved successfully",
      prfId,
    })
  } catch (error) {
    console.error("Error saving PRF header:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to save PRF header data",
    })
  }
}

module.exports = { savePrf }

