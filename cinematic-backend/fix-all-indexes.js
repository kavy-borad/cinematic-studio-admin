/**
 * fix-all-indexes.js
 * Drops ALL non-primary duplicate indexes on every table in the DB.
 * Run once: node fix-all-indexes.js
 */
require("dotenv").config();
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD || "",
    { host: process.env.DB_HOST, dialect: "mysql", logging: false }
);

(async () => {
    try {
        await sequelize.authenticate();
        console.log("✅ Connected to MySQL:", process.env.DB_NAME);

        // Get all tables
        const [tables] = await sequelize.query("SHOW TABLES");
        const tableNames = tables.map((row) => Object.values(row)[0]);
        console.log("📋 Tables found:", tableNames);

        for (const table of tableNames) {
            const [indexes] = await sequelize.query(
                `SHOW INDEX FROM \`${table}\` WHERE Key_name != 'PRIMARY'`
            );
            if (indexes.length === 0) {
                console.log(`  ✅ ${table}: no extra indexes`);
                continue;
            }
            const names = [...new Set(indexes.map((i) => i.Key_name))];
            console.log(`  ⚠️  ${table}: ${names.length} extra index(es) → ${names.join(", ")}`);
            for (const name of names) {
                await sequelize.query(
                    `ALTER TABLE \`${table}\` DROP INDEX \`${name}\``
                );
                console.log(`    🗑️  Dropped: ${name}`);
            }
        }

        console.log("\n🎉 All indexes cleaned! Restart the backend now.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err.message);
        process.exit(1);
    }
})();
