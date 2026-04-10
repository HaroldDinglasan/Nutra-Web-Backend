const getDbPool = require("../utils/getDbPool")

// ✅ Hidden project codes per company
const hiddenProjectCodes = {
    NTBI: [
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
    ],
    AVLI: [
        "CS-MANCOM",
        "PR-TMS",
        "PROJ-LT",
        "PROJ-LT 2024",
        "PROJ-ST 2024",
        "PROJ-LT 2025",
        "PROJ-LT 2026",
        "PROJ-ST",
        "PROJ-ST 2025",
        "PROJ-ST 2026",
        "SA-VNM",
        "SA-VNTNATL",
        "TS-TECH"
    ],
    APHI: [
        "PR-TMS",
        "PROJ-LT",
        "PROJ-LT 2024",
        "PROJ-ST 2024",
        "PROJ-LT 2025",
        "PROJ-LT 2026",
        "PROJ-ST",
        "PROJ-ST 2025",
        "PROJ-ST 2026",
        "SA-VNM",
        "SA-VTNATL",
        "SA-WV",
        "TECH-MIN",
        "CS-MANCOM"
    ]
};

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
                ORDER BY ProjectCode ASC
            `);

        let projectCodes = result.recordset;

        // ✅ Apply filtering based on company
        const hiddenCodes = hiddenProjectCodes[company] || [];

        projectCodes = projectCodes.filter(pc => 
            !hiddenCodes.includes(pc.ProjectCode)
        );

        return projectCodes;

    } catch (error) {
        console.error("❌ Error fetching Project Code List:", error);
        throw error;
    }
};

module.exports = { getProjectCodeList };