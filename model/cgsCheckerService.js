const { sql, poolPurchaseRequest } = require("../connectionHelper/db");

//  Fetch the 3 fixed stock checkers from Users_Info table
// Names: Ryeanna Lois Campos, Regienel S. Regalado, Jazzlyn Villaruel

const getStockCheckersFromDB = async () => {
  try {
    const pool = await poolPurchaseRequest;

    // Fixed names of the 3 stock checkers
    const checkerNames = [
      "Ryeanna Lois Campos",
      "Regienel S. Regalado",
      "Jazzlyn Villaruel",
    ];

    // Query to fetch from Users_Info table
    const placeholders = checkerNames.map((_, i) => `@name${i}`).join(", ");
    let query = `
      SELECT fullName, outlookEmail 
      FROM Users_Info 
      WHERE fullName IN (${placeholders})
    `;

    const request = pool.request();
    checkerNames.forEach((name, i) => {
      request.input(`name${i}`, sql.NVarChar(255), name);
    });

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      console.warn("[v0] Stock checkers not found in Users_Info table");
      return [];
    }

    // Map results to recipient format
    const stockCheckers = result.recordset.map((user) => ({
      email: user.outlookEmail,
      name: user.fullName,
    }));

    console.log(`[v0] Fetched ${stockCheckers.length} stock checkers from database`);
    console.log("[v0] Stock checkers:", stockCheckers);

    return stockCheckers;
  } catch (error) {
    console.error("[v0] Error fetching stock checkers from database:", error);
    throw error;
  }
};

module.exports = { getStockCheckersFromDB };
