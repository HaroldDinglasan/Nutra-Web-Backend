const { sql, poolAVLI } = require("../connectionHelper/db");

// Get all Project Codes from Projects table
const getProjectCodeList = async () => {
    try {
        const pool = await poolAVLI;

        const result = await pool
            .request()
            .query(`
                SELECT
                    Id,
                    ProjectCode,
                    Description,
                    IsActive
                FROM [TEST_AVLI].[dbo].[Projects]
            `);

        return result.recordset;

    } catch (error) {
        console.error("❌ Error fetching Project Code List:", error);
        throw error;
    }
};

module.exports = { getProjectCodeList };