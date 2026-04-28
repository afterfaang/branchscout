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
    // Prisma'nın $executeRawUnsafe'i prepared statement kullanır ve tek bir
    // komut bekler. SQL dosyalarımızda birden çok statement var, bu yüzden
    // dosyayı bir transaction içinde, statement statement uygularız.
    // SQL'i naive bir şekilde `;` ile bölüyoruz; dosyalar idempotent olduğu
    // için DO $$...$$ blokları (semicolon içerir) için pseudo-aware bölme
    // yapıyoruz.
    const statements = splitSqlStatements(sql);
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (!trimmed) continue;
      // Skip only statements that are *entirely* comments (no executable SQL).
      const stripped = trimmed
        .replace(/--[^\n]*\n?/g, "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .trim();
      if (!stripped) continue;
      try {
        await prisma.$executeRawUnsafe(trimmed);
      } catch (err) {
        const msg = String((err as { meta?: { message?: string } }).meta?.message ?? err);
        // Idempotency: tolerate "already exists" / "does not exist" classes
        if (
          /already exists|duplicate object|does not exist/i.test(msg)
        ) {
          console.log(`    (skipped — ${msg.split("\n")[0]?.slice(0, 80)})`);
          continue;
        }
        throw err;
      }
    }
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

// Naive but `$$ ... $$`-aware SQL splitter. Postgres allows DO blocks and
// dollar-quoted strings; bunlar içinde `;` görmezden gelinmeli.
function splitSqlStatements(sql: string): string[] {
  const out: string[] = [];
  let buf = "";
  let i = 0;
  let inDollarTag: string | null = null;
  let inLineComment = false;
  let inBlockComment = false;
  while (i < sql.length) {
    const ch = sql[i];
    const next2 = sql.slice(i, i + 2);
    if (inLineComment) {
      buf += ch;
      if (ch === "\n") inLineComment = false;
      i++;
      continue;
    }
    if (inBlockComment) {
      buf += ch;
      if (next2 === "*/") {
        buf += sql[i + 1];
        i += 2;
        inBlockComment = false;
      } else {
        i++;
      }
      continue;
    }
    if (inDollarTag) {
      buf += ch;
      if (sql.slice(i, i + inDollarTag.length) === inDollarTag) {
        buf += sql.slice(i + 1, i + inDollarTag.length);
        i += inDollarTag.length;
        inDollarTag = null;
      } else {
        i++;
      }
      continue;
    }
    if (next2 === "--") {
      inLineComment = true;
      buf += ch;
      i++;
      continue;
    }
    if (next2 === "/*") {
      inBlockComment = true;
      buf += ch;
      i++;
      continue;
    }
    if (ch === "$") {
      const m = sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
      if (m) {
        inDollarTag = m[0];
        buf += m[0];
        i += m[0].length;
        continue;
      }
    }
    if (ch === ";") {
      out.push(buf);
      buf = "";
      i++;
      continue;
    }
    buf += ch;
    i++;
  }
  if (buf.trim().length > 0) out.push(buf);
  return out;
}
