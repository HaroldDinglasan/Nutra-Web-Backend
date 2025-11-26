const { savePRFDetails, updatePrfDetails } = require("../model/prfDetailsModel");

const savePRFDetailsController = async (req, res) => {
    try {
        const prfDetailsArray = req.body;

        if (!Array.isArray(prfDetailsArray) || prfDetailsArray.length === 0) {
            return res.status(400).json({ message: "Invalid or empty stock details array." });
        }

        await savePRFDetails(prfDetailsArray);
        res.status(201).json({ message: "Data saved successfully!" });
    } catch (error) {
        console.error("Error saving PRF details:", error); // Log error
        res.status(500).json({ message: "Error saving data", error: error.message });
    }
}

const updatePrfDetailsController = async (req, res) => {
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

module.exports = { savePRFDetailsController, updatePrfDetailsController };
