const { getProjectCodeList } = require("../model/projectCodeService")

const fetchProjectCodeList = async (req, res) => {
    try {
        const { company } = req.query; // ✅ GET COMPANY

        console.log("📌 Company received:", company); // debug

        const projectcodeList = await getProjectCodeList(company); // ✅ PASS COMPANY

        res.status(200).json(projectcodeList)
    } catch (error) {
        res.status(500).json({ message: "Error fetching project code List", error: error.message})
    }
};

module.exports = { fetchProjectCodeList }