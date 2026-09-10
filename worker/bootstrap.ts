import initSql from "../migrations/0001_init.sql?raw";
import seedSql from "../migrations/0002_seed.sql?raw";

function executableSql(sql: string): string {
  return sql
    .split("\n")
    .map((line) => line.replace(/--.*$/, "").trimEnd())
    .join("\n")
    .replace(/;\s*;/g, ";")
    .trim();
}

export async function ensureCatalog(db: D1Database): Promise<void> {
  try {
    const row = await db.prepare("SELECT COUNT(*) AS c FROM products").first<{ c: number }>();
    if (row && row.c > 0) return;
  } catch {
    await db.exec(executableSql(initSql));
  }

  const row = await db.prepare("SELECT COUNT(*) AS c FROM products").first<{ c: number }>();
  if (!row || row.c === 0) {
    await db.exec(executableSql(seedSql));
  }
}
