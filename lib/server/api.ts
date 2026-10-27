import type { Database } from "./database.ts";
import { all, one } from "./database.ts";
import {
  sessionUser,
  login,
  cookie,
  checkMutation,
  tokenFromRequest,
  digest,
} from "./auth.ts";
import { AppError, databaseError } from "./rules.ts";
import {
  equipmentById,
  availability,
  reserve,
  getReservation,
  listReservations,
  transition,
  saveEquipment,
  addMaintenance,
  requireAdmin,
} from "./service.ts";
import { seedDemo } from "./seed.ts";
import type { Equipment, Maintenance } from "../types.ts";
function json(
  value: unknown,
  status = 200,
  extra: Record<string, string> = {},
) {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extra,
    },
  });
}
export async function handleApi(
  request: Request,
  db: Database,
): Promise<Response> {
  try {
    const url = new URL(request.url),
      path = url.pathname
        .replace(/^\/api\/?/, "")
        .split("/")
        .filter(Boolean),
      method = request.method;
    const mutation = !["GET", "HEAD"].includes(method);
    let body: Record<string, unknown> = {};
    if (mutation) {
      checkMutation(request);
      const raw = await request.text();
      if (raw.length > 16000) throw new AppError(413, "Request is too large.");
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || Array.isArray(parsed) || typeof parsed !== "object")
          throw new Error();
        body = parsed;
      } catch {
        throw new AppError(400, "Invalid JSON request.");
      }
    }
    if (path[0] === "health" && method === "GET") {
      await one(db, "SELECT 1");
      return json({ ok: true, application: "CampusSlot" });
    }
    if (path.join("/") === "auth/login" && method === "POST") {
      const result = await login(db, body.email, body.password);
      return json({ user: result.user }, 200, {
        "Set-Cookie": cookie(result.token, request),
      });
    }
    // A one-time demo bootstrap can only create the fixed, public fictional dataset.
    // It has no reset/delete operation and cannot elevate an existing account.
    if (path.join("/") === "demo/setup" && method === "POST") {
      const count = await one<{ count: number }>(
        db,
        "SELECT COUNT(*) count FROM users",
      );
      if (count?.count)
        throw new AppError(
          409,
          "Demo data is already initialized. Sign in using a demo account.",
        );
      return json(await seedDemo(db), 201);
    }
    const user = await sessionUser(db, request);
    if (path.join("/") === "auth/me" && method === "GET") return json({ user });
    if (!user) throw new AppError(401, "Sign in to continue.");
    if (path.join("/") === "auth/logout" && method === "POST") {
      const token = tokenFromRequest(request);
      if (token)
        await db
          .prepare("DELETE FROM sessions WHERE token_hash=?")
          .bind(await digest(token))
          .run();
      return json({ ok: true }, 200, {
        "Set-Cookie": cookie("", request, true),
      });
    }
    if (path[0] === "equipment") {
      if (path.length === 1 && method === "GET") {
        const q = (url.searchParams.get("q") ?? "").slice(0, 100),
          category = (url.searchParams.get("category") ?? "").slice(0, 50);
        const rows = await all<Equipment>(
          db,
          `SELECT * FROM equipment WHERE ${user.role === "admin" ? "1=1" : "active=1"} AND (name LIKE ? OR description LIKE ? OR location LIKE ?) AND (?='' OR category=?) ORDER BY active DESC,name`,
          ...Array(3).fill("%" + q + "%"),
          category,
          category,
        );
        return json({ equipment: rows });
      }
      if (path.length === 1 && method === "POST")
        return json({ equipment: await saveEquipment(db, user, body) }, 201);
      const id = path[1];
      if (path.length === 2 && method === "GET")
        return json({
          equipment: await equipmentById(db, id),
          maintenance: await all<Maintenance>(
            db,
            "SELECT * FROM maintenance WHERE equipment_id=? AND end_at>? ORDER BY start_at",
            id,
            Date.now(),
          ),
        });
      if (path.length === 2 && method === "PATCH")
        return json({ equipment: await saveEquipment(db, user, body, id) });
      if (path[2] === "availability" && method === "GET")
        return json(
          await availability(
            db,
            id,
            Number(url.searchParams.get("start")),
            Number(url.searchParams.get("end")),
          ),
        );
      if (path[2] === "maintenance" && method === "POST")
        return json(
          { maintenance: await addMaintenance(db, user, id, body) },
          201,
        );
    }
    if (path[0] === "maintenance" && path.length === 2 && method === "DELETE") {
      requireAdmin(user);
      const result = await db
        .prepare("DELETE FROM maintenance WHERE id=?")
        .bind(path[1])
        .run();
      if (!result.meta.changes)
        throw new AppError(404, "Maintenance period not found.");
      return json({ ok: true });
    }
    if (path[0] === "reservations") {
      if (path.length === 1 && method === "GET")
        return json({ reservations: await listReservations(db, user) });
      if (path.length === 1 && method === "POST") {
        const result = await reserve(db, user, body);
        return json(result, result.replayed ? 200 : 201);
      }
      if (path.length === 2 && method === "GET")
        return json({
          reservation: await getReservation(db, user, path[1]),
          events: await all(
            db,
            "SELECT a.action,a.at,u.name actor FROM audit a JOIN users u ON u.id=a.actor_id WHERE reservation_id=? ORDER BY a.id",
            path[1],
          ),
        });
      if (path.length === 2 && method === "PATCH")
        return json({
          reservation: await transition(db, user, path[1], body.action),
        });
    }
    throw new AppError(404, "Page or resource not found.");
  } catch (error) {
    const e = databaseError(error);
    if (!(error instanceof AppError))
      console.error(
        "CampusSlot request failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
    return json({ error: e.message }, e.status);
  }
}
