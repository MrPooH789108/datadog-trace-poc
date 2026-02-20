import pg from 'pg';
const { Pool } = pg;

class DatabaseConnectionHelperClass {
    constructor() {
        console.log("🔥 [Helper] Global Constructor Init");
        // ลูกค้ายังคงคาค้างบรรทัดนี้ไว้ แม้จะไม่ได้ใช้ในโหมด Per Request ก็ตาม
        this.client = this.connect(); 
    }

    async connect() {
        await new Promise(resolve => setTimeout(resolve, 100)); 
        console.log("🔌 [Helper] Global Pool Created (แต่ไม่ได้ใช้ในโหมดนี้)");
        return new Pool({ /* ... config ... */ });
    }

    async execute(callback) {
        // =========================================================
        // ✅ เปิดใช้งานโหมด PER REQUEST จาก "ตัวแปร pool" (บรรทัด 119 ในรูป)
        // =========================================================
        console.log("⚠️ [Helper] Creating a BRAND NEW POOL for this specific request! (ลูกค้าสไตล์)");
        
        // นี่เลยครับ! ตัวแปร pool มาจากการ new ขึ้นมาใหม่ดื้อๆ ในเมธอดเลย
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
        // 🛑 (คอมเมนต์ปิดไว้ ตามรูปเป๊ะ)
        // const client = await this.client; 
        
        // --- per request ---
        console.log("⏳ [Helper: execute] Waiting for client from local pool...");
        // ✅ เปิดใช้งานบรรทัดที่คุณวงแดงไว้! มันจะดึงค่าจากตัวแปร pool ข้างบนนี้แหละ
        const client = await pool.connect(); 
        
        console.log("🟢 [Helper: execute] Database Connected.");

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
            // --- per request ---
            // ✅ เปิดใช้งานคืน Connection ให้ Local Pool
            client.release(); 
            console.log("🔓 [Helper] Client released back to local pool.");
            
            // 💀 หายนะที่แท้จริง: ลูกค้าแค่ release() คืน Connection... 
            // แต่ไม่ได้สั่ง pool.end() เพื่อทำลาย Pool ก้อนนี้ทิ้ง! 
            // ถ้ายิงมา 100 Request ก็จะมี Pool ค้างใน Memory 100 ก้อน (Memory Leak ชัวร์ๆ)
        }
    }
}

export const DBConnectionHelper = new DatabaseConnectionHelperClass();