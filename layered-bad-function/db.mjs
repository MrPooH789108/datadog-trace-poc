import pg from 'pg';
import { EventEmitter } from 'events'; // ใช้ Native Module
const { Pool } = pg;

console.log("🔥 [Helper: DB] Global Init - Registering Event Listener");

const poolInstance = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

// สร้าง Event Bus ในระดับ Global
const dbBus = new EventEmitter();

// 🚨 จุดสำคัญ: ลงทะเบียน Listener ไว้ตั้งแต่ตอนโหลดไฟล์ (Global Scope)
// ซึ่งในจังหวะนี้ Datadog ยังไม่ได้สร้าง Lambda Span
// ทำให้ Listener นี้อาจจะ "จำ" Context ที่ว่างเปล่าไว้
dbBus.on('execute_query', async (callback, resolve, reject) => {
    console.log("⚡ [Helper: DB] Event Received - Running Query in Global Listener Context");
    try {
        const client = await poolInstance.connect();
        try {
            const result = await callback(client);
            resolve(result);
        } finally {
            client.release();
        }
    } catch (err) {
        reject(err);
    }
});

export const DBConnectionHelper = {
    execute: (callback) => {
        // สร้าง Promise เพื่อให้ Handler ยัง await ได้ปกติเหมือนโค้ดลูกค้า
        return new Promise((resolve, reject) => {
            // สั่ง Emit Event เพื่อไปกระตุ้น Listener ที่สร้างไว้ข้างบน
            dbBus.emit('execute_query', callback, resolve, reject);
        });
    }
};