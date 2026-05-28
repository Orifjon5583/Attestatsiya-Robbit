import 'dotenv/config';
import crypto from 'node:crypto';
import { appendFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import express from 'express';
import pg from 'pg';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = Number(process.env.PORT || 3001);
const distPath = join(__dirname, '..', 'dist');
const isProduction = process.env.NODE_ENV === 'production';
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const jwtSecret = process.env.JWT_SECRET || 'dev-only-change-this-secret-before-production';
const sessionCookieName = 'attestatsiya_session';
const csrfCookieName = 'attestatsiya_csrf';
const trustProxy = process.env.TRUST_PROXY || (isProduction ? 'loopback' : '1');
const securityLogPath = process.env.SECURITY_LOG_PATH || join(__dirname, '..', 'security.log');
const failedLoginLimit = Number(process.env.FAILED_LOGIN_LIMIT || 5);
const failedLoginBanMs = Number(process.env.FAILED_LOGIN_BAN_MS || 15 * 60_000);
const apiRateWindowMs = Number(process.env.API_RATE_WINDOW_MS || 60_000);
const apiRateMax = Number(process.env.API_RATE_MAX || 180);
const apiRateBanMs = Number(process.env.API_RATE_BAN_MS || 5 * 60_000);
const codeExecutionTimeoutMs = Number(process.env.CODE_EXECUTION_TIMEOUT_MS || 2_000);
const codeOutputLimit = Number(process.env.CODE_OUTPUT_LIMIT || 10_000);
const codeBodyLimitBytes = Number(process.env.CODE_BODY_LIMIT_BYTES || 50 * 1024);
const codeRateWindowMs = Number(process.env.CODE_RATE_WINDOW_MS || 60_000);
const codeRateMax = Number(process.env.CODE_RATE_MAX || 20);
const codeRateBanMs = Number(process.env.CODE_RATE_BAN_MS || 15 * 60_000);
const codeRunner = process.env.CODE_RUNNER || 'process';
const codeDockerImage = process.env.CODE_DOCKER_IMAGE || 'python:3.12-alpine';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'Attestatsiya-Robbit',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

const defaultStudentEmail = 'em.sardor@gmail.com';
const initialStudentProfile = {
  fullName: 'Sardor Karimov',
  email: defaultStudentEmail,
  phone: '+998 90 123 45 67',
  birthDate: '15.01.2004',
  roleLabel: "O'quvchi",
};

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function parseTrustProxy(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(String(value))) return Number(value);
  return value;
}

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((part) => {
    const [key, ...rest] = part.trim().split('=');
    return [key, decodeURIComponent(rest.join('=') || '')];
  }).filter(([key]) => key));
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signToken(payload) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8 }));
  const signature = crypto.createHmac('sha256', jwtSecret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  const [header, body, signature] = String(token || '').split('.');
  if (!header || !body || !signature) return null;
  const expected = crypto.createHmac('sha256', jwtSecret).update(`${header}.${body}`).digest('base64url');
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function cookieOptions(httpOnly = true) {
  return [
    'Path=/',
    'SameSite=Strict',
    httpOnly ? 'HttpOnly' : '',
    isProduction ? 'Secure' : '',
    'Max-Age=28800',
  ].filter(Boolean).join('; ');
}

function setSessionCookies(response, user) {
  const csrfToken = crypto.randomBytes(24).toString('base64url');
  const token = signToken({ email: user.email, role: user.role, csrf: csrfToken });
  response.setHeader('Set-Cookie', [
    `${sessionCookieName}=${encodeURIComponent(token)}; ${cookieOptions(true)}`,
    `${csrfCookieName}=${encodeURIComponent(csrfToken)}; ${cookieOptions(false)}`,
  ]);
}

function clearSessionCookies(response) {
  response.setHeader('Set-Cookie', [
    `${sessionCookieName}=; Path=/; SameSite=Strict; HttpOnly; Max-Age=0`,
    `${csrfCookieName}=; Path=/; SameSite=Strict; Max-Age=0`,
  ]);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(String(password), salt, 64, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(`scrypt:${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

async function verifyPassword(password, storedHash) {
  const [scheme, salt, hash] = String(storedHash || '').split(':');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const nextHash = await hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(nextHash), Buffer.from(storedHash));
}

class MemorySecurityStore {
  constructor() {
    this.counters = new Map();
    this.blocks = new Map();
  }

  async increment(key, windowMs) {
    const now = Date.now();
    const current = this.counters.get(key) || { count: 0, resetAt: now + windowMs };
    if (current.resetAt < now) {
      current.count = 0;
      current.resetAt = now + windowMs;
    }
    current.count += 1;
    this.counters.set(key, current);
    return current;
  }

  async reset(key) {
    this.counters.delete(key);
  }

  async block(ip, reason, durationMs) {
    this.blocks.set(ip, { reason, blockedUntil: Date.now() + durationMs });
  }

  async getBlock(ip) {
    const block = this.blocks.get(ip);
    if (!block) return null;
    if (block.blockedUntil <= Date.now()) {
      this.blocks.delete(ip);
      return null;
    }
    return block;
  }
}

class RedisSecurityStore {
  constructor(client) {
    this.client = client;
  }

  async increment(key, windowMs) {
    const count = await this.client.incr(key);
    if (count === 1) await this.client.pExpire(key, windowMs);
    const ttl = await this.client.pTTL(key);
    return { count, resetAt: Date.now() + Math.max(ttl, 0) };
  }

  async reset(key) {
    await this.client.del(key);
  }

  async block(ip, reason, durationMs) {
    await this.client.set(`block:${ip}`, JSON.stringify({ reason, blockedUntil: Date.now() + durationMs }), {
      PX: durationMs,
    });
  }

  async getBlock(ip) {
    const raw = await this.client.get(`block:${ip}`);
    return raw ? JSON.parse(raw) : null;
  }
}

async function createSecurityStore() {
  if (!process.env.REDIS_URL) return new MemorySecurityStore();
  const { createClient } = await import('redis');
  const client = createClient({
    url: process.env.REDIS_URL,
    socket: {
      connectTimeout: 1500,
      reconnectStrategy: false,
    },
  });
  client.on('error', (error) => {
    writeSecurityLog('redis_error', {
      name: error.name,
      code: error.code,
      message: error.message || String(error),
    });
  });
  try {
    await client.connect();
    return new RedisSecurityStore(client);
  } catch (error) {
    await writeSecurityLog('redis_unavailable_fallback_memory', {
      redisUrl: process.env.REDIS_URL.replace(/\/\/.*@/, '//***@'),
      name: error.name,
      code: error.code,
      message: error.message || String(error),
    });
    try {
      await client.disconnect();
    } catch {
      // Ignore disconnect errors after a failed connection attempt.
    }
    return new MemorySecurityStore();
  }
}

let securityStore = new MemorySecurityStore();

function getClientIp(request) {
  const ip = request.ip || request.socket?.remoteAddress || 'unknown';
  return String(ip).replace(/^::ffff:/, '');
}

async function writeSecurityLog(event, details = {}) {
  const entry = {
    ts: new Date().toISOString(),
    event,
    ...details,
  };
  const line = `${JSON.stringify(entry)}\n`;
  console.warn('[security]', line.trim());
  try {
    await appendFile(securityLogPath, line, 'utf8');
  } catch {
    // Logging must never break request handling.
  }
}

function requestIpContext(request, _response, next) {
  request.clientIp = getClientIp(request);
  next();
}

function sendBlocked(response, block) {
  const retryAfterSeconds = Math.max(1, Math.ceil((block.blockedUntil - Date.now()) / 1000));
  response.setHeader('Retry-After', String(retryAfterSeconds));
  response.status(429).json({
    message: 'Too many requests. IP temporarily blocked.',
    retryAfterSeconds,
  });
}

function blockGuard() {
  return async (request, response, next) => {
    const block = await securityStore.getBlock(request.clientIp);
    if (block) {
      await writeSecurityLog('blocked_request', {
        ip: request.clientIp,
        method: request.method,
        path: request.path,
        reason: block.reason,
      });
      sendBlocked(response, block);
      return;
    }
    next();
  };
}

function rateLimit({ windowMs, max, banMs = 0, scope = 'api' }) {
  return async (request, response, next) => {
    const key = `rate:${scope}:${request.clientIp}`;
    const current = await securityStore.increment(key, windowMs);
    response.setHeader('RateLimit-Limit', String(max));
    response.setHeader('RateLimit-Remaining', String(Math.max(0, max - current.count)));
    response.setHeader('RateLimit-Reset', String(Math.ceil(current.resetAt / 1000)));
    if (current.count > max) {
      if (banMs > 0) {
        await securityStore.block(request.clientIp, `${scope}_rate_limit`, banMs);
        await writeSecurityLog('ip_banned_rate_limit', {
          ip: request.clientIp,
          path: request.path,
          scope,
          count: current.count,
          durationMs: banMs,
        });
        sendBlocked(response, { reason: `${scope}_rate_limit`, blockedUntil: Date.now() + banMs });
        return;
      }
      response.status(429).json({ message: 'Too many requests' });
      return;
    }
    next();
  };
}

async function recordFailedLogin(request, reason) {
  const key = `login_fail:${request.clientIp}`;
  const current = await securityStore.increment(key, failedLoginBanMs);
  await writeSecurityLog('failed_login', {
    ip: request.clientIp,
    path: request.path,
    reason,
    count: current.count,
  });
  if (current.count >= failedLoginLimit) {
    await securityStore.block(request.clientIp, 'too_many_failed_logins', failedLoginBanMs);
    await securityStore.reset(key);
    await writeSecurityLog('ip_banned_failed_logins', {
      ip: request.clientIp,
      path: request.path,
      durationMs: failedLoginBanMs,
    });
  }
}

async function resetFailedLogin(request) {
  await securityStore.reset(`login_fail:${request.clientIp}`);
}

function requestBodySizeLimit(maxBytes) {
  return (request, response, next) => {
    const contentLength = Number(request.get('content-length') || 0);
    if (contentLength > maxBytes) {
      response.status(413).json({ message: 'Request body too large' });
      return;
    }
    next();
  };
}

function truncateOutput(value) {
  const text = String(value || '');
  return text.length > codeOutputLimit ? `${text.slice(0, codeOutputLimit)}\n...output truncated...` : text;
}

function detectLanguage(value) {
  const language = String(value || 'python').trim().toLowerCase();
  if (['python', 'py', 'python3'].includes(language)) return 'python';
  return null;
}

function validateCodePayload(request, response, next) {
  const code = String(request.body?.code || '');
  const language = detectLanguage(request.body?.language);
  const checkWords = Array.isArray(request.body?.checkWords)
    ? request.body.checkWords.map((item) => String(item).slice(0, 80)).filter(Boolean).slice(0, 20)
    : [];

  if (!language) {
    response.status(400).json({ message: 'Unsupported language' });
    return;
  }
  if (!code.trim()) {
    response.status(400).json({ message: 'Code is required' });
    return;
  }
  if (Buffer.byteLength(code, 'utf8') > codeBodyLimitBytes) {
    response.status(413).json({ message: 'Code is too large' });
    return;
  }

  request.codeCheck = { code, language, checkWords };
  next();
}

function createPythonSandboxSource(userCode) {
  return `
import ast
import builtins
import sys

FORBIDDEN_IMPORTS = {
    "os", "sys", "subprocess", "socket", "pathlib", "shutil", "ctypes",
    "multiprocessing", "threading", "asyncio", "http", "urllib", "ftplib",
    "ssl", "requests", "importlib", "inspect", "glob", "pickle", "marshal",
}
FORBIDDEN_BUILTINS = {
    "open", "exec", "eval", "compile", "input", "__import__", "breakpoint",
    "globals", "locals", "vars", "dir",
}
USER_CODE = ${JSON.stringify(userCode)}

try:
    tree = ast.parse(USER_CODE, filename="<user_code>", mode="exec")
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            names = [alias.name for alias in getattr(node, "names", [])]
            if isinstance(node, ast.ImportFrom) and node.module:
                names.append(node.module)
            for name in names:
                root = name.split(".")[0]
                if root in FORBIDDEN_IMPORTS:
                    raise PermissionError(f"Xavfli modul taqiqlangan: {root}")
except Exception as exc:
    print(str(exc), file=sys.stderr)
    raise SystemExit(2)

safe_builtins = {
    name: value for name, value in builtins.__dict__.items()
    if name not in FORBIDDEN_BUILTINS
}

namespace = {
    "__builtins__": safe_builtins,
    "__name__": "__main__",
}

try:
    exec(compile(tree, "<user_code>", "exec"), namespace, namespace)
except Exception as exc:
    print(f"{type(exc).__name__}: {exc}", file=sys.stderr)
    raise SystemExit(1)
`;
}

function runProcessWithLimits(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env || {},
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, codeExecutionTimeoutMs);

    function collect(stream, setter) {
      stream.on('data', (chunk) => {
        const next = setter() + chunk.toString('utf8');
        const trimmed = next.slice(0, codeOutputLimit + 200);
        if (setter === getStdout) stdout = trimmed;
        else stderr = trimmed;
      });
    }

    const getStdout = () => stdout;
    const getStderr = () => stderr;
    collect(child.stdout, getStdout);
    collect(child.stderr, getStderr);

    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: false, stdout: '', stderr: error.message, exitCode: null, timedOut: false });
    });

    child.on('close', (exitCode) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        ok: exitCode === 0 && !timedOut,
        stdout: truncateOutput(stdout),
        stderr: timedOut ? 'Kod ishlash vaqti oshib ketdi' : truncateOutput(stderr),
        exitCode,
        timedOut,
      });
    });
  });
}

async function runPythonInProcess(code) {
  const tempDir = await mkdtemp(join(tmpdir(), 'attestatsiya-code-'));
  try {
    const runnerPath = join(tempDir, 'runner.py');
    await writeFile(runnerPath, createPythonSandboxSource(code), 'utf8');
    const result = await runProcessWithLimits(process.env.PYTHON_BIN || 'python', ['-I', '-S', runnerPath], {
      cwd: tempDir,
      env: {
        PYTHONNOUSERSITE: '1',
        PYTHONDONTWRITEBYTECODE: '1',
      },
    });
    return result;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function runPythonInDocker(code) {
  const tempDir = await mkdtemp(join(tmpdir(), 'attestatsiya-code-'));
  try {
    const runnerPath = join(tempDir, 'runner.py');
    await writeFile(runnerPath, createPythonSandboxSource(code), 'utf8');
    const dockerArgs = [
      'run',
      '--rm',
      '--network', 'none',
      '--memory', '128m',
      '--memory-swap', '128m',
      '--cpus', '0.5',
      '--pids-limit', '64',
      '--read-only',
      '--cap-drop', 'ALL',
      '--security-opt', 'no-new-privileges',
      '--tmpfs', '/tmp:rw,noexec,nosuid,size=16m',
      '-v', `${tempDir.replace(/\\/g, '/')}:/sandbox:ro`,
      '-w', '/sandbox',
      codeDockerImage,
      'python',
      '-I',
      '-S',
      '/sandbox/runner.py',
    ];
    return await runProcessWithLimits('docker', dockerArgs, { cwd: tempDir, env: {} });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function executeUserCode({ code, language }) {
  if (language !== 'python') {
    return { ok: false, stdout: '', stderr: 'Unsupported language', exitCode: null, timedOut: false };
  }
  if (codeRunner === 'docker') return runPythonInDocker(code);
  return runPythonInProcess(code);
}

function validateOrigin(request, response, next) {
  const origin = request.get('origin');
  if (origin && origin !== clientOrigin) {
    response.status(403).json({ message: 'Origin is not allowed' });
    return;
  }
  response.setHeader('Access-Control-Allow-Origin', clientOrigin);
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  if (request.method === 'OPTIONS') {
    response.sendStatus(204);
    return;
  }
  next();
}

function securityHeaders(_request, response, next) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-src https://www.youtube.com",
    "media-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '));
  if (isProduction) response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}

function requireAuth(request, response, next) {
  const cookies = parseCookies(request.get('cookie'));
  const session = verifyToken(cookies[sessionCookieName]);
  if (!session) {
    response.status(401).json({ message: 'Authentication required' });
    return;
  }
  request.user = { email: normalizeEmail(session.email), role: session.role, csrf: session.csrf };
  next();
}

function requireCsrf(request, response, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    next();
    return;
  }
  const cookies = parseCookies(request.get('cookie'));
  const csrfHeader = request.get('x-csrf-token');
  if (!request.user?.csrf || csrfHeader !== request.user.csrf || cookies[csrfCookieName] !== request.user.csrf) {
    response.status(403).json({ message: 'Invalid CSRF token' });
    return;
  }
  next();
}

function requireAdmin(request, response, next) {
  if (request.user?.role !== 'admin') {
    response.status(403).json({ message: 'Admin access required' });
    return;
  }
  next();
}

function safeString(value, max = 500) {
  return String(value || '').trim().slice(0, max);
}

function sanitizeUserForClient(user) {
  if (!user) return null;
  const { password, passwordHash, ...safeUser } = user;
  return safeUser;
}

function sanitizeStateForClient(data, currentUser) {
  const users = Object.fromEntries(Object.entries(data.users || {}).map(([email, user]) => [
    email,
    currentUser.role === 'admin' || email === currentUser.email ? sanitizeUserForClient(user) : {
      email,
      role: 'student',
      profile: user.profile,
    },
  ]));
  return { ...data, users };
}

async function getAppData() {
  const result = await pool.query('SELECT data FROM app_state WHERE id = 1');
  return result.rows[0]?.data || {};
}

async function saveAppData(data) {
  const result = await pool.query(
    `UPDATE app_state
     SET data = $1::jsonb, updated_at = now()
     WHERE id = 1
     RETURNING data, updated_at`,
    [JSON.stringify(data)],
  );
  return result.rows[0];
}

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

  const data = await getAppData();
  if (!data.users?.[defaultStudentEmail]) {
    const passwordHash = await hashPassword('123456');
    await saveAppData({
      ...data,
      users: {
        ...(data.users || {}),
        [defaultStudentEmail]: {
          email: defaultStudentEmail,
          role: 'student',
          passwordHash,
          profile: initialStudentProfile,
          directionAccess: data.directionAccess,
          lessonAccess: data.lessonAccess,
          completedDirections: [],
          result: null,
        },
      },
    });
  }
}

async function findUser(email) {
  const data = await getAppData();
  const user = data.users?.[normalizeEmail(email)];
  return { data, user };
}

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
  const email = normalizeEmail(actorEmail);
  const currentUser = currentData.users?.[email];
  const incomingUser = incomingData.users?.[email];
  if (!email || !currentUser || !incomingUser) return currentData;

  return {
    ...currentData,
    users: {
      ...(currentData.users || {}),
      [email]: {
        ...currentUser,
        profile: { ...currentUser.profile, ...incomingUser.profile, email },
        directionAccess: incomingUser.directionAccess || currentUser.directionAccess,
        lessonAccess: incomingUser.lessonAccess || currentUser.lessonAccess,
        completedDirections: incomingUser.completedDirections || currentUser.completedDirections,
        result: incomingUser.result || currentUser.result,
      },
    },
    messages: mergeMessages(currentData.messages, incomingData.messages),
  };
}

function mergeAdminState(currentData, incomingData) {
  const incomingUsers = incomingData.users || {};
  const users = Object.fromEntries(Object.entries(incomingUsers).map(([email, incomingUser]) => {
    const normalizedEmail = normalizeEmail(email);
    const existingUser = currentData.users?.[normalizedEmail] || {};
    return [
      normalizedEmail,
      {
        ...existingUser,
        ...incomingUser,
        email: normalizedEmail,
        role: incomingUser.role || existingUser.role || 'student',
        passwordHash: existingUser.passwordHash || incomingUser.passwordHash,
      },
    ];
  }));

  return {
    ...currentData,
    ...incomingData,
    users: {
      ...(currentData.users || {}),
      ...users,
    },
  };
}

app.set('trust proxy', parseTrustProxy(trustProxy));
app.use(securityHeaders);
app.use(requestIpContext);
app.use(blockGuard());
app.use(validateOrigin);
app.use('/api', rateLimit({
  windowMs: apiRateWindowMs,
  max: apiRateMax,
  banMs: apiRateBanMs,
  scope: 'api',
}));
app.use(express.json({ limit: '1mb', strict: true }));

app.get('/api/health', async (_request, response) => {
  try {
    await pool.query('SELECT 1');
    response.json({ ok: true, database: 'connected' });
  } catch {
    response.status(500).json({ ok: false, database: 'error' });
  }
});

app.post('/api/auth/register', rateLimit({
  windowMs: 15 * 60_000,
  max: 8,
  banMs: 15 * 60_000,
  scope: 'register',
}), async (request, response) => {
  const fullName = safeString(request.body?.fullName, 120);
  const email = normalizeEmail(request.body?.email);
  const password = String(request.body?.password || '');
  if (!fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
    response.status(400).json({ message: "Ism, to'g'ri email va kamida 8 belgili parol kiriting." });
    return;
  }

  const data = await getAppData();
  if (data.users?.[email]) {
    response.status(409).json({ message: 'Bu email bilan hisob allaqachon mavjud.' });
    return;
  }

  const user = {
    email,
    role: 'student',
    passwordHash: await hashPassword(password),
    profile: { ...initialStudentProfile, fullName, email },
    directionAccess: data.directionAccess,
    lessonAccess: data.lessonAccess,
    completedDirections: [],
    result: null,
  };
  await saveAppData({ ...data, users: { ...(data.users || {}), [email]: user } });
  setSessionCookies(response, user);
  response.status(201).json({ user: sanitizeUserForClient(user) });
});

app.post('/api/auth/login', rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  banMs: 15 * 60_000,
  scope: 'login',
}), async (request, response) => {
  const email = normalizeEmail(request.body?.email);
  const password = String(request.body?.password || '');
  const { data, user } = await findUser(email);
  if (!user) {
    await recordFailedLogin(request, 'unknown_user');
    const block = await securityStore.getBlock(request.clientIp);
    if (block) {
      sendBlocked(response, block);
      return;
    }
    response.status(401).json({ message: "Email yoki parol noto'g'ri." });
    return;
  }

  let ok = await verifyPassword(password, user.passwordHash);
  if (!ok && user.password && user.password === password) {
    user.passwordHash = await hashPassword(password);
    delete user.password;
    data.users[email] = user;
    await saveAppData(data);
    ok = true;
  }
  if (!ok) {
    await recordFailedLogin(request, 'bad_password');
    const block = await securityStore.getBlock(request.clientIp);
    if (block) {
      sendBlocked(response, block);
      return;
    }
    response.status(401).json({ message: "Email yoki parol noto'g'ri." });
    return;
  }

  await resetFailedLogin(request);
  await writeSecurityLog('login_success', { ip: request.clientIp, email });
  setSessionCookies(response, user);
  response.json({ user: sanitizeUserForClient(user) });
});

app.post('/api/auth/admin-login', rateLimit({
  windowMs: 15 * 60_000,
  max: 6,
  banMs: 15 * 60_000,
  scope: 'admin_login',
}), async (request, response) => {
  const email = normalizeEmail(request.body?.email);
  const password = String(request.body?.password || '');
  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL || 'admin@attestatsiya.local');
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH || '';
  const validPassword = adminPasswordHash
    ? await verifyPassword(password, adminPasswordHash)
    : Boolean(adminPassword) && password === adminPassword;

  if (email !== adminEmail || !validPassword) {
    await recordFailedLogin(request, 'bad_admin_credentials');
    const block = await securityStore.getBlock(request.clientIp);
    if (block) {
      sendBlocked(response, block);
      return;
    }
    response.status(401).json({ message: "Admin login yoki parol noto'g'ri." });
    return;
  }

  const user = { email: adminEmail, role: 'admin', profile: { fullName: 'Administrator', email: adminEmail, roleLabel: 'Admin' } };
  await resetFailedLogin(request);
  await writeSecurityLog('admin_login_success', { ip: request.clientIp, email: adminEmail });
  setSessionCookies(response, user);
  response.json({ user });
});

app.post('/api/auth/logout', requireAuth, requireCsrf, (_request, response) => {
  clearSessionCookies(response);
  response.json({ ok: true });
});

app.get('/api/auth/session', requireAuth, (request, response) => {
  response.json({ user: request.user });
});

app.post('/api/auth/change-password', requireAuth, requireCsrf, async (request, response) => {
  try {
    const currentPassword = String(request.body?.currentPassword || '');
    const nextPassword = String(request.body?.nextPassword || '');
    if (nextPassword.length < 8) {
      response.status(400).json({ message: 'Yangi parol kamida 8 belgidan iborat bo‘lsin.' });
      return;
    }

    const { data, user } = await findUser(request.user.email);
    if (!user) {
      response.status(404).json({ message: 'User topilmadi.' });
      return;
    }

    let ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok && user.password && user.password === currentPassword) ok = true;
    if (!ok) {
      await recordFailedLogin(request, 'bad_current_password');
      response.status(401).json({ message: 'Hozirgi parol noto‘g‘ri.' });
      return;
    }

    user.passwordHash = await hashPassword(nextPassword);
    delete user.password;
    data.users[request.user.email] = user;
    await saveAppData(data);
    await writeSecurityLog('password_changed', { ip: request.clientIp, email: request.user.email });
    response.json({ ok: true, message: 'Parol yangilandi.' });
  } catch (error) {
    await writeSecurityLog('password_change_error', { ip: request.clientIp, email: request.user?.email, message: error.message });
    response.status(500).json({ message: 'Parolni yangilab bo‘lmadi.' });
  }
});

app.post('/api/admin/users/password', requireAuth, requireCsrf, requireAdmin, async (request, response) => {
  try {
    const email = normalizeEmail(request.body?.email);
    const nextPassword = String(request.body?.nextPassword || '');
    if (!email || nextPassword.length < 8) {
      response.status(400).json({ message: 'Email va kamida 8 belgili parol kerak.' });
      return;
    }

    const data = await getAppData();
    const user = data.users?.[email];
    if (!user) {
      response.status(404).json({ message: 'User topilmadi.' });
      return;
    }

    user.passwordHash = await hashPassword(nextPassword);
    delete user.password;
    data.users[email] = user;
    await saveAppData(data);
    await writeSecurityLog('admin_password_reset', { ip: request.clientIp, admin: request.user.email, target: email });
    response.json({ ok: true, message: 'User paroli yangilandi.' });
  } catch (error) {
    await writeSecurityLog('admin_password_reset_error', { ip: request.clientIp, admin: request.user?.email, message: error.message });
    response.status(500).json({ message: 'User parolini yangilab bo‘lmadi.' });
  }
});

app.post(
  '/api/code/check',
  requireAuth,
  requireCsrf,
  requestBodySizeLimit(codeBodyLimitBytes),
  rateLimit({
    windowMs: codeRateWindowMs,
    max: codeRateMax,
    banMs: codeRateBanMs,
    scope: 'code_check',
  }),
  validateCodePayload,
  async (request, response) => {
    try {
      const result = await executeUserCode(request.codeCheck);
      const normalizedCode = request.codeCheck.code.toLowerCase();
      const checkWords = request.codeCheck.checkWords;
      const checksPassed = checkWords.length
        ? checkWords.every((word) => normalizedCode.includes(word.toLowerCase()))
        : result.ok;
      const ok = result.ok && checksPassed;

      await writeSecurityLog('code_check_completed', {
        ip: request.clientIp,
        email: request.user.email,
        language: request.codeCheck.language,
        ok,
        timedOut: result.timedOut,
        exitCode: result.exitCode,
      });

      response.json({
        ok,
        timedOut: result.timedOut,
        message: result.timedOut
          ? 'Kod ishlash vaqti oshib ketdi'
          : ok
            ? 'Yechim qabul qilindi.'
            : result.stderr || 'Yechimda kerakli qismlar yetishmayapti.',
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
      });
    } catch (error) {
      await writeSecurityLog('code_check_error', {
        ip: request.clientIp,
        email: request.user?.email,
        message: error.message,
      });
      response.status(500).json({
        ok: false,
        timedOut: false,
        message: 'Kod tekshirishda xato yuz berdi.',
        stdout: '',
        stderr: 'Internal execution error',
      });
    }
  },
);

app.get('/api/app-state', requireAuth, async (request, response) => {
  try {
    const result = await pool.query('SELECT data, updated_at FROM app_state WHERE id = 1');
    const row = result.rows[0] || { data: {}, updated_at: null };
    response.json({ ...row, data: sanitizeStateForClient(row.data, request.user) });
  } catch {
    response.status(500).json({ message: 'Failed to load app state' });
  }
});

app.put('/api/app-state', requireAuth, requireCsrf, async (request, response) => {
  try {
    const data = request.body?.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      response.status(400).json({ message: 'data object is required' });
      return;
    }

    const current = await getAppData();
    const nextData = request.user.role === 'admin'
      ? mergeAdminState(current, data)
      : mergeStudentState(current, data, request.user.email);

    const result = await saveAppData(nextData);
    response.json({ ...result, data: sanitizeStateForClient(result.data, request.user) });
  } catch {
    response.status(500).json({ message: 'Failed to save app state' });
  }
});

app.use(express.static(distPath, {
  dotfiles: 'deny',
  etag: true,
  index: false,
  maxAge: isProduction ? '1h' : 0,
}));

app.get('*', (_request, response) => {
  response.sendFile(join(distPath, 'index.html'));
});

createSecurityStore()
  .then((store) => {
    securityStore = store;
    const backend = store instanceof RedisSecurityStore ? 'redis' : 'memory';
    return writeSecurityLog('security_store_ready', {
      backend,
      trustProxy,
      failedLoginLimit,
      failedLoginBanMs,
      apiRateWindowMs,
      apiRateMax,
      apiRateBanMs,
    });
  })
  .then(() => ensureSchema())
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
