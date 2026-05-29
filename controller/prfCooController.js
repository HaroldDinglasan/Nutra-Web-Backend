const { getPendingPrfsForCOO } = require("../model/prfCooService");
  
const fetchPendingCooPrfs = async (req, res) => {
    try {

        const { approvedBy } = req.query

        const pendingPrf = await getPendingPrfsForCOO(approvedBy)

        res.status(200).json(pendingPrf)

    } catch (error) {

        res.status(500).json({ message: "Error fetching COO pending PRF List", error: error.message })
    }
}


module.exports = { fetchPendingCooPrfs }