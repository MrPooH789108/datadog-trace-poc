import pg from 'pg';
const { Pool } = pg;

// Global Scope Init (ตาม Pattern ที่เราทดสอบกัน)
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

export const DBConnectionHelper = {
    // ฟังก์ชันเดิมสำหรับ test trace
    execute: async (callback) => {
        const client = await pool.connect();
        try {
            return await callback(client);
        } finally {
            client.release();
        }
    },
    
    // ✅ เพิ่มฟังก์ชันนี้สำหรับรับ SQL + Params
    query: async (text, params) => {
        const start = Date.now();
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('executed query', { text, duration, rows: res.rowCount });
        return res;
    }
};