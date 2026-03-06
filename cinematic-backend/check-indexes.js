require("dotenv").config();
const { Sequelize } = require("sequelize");

const s = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD || "",
    { host: process.env.DB_HOST, dialect: "mysql", logging: false }
);

const TABLES = ["api_logs", "clients", "portfolios", "quotations", "services", "settings", "testimonials", "users"];

(async () => {
    await s.authenticate();
    console.log("Connected to:", process.env.DB_NAME);

    for (const table of TABLES) {
        const [rows] = await s.query(`SHOW INDEX FROM \`${table}\` WHERE Key_name != 'PRIMARY'`);
        const names = [...new Set(rows.map((r) => r.Key_name))];
        console.log(`\n${table}: ${names.length} extra index(es)`);
        if (names.length === 0) continue;
        for (const name of names) {
            await s.query(`ALTER TABLE \`${table}\` DROP INDEX \`${name}\``);
            console.log(`  Dropped: ${name}`);
        }
    }
    console.log("\nDone.");
    process.exit(0);
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
