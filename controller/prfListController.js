const { getPrfList, getPrfListByUser, getPrfByNumber } = require("../model/prfListModel")

const fetchPrfList = async (req, res) => {
  try {
    const prfList = await getPrfList()
    res.status(200).json(prfList)
  } catch (error) {
    res.status(500).json({ message: "Error fetching PRF List", error: error.message })
  }
}

const fetchPrfListByUser = async (req, res) => {
  try {
    const { username } = req.params

    if (!username) {
      return res.status(400).json({ message: "Username is required" })
    }

    const prfList = await getPrfListByUser(username)

    console.log(`Returning ${prfList.length} PRFs for user: ${username}`)
    res.status(200).json(prfList)
  } catch (error) {
    console.error("Error fetching PRF List by user:", error)
    res.status(500).json({ message: "Error fetching PRF List by user", error: error.message })
  }
}

const fetchPrfByNumber = async (req, res) => {
  try {
    const { prfId } = req.params;
    if (!prfId) return res.status(400).json({ message: "PRF number is required" });

    const prfData = await getPrfByNumber(prfId);
    if (!prfData) return res.status(404).json({ message: "PRF not found" });

    res.status(200).json(prfData);
  } catch (error) {
    res.status(500).json({ message: "Error fetching PRF by number", error: error.message });
  }
};

module.exports = { fetchPrfList, fetchPrfListByUser, fetchPrfByNumber }
