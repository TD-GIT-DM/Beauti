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

/**
 * Ensure schema + base seed exist. Large aisle files (0004, 0006, 0007) are
 * intentionally NOT auto-applied via db.exec — they are too large / numerous
 * for a single D1 exec and 500s the Worker. Apply with wrangler / MCP instead:
 *   npm run db:migrate:local  |  npm run db:migrate:remote
 * If mac-ruby-woo is missing we no-op and keep serving the base catalog.
 */
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

  // Expanded catalog + real-image UPDATEs are applied via remote migrations /
  // MCP seeding — do not db.exec 0004, 0006, or 0007 here (too large → Worker 500).
  const expanded = await db.prepare("SELECT id FROM products WHERE id = ?").bind("mac-ruby-woo").first();
  if (!expanded) {
    console.log(
      "[beauti] expand catalog not applied yet (mac-ruby-woo missing); serving base catalog. Run npm run db:migrate:remote (0004 + 0006 + 0007).",
    );
    return;
  }

  const ruby = await db
    .prepare("SELECT image_url FROM products WHERE id = ?")
    .bind("mac-ruby-woo")
    .first<{ image_url: string }>();
  if (ruby?.image_url?.includes("1522337660859")) {
    await db.exec(executableSql(lipstickImagesSql));
  }
}
