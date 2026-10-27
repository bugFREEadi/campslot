import type { Database } from "./database.ts";
import { all, one } from "./database.ts";
import {
  AppError,
  interval,
  positiveInteger,
  textField,
  peakUsage,
  databaseError,
} from "./rules.ts";
import type {
  Equipment,
  Reservation,
  Maintenance,
  User,
  Availability,
} from "../types.ts";
export function requireAdmin(user: User) {
  if (user.role !== "admin")
    throw new AppError(403, "Administrator access is required.");
}
export async function equipmentById(
  db: Database,
  id: string,
): Promise<Equipment> {
  const row = await one<Equipment>(
    db,
    "SELECT * FROM equipment WHERE id=?",
    id,
  );
  if (!row) throw new AppError(404, "Equipment not found.");
  return row;
}
export async function availability(
  db: Database,
  id: string,
  start: number,
  end: number,
  now = Date.now(),
): Promise<Availability> {
  interval(start, end, now);
  const e = await equipmentById(db, id);
  const blocks = await all<Maintenance>(
    db,
    "SELECT * FROM maintenance WHERE equipment_id=? AND start_at<? AND end_at>?",
    id,
    end,
    start,
  );
  const loans = await all<Reservation>(
    db,
    "SELECT * FROM reservations WHERE equipment_id=? AND status IN ('RESERVED','ISSUED') AND CASE WHEN status='ISSUED' THEN MIN(start_at,issued_at) ELSE start_at END<? AND end_at>?",
    id,
    end,
    start,
  );
  const overdue = await one<{ quantity: number }>(
    db,
    "SELECT COALESCE(SUM(quantity),0) quantity FROM reservations WHERE equipment_id=? AND status='ISSUED' AND end_at<=?",
    id,
    now,
  );
  const peak = peakUsage(
    loans.map((r) => ({
      ...r,
      start_at:
        r.status === "ISSUED"
          ? Math.min(r.start_at, r.issued_at ?? r.start_at)
          : r.start_at,
    })),
    start,
    end,
  );
  return {
    available:
      !e.active || blocks.length || overdue?.quantity
        ? 0
        : Math.max(0, e.capacity - peak),
    capacity: e.capacity,
    peak,
    maintenance: blocks,
    overdue: overdue?.quantity ?? 0,
  };
}
export async function reserve(
  db: Database,
  user: User,
  input: Record<string, unknown>,
  now = Date.now(),
): Promise<{ reservation: Reservation; replayed: boolean }> {
  if (user.role !== "student")
    throw new AppError(403, "Use a student account to make a reservation.");
  const key = textField(input.requestKey, "Request key", 100);
  const equipmentId = textField(input.equipmentId, "Equipment", 100);
  const quantity = positiveInteger(input.quantity);
  const purpose = textField(input.purpose, "Purpose", 240);
  // Replay precedes time validation: an already successful request remains replayable later.
  const existing = await one<Reservation>(
    db,
    "SELECT * FROM reservations WHERE user_id=? AND request_key=?",
    user.id,
    key,
  );
  if (existing) {
    if (
      existing.equipment_id !== equipmentId ||
      existing.start_at !== input.startAt ||
      existing.end_at !== input.endAt ||
      existing.quantity !== quantity ||
      existing.purpose !== purpose
    )
      throw new AppError(
        409,
        "This request key belongs to a different reservation.",
      );
    return { reservation: existing, replayed: true };
  }
  const [start, end] = interval(input.startAt, input.endAt, now);
  await equipmentById(db, equipmentId);
  const id = crypto.randomUUID();
  try {
    await db
      .prepare(
        "INSERT INTO reservations (id,user_id,equipment_id,start_at,end_at,quantity,status,purpose,request_key,created_at,updated_by) VALUES (?,?,?,?,?,?,'RESERVED',?,?,?,?)",
      )
      .bind(
        id,
        user.id,
        equipmentId,
        start,
        end,
        quantity,
        purpose,
        key,
        now,
        user.id,
      )
      .run();
  } catch (e) {
    // A concurrent identical submission may have won the unique key.
    const winner = await one<Reservation>(
      db,
      "SELECT * FROM reservations WHERE user_id=? AND request_key=?",
      user.id,
      key,
    );
    if (winner) {
      if (
        winner.equipment_id !== equipmentId ||
        winner.start_at !== start ||
        winner.end_at !== end ||
        winner.quantity !== quantity ||
        winner.purpose !== purpose
      )
        throw new AppError(
          409,
          "This request key belongs to a different reservation.",
        );
      return { reservation: winner, replayed: true };
    }
    throw databaseError(e);
  }
  return {
    reservation: (await one<Reservation>(
      db,
      "SELECT * FROM reservations WHERE id=?",
      id,
    ))!,
    replayed: false,
  };
}
export async function getReservation(
  db: Database,
  user: User,
  id: string,
): Promise<Reservation> {
  const r = await one<Reservation>(
    db,
    `SELECT r.*, e.name equipment_name,e.location,u.name student_name FROM reservations r JOIN equipment e ON e.id=r.equipment_id JOIN users u ON u.id=r.user_id WHERE r.id=? ${user.role === "admin" ? "" : "AND r.user_id=?"}`,
    ...(user.role === "admin" ? [id] : [id, user.id]),
  );
  if (!r) throw new AppError(404, "Reservation not found.");
  return { ...r, overdue: r.status === "ISSUED" && r.end_at < Date.now() };
}
export async function listReservations(
  db: Database,
  user: User,
): Promise<Reservation[]> {
  const rows = await all<Reservation>(
    db,
    `SELECT r.*,e.name equipment_name,e.location,u.name student_name FROM reservations r JOIN equipment e ON e.id=r.equipment_id JOIN users u ON u.id=r.user_id ${user.role === "admin" ? "" : "WHERE r.user_id=?"} ORDER BY r.created_at DESC LIMIT 500`,
    ...(user.role === "admin" ? [] : [user.id]),
  );
  return rows.map((r) => ({
    ...r,
    overdue: r.status === "ISSUED" && r.end_at < Date.now(),
  }));
}
export async function transition(
  db: Database,
  user: User,
  id: string,
  action: unknown,
  now = Date.now(),
): Promise<Reservation> {
  const r = await getReservation(db, user, id);
  if (!["cancel", "issue", "return"].includes(String(action)))
    throw new AppError(400, "Unknown reservation action.");
  if (action !== "cancel") requireAdmin(user);
  const target =
    action === "cancel"
      ? "CANCELLED"
      : action === "issue"
        ? "ISSUED"
        : "RETURNED";
  // Retrying the same completed transition is safe, but never reopens a terminal state.
  if (r.status === target) return r;
  if (action === "cancel" && (r.status !== "RESERVED" || r.start_at <= now))
    throw new AppError(
      409,
      "Only reservations that have not started can be cancelled.",
    );
  if (
    action === "issue" &&
    (r.status !== "RESERVED" ||
      now < r.start_at - 15 * 60_000 ||
      now >= r.end_at)
  )
    throw new AppError(
      409,
      "Issue is allowed from 15 minutes before the start until the end time.",
    );
  if (action === "return" && r.status !== "ISSUED")
    throw new AppError(409, "Only issued equipment can be returned.");
  try {
    const result = await db
      .prepare(
        "UPDATE reservations SET status=?,issued_at=?,returned_at=?,updated_by=? WHERE id=? AND status=?",
      )
      .bind(
        target,
        action === "issue" ? now : r.issued_at,
        action === "return" ? now : r.returned_at,
        user.id,
        id,
        r.status,
      )
      .run();
    if (result.meta.changes === 0)
      throw new AppError(
        409,
        "The reservation changed. Refresh and try again.",
      );
  } catch (e) {
    throw databaseError(e);
  }
  return getReservation(db, user, id);
}
export async function saveEquipment(
  db: Database,
  user: User,
  input: Record<string, unknown>,
  id?: string,
): Promise<Equipment> {
  requireAdmin(user);
  const name = textField(input.name, "Name", 100),
    category = textField(input.category, "Category", 50),
    location = textField(input.location, "Location", 100),
    description = textField(input.description, "Description", 1200);
  const capacity = positiveInteger(input.capacity, "Capacity");
  if (input.active !== undefined && typeof input.active !== "boolean")
    throw new AppError(400, "Active must be true or false.");
  if (id) await equipmentById(db, id);
  const eid = id ?? crypto.randomUUID();
  try {
    if (id)
      await db
        .prepare(
          "UPDATE equipment SET name=?,category=?,location=?,description=?,capacity=?,active=? WHERE id=?",
        )
        .bind(
          name,
          category,
          location,
          description,
          capacity,
          input.active === false ? 0 : 1,
          id,
        )
        .run();
    else
      await db
        .prepare(
          "INSERT INTO equipment (id,name,category,location,description,capacity,active,created_at) VALUES (?,?,?,?,?,?,?,?)",
        )
        .bind(
          eid,
          name,
          category,
          location,
          description,
          capacity,
          input.active === false ? 0 : 1,
          Date.now(),
        )
        .run();
  } catch (e) {
    throw databaseError(e);
  }
  return equipmentById(db, eid);
}
export async function addMaintenance(
  db: Database,
  user: User,
  id: string,
  input: Record<string, unknown>,
): Promise<Maintenance> {
  requireAdmin(user);
  await equipmentById(db, id);
  const [start, end] = interval(input.startAt, input.endAt, Date.now(), true);
  const reason = textField(input.reason, "Maintenance reason", 240),
    mid = crypto.randomUUID();
  try {
    await db
      .prepare(
        "INSERT INTO maintenance (id,equipment_id,start_at,end_at,reason,created_by) VALUES (?,?,?,?,?,?)",
      )
      .bind(mid, id, start, end, reason, user.id)
      .run();
  } catch (e) {
    throw databaseError(e);
  }
  return (await one<Maintenance>(
    db,
    "SELECT * FROM maintenance WHERE id=?",
    mid,
  ))!;
}
