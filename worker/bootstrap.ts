import initSql from "../migrations/0001_init.sql?raw";
import seedSql from "../migrations/0002_seed.sql?raw";
import lipstickImagesSql from "../migrations/0005_lipstick_images.sql?raw";

/** D1 treats `?` as bind placeholders even inside db.exec strings. */
function stripUrlQueryParams(sql: string): string {
  return sql.replace(/(https:\/\/[^'\s]+?)\?[^'\s]*/g, "$1");
}

function executableSql(sql: string): string {
  return stripUrlQueryParams(
    sql
      .split("\n")
      .map((line) => line.replace(/--.*$/, "").trimEnd())
      .join("\n")
      .replace(/;\s*;/g, ";")
      .trim(),
  );
}

export async function ensureCatalog(db: D1Database): Promise<void> {
  try {
    await db.prepare("SELECT COUNT(*) AS c FROM products").first<{ c: number }>();
  } catch {
    await db.exec(executableSql(initSql));
  }

  const row = await db.prepare("SELECT COUNT(*) AS c FROM products").first<{ c: number }>();
  if (!row || row.c === 0) {
    await db.exec(executableSql(seedSql));
  }

  // Large expand migration is applied via remote D1 migrate / ops tooling.
  // Do not db.exec the full 0004 file here — it exceeds reliable D1 exec limits and 500s the API.

  const ruby = await db
    .prepare("SELECT image_url FROM products WHERE id = ?")
    .bind("mac-ruby-woo")
    .first<{ image_url: string }>();
  if (ruby?.image_url?.includes("1522337660859")) {
    await db.exec(executableSql(lipstickImagesSql));
  }
}
