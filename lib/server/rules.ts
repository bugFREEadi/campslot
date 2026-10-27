export class AppError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export const DAY = 86_400_000;
export function interval(
  start: unknown,
  end: unknown,
  now = Date.now(),
  maintenance = false,
): [number, number] {
  if (
    typeof start !== "number" ||
    typeof end !== "number" ||
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end)
  )
    throw new AppError(400, "Choose valid start and end dates.");
  if (start < now) throw new AppError(400, "The start must be in the future.");
  if (end <= start) throw new AppError(400, "End must be after start.");
  if (end - start > (maintenance ? 30 : 7) * DAY)
    throw new AppError(
      400,
      `Choose a period of ${maintenance ? 30 : 7} days or less.`,
    );
  if (start > now + 90 * DAY)
    throw new AppError(400, "Bookings open 90 days in advance.");
  return [start, end];
}
export function positiveInteger(value: unknown, label = "Quantity"): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 100
  )
    throw new AppError(
      400,
      `${label} must be a whole number between 1 and 100.`,
    );
  return value;
}
export function textField(value: unknown, label: string, max = 300): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new AppError(400, `${label} is required (up to ${max} characters).`);
  return value.trim();
}
export function peakUsage(
  rows: { start_at: number; end_at: number; quantity: number }[],
  start: number,
  end: number,
): number {
  const events: [number, number][] = [];
  for (const r of rows)
    if (r.start_at < end && r.end_at > start) {
      events.push(
        [Math.max(start, r.start_at), r.quantity],
        [Math.min(end, r.end_at), -r.quantity],
      );
    }
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let current = 0,
    peak = 0;
  for (const [, delta] of events) {
    current += delta;
    peak = Math.max(peak, current);
  }
  return peak;
}
export function databaseError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("equipment_name_location"))
    return new AppError(
      409,
      "Equipment with this name already exists at this collection location. Refresh the inventory.",
    );
  if (message.includes("CAPACITY_CONFLICT"))
    return new AppError(
      409,
      "Not enough units are available for this action. Refresh, choose another time or request fewer units.",
    );
  if (message.includes("MAINTENANCE_CONFLICT"))
    return new AppError(
      409,
      "This period overlaps maintenance or an active reservation. Resolve the conflict first.",
    );
  if (message.includes("OVERDUE_CONFLICT"))
    return new AppError(
      409,
      "An overdue loan is blocking this equipment. Ask the lab desk to record its return.",
    );
  if (message.includes("INVENTORY_CONFLICT"))
    return new AppError(
      409,
      "Outstanding reservations prevent this inventory change. Resolve them first.",
    );
  if (message.includes("STATE_CONFLICT"))
    return new AppError(
      409,
      "That action is no longer allowed. Refresh the reservation.",
    );
  if (message.includes("INACTIVE"))
    return new AppError(
      409,
      "This equipment is archived and cannot be booked.",
    );
  if (message.includes("INVALID_INTERVAL"))
    return new AppError(
      400,
      "Choose a future interval within the booking limits.",
    );
  if (message.includes("SQLITE_BUSY") || message.includes("locked"))
    return new AppError(503, "The desk is busy. Please retry in a moment.");
  return new AppError(
    503,
    "The database is temporarily unavailable. Please retry.",
  );
}
