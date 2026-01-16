import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const phone = "+237676858216";
  const email = "admin@jemo.cm";
  const password = "Gateway@12345";
  const name = "Admin";

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create or update admin user
  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      phone,
      passwordHash,
      role: "ADMIN",
      name,
    },
    create: {
      email,
      phone,
      passwordHash,
      name,
      role: "ADMIN",
    },
  });

  console.log("✅ Admin user created/updated successfully!");
  console.log("   Name:", admin.name);
  console.log("   Email:", admin.email);
  console.log("   Phone:", admin.phone);
  console.log("   Role:", admin.role);
  console.log("");
  console.log("   Login with:");
  console.log("   Phone: 676858216 (or +237676858216)");
  console.log("   Password: Gateway@12345");
}

main()
  .catch((e) => {
    console.error("❌ Error creating admin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
