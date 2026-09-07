import { app } from './app.js';
import dotenv from 'dotenv';
import path from 'path';

// 1. Capture original process.env.PORT before loading .env files
const systemPort = process.env.PORT;

dotenv.config();
try {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
} catch {}

if (typeof (global as any).PhusionPassenger !== 'undefined') {
  try {
    (global as any).PhusionPassenger.configure({ autoInstall: false });
  } catch {}
}

const isPassenger = typeof (process as any).env.PASSENGER_APP_ENV !== 'undefined' ||
                    typeof (global as any).PhusionPassenger !== 'undefined' ||
                    Boolean(process.cwd().includes('eduforge.haegl.in'));

// In cPanel Phusion Passenger / LiteSpeed:
// If systemPort is provided (socket path or port), use it.
// If not provided in Passenger, use 'passenger'.
// If local, use 4000.
const PORT = systemPort || (isPassenger ? 'passenger' : (process.env.PORT || 4000));

const server = app.listen(PORT, () => {
  console.log(`[EduForge Express Server] Running on ${typeof PORT === 'string' ? PORT : `port ${PORT}`}`);
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[EduForge Express Server] Port ${PORT} in use, binding to ephemeral port...`);
    app.listen(0);
  } else {
    console.error('[EduForge Express Server] Startup error:', err);
  }
});

export { app, server };
export default app;
