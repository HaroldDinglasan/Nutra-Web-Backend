const { sql, poolPurchaseRequest } = require("../connectionHelper/db");

const savePRFDetails = async (prfDetailsArray) => {
    try {
        const pool = await poolPurchaseRequest;
        const table = new sql.Table("PRFTABLE_DETAILS");

        table.create = false;
        table.columns.add("PrfId", sql.UniqueIdentifier, { nullable: false });
        table.columns.add("StockId", sql.UniqueIdentifier, { nullable: false });
        table.columns.add("StockCode", sql.VarChar(250), { nullable: false });
        table.columns.add("StockName", sql.VarChar(sql.MAX), { nullable: false });
        table.columns.add("UOM", sql.VarChar(100), { nullable: false });
        table.columns.add("QTY", sql.Decimal(10,2), { nullable: false });
        table.columns.add("DateNeeded", sql.VarChar(250), { nullable: false });
        table.columns.add("Purpose", sql.VarChar(250), { nullable: false });
        table.columns.add("Description", sql.VarChar(250), { nullable: true });

        prfDetailsArray.forEach((detail) => {
            console.log("Saving PRF details with PrfId:", detail.prfId); // Log PrfId
            table.rows.add(
                detail.prfId,
                detail.stockId,
                detail.stockCode,
                detail.stockName,
                detail.uom,
                detail.qty,
                detail.dateNeeded,
                detail.purpose,
                detail.description
            );
        });

        const request = pool.request();
        await request.bulk(table);

        return { message: "Data saved successfully!" };
    } catch (error) {
        throw error;
    }
};

module.exports = { savePRFDetails };
