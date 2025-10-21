const express = require("express")
const cors = require("cors")
const dotenv = require("dotenv")
const stockRoutes = require("./routes/stockRoutes")
const employeeRoutes = require("./routes/employeeRoutes")
const userRoutes = require("./routes/userRoutes")
const prfDetailsRoutes = require("./routes/prfDetailsRoutes")
const prfTableRoutes = require("./routes/prfTableRoutes")
const prfListRoutes = require("./routes/prfListRoutes")
const searchPrfNoRoutes = require("./routes/searchPrfNoRoutes")
const updatePrfDetailsRoutes = require("./routes/updatePrfDetailsRoutes")
const cancelPrfRoutes = require("./routes/cancelPrfRoutes")
const uomRoutes = require("./routes/UomRoutes") 
const approvalRoutes = require("./routes/approvalRoutes")
const uncancelPrfRoutes = require("./routes/uncancelPrfRoutes")
const notificationRoutes = require("./routes/notificationRoutes")
const markAsReceivedRoutes = require("./routes/markAsReceivedRoutes")

dotenv.config()
const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// API Routes
app.use("/api", stockRoutes)
app.use("/api", employeeRoutes)
app.use("/api", userRoutes)
app.use("/api", prfDetailsRoutes)
app.use("/api", prfTableRoutes)
app.use("/api", prfListRoutes)
app.use("/api", searchPrfNoRoutes)
app.use("/api", updatePrfDetailsRoutes)
app.use("/api", cancelPrfRoutes)
app.use("/api", uomRoutes) 
app.use("/api", approvalRoutes)
app.use("/api", uncancelPrfRoutes)
app.use("/api", notificationRoutes)
app.use("/api", markAsReceivedRoutes)


app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})
