const mysql = require('mysql2/promise');
require('dotenv').config();

async function createDatabase() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
        });

        const dbName = process.env.DB_NAME || 'pixcel_db';
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        console.log(`✅ Database "${dbName}" created or already exists.`);
        
        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating database:', error.message);
        process.exit(1);
    }
}

createDatabase();
