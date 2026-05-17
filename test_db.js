const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Tentando conectar ao banco...");
        await prisma.$connect();
        console.log("Conexão com o banco estabelecida com sucesso!");
        const users = await prisma.user.findMany({ take: 1 });
        console.log("Busca de usuários funcionou:", users);
    } catch (e) {
        console.error("ERRO DE BANCO DE DADOS:", e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
