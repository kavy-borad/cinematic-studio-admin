const sequelize = require("./src/config/database");

async function checkBills() {
    try {
        await sequelize.authenticate();
        const [results] = await sequelize.query("SELECT * FROM Bills LIMIT 5");
        console.log("Bills in DB:", results.length);
        console.log(JSON.stringify(results, null, 2));
    } catch (e) { console.error(e); } finally { await sequelize.close(); }
}
checkBills();
