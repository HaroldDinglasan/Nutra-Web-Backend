const { poolNTBI2, poolAVLI, poolAPHI } = require("../connectionHelper/db")

const getDbPool = async (company) => {
    switch (company) {
        case "NTBI":
            return await poolNTBI2;
        
        case "AVLI":
            return await poolAVLI;

        case "APHI":
            return await poolAPHI;

        default:
            throw new Error("Invalid company selected");
    }
};

module.exports = getDbPool;