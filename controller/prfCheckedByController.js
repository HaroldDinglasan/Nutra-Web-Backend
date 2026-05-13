const { getPendingCheckedBy } = require("../model/prfCheckedByService");

const fetchPendingCheckedBy = async (req, res) => {
  try {
    const { fullName } = req.query;

    const data = await getPendingCheckedBy(fullName);

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { fetchPendingCheckedBy };