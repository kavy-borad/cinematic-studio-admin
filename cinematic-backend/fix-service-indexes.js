/**
 * fix-service-indexes.js
 * Drops ALL non-primary indexes on the Services table so Sequelize
 * can sync cleanly. Run once: node fix-service-indexes.js
 */
require("dotenv").config();
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD || "",
    { host: process.env.DB_HOST, dialect: "mysql", logging: console.log }
);

(async () => {
    try {
        await sequelize.authenticate();
        console.log("✅ Connected to MySQL");

        // Get all indexes on Services table
        const [indexes] = await sequelize.query(
            "SHOW INDEX FROM Services WHERE Key_name != 'PRIMARY'"
        );

        if (indexes.length === 0) {
            console.log("✅ No extra indexes found on Services table.");
        } else {
            // Get unique index names
            const names = [...new Set(indexes.map((i) => i.Key_name))];
            console.log(`🗑️  Dropping ${names.length} index(es):`, names);

            for (const name of names) {
                await sequelize.query(
                    `ALTER TABLE Services DROP INDEX \`${name}\``
                );
                console.log("  ✅ Dropped:", name);
            }
        }

        console.log("🎉 Done! Now restart the backend.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err.message);
        process.exit(1);
    }
})();
