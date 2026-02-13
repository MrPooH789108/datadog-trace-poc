// ตรวจสอบว่า import มาจาก file ที่เราเพิ่งแก้ตะกี้
import { DBConnectionHelper } from './db.mjs'; 

export class UserService {
    static async processFlow() {
        console.log("🚀 [Service] Process Flow Start");

        // ✅ เรียก execute (Trace ขาด + Leak)
        const result = await DBConnectionHelper.execute(async (client) => {
            console.log("   -> Executing Query...");
            const res = await client.query('SELECT NOW() as now, pg_sleep(1)'); 
            return res.rows[0];
        });

        return result;
    }

    static async createUser(userData) {
        console.log("🚀 [Service] Creating User:", userData);
        
        const sql = 'INSERT INTO users(name, email) VALUES($1, $2) RETURNING *';
        const values = [userData.name, userData.email];

        try {
            // ✅ เรียก query (Trace ขาด + Leak)
            // ตอนนี้ db.mjs มี method นี้แล้ว ทำงานได้แน่นอน
            const result = await DBConnectionHelper.query(sql, values);
            return result.rows[0];
        } catch (error) {
            console.error("Error creating user:", error);
            throw error;
        }
    }
}