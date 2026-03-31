const getDbPool = require("../utils/getDbPool")

// Get all ACTIVE Project Codes from NTBI2
const getProjectCodeList = async (company) => {
    try {

        const pool = await getDbPool(company);

        const result = await pool
            .request()
            .query(`
                SELECT 
                    Id,
                    ProjectCode,
                    Description,
                    IsActive,
                    DivisionId,
                    OptimisticLockField,
                    CompanyName
                FROM Projects
                WHERE IsActive = 1
                AND ProjectCode NOT IN (
                    'PR-EXEC',
                    'PR-LUZ',
                    'PR-VISMIN',
                    'PROJ-LT',
                    'PROJ-LT 2025',
                    'PROJ-LT 2026',
                    'PROJ-LT-2024',
                    'PROJ-ST',
                    'PROJ-ST-2024',
                    'PROJ-ST-2025',
                    'PROJ-ST-2026'
                )
                ORDER BY ProjectCode ASC
            `);

        return result.recordset;

    } catch (error) {
        console.error("❌ Error fetching Project Code List:", error);
        throw error;
    }
};

module.exports = { getProjectCodeList };