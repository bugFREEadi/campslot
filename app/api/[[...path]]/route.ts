import { env } from "cloudflare:workers";
import { handleApi } from "../../../lib/server/api";
import type { Database } from "../../../lib/server/database";
export const dynamic = "force-dynamic";
async function handler(request: Request) {
  if (!env.DB)
    return Response.json(
      { error: "Database binding is missing." },
      { status: 503 },
    );
  // Read from the primary so confirmations immediately observe their own writes.
  return handleApi(
    request,
    env.DB.withSession("first-primary") as unknown as Database,
  );
}
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
