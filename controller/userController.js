const { registerEmployee } = require("../model/userModel");

const registerUser = async (req, res) => {
  const { departmentType, fullName, username, password } = req.body;

  if (!departmentType || !fullName || !username || !password) {
    return res.status(400).json({ message: "All fields are required!" });
  }

  try {
    const result = await registerEmployee(departmentType, fullName, username, password);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ message: "Error registering user", error: error.message });
  }
};

module.exports = { registerUser };
