const { registerEmployee, loginUser } = require("../model/userModel");

// Register User
const registerUser = async (req, res) => {
  const { departmentType, departmentId, fullName, username, password } = req.body;

  if (!departmentType || !fullName || !username || !password) {
    return res.status(400).json({ message: "All fields are required!" });
  }

  try {
    const result = await registerEmployee(departmentType, departmentId, fullName, username, password);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ message: "Error registering user", error: error.message });
  }
};

// Login User
const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required!" });
  }

  try {
    const result = await loginUser(username, password);
    if (!result.success) {
      return res.status(401).json(result);
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ message: "Error logging in", error: error.message });
  }
};

module.exports = { registerUser, login };
