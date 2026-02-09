// 👇 Import Service (ตัวจุดชนวน Import Chain)
import { UserService } from './userService.mjs';

console.log("🏁 [Handler] App Module Loaded");

export const handler = async (event) => {
    console.log("🎯 [Handler] Invocation Started (Trace ID available now)");

    try {
        // เรียกใช้ Service Logic
        const data = await UserService.processFlow();
        
        return {
            statusCode: 200,
            body: JSON.stringify({ 
                message: "Simulated Customer Pattern (Handler -> Service -> Helper)",
                data: data 
            })
        };
    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: err.message };
    }
};
export const postHandler = async (event) => {
    console.log("📥 [POST Handler] Received Request");

    try {
        // Parse Body
        const body = JSON.parse(event.body);
        
        // Validate Input นิดหน่อย
        if (!body.name || !body.email) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Missing name or email" })
            };
        }

        // เรียก Service
        const newUser = await UserService.createUser(body);

        return {
            statusCode: 201, // Created
            body: JSON.stringify({
                message: "User created successfully",
                data: newUser
            })
        };

    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: err.message })
        };
    }
};