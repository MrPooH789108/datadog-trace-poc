import pg from 'pg';
const { Pool } = pg;

class DatabaseConnectionHelperClass {
    constructor() {
        console.log("🔥 [Helper] Global Constructor Init");
        // 🚨 [ตามภาพเป๊ะ] ลูกค้าใช้ชื่อตัวแปรนี้เก็บ Promise ของ Pool
        this.client = this.connect(); 
    }

    async connect() {
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log("🔌 [Helper] Pool Created");
        return new Pool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
            ssl: { rejectUnauthorized: false },
            max: 2, // ⚠️ ตั้งน้อยๆ ให้ Timeout ไวๆ
            connectionTimeoutMillis: 2000
        });
    }

    async execute(callback) {
        // =========================================================
        // 🛑 โหมดที่ 1: แบบ GLOBAL CONNECTION (แบบของลูกค้า)
        // =========================================================
        /*
        console.log("⚠️ [Mode] Running in GLOBAL CONNECTION mode");
        
        // --- global connection ---
        // 🚨 [หายนะเรื่องชื่อ] เอา local variable ชื่อ client มารับก้อน Pool!
        const client = await this.client; 
        
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
            // 💀 ลูกค้าคอมเมนต์ทิ้ง เพราะถ้าเปิดมันจะ Error (Pool ไม่มี method release)
            // client.release(); 
            console.warn("⚠️ [Leak] client.release() SKIPPED!");
        }
        */


        // =========================================================
        // ✅ โหมดที่ 2: แบบ PER REQUEST (ที่ควรจะเป็น)
        // =========================================================
        // /*
        console.log("✅ [Mode] Running in PER REQUEST mode");
        
        // 🟢 เปลี่ยนมารับค่าจาก this.client ให้ตรงกับ Constructor
        const pool = await this.client; 
        
        // --- per request ---
        console.log("⏳ [Helper] Waiting for dedicated client...");
        const client = await pool.connect(); 
        console.log("🟢 [Helper] Dedicated Client acquired!");

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
            console.log("🔓 [Helper] Client successfully released back to pool.");
        }
        // */
    }
}

export const DBConnectionHelper = new DatabaseConnectionHelperClass();