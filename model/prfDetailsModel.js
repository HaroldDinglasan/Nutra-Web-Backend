const { sql, poolPurchaseRequest } = require("../connectionHelper/db");

const savePRFDetails = async (prfId, stockId, stockCode, stockName, uom, qty, dateNeeded, purpose, description) => {
    try {
        const pool = await poolPurchaseRequest;
        const result = await pool.request()
            .input("PrfId", sql.UniqueIdentifier, prfId)
            .input("StockId", sql.UniqueIdentifier, stockId)
            .input("StockCode", sql.VarChar(250), stockCode)
            .input("StockName", sql.VarChar(sql.MAX), stockName)
            .input("UOM", sql.VarChar(100), uom)
            .input("QTY", sql.Int, qty)
            .input("DateNeeded", sql.VarChar(250), dateNeeded)
            .input("Purpose", sql.VarChar(250), purpose)
            .input("Description", sql.VarChar(250), description)
            .query(`
                INSERT INTO PRFTABLE_DETAILS (PrfId, StockId, StockCode, StockName, UOM, QTY, DateNeeded, Purpose, Description) 
                VALUES (@PrfId, @StockId, @StockCode, @StockName, @UOM, @QTY, @DateNeeded, @Purpose, @Description)
            `);

        return result;
    } catch (error) {
        throw error;
    }
};

module.exports = { savePRFDetails };
