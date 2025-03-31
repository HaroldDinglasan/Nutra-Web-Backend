const { savePRFDetails } = require("../model/prfDetailsModel");

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
};

module.exports = { savePRFDetailsController };
