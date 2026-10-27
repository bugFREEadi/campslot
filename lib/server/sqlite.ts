// Local/test adapter only. Production uses D1 with identical SQL and triggers.
import { DatabaseSync } from "node:sqlite";
import type { Database, Statement, Result } from "./database.ts";
export function sqliteAdapter(raw: DatabaseSync): Database {
  const runners = new WeakMap<Statement, () => Result>();
  function prepare(sql: string): Statement {
    let params: (string | number | null | Uint8Array)[] = [];
    const run = () => {
      const result = raw.prepare(sql).run(...params);
      return { results: [], meta: { changes: Number(result.changes) } };
    };
    const statement: Statement = {
      bind(...values: unknown[]) {
        params = values as typeof params;
        return statement;
      },
      async first<T>() {
        return (raw.prepare(sql).get(...params) ?? null) as T | null;
      },
      async all<T>() {
        return {
          results: raw.prepare(sql).all(...params) as T[],
          meta: { changes: 0 },
        };
      },
      async run() {
        return run();
      },
    };
    runners.set(statement, run);
    return statement;
  }
  return {
    prepare,
    async batch(statements: Statement[]): Promise<Result[]> {
      // Execute without yielding: another request cannot interleave this connection's transaction.
      raw.exec("BEGIN IMMEDIATE");
      try {
        const results = statements.map((statement) => {
          const run = runners.get(statement);
          if (!run) throw new Error("Statement belongs to another database.");
          return run();
        });
        raw.exec("COMMIT");
        return results;
      } catch (e) {
        raw.exec("ROLLBACK");
        throw e;
      }
    },
  };
}
