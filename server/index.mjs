import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import pg from 'pg';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = Number(process.env.PORT || 3001);
const clientOrigin = process.env.CLIENT_ORIGIN || true;
const distPath = join(__dirname, '..', 'dist');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'Attestatsiya-Robbit',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

app.use(cors({ origin: clientOrigin }));
app.use(express.json({ limit: '5mb' }));


async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id integer PRIMARY KEY DEFAULT 1,
      data jsonb NOT NULL DEFAULT '{}'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT app_state_single_row CHECK (id = 1)
    );
  `);
  await pool.query(`
    INSERT INTO app_state (id, data)
    VALUES (1, '{}'::jsonb)
    ON CONFLICT (id) DO NOTHING;
  `);
}

app.get('/api/health', async (_request, response) => {
  try {
    await pool.query('SELECT 1');
    response.json({ ok: true, database: 'connected' });
  } catch (error) {
    response.status(500).json({ ok: false, database: 'error', message: error.message });
  }
});

app.get('/api/app-state', async (_request, response) => {
  try {
    const result = await pool.query('SELECT data, updated_at FROM app_state WHERE id = 1');
    response.json(result.rows[0] || { data: {}, updated_at: null });
  } catch (error) {
    response.status(500).json({ message: error.message });
  }
});

function mergeMessages(existingMessages = [], incomingMessages = []) {
  const messages = new Map();
  for (const message of existingMessages) {
    if (message?.id) messages.set(message.id, message);
  }
  for (const message of incomingMessages) {
    if (message?.id) messages.set(message.id, { ...messages.get(message.id), ...message });
  }
  return [...messages.values()].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
}

function mergeStudentState(currentData, incomingData, actorEmail) {
  const email = String(actorEmail || '').trim().toLowerCase();
  if (!email) return currentData;

  const incomingUser = incomingData.users?.[email];
  return {
    ...currentData,
    users: {
      ...(currentData.users || {}),
      ...(incomingUser ? { [email]: incomingUser } : {}),
    },
    messages: mergeMessages(currentData.messages, incomingData.messages),
  };
}

app.put('/api/app-state', async (request, response) => {
  try {
    const data = request.body?.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      response.status(400).json({ message: 'data object is required' });
      return;
    }

    const actorRole = request.body?.actorRole || request.body?.actor?.role;
    const actorEmail = request.body?.actorEmail || request.body?.actor?.email;
    const current = await pool.query('SELECT data FROM app_state WHERE id = 1');
    const currentData = current.rows[0]?.data || {};
    const nextData = actorRole === 'admin' || !actorRole
      ? data
      : mergeStudentState(currentData, data, actorEmail);

    const result = await pool.query(
      `UPDATE app_state
       SET data = $1::jsonb, updated_at = now()
       WHERE id = 1
       RETURNING data, updated_at`,
      [JSON.stringify(nextData)],
    );

    response.json(result.rows[0]);
  } catch (error) {
    response.status(500).json({ message: error.message });
  }
});

app.use(express.static(distPath));
app.get('*', (_request, response) => {
  response.sendFile(join(distPath, 'index.html'));
});

ensureSchema()
  .then(() => {
    const server = app.listen(port, () => {
      console.log(`API server running on http://localhost:${port}`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} band. Oldingi serverni to'xtating yoki .env ichida boshqa PORT yozing.`);
        process.exit(1);
      }

      console.error('Failed to start API server:', error.message);
      process.exit(1);
    });
  })
  .catch((error) => {
    console.error('Failed to start API server:', error.message);
    process.exit(1);
  });
