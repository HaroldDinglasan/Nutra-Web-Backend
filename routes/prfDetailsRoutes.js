const express = require("express");
const { savePRFDetailsController } = require("../controller/prfDetailsController");
const router = express.Router();

router.post("/save-prf-details", savePRFDetailsController);

module.exports = router;
