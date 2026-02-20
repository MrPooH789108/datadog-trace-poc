import pg from 'pg';
const { Pool } = pg;

class DatabaseConnectionHelperClass {
    constructor() {
        console.log("🔥 [Helper] Global Constructor Init");
        // สร้าง Promise ของ Pool เก็บไว้ตั้งแต่ตอน Cold Start
        this.client = this.connect(); 
    }

    async connect() {
        // จำลอง delay ในการดึงค่าหรือเซ็ตอัป
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log("🔌 [Helper] Pool Created");
        return new Pool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
            ssl: { rejectUnauthorized: false },
            max: 2, // ตั้งไว้ 2 เพื่อเทส Connection เต็ม
            connectionTimeoutMillis: 2000
        });
    }

    async execute(callback) {
        // =========================================================
        // 🛑 โหมดที่ 1: แบบ GLOBAL CONNECTION (เปิดใช้งานอยู่)
        // จำลองบั๊กของลูกค้า: Trace ขาด + Transaction ไม่ล็อก
        // =========================================================
        console.log("⚠️ [Mode] Running in GLOBAL CONNECTION mode");
        
        // --- global connection ---
        const client = await this.client; 
        
        // --- per request ---
        // const client = await pool.connect();
        
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
            // client.release(); 
            console.warn("⚠️ [Leak] client.release() SKIPPED!");
        }

        // =========================================================
        // ✅ โหมดที่ 2: แบบ PER REQUEST (คอมเมนต์ปิดไว้)
        // =========================================================
        /*
        console.log("✅ [Mode] Running in PER REQUEST mode");
        
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
        */
    }

    async query(text, params) {
        // --- global connection ---
        const client = await this.client;
        
        // --- per request ---
        // const client = await pool.connect();

        try {
            const result = await client.query(text, params);
            return result;
        } finally {
            // --- per request ---
            // client.release();
        }
    }
}

export const DBConnectionHelper = new DatabaseConnectionHelperClass();