const express = require('express');
const { updatePrf } = require("../controller/updatePrfDetailsController");

const router = express.Router();

router.post("/update-prf-details", updatePrf);

module.exports = router;