require("dotenv").config()
const { sendApprovalNotifications } = require("./lib/email-service")

// Test data
const approvalData = {
  CheckedByEmail: "test-checker@example.com", // Replace with real test email
  ApprovedByEmail: "test-approver@example.com", 
  ReceivedByEmail: "test-receiver@example.com", 
}

const prfData = {
  prfNo: "TEST-123",
  preparedBy: "Test User",
  company: "NutraTech Biopharma, Inc",
}

// Optional custom sender credentials
const senderEmail = process.argv[2] // First command line argument
const smtpPassword = process.argv[3] // Second command line argument

// Display configuration
console.log("Testing email notifications with:")
console.log(`PRF Number: ${prfData.prfNo}`)
console.log(`Prepared By: ${prfData.preparedBy}`)
console.log(`Company: ${prfData.company}`)
console.log(`Sender Email: ${senderEmail || "(using default from .env)"}`)
console.log("\nSending to:")
console.log(`CheckedBy: ${approvalData.CheckedByEmail}`)
console.log(`ApprovedBy: ${approvalData.ApprovedByEmail}`)
console.log(`ReceivedBy: ${approvalData.ReceivedByEmail}`)
console.log("\n")

// Send test notifications
async function sendTestNotifications() {
  try {
    console.log("Sending test notifications...")
    const results = await sendApprovalNotifications(approvalData, prfData, senderEmail, smtpPassword)

    console.log("\nResults:")
    console.log(JSON.stringify(results, null, 2))

    // Check if all emails were sent successfully
    const allSuccessful =
      results.checkBy?.success !== false && results.approveBy?.success !== false && results.receiveBy?.success !== false

    if (allSuccessful) {
      console.log("\n✅ All notifications sent successfully!")
    } else {
      console.log("\n❌ Some notifications failed. Check the results above.")
    }
  } catch (error) {
    console.error("Error sending test notifications:", error)
  }
}

// Run the test
sendTestNotifications()
