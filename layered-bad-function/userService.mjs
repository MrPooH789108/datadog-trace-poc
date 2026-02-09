import { DBConnectionHelper } from './db.mjs';

export class UserService {
    static async processFlow() {
        console.log("🚀 [Service] Process Flow Start");

        // ✅ มี await ครบถ้วน เหมือน Code ลูกค้า
        // แต่เพราะไส้ใน DBConnectionHelper เราวางยาเรื่อง Promise ไว้
        // Trace ของ DB Query ข้างในมักจะหลุดจาก Main Trace
        const result = await DBConnectionHelper.execute(async (client) => {
            console.log("   -> Executing Query...");
            // Query นี้จะกลายเป็น Disconnected Span
            const res = await client.query('SELECT NOW(), pg_sleep(1)'); 
            return res.rows[0];
        });

        return result;
    }
}