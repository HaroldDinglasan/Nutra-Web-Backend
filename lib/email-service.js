// Load nodemailer for sending emails
const nodemailer = require("nodemailer")

// Load environment variables from .env file
require("dotenv").config()

// Reusable email transporter (SMTP connection)
let transporter = null

// Initialize email transporter
const initializeTransporter = (senderEmail, smtpPassword) => {
  // Use provided email/password OR fallback to .env values
  const email = senderEmail || process.env.SMTP_USER
  const password = smtpPassword || process.env.SMTP_PASSWORD

  console.log(`Initializing email transporter for: ${email}`)

  // Default SMTP Configuration
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

    // Gmail settings
    if (domain.includes("gmail.com")) {
      smtpConfig.host = "smtp.gmail.com"
      smtpConfig.port = 587
      smtpConfig.secure = false

      // Outlook / Hotmail / Live settings
    } else if (domain.includes("outlook.com") || domain.includes("hotmail.com") || domain.includes("live.com")) {
      smtpConfig.host = "smtp-mail.outlook.com"
      smtpConfig.port = 587
      smtpConfig.secure = false
    } else if (domain.includes("office365.com") || process.env.SMTP_HOST === "smtp.office365.com") {

      // Office 365 settings
      smtpConfig.host = "smtp.office365.com"
      smtpConfig.port = 587
      smtpConfig.secure = false
    }
  }
  // Log SMTP settings (for debugging)
  console.log("SMTP Configuration:", {
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    user: email,
  })

  // Create nodemailer transporter (SMTP connection)
  transporter = nodemailer.createTransport(smtpConfig)

  return transporter
}

// Test if email server is reachable
const testEmailConnection = async (senderEmail, smtpPassword) => {
  try {
    // Get or create transporter
    const transport = getTransporter(senderEmail, smtpPassword)
    // Verify SMTP connection
    await transport.verify()

    console.log("✅ Email server connection successful")
    return { success: true, message: "Connection successful" }
  } catch (error) {
    console.error("❌ Email server connection failed:", error.message)
    return { success: false, error: error.message }
  }
}

// Get existing transporter or create new one 
const getTransporter = (senderEmail, smtpPassword) => {
  // If no transporter OR new senderEmail is provided, reinitialize
  if (!transporter || senderEmail) {
    return initializeTransporter(senderEmail, smtpPassword)
  }
  // Reuse existing transporter
  return transporter
}

