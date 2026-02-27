// Import database connection
const { sql, poolPurchaseRequest, poolAVLI } = require("../connectionHelper/db")

// Get all employees (SecuritySystemUser + HeadUsers)
const getEmployees = async () => {
  try {
    // Connect to both database
    const avliPool = await poolAVLI
    const purchasePool = await poolPurchaseRequest

    // Step 1: Get active employees from SecuritySystemUser
    const securityResult = await avliPool
      .request()
      .query(`
        SELECT Oid, FullName 
        FROM SecuritySystemUser 
        WHERE IsActive = 1 
        ORDER BY FullName
      `)

    // Step 2: Get employees from HeadUsers table
    const headUsersResult = await purchasePool
      .request()
      .query(`
        SELECT headOid AS Oid, 
        fullName AS FullName 
        FROM HeadUsers 
        ORDER BY fullName
      `)

    // Step 3: Combine both results
    // Avoid duplicate names (if already in SecuritySystemUser)
    const combinedEmployees = [
      ...securityResult.recordset,

      // Only add HeadUsers that are NOT already in SecuritySystemUser
      ...headUsersResult.recordset.filter(
        (headUser) => !securityResult.recordset.some((secUser) => secUser.FullName === headUser.FullName),
      ),
    ]

    // Step 4: Sort all employees alphabetically
    return combinedEmployees.sort((a, b) => a.FullName.localeCompare(b.FullName))
  } catch (error) {
    console.error("❌ Error fetching employees:", error)
    throw error
  }
}

// Get one employee using OID
const getEmployeeByOid = async (oid) => {
  try {
    const avliPool = await poolAVLI
    const purchasePool = await poolPurchaseRequest

    // Step 1: Try to find employee in SecuritySystemUser
    const avliResult = await avliPool
      .request()
      .input("Oid", sql.UniqueIdentifier, oid)
      .query(`
        SELECT Oid, FullName 
        FROM SecuritySystemUser 
        WHERE Oid = @Oid
      `)
    
    // If found in SecuritySystemUser, return it
    if (avliResult.recordset.length > 0) {
      return avliResult.recordset[0]
    }

    // Step 2: If not found, check HeadUsers table
    const headUsersResult = await purchasePool
      .request()
      .input("oid", sql.UniqueIdentifier, oid)
      .query(`
        SELECT headOid AS Oid, fullName 
        AS FullName 
        FROM HeadUsers 
        WHERE headOid = @oid
      `)

    return headUsersResult.recordset[0] || null
  } catch (error) {
    console.error("❌ Error fetching employee by Oid:", error)
    throw error
  }
}

module.exports = { getEmployees, getEmployeeByOid }
