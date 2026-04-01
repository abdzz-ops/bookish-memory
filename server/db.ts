import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

async function buildPool(): Promise<pg.Pool> {
  const supabaseUrl = process.env.SUPABASE_DB_URL;
  const fallback = process.env.DATABASE_URL;

  if (!supabaseUrl && !fallback) {
    throw new Error("No database connection found. Set SUPABASE_DB_URL or DATABASE_URL.");
  }

  const candidates: { label: string; url: string }[] = [];

  if (supabaseUrl) {
    try {
      const url = new URL(supabaseUrl);
      const host = url.hostname;
      const ref = host.startsWith("db.") ? host.split(".")[1] : null;
      const pass = url.password;

      if (ref) {
        const regions = [
          "aws-0-eu-central-1",
          "aws-0-us-east-1",
          "aws-0-us-west-1",
          "aws-0-ap-southeast-1",
          "aws-0-ap-northeast-1",
          "aws-0-eu-west-2",
          "aws-0-sa-east-1",
        ];

        for (const region of regions) {
          candidates.push({
            label: `pooler-txn-${region}`,
            url: `postgresql://postgres.${ref}:${pass}@${region}.pooler.supabase.com:6543/postgres`,
          });
          candidates.push({
            label: `pooler-session-${region}`,
            url: `postgresql://postgres.${ref}:${pass}@${region}.pooler.supabase.com:5432/postgres`,
          });
        }
      }

      candidates.push({ label: "direct", url: supabaseUrl });
    } catch {
      candidates.push({ label: "supabase-raw", url: supabaseUrl });
    }
  }

  if (fallback) {
    candidates.push({ label: "DATABASE_URL", url: fallback });
  }

  for (const { label, url } of candidates) {
    const testPool = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 8000,
    });

    try {
      const client = await testPool.connect();
      await client.query("SELECT 1");
      client.release();

      console.log(`[db] Connected successfully using: ${label}`);

      await testPool.end();
      const finalPool = new Pool({
        connectionString: url,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
      finalPool.on("error", (err) => console.error("[db] Pool error:", err.message));
      return finalPool;
    } catch (err: any) {
      console.warn(`[db] Candidate '${label}' failed: ${err.message}`);
      await testPool.end().catch(() => {});
    }
  }

  throw new Error("[db] All database connection attempts failed. Check SUPABASE_DB_URL credentials.");
}

let poolInstance: pg.Pool | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export const poolReady: Promise<pg.Pool> = buildPool().then((p) => {
  poolInstance = p;
  dbInstance = drizzle(p, { schema });
  console.log("[db] Using Supabase PostgreSQL as primary database (persistent).");
  return p;
});

export const pool = new Proxy({} as pg.Pool, {
  get(_target, prop) {
    if (!poolInstance) {
      throw new Error("[db] pool used before connection was established");
    }
    const val = (poolInstance as any)[prop];
    return typeof val === "function" ? val.bind(poolInstance) : val;
  },
});

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    if (!dbInstance) {
      throw new Error("[db] db used before connection was established");
    }
    const val = (dbInstance as any)[prop];
    return typeof val === "function" ? val.bind(dbInstance) : val;
  },
});
