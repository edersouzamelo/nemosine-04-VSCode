const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function resetPassword() {
  const email = process.env.ADMIN_EMAIL || "edersouzamelo@gmail.com";
  const newPassword = process.env.ADMIN_RESET_PASSWORD;

  if (!newPassword || newPassword.length < 8) {
    throw new Error("Set ADMIN_RESET_PASSWORD with at least 8 characters before running this script.");
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  const user = await prisma.user.update({
    where: { email },
    data: { password: hashed },
  });

  console.log("Senha atualizada com sucesso!");
  console.log("Email:", email);
  console.log("User ID:", user.id);

  await prisma.$disconnect();
}

resetPassword().catch(console.error);
