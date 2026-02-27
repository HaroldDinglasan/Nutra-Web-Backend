const { getEmployees, getEmployeeByOid } = require("../model/employeeService")

// Controller to fetch all employees
const fetchEmployees = async (req, res) => {
  try {
    const employees = await getEmployees()
    res.status(200).json(employees)
  } catch (error) {
    console.error("Error fetching employees:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch employees",
    })
  }
}

// Controller to fetch employee by Oid
const fetchEmployeeByOid = async (req, res) => {
  try {
    const { oid } = req.params
    const employee = await getEmployeeByOid(oid)

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      })
    }

    res.status(200).json(employee)
  } catch (error) {
    console.error("Error fetching employee by Oid:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch employee",
    })
  }
}

module.exports = { fetchEmployees, fetchEmployeeByOid }
