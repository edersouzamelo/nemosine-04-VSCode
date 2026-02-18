require('dotenv').config();

console.log("Checking Environment Variables...");
console.log("AUTH_SECRET:", process.env.AUTH_SECRET ? "LOADED (Length: " + process.env.AUTH_SECRET.length + ")" : "MISSING");
console.log("AUTH_RESEND_KEY:", process.env.AUTH_RESEND_KEY ? "LOADED (Starts with: " + process.env.AUTH_RESEND_KEY.substring(0, 5) + ")" : "MISSING");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "LOADED" : "MISSING");

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDb() {
    try {
        console.log("Attempting DB connection...");
        await prisma.$connect();
        console.log("DB Connection SUCCESS");
        const userCount = await prisma.user.count();
        console.log("User count:", userCount);
    } catch (e) {
        console.error("DB Connection FAILED:", e);
    } finally {
        await prisma.$disconnect();
    }
}

checkDb();
