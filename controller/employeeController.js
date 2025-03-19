// Handle API request to get Employee Names

const { getEmployees } = require("../model/employeeModel");

const fetchEmployees = async (req, res) => {
  try {
    const employees = await getEmployees();
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch employees" });
  }
};

module.exports = { fetchEmployees };
