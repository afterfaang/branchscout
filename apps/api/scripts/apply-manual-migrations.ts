// BranchScout — Manual migration uygulayıcı.
// Prisma'nın yönettiği migration'lardan ayrı olarak `prisma/migrations/manual/`
// altındaki .sql dosyalarını sırayla uygular. Idempotent SQL bekler.
//
// Kullanım:  pnpm --filter @branchscout/api db:migrate:manual

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

async function main() {
  const dir = join(__dirname, "..", "prisma", "migrations", "manual");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("Manual migration bulunamadı.");
    return;
  }

  console.log(`📂 ${files.length} manual migration uygulanacak:`);
  for (const file of files) {
    console.log(`  → ${file}`);
    const sql = readFileSync(join(dir, file), "utf-8");
    // Postgres çoklu statement desteği için $executeRawUnsafe.
    await prisma.$executeRawUnsafe(sql);
  }

  console.log("✓ Tüm manual migration'lar uygulandı.");
}

main()
  .catch((err) => {
    console.error("✗ Manual migration hatası:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
