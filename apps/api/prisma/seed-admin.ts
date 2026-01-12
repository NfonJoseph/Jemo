import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@jemo.cm";
  const password = "Gateway@12345";

  // Hash new password
  const passwordHash = await bcrypt.hash(password, 10);

  // Update admin user password
  const admin = await prisma.user.update({
    where: { email },
    data: { passwordHash },
  });

  console.log("✅ Admin password updated successfully!");
  console.log("   Email:", admin.email);
  console.log("   Role:", admin.role);
}

main()
  .catch((e) => {
    console.error("Error updating admin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
