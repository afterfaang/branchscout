import { PrismaClient, Role } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database…");

  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-bank" },
    update: {},
    create: {
      name: "Demo Bank",
      slug: "demo-bank",
    },
  });

  const passwordHash = await argon2.hash("admin123!");

  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "admin@demo-bank.test" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "admin@demo-bank.test",
      name: "Demo Admin",
      role: Role.ADMIN,
      passwordHash,
    },
  });

  const region = await prisma.region.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "İstanbul Anadolu" } },
    update: {},
    create: { tenantId: tenant.id, name: "İstanbul Anadolu" },
  });

  await prisma.branch.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "KDK-001" } },
    update: {},
    create: {
      tenantId: tenant.id,
      regionId: region.id,
      code: "KDK-001",
      name: "Kadıköy Şubesi",
      address: "Bağdat Cd. No:123, Kadıköy, İstanbul",
    },
  });

  await prisma.branch.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "USK-002" } },
    update: {},
    create: {
      tenantId: tenant.id,
      regionId: region.id,
      code: "USK-002",
      name: "Üsküdar Şubesi",
      address: "Hakimiyet-i Milliye Cd. No:45, Üsküdar, İstanbul",
    },
  });

  console.log(`✓ Tenant: ${tenant.slug}`);
  console.log(`✓ Admin: ${admin.email} / admin123!`);
  console.log(`   totpEnabled=${admin.totpEnabled} (admin can opt-in via /auth/setup-totp)`);
  console.log(`✓ Region: ${region.name}`);
  console.log("✓ Branches: KDK-001, USK-002");
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
