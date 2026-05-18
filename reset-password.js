const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function resetPassword() {
  const email = "edersouzamelo@gmail.com";
  const newPassword = "nemosine2026";

  const hashed = await bcrypt.hash(newPassword, 10);

  const user = await prisma.user.update({
    where: { email },
    data: { password: hashed },
  });

  console.log("Senha atualizada com sucesso!");
  console.log("Email:", email);
  console.log("Nova senha:", newPassword);
  console.log("User ID:", user.id);

  await prisma.$disconnect();
}

resetPassword().catch(console.error);
