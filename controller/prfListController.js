const { getPrfList } = require("../model/prfListModel");

const fetchPrfList = async (req, res) => {
  try {
    const prfList = await getPrfList();
    res.status(200).json(prfList);
  } catch (error) {
    res.status(500).json({ message: "Error fetching PRF List", error: error.message });
  }
};

module.exports = { fetchPrfList };
