const express = require("express");
const router = express.Router();
const { fetchEmployees } = require("../controller/employeeController");

// API endpoint to get employee full names
router.get("/employees", fetchEmployees);

module.exports = router;


