import pg from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const { Pool } = pg;

// สร้าง Client สำหรับคุยกับ Secrets Manager (ใช้ Region ปัจจุบันของ Lambda)
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'ap-southeast-1' });

class DatabaseConnectionHelperClass {
    constructor() {
        console.log("🔥 [Helper] Global Constructor Init");
        // สร้าง Promise ของ Pool เก็บไว้ตั้งแต่ตอน Cold Start
        this.client = this.connect(); 
    }

    async connect() {
        // จำลอง delay ในการดึงค่าหรือเซ็ตอัป
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
            console.log("🔐 [Helper] กำลังดึงรหัสผ่านจาก AWS Secrets Manager...");
            
            // ดึงค่า Secret โดยใช้ชื่อ Secret จาก Environment Variable (ที่ตั้งใน template.yaml)
            const secretName = process.env.SECRET_NAME; 
            const response = await secretsClient.send(
                new GetSecretValueCommand({ SecretId: secretName, VersionStage: "AWSCURRENT" })
            );
            
            // แปลงค่า String ที่ได้มาให้เป็น JSON Object
            const secret = JSON.parse(response.SecretString);
            console.log("🔓 [Helper] ดึง Secret สำเร็จ!");

            console.log("🔌 [Helper] Pool Created");
            return new Pool({
                host: process.env.DB_HOST,
                user: secret.username,       // 👈 เปลี่ยนมาใช้ค่าจาก Secrets Manager
                password: secret.password,   // 👈 เปลี่ยนมาใช้ค่าจาก Secrets Manager
                database: process.env.DB_NAME,
                port: process.env.DB_PORT,
                ssl: { rejectUnauthorized: false },
                max: 2, // ตั้งไว้ 2 เพื่อเทส Connection เต็ม
                connectionTimeoutMillis: 2000
            });
        } catch (error) {
            console.error("❌ [Helper] Error fetching secret or creating pool:", error);
            throw error;
        }
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
            console.warn("⚠️ [Leak] client.release() SKIPPED in query!");
        }
    }
}

export const DBConnectionHelper = new DatabaseConnectionHelperClass();