import pg from 'pg';
const { Pool } = pg;

class DatabaseConnectionHelperClass {
    constructor() {
        // 🚨 [จุดตายที่ 1: Trace ขาด]
        // Global Scope Init -> สร้าง Pool ตอนที่ยังไม่มี Trace ID
        console.log("🔥 [Helper] Global Constructor Init - Creating Pool Promise...");
        this.client = this.connect(); 
    }

    /*async connect() {
        // จำลอง delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log("🔌 [Helper] Pool Created (in Global Context)");
        return new Pool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
            ssl: { rejectUnauthorized: false },
            max: 2, // ⚠️ ตั้งน้อยๆ ให้เห็น Timeout เร็วๆ
            connectionTimeoutMillis: 2000
        });
    }*/

    // 1. Method execute (สำหรับ Transaction / Callback)
    async execute(callback) {

        const pool = new Pool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 2000
        })
        // const pool = await this.poolPromise;
        // const client = await this.client;
        
        const client = await pool.connect(); 
        console.log("🟢 [Helper: execute] Client acquired!");

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
            // 💀 [Connection Leak] Comment ทิ้งไว้เหมือนลูกค้า
            // client.release(); 
            console.warn("⚠️ [Leak] client.release() SKIPPED in execute!");
        }
    }

    // 2. Method query (เพิ่มอันนี้มาเพื่อให้ createUser ของคุณทำงานได้)
    async query(text, params) {
        const pool = await this.poolPromise;
        
        console.log("⏳ [Helper: query] Waiting for client...");
        const client = await pool.connect();
        console.log("🟢 [Helper: query] Client acquired!");

        try {
            // รัน Query ปกติ
            const result = await client.query(text, params);
            return result;
        } finally {
            // 💀 [Connection Leak] Comment ทิ้งไว้เช่นกัน
            // client.release();
            console.warn("⚠️ [Leak] client.release() SKIPPED in query!");
        }
    }
}

// ✅ Export ชื่อให้ตรงกับที่คุณใช้ใน userService
export const DBConnectionHelper = new DatabaseConnectionHelperClass();