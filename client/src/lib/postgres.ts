import { Pool } from "pg";

const connectionString = process.env.PRODUCTION_DB_DSN;

if (!connectionString) {
  throw new Error("PRODUCTION_DB_DSN is not set");
}

type GlobalWithPg = typeof globalThis & {
  _pgPool?: Pool;
};

const globalForPg = globalThis as GlobalWithPg;

export const pgPool =
  globalForPg._pgPool ??
  new Pool({
    connectionString,
    max: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: connectionString.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg._pgPool = pgPool;
}