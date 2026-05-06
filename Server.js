const express = require("express")
const cors = require("cors")
const dotenv = require("dotenv")

dotenv.config()

const app = express()

// ✅ ADD THIS (CRITICAL FIX)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// CORS
app.use(cors({
  origin: [
    "http://192.168.0.9",
    "http://prf-portal.nutratech.com.ph" // ✅ ADD THIS ALSO

  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}))

app.options("*", cors())

app.get("/", (req, res) => {
  res.send("Backend is running successfully 🚀")
})


// Routes
const stockRoutes = require("./routes/stockRoutes")
const employeeRoutes = require("./routes/employeeRoutes")
const userRoutes = require("./routes/userRoutes")
const prfDetailsRoutes = require("./routes/prfDetailsRoutes")
const prfTableRoutes = require("./routes/prfTableRoutes")
const prfListRoutes = require("./routes/prfListRoutes")
const searchPrfNoRoutes = require("./routes/searchPrfNoRoutes")
const cancelPrfRoutes = require("./routes/cancelPrfRoutes")
const uomRoutes = require("./routes/UomRoutes") 
const approvalRoutes = require("./routes/approvalRoutes")
const notificationRoutes = require("./routes/notificationRoutes")
const markAsReceivedRoutes = require("./routes/markAsReceivedRoutes")
const approveOrRejectPrfRoutes = require("./routes/approveOrRejectPrfRoutes")
const cgsCheckerRoutes = require("./routes/cgsCheckerRoutes")
const projectCodeRoutes = require("./routes/projectCodeRoutes")


// IMPORTANT for IIS
const port = process.env.PORT || 8090;

// API Routes
app.use("/api", stockRoutes)
app.use("/api", employeeRoutes)
app.use("/api", userRoutes)
app.use("/api", prfDetailsRoutes)
app.use("/api", prfTableRoutes)
app.use("/api", prfListRoutes)
app.use("/api", searchPrfNoRoutes)
app.use("/api", cancelPrfRoutes)
app.use("/api", uomRoutes) 
app.use("/api", approvalRoutes)
app.use("/api", notificationRoutes)
app.use("/api", markAsReceivedRoutes)
app.use("/api", approveOrRejectPrfRoutes)
app.use("/api", cgsCheckerRoutes)
app.use("/api", projectCodeRoutes)


app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`)
})