// Format date for email display
const formatDate = (dateString) => {
  if (!dateString) return "N/A"

  const date = new Date(dateString)
  // If invalid date, return N/A
  if (isNaN(date.getTime())) return "N/A"

  // Return formatted date (example: January 29, 2026)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

// Email templates for PRF workflow
const emailTemplates = {
  // Email for Checked By approvers
  checkBy: (prfData) => ({
    subject: `[Notification] You are assigned to check PRF #${prfData.prfNo}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">Purchase Request Form Needs Your Review</h2>
        <p>Good Day!</p>
        <p>You have been assigned to <strong>check</strong> a Purchase Request Form.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>PRF Number:</strong> ${prfData.prfNo}</p>
          <p><strong>Date:</strong> ${formatDate(prfData.prfDate)}</p>
          <p><strong>Prepared By:</strong> ${prfData.preparedBy}</p>
          <p><strong>Department Charge to:</strong> ${prfData.departmentCharge || prfData.departmentType || "Not specified"}</p>
          <p><strong>Company:</strong> ${prfData.company}</p>
          <p><strong>Checked By:</strong> ${prfData.CheckedByFullName || "N/A"}</p>
          <p><strong>Approved By:</strong> ${prfData.ApprovedByFullName || "N/A"}</p>
          <p><strong>Received By:</strong> ${prfData.ReceivedByFullName || "N/A"}</p>
        </div>

        <!-- Proceed Button -->
          <div style="text-align:center; margin: 25px 0;">
           <a 
            href="${process.env.APP_URL || "http://localhost:3000"}/?prfId=${prfData.prfId}&prfNo=${encodeURIComponent(prfData.prfNo)}&prfDate=${encodeURIComponent(prfData.prfDate || "")}&preparedBy=${encodeURIComponent(prfData.preparedBy || "")}&departmentCharge=${encodeURIComponent(prfData.departmentCharge || prfData.departmentType || "")}&checkedBy=${encodeURIComponent(prfData.CheckedByFullName || "")}&approvedBy=${encodeURIComponent(prfData.ApprovedByFullName || "")}&receivedBy=${encodeURIComponent(prfData.ReceivedByFullName || "")}&assignedAction=check"              
            style="display: inline-block; background-color: #0078D7; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;"
            >
              Proceed
            </a>
          </div>

        <p>Thank you,<br>${prfData.company} Purchase System</p>
      </div>
    `,
  }),

  // Email for Approve By approvers
  approveBy: (prfData) => ({
    subject: `[Notification] You are assigned to approve PRF #${prfData.prfNo}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">Purchase Request Form Needs Your Approval</h2>
        <p>Good Day!</p>
        <p>You have been assigned to <strong>approve</strong> a Purchase Request Form.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>PRF Number:</strong> ${prfData.prfNo}</p>
          <p><strong>Date:</strong> ${formatDate(prfData.prfDate)}</p>
          <p><strong>Prepared By:</strong> ${prfData.preparedBy}</p>
          <p><strong>Department Charge to:</strong> ${prfData.departmentCharge || prfData.departmentType || "Not specified"}</p>
          <p><strong>Company:</strong> ${prfData.company}</p>
          <p><strong>Checked By:</strong> ${prfData.CheckedByFullName || "N/A"}</p>
          <p><strong>Approved By:</strong> ${prfData.ApprovedByFullName || "N/A"}</p>
          <p><strong>Received By:</strong> ${prfData.ReceivedByFullName || "N/A"}</p>
        </div>

         <!-- Proceed Button -->
          <div style="text-align:center; margin: 25px 0;">
           <a 
            href="${process.env.APP_URL || "http://localhost:3000"}/?prfId=${prfData.prfId}&prfNo=${encodeURIComponent(prfData.prfNo)}&prfDate=${encodeURIComponent(prfData.prfDate || "")}&preparedBy=${encodeURIComponent(prfData.preparedBy || "")}&departmentCharge=${encodeURIComponent(prfData.departmentCharge || prfData.departmentType || "")}&checkedBy=${encodeURIComponent(prfData.CheckedByFullName || "")}&approvedBy=${encodeURIComponent(prfData.ApprovedByFullName || "")}&receivedBy=${encodeURIComponent(prfData.ReceivedByFullName || "")}&assignedAction=approve"              
            style="display: inline-block; background-color: #0078D7; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;"
            >
              Proceed
            </a>
          </div>

        <p>Thank you,<br>${prfData.company} Purchase System</p>
      </div>
    `,
  }),

  // Email for Receive By approvers
  receiveBy: (prfData) => ({
    subject: `[Notification] You are assigned to receive PRF #${prfData.prfNo}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">Purchase Request Form Receipt Assignment</h2>
        <p>Good Day!</p>
        <p>You have been assigned to <strong>receive</strong> items for a Purchase Request Form.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>PRF Number:</strong> ${prfData.prfNo}</p>
          <p><strong>Date:</strong> ${formatDate(prfData.prfDate)}</p>
          <p><strong>Prepared By:</strong> ${prfData.preparedBy}</p>
          <p><strong>Department Charge to:</strong> ${prfData.departmentCharge || prfData.departmentType || "Not specified"}</p>
          <p><strong>Company:</strong> ${prfData.company}</p>
          <p><strong>Checked By:</strong> ${prfData.CheckedByFullName || "N/A"}</p>
          <p><strong>Approved By:</strong> ${prfData.ApprovedByFullName || "N/A"}</p>
          <p><strong>Received By:</strong> ${prfData.ReceivedByFullName || "N/A"}</p>
        </div>

        <!-- Proceed Button (goes to Login page) -->
        <div style="text-align:center; margin: 25px 0;">
          <a 
          href="${process.env.APP_URL || "http://localhost:3000"}/?prfId=${prfData.prfId}&prfNo=${encodeURIComponent(prfData.prfNo)}&prfDate=${encodeURIComponent(prfData.prfDate || "")}&preparedBy=${encodeURIComponent(prfData.preparedBy || "")}&departmentCharge=${encodeURIComponent(prfData.departmentCharge || prfData.departmentType || "")}&checkedBy=${encodeURIComponent(prfData.CheckedByFullName || "")}&approvedBy=${encodeURIComponent(prfData.ApprovedByFullName || "")}&receivedBy=${encodeURIComponent(prfData.ReceivedByFullName || "")}&assignedAction=receive"            
          style="display: inline-block; background-color: #0078D7; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;"
          >
            Proceed
          </a>
        </div>

        <p>Thank you,<br>${prfData.company} Purchase System</p>
      </div>
    `,
  }),

  // Email to preparedBy when PRF is checked
  prfChecked: (prfData) => ({
    subject: `[Update] Your PRF #${prfData.prfNo} has been checked`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #27AE60;">Your PRF has been Checked</h2>
        <p>Good Day ${prfData.preparedBy}!</p>
        <p>Your Purchase Request Form has been <strong>checked</strong> and is now awaiting approval.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>PRF Number:</strong> ${prfData.prfNo}</p>
          <p><strong>Status:</strong> Checked - Pending Approval</p>
          <p><strong>Checked By:</strong> ${prfData.CheckedByFullName || "N/A"}</p>
          <p><strong>Next Step:</strong> Approval by ${prfData.ApprovedByFullName || "N/A"}</p>
        </div>
        <p>Thank you,<br>${prfData.company} Purchase System</p>
      </div>
    `,
  }),

  // Email to preparedBy when PRF is approved
  prfApproved: (prfData) => ({
    subject: `[Update] Your PRF #${prfData.prfNo} has been approved`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #27AE60;">Your PRF has been Approved</h2>
        <p>Good Day ${prfData.preparedBy}!</p>
        <p>Your Purchase Request Form has been <strong>approved</strong> and is now awaiting receipt.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>PRF Number:</strong> ${prfData.prfNo}</p>
          <p><strong>Status:</strong> Approved - Pending Receipt</p>
          <p><strong>Approved By:</strong> ${prfData.ApprovedByFullName || "N/A"}</p>
          <p><strong>Next Step:</strong> Receipt by ${prfData.ReceivedByFullName || "N/A"}</p>
        </div>
        <p>Thank you,<br>${prfData.company} Purchase System</p>
      </div>
    `,
  }),

  // Email to preparedBy when PRF is received
  prfReceived: (prfData) => ({
    subject: `[Complete] Your PRF #${prfData.prfNo} has been received`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #27AE60;">Your PRF has been Received - Complete!</h2>
        <p>Good Day ${prfData.preparedBy}!</p>
        <p>Your Purchase Request Form has been <strong>received</strong>. The process is now complete.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>PRF Number:</strong> ${prfData.prfNo}</p>
          <p><strong>Status:</strong> Complete</p>
          <p><strong>Received By:</strong> ${prfData.ReceivedByFullName || "N/A"}</p>
          <p><strong>Final Status:</strong> Successfully Processed</p>
        </div>
        <p>Thank you,<br>${prfData.company} Purchase System</p>
      </div>
    `,
  }),

  // Email to preparedBy when PRF is rejected
  prfRejected: (prfData) => ({
    subject: `[Action Required] Your PRF #${prfData.prfNo} has been rejected - Please review`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 0; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);">
        <!-- Header Section -->
        <div style="background: linear-gradient(135deg, #E74C3C 0%, #C0392B 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
          <h2 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">PRF Has Been Rejected</h2>
           <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Action Required - Please Review Feedback</p>
        </div>

        <!-- Main Content -->
        <div style="background: white; padding: 30px 20px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <p style="color: #2C3E50; font-size: 16px; margin: 0 0 20px 0;">Good Day ${prfData.preparedBy},</p>

          <p style="color: #34495E; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
            Unfortunately, your Purchase Request Form has been <strong>rejected</strong> and requires your attention. Please review the feedback below.
          </p>

          <!-- PRF Details Card -->
          <div style="background: #F8F9FA; border-left: 4px solid #E74C3C; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 8px 0; color: #2C3E50;">
              <strong style="color: #34495E;">PRF Number:</strong> <span style="font-size: 16px; font-weight: 600; color: #E74C3C;">${prfData.prfNo}</span>
            </p>
            <p style="margin: 8px 0; color: #34495E;">
              <strong>Rejected By:</strong> ${prfData.rejectedByFullName || "N/A"}
            </p>
            <p style="margin: 8px 0; color: #34495E;">
              <strong>Status:</strong> <span style="background: #FFE5E5; color: #C0392B; padding: 3px 8px; border-radius: 3px; font-weight: 600;">REJECTED</span>
            </p>
          </div>

          <!-- Rejection Reason Section -->
          <div style="background: #FFF3CD; border: 1px solid #FFE8A1; border-left: 4px solid #F39C12; padding: 18px; margin: 25px 0; border-radius: 4px;">
            <p style="margin: 0 0 10px 0; color: #856404; font-weight: 600; font-size: 14px;">
              📝 REASON FOR REJECTION:
            </p>
            <div style="background: white; padding: 12px; border-radius: 3px; border-left: 3px solid #E74C3C;">
              <p style="margin: 0; color: #2C3E50; font-size: 15px; line-height: 1.6; white-space: pre-wrap; word-break: break-word;">
                ${prfData.rejectionReason || "No reason provided"}
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <p style="color: #7F8C8D; font-size: 13px; line-height: 1.6; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #ECF0F1;">
            If you have any questions or need assistance, please contact the Harold James Raid.<br>
            <strong>Best regards,</strong><br>
            ${prfData.company} Purchase Requisition System
          </p>
        </div>

        <!-- Footer Note -->
        <div style="background: #2C3E50; color: white; padding: 15px 20px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
          <p style="margin: 0;">This is an automated notification. Please do not reply to this email.</p>
        </div>

      </div>
    `,
  }),

  // Email to preparedBy when PRF is received
  prfReceived: (prfData) => ({
    subject: `✓ ${prfData.stockName} Successfully Delivered - PRF #${prfData.prfNo}`,
    html: `
      <div style="font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 0; background-color: #f8f9fa;">

        <!-- Header Section with Success Gradient -->
        <div style="background: #308048; padding: 40px 30px; text-align: center; box-shadow: 0 4px 6px rgba(27, 158, 58, 0.15);">

          <div style="font-size: 56px; margin-bottom: 15px;">✓</div>

          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">${prfData.stockName}</h1>
           <!-- Subheading -->

          <p style="color: rgba(255,255,255,0.95); margin: 0; font-size: 18px; font-weight: 500; letter-spacing: 0.5px;">
            Successfully Delivered
          </p>
          
        </div>

        <!-- Main Content -->
        <div style="background: white; padding: 40px 30px;">
          <p style="color: #ffffff; font-size: 16px; margin: 0 0 25px 0; line-height: 1.6;">
            Hello <strong>${prfData.preparedBy}</strong>,
          </p>

          <p style="color: #ffffff; font-size: 15px; line-height: 1.8; margin: 0 0 30px 0;">
            Great news! Your Purchase Request Form for <strong>${prfData.stockName}</strong> has been <strong>successfully delivered</strong>.
          </p>

          <!-- Status Card -->
          <div style="background: linear-gradient(135deg, #E8F8F0 0%, #D4EFE6 100%); border-left: 5px solid #1B9E3A; padding: 25px; margin: 30px 0; border-radius: 6px; box-shadow: 0 2px 4px rgba(27, 158, 58, 0.1);">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px;">
              <div>
                <p style="margin: 0 0 5px 0; color: #ffffff; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">PRF Number</p>
                <p style="margin: 0; font-size: 20px; font-weight: 700; color: #1B9E3A;">${prfData.prfNo}</p>
              </div>
              <div>
                <p style="margin: 0 0 5px 0; color: #ffffff; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Item</p>
                <p style="margin: 0; font-size: 16px; font-weight: 700; color: #1B9E3A;">${prfData.stockName}</p>
              </div>
            </div>
          </div>

          <!-- Details Section -->
          <div style="margin: 30px 0;">
            <h3 style="color: #ffffff; font-size: 16px; font-weight: 600; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #ECF0F1;">Delivery Details</h3>
            
            <div style="background: #308048; padding: 20px; border-radius: 6px;">
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 3px 0; color: #ececec; font-size: 12px; font-weight: 600; text-transform: uppercase;">Item Name</p>
                <p style="margin: 0; color: #ffffff; font-size: 15px; font-weight: 600;">${prfData.stockName}</p>
              </div>

              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 3px 0; color: #ececec; font-size: 12px; font-weight: 600; text-transform: uppercase;">Prepared By</p>
                <p style="margin: 0; color: #ffffff; font-size: 15px;">${prfData.preparedBy}</p>
              </div>
              
              <div>
                <p style="margin: 0 0 3px 0; color: #ececec; font-size: 12px; font-weight: 600; text-transform: uppercase;">Date Received</p>
                <p style="margin: 0; color: #ffffff; font-size: 15px;">${formatDate(new Date().toISOString())}</p>
              </div>
            </div>

          </div>

          <!-- Footer -->
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ECF0F1;">
            <p style="color: #ffffff; font-size: 14px; line-height: 1.8; margin: 0 0 15px 0;">
              <strong>Best regards,</strong><br>
              ${prfData.company} Procurement Team<br>
              <span style="color: #007239; font-size: 12px;">Purchase Requisition System</span>
            </p>
          </div>

        </div>

        <!-- Footer Note -->
        <div style="background: #2C3E50; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0 0 8px 0;">This is an automated notification from your procurement system</p>
          <p style="margin: 0; color: rgba(255,255,255,0.7);">Please do not reply to this email. For assistance, contact your procurement department.</p>
        </div>


      </div>
    `,
  }),

}

// Function to send email with provided credentials
const sendEmail = async (to, template, prfData, senderEmail = null, smtpPassword = null) => {
  try {
    // Check if email address is valid 
    if (!to || !to.includes("@")) {
      console.error("Invalid email address:", to)
      return { success: false, error: "Invalid email address" }
    }

    console.log(`Sending ${template} email to ${to} with PRF data:`, prfData)

    // Test SMTP connection before sending
    const connectionTest = await testEmailConnection(senderEmail, smtpPassword)
    if (!connectionTest.success) {
      console.error("Email connection test failed:", connectionTest.error)
      return { success: false, error: `Connection failed: ${connectionTest.error}` }
    }

    // Get subject and HTML from selected template
    const { subject, html } = emailTemplates[template](prfData)

    // Email details
    const mailOptions = {
      from: senderEmail ? `PRF System <${senderEmail}>` : process.env.EMAIL_FROM,
      to,
      subject,
      html,
      replyTo: prfData.replyTo || senderEmail,
    }

    // Get transporter and send email
    const transport = getTransporter(senderEmail, smtpPassword)

    console.log(`Sending ${template} email to ${to} from ${mailOptions.from}`)
    const info = await transport.sendMail(mailOptions)

    console.log(`✅ Email sent to ${to}: ${info.messageId}`)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error(`❌ Error sending ${template} email to ${to}:`, error.message)

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

// Send emails to check, approve, receive users
const sendApprovalNotifications = async (
  approvalData,
  prfData,
  senderEmail = null,
  smtpPassword = null,
  notificationTypes = ["checkBy", "approveBy", "receiveBy"] // control which types get notifications
) => {
  const results = {
    checkBy: null,
    approveBy: null,
    receiveBy: null,
  };

  // Send email to CheckedBy user ONLY if "checkBy" is in notificationTypes
  if (notificationTypes.includes("checkBy") && approvalData.CheckedByEmail) {
    results.checkBy = await sendEmail(
      approvalData.CheckedByEmail,
      "checkBy",
      prfData,
      senderEmail,
      smtpPassword
    );
  }

  // Send email to ApprovedBy user ONLY if "approveBy" is in notificationTypes
  if (notificationTypes.includes("approveBy") && approvalData.ApprovedByEmail) {
    results.approveBy = await sendEmail(
      approvalData.ApprovedByEmail,
      "approveBy",
      prfData,
      senderEmail,
      smtpPassword
    );
  }

  // Send email to ReceivedBy user ONLY if "receiveBy" is in notificationTypes
  if (notificationTypes.includes("receiveBy") && approvalData.ReceivedByEmail) {
    results.receiveBy = await sendEmail(
      approvalData.ReceivedByEmail,
      "receiveBy",
      prfData,
      senderEmail,
      smtpPassword
    );
  }

  return results;
};

module.exports = {
  sendEmail,
  sendApprovalNotifications,
  initializeTransporter,
  testEmailConnection,
}
