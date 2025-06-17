const nodemailer = require("nodemailer")
require("dotenv").config()

// Create a reusable transporter object
let transporter = null

// Initialize the transporter with provided credentials
const initializeTransporter = (senderEmail, smtpPassword) => {
  // If credentials are provided, use them; otherwise, fall back to .env
  const email = senderEmail || process.env.SMTP_USER
  const password = smtpPassword || process.env.SMTP_PASSWORD

  console.log(`Initializing email transporter for: ${email}`)

  // Determine SMTP settings based on email domain
  const smtpConfig = {
    host: process.env.SMTP_HOST || "smtp-mail.outlook.com",
    port: Number.parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // false for 587, true for 465
    auth: {
      user: email,
      pass: password,
    },
  }

  // Auto-detect SMTP settings based on email domain
  if (email) {
    const domain = email.split("@")[1].toLowerCase()

    if (domain.includes("gmail.com")) {
      smtpConfig.host = "smtp.gmail.com"
      smtpConfig.port = 587
      smtpConfig.secure = false
    } else if (domain.includes("outlook.com") || domain.includes("hotmail.com") || domain.includes("live.com")) {
      smtpConfig.host = "smtp-mail.outlook.com"
      smtpConfig.port = 587
      smtpConfig.secure = false
    } else if (domain.includes("office365.com") || process.env.SMTP_HOST === "smtp.office365.com") {
      // For custom domains hosted on Office365
      smtpConfig.host = "smtp.office365.com"
      smtpConfig.port = 587
      smtpConfig.secure = false
    }
  }

  console.log("SMTP Configuration:", {
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    user: email,
  })

  // FIXED: Use createTransport instead of createTransporter
  transporter = nodemailer.createTransport(smtpConfig)

  return transporter
}

// Test email connection
const testEmailConnection = async (senderEmail, smtpPassword) => {
  try {
    const transport = getTransporter(senderEmail, smtpPassword)
    await transport.verify()
    console.log("✅ Email server connection successful")
    return { success: true, message: "Connection successful" }
  } catch (error) {
    console.error("❌ Email server connection failed:", error.message)
    return { success: false, error: error.message }
  }
}

// Get or create transporter
const getTransporter = (senderEmail, smtpPassword) => {
  if (!transporter || senderEmail) {
    return initializeTransporter(senderEmail, smtpPassword)
  }
  return transporter
}

