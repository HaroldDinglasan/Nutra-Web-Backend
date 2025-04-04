const { searchPrfByNumber } = require("../model/searchPrfNoModel");

// Export the controller function
const searchPrf = async (req, res) => {
  try {
    const { prfNo } = req.query;
    
    if (!prfNo) {
      return res.status(400).json({ message: 'PRF number is required' });
    }
    
    const result = await searchPrfByNumber(prfNo);
    res.json(result);
  } catch (error) {
    console.error('Error searching PRF:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { searchPrf };