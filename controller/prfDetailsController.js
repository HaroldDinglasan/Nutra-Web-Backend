const { savePRFDetails } = require("../model/prfDetailsModel");

const savePRFDetailsController = async (req, res) => {
    try {
        const { prfId, stockId, stockCode, stockName, uom, qty, dateNeeded, purpose, description } = req.body;

        if (!prfId || !stockId || !stockCode || !stockName || !uom || !qty || !dateNeeded || !purpose) {
            return res.status(400).json({ message: "All fields are required." });
        }

        await savePRFDetails(prfId, stockId, stockCode, stockName, uom, qty, dateNeeded, purpose, description);
        res.status(201).json({ message: "Data saved successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Error saving data", error: error.message });
    }
};

module.exports = { savePRFDetailsController };
