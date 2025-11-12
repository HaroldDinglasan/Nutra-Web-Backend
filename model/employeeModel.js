
const { sql, poolPurchaseRequest, poolAVLI } = require("../connectionHelper/db")

// Kinukuha yung Fullname sa table ng SecuritySystemUser at HeadUsers
const getEmployees = async () => {
  try {
    const avliPool = await poolAVLI
    const purchasePool = await poolPurchaseRequest

    // Fetch from SecuritySystemUser
    const securityResult = await avliPool
      .request()
      .query("SELECT Oid, FullName FROM SecuritySystemUser WHERE IsActive = 1 ORDER BY FullName")

    // Fetch from HeadUsers
    const headUsersResult = await purchasePool
      .request()
      .query("SELECT headOid AS Oid, fullName AS FullName FROM HeadUsers ORDER BY fullName")

    // combination ng table Security System User at Head Users
    const combinedEmployees = [
      ...securityResult.recordset,
      ...headUsersResult.recordset.filter(
        (headUser) => !securityResult.recordset.some((secUser) => secUser.FullName === headUser.FullName),
      ),
    ]

    return combinedEmployees.sort((a, b) => a.FullName.localeCompare(b.FullName))
  } catch (error) {
    console.error("❌ Error fetching employees:", error)
    throw error
  }
}

// Kinukuha yung employee oid sa table ng SecuritySystemUser at HeadUsers
const getEmployeeByOid = async (oid) => {
  try {
    const avliPool = await poolAVLI
    const purchasePool = await poolPurchaseRequest

    // Try SecuritySystemUser first
    const avliResult = await avliPool
      .request()
      .input("Oid", sql.UniqueIdentifier, oid)
      .query("SELECT Oid, FullName FROM SecuritySystemUser WHERE Oid = @Oid")

    if (avliResult.recordset.length > 0) {
      return avliResult.recordset[0]
    }

    // If not found, try HeadUsers
    const headUsersResult = await purchasePool
      .request()
      .input("oid", sql.UniqueIdentifier, oid)
      .query("SELECT headOid AS Oid, fullName AS FullName FROM HeadUsers WHERE headOid = @oid")

    return headUsersResult.recordset[0] || null
  } catch (error) {
    console.error("❌ Error fetching employee by Oid:", error)
    throw error
  }
}

module.exports = { getEmployees, getEmployeeByOid }
