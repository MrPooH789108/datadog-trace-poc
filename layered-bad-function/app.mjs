import { UserService } from './userService.mjs';
// Import Helper เข้ามาเพื่อใช้ใน setupHandler 
// และเพื่อให้มั่นใจว่า Global Constructor ถูกรันแน่นอน
import { DBConnectionHelper } from './db.mjs';

console.log("🏁 [Handler] App Module Loaded (Global Scope Executed)");

// 1. GET Handler: ทดสอบ processFlow (เจอ Trace ขาด)
export const handler = async (event) => {
    console.log("🎯 [Handler] GET Invocation Started");

    try {
        // เรียกใช้ Service Logic
        // -> วิ่งไปเรียก DBConnectionHelper.execute
        // -> เจอ Trace ขาด + Connection Leak
        const data = await UserService.processFlow();
        
        return {
            statusCode: 200,
            body: JSON.stringify({ 
                message: "Simulated Customer Pattern (Handler -> Service -> Helper)",
                data: data 
            })
        };
    } catch (err) {
        console.error("💥 [Handler Error]", err);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ 
                error: err.message,
                hint: "Check if Connection Pool is exhausted (Timeout)?" 
            }) 
        };
    }
};

// 2. POST Handler: ทดสอบ createUser (เจอ Trace ขาด + Connection Leak)
export const postHandler = async (event) => {
    console.log("📥 [POST Handler] Received Request");

    try {
        // Parse Body (กันเหนียวเผื่อ body เป็น null)
        const body = event.body ? JSON.parse(event.body) : {};
        
        // Validate Input
        if (!body.name || !body.email) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Missing name or email" })
            };
        }

        // เรียก Service
        // -> วิ่งไปเรียก DBConnectionHelper.query
        // -> เจอ Trace ขาด + Connection Leak
        const newUser = await UserService.createUser(body);

        return {
            statusCode: 201, // Created
            body: JSON.stringify({
                message: "User created successfully",
                data: newUser
            })
        };

    } catch (err) {
        console.error("💥 [POST Error]", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                message: err.message,
                hint: "Did the DB timeout?"
            })
        };
    }
};

// 3. Setup Handler: สร้างตาราง (ใช้ DB Helper โดยตรง)
export const setupHandler = async (event) => {
    console.log("🛠️ [Setup] Creating Table...");

    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100),
            email VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;

    try {
        // เรียกใช้ Helper ตัวเดิมเพื่อรันคำสั่ง SQL
        // (Method query นี้เราเพิ่งเพิ่มเข้าไปใน db.mjs)
        await DBConnectionHelper.query(createTableSQL);
        
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Table 'users' created successfully!" })
        };
    } catch (err) {
        console.error("💥 [Setup Error]", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message })
        };
    }
};