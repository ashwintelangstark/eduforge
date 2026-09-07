import mysql, { Pool, PoolOptions } from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// 1. Load environment variables from process.cwd() or parent directories
dotenv.config();
const potentialEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'apps', 'server', '.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(process.cwd(), '../../.env')
];

for (const envPath of potentialEnvPaths) {
  if (fs.existsSync(envPath)) {
    try {
      dotenv.config({ path: envPath });
    } catch {}
  }
}

// 2. Intelligent Default Resolution (Production cPanel vs Local Development)
const isProduction = process.env.NODE_ENV === 'production' || 
                     Boolean(process.env.PASSENGER_APP_ENV) || 
                     Boolean(process.cwd().includes('eduforge.haegl.in'));

// Primary credentials
const dbHost = process.env.DB_HOST || (isProduction ? '127.0.0.1' : '127.0.0.1');
const dbPort = parseInt(process.env.DB_PORT || (isProduction ? '3306' : '3308'), 10);
const dbUser = process.env.DB_USER || (isProduction ? 'agrikart_EduForge_user' : 'root');
const dbPassword = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : (isProduction ? 'EduForge@2026' : '');
const dbName = process.env.DB_NAME || (isProduction ? 'agrikart_EduForge_db' : 'eduforge');

// Create connection candidates (127.0.0.1:3306, localhost, and Unix socket)
function createPoolWithCandidate(): Pool {
  // Use 127.0.0.1 directly as primary to avoid IPv6 ::1 lookup delays on Linux
  const poolConfig: PoolOptions = {
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 8000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 5000
  };

  // If on Linux/cPanel and standard socket exists, allow socket fallback
  if (isProduction && fs.existsSync('/var/lib/mysql/mysql.sock')) {
    // Keep standard 127.0.0.1 first, socket ready if needed
  }

  return mysql.createPool(poolConfig);
}

let activePool: Pool = createPoolWithCandidate();

// Fallback pool creation if primary candidate encounters socket or connection refused
async function getWorkingPool(): Promise<Pool> {
  // First test activePool
  try {
    const conn = await activePool.getConnection();
    await conn.ping();
    conn.release();
    return activePool;
  } catch (primaryErr: any) {
    console.warn(`[MySQL Pool] Primary candidate (${dbHost}:${dbPort}) issue:`, primaryErr.message);
  }

  // Candidate 2: Try 127.0.0.1 with port 3306
  try {
    const p2 = mysql.createPool({
      host: '127.0.0.1',
      port: 3306,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      connectTimeout: 8000
    });
    const conn = await p2.getConnection();
    await conn.ping();
    conn.release();
    console.log('[MySQL Pool] Connected via 127.0.0.1:3306');
    activePool = p2;
    return activePool;
  } catch {}

  // Candidate 3: Try localhost
  try {
    const p3 = mysql.createPool({
      host: 'localhost',
      port: 3306,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      connectTimeout: 8000
    });
    const conn = await p3.getConnection();
    await conn.ping();
    conn.release();
    console.log('[MySQL Pool] Connected via localhost:3306');
    activePool = p3;
    return activePool;
  } catch {}

  // Candidate 4: Try standard cPanel Unix sockets
  for (const sock of ['/var/lib/mysql/mysql.sock', '/tmp/mysql.sock']) {
    if (fs.existsSync(sock)) {
      try {
        const pSock = mysql.createPool({
          socketPath: sock,
          user: dbUser,
          password: dbPassword,
          database: dbName,
          waitForConnections: true,
          connectionLimit: 10,
          connectTimeout: 8000
        });
        const conn = await pSock.getConnection();
        await conn.ping();
        conn.release();
        console.log(`[MySQL Pool] Connected via socket ${sock}`);
        activePool = pSock;
        return activePool;
      } catch {}
    }
  }

  return activePool;
}

// Proxied db export for automatic self-healing queries
export const db: Pool = new Proxy({} as Pool, {
  get(_target, prop: string | symbol) {
    if (prop === 'query' || prop === 'execute') {
      return async function (sql: any, values: any) {
        try {
          return await (activePool as any)[prop](sql, values);
        } catch (err: any) {
          const isConnErr = err.code === 'PROTOCOL_CONNECTION_LOST' ||
            err.code === 'ECONNRESET' ||
            err.code === 'ECONNREFUSED' ||
            err.code === 'ETIMEDOUT' ||
            err.code === 'EPIPE' ||
            err.code === 'ER_ACCESS_DENIED_ERROR';

          if (isConnErr) {
            console.warn(`[MySQL Resilient Pool] Query failed (${err.code}). Auto-reconnecting...`);
            const pool = await getWorkingPool();
            return await (pool as any)[prop](sql, values);
          }
          throw err;
        }
      };
    }

    if (prop === 'getConnection') {
      return async function () {
        try {
          return await activePool.getConnection();
        } catch (err: any) {
          console.warn(`[MySQL Resilient Pool] getConnection failed. Auto-reconnecting...`);
          const pool = await getWorkingPool();
          return await pool.getConnection();
        }
      };
    }

    return (activePool as any)[prop];
  }
});

// Initialize authentication schema verification in background
export async function initMysqlAuth() {
  try {
    const pool = await getWorkingPool();
    const conn = await pool.getConnection();
    try {
      const [cols]: any = await conn.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'user_profiles' AND COLUMN_NAME = 'password_hash'
      `, [dbName]);

      if (!cols || cols.length === 0) {
        await conn.query(`ALTER TABLE \`user_profiles\` ADD COLUMN \`password_hash\` VARCHAR(255) NULL AFTER \`email\``);
        console.log('[MySQL] Added password_hash column to user_profiles');
      }

      console.log(`[MySQL] ✅ Database Auth Ready on ${dbName}`);
    } finally {
      conn.release();
    }
  } catch (err: any) {
    console.error('[MySQL Connection Warning]:', err.message);
  }
}

export function getDbHealthInfo() {
  return {
    database: dbName,
    user: dbUser,
    host: dbHost,
    port: dbPort,
    isProduction
  };
}

// Auto-run init asynchronously in background so server starts listening immediately
setTimeout(() => {
  initMysqlAuth().catch(() => {});
}, 200);
