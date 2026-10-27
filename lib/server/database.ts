export interface Result<T = Record<string, unknown>> {
  results: T[];
  meta: { changes: number };
}
export interface Statement {
  bind(...values: unknown[]): Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<Result<T>>;
  run(): Promise<Result>;
}
export interface Database {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<Result[]>;
}
export async function all<T>(
  db: Database,
  sql: string,
  ...values: unknown[]
): Promise<T[]> {
  return (
    await db
      .prepare(sql)
      .bind(...values)
      .all<T>()
  ).results;
}
export async function one<T>(
  db: Database,
  sql: string,
  ...values: unknown[]
): Promise<T | null> {
  return db
    .prepare(sql)
    .bind(...values)
    .first<T>();
}
