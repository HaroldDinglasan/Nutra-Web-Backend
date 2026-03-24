const express = require("express")
const router = express.Router()
const { fetchProjectCodeList } = require("../controller/projectCodeController")

router.get("/project-code-list", fetchProjectCodeList);

module.exports = router