// Format date for display in emails
const formatDate = (dateString) => {
  if (!dateString) return "N/A"

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return "N/A"

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

// Enhanced email templates with more PRF details
const emailTemplates = {
  checkBy: (prfData) => ({
    subject: `[Notification] You are assigned to check PRF #${prfData.prfNo}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">Purchase Request Form Needs Your Review</h2>
        <p>Hello,</p>
        <p>You have been assigned to <strong>check</strong> a Purchase Request Form.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>PRF Number:</strong> ${prfData.prfNo}</p>
          <p><strong>Date:</strong> ${formatDate(prfData.prfDate)}</p>
          <p><strong>Prepared By:</strong> ${prfData.preparedBy}</p>
          <p><strong>Department:</strong> ${prfData.departmentName || "Not specified"}</p>
          <p><strong>Company:</strong> ${prfData.company}</p>
        </div>
        <p>Please review this PRF at your earliest convenience.</p>
        <p>Thank you,<br>${prfData.company} Purchase System</p>
      </div>
    `,
  }),

  approveBy: (prfData) => ({
    subject: `[Notification] You are assigned to approve PRF #${prfData.prfNo}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">Purchase Request Form Needs Your Approval</h2>
        <p>Hello,</p>
        <p>You have been assigned to <strong>approve</strong> a Purchase Request Form.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>PRF Number:</strong> ${prfData.prfNo}</p>
          <p><strong>Date:</strong> ${formatDate(prfData.prfDate)}</p>
          <p><strong>Prepared By:</strong> ${prfData.preparedBy}</p>
          <p><strong>Department:</strong> ${prfData.departmentName || "Not specified"}</p>
          <p><strong>Company:</strong> ${prfData.company}</p>
        </div>
        <p>Please approve this PRF at your earliest convenience.</p>
        <p>Thank you,<br>${prfData.company} Purchase System</p>
      </div>
    `,
  }),

  receiveBy: (prfData) => ({
    subject: `[Notification] You are assigned to receive PRF #${prfData.prfNo}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">Purchase Request Form Receipt Assignment</h2>
        <p>Hello,</p>
        <p>You have been assigned to <strong>receive</strong> items for a Purchase Request Form.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>PRF Number:</strong> ${prfData.prfNo}</p>
          <p><strong>Date:</strong> ${formatDate(prfData.prfDate)}</p>
          <p><strong>Prepared By:</strong> ${prfData.preparedBy}</p>
          <p><strong>Department:</strong> ${prfData.departmentName || "Not specified"}</p>
          <p><strong>Company:</strong> ${prfData.company}</p>
        </div>
        <p>Please note that you will be responsible for receiving these items when they arrive.</p>
        <p>Thank you,<br>${prfData.company} Purchase System</p>
      </div>
    `,
  }),
}

// Function to send email with provided credentials
const sendEmail = async (to, template, prfData, senderEmail = null, smtpPassword = null) => {
  try {
    if (!to || !to.includes("@")) {
      console.error("Invalid email address:", to)
      return { success: false, error: "Invalid email address" }
    }

    console.log(`Sending ${template} email to ${to} with PRF data:`, prfData)

    // Test connection first
    const connectionTest = await testEmailConnection(senderEmail, smtpPassword)
    if (!connectionTest.success) {
      console.error("Email connection test failed:", connectionTest.error)
      return { success: false, error: `Connection failed: ${connectionTest.error}` }
    }

    const { subject, html } = emailTemplates[template](prfData)

    // Create mail options
    const mailOptions = {
      from: senderEmail ? `PRF System <${senderEmail}>` : process.env.EMAIL_FROM,
      to,
      subject,
      html,
      replyTo: prfData.replyTo || senderEmail,
    }

    // Get transporter with optional credentials
    const transport = getTransporter(senderEmail, smtpPassword)

    console.log(`Sending ${template} email to ${to} from ${mailOptions.from}`)
    const info = await transport.sendMail(mailOptions)

    console.log(`✅ Email sent to ${to}: ${info.messageId}`)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error(`❌ Error sending ${template} email to ${to}:`, error.message)

    // Provide more specific error messages
    let errorMessage = error.message
    if (error.code === "EAUTH") {
      errorMessage = "Authentication failed. Please check your email and password."
    } else if (error.code === "ECONNECTION") {
      errorMessage = "Connection failed. Please check your SMTP settings."
    } else if (error.responseCode === 535) {
      errorMessage = 'Authentication failed. You may need to enable "Less secure app access" or use an app password.'
    }

    return { success: false, error: errorMessage }
  }
}

// Function to send notifications to all approval roles with provided credentials
const sendApprovalNotifications = async (approvalData, prfData, senderEmail = null, smtpPassword = null) => {
  const results = {
    checkBy: null,
    approveBy: null,
    receiveBy: null,
  }

  // Send email to CheckedBy user if email is provided
  if (approvalData.CheckedByEmail) {
    results.checkBy = await sendEmail(approvalData.CheckedByEmail, "checkBy", prfData, senderEmail, smtpPassword)
  }

  // Send email to ApprovedBy user if email is provided
  if (approvalData.ApprovedByEmail) {
    results.approveBy = await sendEmail(approvalData.ApprovedByEmail, "approveBy", prfData, senderEmail, smtpPassword)
  }

  // Send email to ReceivedBy user if email is provided
  if (approvalData.ReceivedByEmail) {
    results.receiveBy = await sendEmail(approvalData.ReceivedByEmail, "receiveBy", prfData, senderEmail, smtpPassword)
  }

  return results
}

module.exports = {
  sendEmail,
  sendApprovalNotifications,
  initializeTransporter,
  testEmailConnection,
}
