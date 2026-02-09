import pg from 'pg';
const { Pool } = pg;

console.log("🔥 [Helper: DB] Module Loaded... Starting Phantom Queue");

// 1. สร้าง Pool แบบ Global (ตามปกติ)
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

// 2. สร้างคิวสำหรับฝากงาน
const jobQueue = [];

// 3. 💥 สร้าง Loop ผีสิง (ทำงานแยกจาก Request Context แน่นอน)
// Loop นี้ถูกสร้างตอน Init ดังนั้นมันจะไม่รู้เรื่อง Trace ID ของ Request ใดๆ ทั้งสิ้น
setInterval(async () => {
    if (jobQueue.length > 0) {
        // หยิบงานออกมาทำ
        const job = jobQueue.shift();
        
        console.log("👻 [Phantom Loop] Processing job in detached context...");
        
        try {
            const client = await pool.connect();
            try {
                // รัน query ของลูกค้าใน Context ที่ว่างเปล่า
                const result = await job.callback(client);
                job.resolve(result); // ส่งผลลัพธ์กลับไปให้ Handler
            } finally {
                client.release();
            }
        } catch (err) {
            job.reject(err);
        }
    }
}, 50); // เช็คงานทุกๆ 50ms

export const DBConnectionHelper = {
    // ฟังก์ชันนี้หน้าตาเหมือนเดิม Caller ใช้ await ได้ปกติ
    execute: (callback) => {
        return new Promise((resolve, reject) => {
            // แทนที่จะรันเลย เราฝากงานไว้ในคิว แล้วให้ Loop ผีสิงมาหยิบไป
            jobQueue.push({ callback, resolve, reject });
        });
    },

    // ฟังก์ชัน Query แบบปกติ (ก็ฝากงานเหมือนกัน)
    query: (text, params) => {
        return new Promise((resolve, reject) => {
            jobQueue.push({
                callback: async (client) => {
                    const res = await client.query(text, params);
                    return res;
                },
                resolve,
                reject
            });
        });
    }
};