const express = require('express');
const { searchPrf } = require("../controller/searchPrfNoController");

const router = express.Router();

// Connect the route to the controller function
router.get("/search-prf", searchPrf);

module.exports = router;