import pg from 'pg';
const { Pool } = pg;

class DatabaseConnectionHelperClass {
    constructor() {
        console.log("🔥 [Helper] Global Constructor Init");
        // ลูกค้ายังคงคาค้างบรรทัดนี้ไว้
        this.client = this.connect(); 
    }

    async connect() {
        await new Promise(resolve => setTimeout(resolve, 100)); 
        console.log("🔌 [Helper] Global Pool Created (แต่ไม่ได้ใช้)");
        return new Pool({ /* ... config ... */ });
    }

    async execute(callback) {
        console.log("⚠️ [Helper] Creating a BRAND NEW POOL for execute! (ลูกค้าสไตล์)");
        
        // 🚨 สร้าง Pool ก้อนใหม่แกะกล่องสำหรับ Request นี้โดยเฉพาะ
        const pool = new Pool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
            ssl: { rejectUnauthorized: false },
            max: 2, 
            connectionTimeoutMillis: 2000
        });

        // --- global connection ---
        // const client = await this.client; 
        
        // --- per request ---
        console.log("⏳ [Helper: execute] Waiting for client from local pool...");
        const client = await pool.connect(); 
        console.log("🟢 [Helper: execute] Database Connected.");

        try {
            await client.query('BEGIN'); 
            const result = await callback(client); 
            await client.query('COMMIT'); 
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            // --- per request ---
            client.release(); 
            console.log("🔓 [Helper] Client released back to local pool.");
        }
    }

    // 🟢 เติมเมธอดนี้กลับมาแล้วครับ! /setup จะได้ทำงานได้
    async query(text, params) {
        console.log("⚠️ [Helper] Creating a BRAND NEW POOL for query! (ลูกค้าสไตล์)");
        
        // 🚨 สร้าง Pool ใหม่อีกก้อนนึงเลย (เพื่อให้เหมือนสไตล์ลูกค้าที่ทำ Per Request)
        const pool = new Pool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
            ssl: { rejectUnauthorized: false },
            max: 2, 
            connectionTimeoutMillis: 2000
        });

        console.log("⏳ [Helper: query] Waiting for client from local pool...");
        const client = await pool.connect();
        console.log("🟢 [Helper: query] Database Connected.");

        try {
            const result = await client.query(text, params);
            return result;
        } finally {
            client.release();
            console.log("🔓 [Helper] Client released back to local pool.");
        }
    }
}

export const DBConnectionHelper = new DatabaseConnectionHelperClass();