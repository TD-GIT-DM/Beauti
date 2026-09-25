import { entryFromRow, isListed, toPublicPreorder, type PreorderRow, type PublicPreorder } from "../src/lib/preorder";
import { accountScope, type AuthUser } from "./auth";

function sortComing(a: PublicPreorder, b: PublicPreorder): number {
  return a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name);
}

function sortDeals(a: PublicPreorder, b: PublicPreorder): number {
  const aStart = a.startsAt ?? "9999";
  const bStart = b.startsAt ?? "9999";
  return aStart.localeCompare(bStart) || a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name);
}

async function wishedIds(db: D1Database, deviceId: string | null, userId?: string | null): Promise<Set<string>> {
  if (userId) {
    const { results } = await db
      .prepare(`SELECT DISTINCT preorder_id FROM preorder_wishlist WHERE user_id = ? OR device_id = ?`)
      .bind(userId, deviceId ?? "")
      .all<{ preorder_id: string }>();
    return new Set((results ?? []).map((row) => row.preorder_id));
  }
  if (!deviceId) return new Set();
  const { results } = await db
    .prepare(`SELECT preorder_id FROM preorder_wishlist WHERE device_id = ?`)
    .bind(deviceId)
    .all<{ preorder_id: string }>();
  return new Set((results ?? []).map((row) => row.preorder_id));
}

export async function listPublicPreorders(
  db: D1Database,
  deviceId: string | null,
  userId: string | null,
  now = new Date(),
): Promise<{ upcomingDeals: PublicPreorder[]; comingSoon: PublicPreorder[] }> {
  const empty = { upcomingDeals: [] as PublicPreorder[], comingSoon: [] as PublicPreorder[] };
  let rows: PreorderRow[] = [];
  try {
    const queried = await db.prepare(`SELECT * FROM preorders WHERE status = 'upcoming'`).all<PreorderRow>();
    rows = queried.results ?? [];
  } catch {
    return empty;
  }
  let loved = new Set<string>();
  try {
    loved = await wishedIds(db, deviceId, userId);
  } catch {
    loved = new Set();
  }
  const nowMs = now.getTime();
  const upcomingDeals: PublicPreorder[] = [];
  const comingSoon: PublicPreorder[] = [];
  for (const row of rows) {
    const entry = entryFromRow(row);
    if (!entry) continue;
    const pub = toPublicPreorder(entry, loved.has(entry.id), nowMs);
    if (!pub) continue;
    if (pub.kind === "upcoming_deal") upcomingDeals.push(pub);
    else comingSoon.push(pub);
  }
  upcomingDeals.sort(sortDeals);
  comingSoon.sort(sortComing);
  return { upcomingDeals, comingSoon };
}

export async function wishedPreorderCards(
  db: D1Database,
  deviceId: string | null,
  userId: string | null,
  now = new Date(),
): Promise<PublicPreorder[]> {
  const { upcomingDeals, comingSoon } = await listPublicPreorders(db, deviceId, userId, now);
  return [...upcomingDeals, ...comingSoon].filter((item) => item.wishlisted);
}

async function preorderExists(db: D1Database, id: string, nowMs: number): Promise<boolean> {
  const row = await db.prepare(`SELECT * FROM preorders WHERE id = ?`).bind(id).first<PreorderRow>();
  if (!row) return false;
  const entry = entryFromRow(row);
  return Boolean(entry && isListed(entry, nowMs));
}

export async function setPreorderWish(
  db: D1Database,
  deviceId: string,
  user: AuthUser | null,
  preorderId: string,
  wished: boolean,
  now = new Date(),
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  let listed = false;
  try {
    listed = await preorderExists(db, preorderId, now.getTime());
  } catch {
    return { ok: false, status: 404, error: "Not found" };
  }
  if (!listed) return { ok: false, status: 404, error: "Not found" };
  const nowIso = now.toISOString();
  if (wished) {
    if (user) {
      await db.batch([
        db
          .prepare(
            `INSERT OR IGNORE INTO preorder_wishlist (device_id, preorder_id, user_id, created_at) VALUES (?, ?, ?, ?)`,
          )
          .bind(accountScope(user.id), preorderId, user.id, nowIso),
        db
          .prepare(
            `INSERT OR IGNORE INTO preorder_wishlist (device_id, preorder_id, user_id, created_at) VALUES (?, ?, ?, ?)`,
          )
          .bind(deviceId, preorderId, user.id, nowIso),
      ]);
    } else {
      await db
        .prepare(`INSERT OR IGNORE INTO preorder_wishlist (device_id, preorder_id, created_at) VALUES (?, ?, ?)`)
        .bind(deviceId, preorderId, nowIso)
        .run();
    }
    return { ok: true };
  }
  if (user) {
    await db
      .prepare(`DELETE FROM preorder_wishlist WHERE preorder_id = ? AND (user_id = ? OR device_id = ?)`)
      .bind(preorderId, user.id, deviceId)
      .run();
  } else {
    await db
      .prepare(`DELETE FROM preorder_wishlist WHERE device_id = ? AND preorder_id = ?`)
      .bind(deviceId, preorderId)
      .run();
  }
  return { ok: true };
}
