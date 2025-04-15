const { searchPrfByNumber } = require("../model/searchPrfNoModel");

const searchPrf = async (req, res) => {
  try {
    const { prfNo } = req.query;
    
    if (!prfNo) {
      return res.status(400).json({ message: 'PRF number is required' });
    }
    
    const result = await searchPrfByNumber(prfNo);

    if (result.found) {
      // If PRF is found, send back the result including the isCancel status
      res.json({
        ...result,
        cancelButtonLabel: result.isCancel === 1 ? 'Marked as Cancelled' : 'Cancel'  // Conditionally set the button label
      });
    } else {
      res.json(result);
    }
  } catch (error) {
    console.error('Error searching PRF:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { searchPrf };
