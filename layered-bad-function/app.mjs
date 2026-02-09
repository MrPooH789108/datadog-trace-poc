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