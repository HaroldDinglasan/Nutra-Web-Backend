const express = require("express");
const { savePRFDetailsController, updatePrfDetailsController } = require("../controller/prfDetailsController");

const router = express.Router();

router.post("/save-prf-details", savePRFDetailsController);
router.post("/update-prf-details", updatePrfDetailsController);

module.exports = router;
