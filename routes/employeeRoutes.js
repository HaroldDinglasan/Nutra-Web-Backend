const express = require("express")
const router = express.Router()
const { fetchEmployees, fetchEmployeeByOid } = require("../controller/employeeController")

// API endpoint to get employee full names and Oids
router.get("/employees", fetchEmployees)

// API endpoint to get employee by Oid
router.get("/employee/:oid", fetchEmployeeByOid)

module.exports = router
