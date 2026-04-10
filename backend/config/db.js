const { Pool } = require("pg");
require("dotenv").config();

const poolConfig = process.env.DATABASE_URL 
    ? { 
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
    };

if (process.env.DATABASE_URL) {
    console.log("📡 Using DATABASE_URL connection string (IPv4 Pooler)");
} else {
    console.log("🔗 Using individual DB_* variables (Direct Connection)");
}

const pool = new Pool(poolConfig);

// Test connection
pool.connect((err, client, release) => {
    if (err) {
        console.error("❌ Error connecting to PostgreSQL:", err.message);
    } else {
        console.log("✅ Connected to PostgreSQL successfully");
        release();
    }
});

module.exports = pool;
