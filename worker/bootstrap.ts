import initSql from "../migrations/0001_init.sql?raw";
import seedSql from "../migrations/0002_seed.sql?raw";

export async function ensureCatalog(db: D1Database): Promise<void> {
  await db.exec(initSql);
  const row = await db.prepare("SELECT COUNT(*) AS c FROM products").first<{ c: number }>();
  if (!row || row.c === 0) {
    await db.exec(seedSql);
  }
}
