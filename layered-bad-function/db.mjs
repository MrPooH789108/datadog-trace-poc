import pg from 'pg';
const { Pool } = pg;

class DatabaseConnectionHelperClass {
    constructor() {
        console.log("🔥 [Helper] Global Constructor Init");
        this.poolPromise = this.connect();
    }

    async connect() {
        console.log("🔌 [Helper] Pool Created");
        return new Pool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
            ssl: { rejectUnauthorized: false },
            max: 2,
            connectionTimeoutMillis: 2000
        });
    }

    async execute(callback) {
        const pool = await this.poolPromise;
        const client = await pool.connect();
        console.log("🟢 [Helper: execute] Dedicated client acquired.");

        try {
            console.log("🔄 [Transaction] BEGIN");
            await client.query('BEGIN'); 
            
            const result = await callback(client); 
            
            console.log("✅ [Transaction] COMMIT");
            await client.query('COMMIT'); 
            
            return result;
        } catch (error) {
            console.error("❌ [Transaction] ROLLBACK", error.message);
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
            console.log("🔓 [Helper: execute] Client released.");
        }
    }

    async query(text, params) {
        const pool = await this.poolPromise;
        return pool.query(text, params);
    }
}

export const DBConnectionHelper = new DatabaseConnectionHelperClass();