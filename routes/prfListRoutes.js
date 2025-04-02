const express = require("express");
const router = express.Router();
const { fetchPrfList } = require("../controller/prfListController");

router.get("/prf-list", fetchPrfList);

module.exports = router;
