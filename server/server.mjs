import { randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const __dirname = normalize(fileURLToPath(new URL('.', import.meta.url)));
const root = normalize(join(__dirname, '..'));
const dist = join(root, 'dist');
const dataDir = __dirname;
const dbPath = join(dataDir, 'rifas.sqlite');
const env = globalThis.process?.env || {};
const port = Number(env.PORT || 4173);
const host = env.HOST || (env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
const sessions = new Map();
const brandName = 'businessrifa';
const developerName = 'Leandro Santos';
const officialSite = 'Configure seu dominio publico';
const copyrightText = 'Copyright 2026 Todos os direitos reservados.';
const maxRaffleNumbers = 500000;
const defaultSettings = {
  brand: brandName,
  company: brandName,
  developer: developerName,
  officialSite,
  copyright: copyrightText,
  contactEmail: 'businessrifa@hotmail.com',
  pixKey: 'businessrifa@hotmail.com',
  pixMerchant: 'BUSINESSRIFA',
  city: 'FORTALEZA',
  rentalMonthlyPrice: '59.99',
  paymentProvider: 'infinitepay',
  infinitePayHandle: 'cicero-leandro-dos',
  infinitePayMonthlyDescription: 'Produto de Exemplo',
  infinitePayApiUrl: '',
  infinitePayApiToken: '',
  infinitePayPaymentLink: '',
  infinitePayWebhookSecret: '',
  automaticEmailWelcome: `Bem-vindo ao ${brandName}. Sua conta foi criada com sucesso.`,
  automaticEmailReservation: `Seus numeros foram reservados no ${brandName}. Finalize o Pix para validar sua participacao.`,
  automaticEmailPayment: `Pagamento confirmado pela plataforma ${brandName}. Boa sorte no sorteio.`
};
const publicSettingKeys = new Set([
  'brand',
  'company',
  'developer',
  'officialSite',
  'copyright',
  'contactEmail',
  'pixKey',
  'pixMerchant',
  'city',
  'rentalMonthlyPrice',
  'paymentProvider',
  'infinitePayHandle',
  'infinitePayMonthlyDescription',
  'infinitePayPaymentLink',
  'automaticEmailWelcome',
  'automaticEmailReservation',
  'automaticEmailPayment'
]);

const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(String(password), salt, 64).toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(String(password), salt, 64);
  const saved = Buffer.from(hash, 'hex');
  return saved.length === candidate.length && timingSafeEqual(saved, candidate);
}

const now = () => new Date().toISOString();
const money = (value) => Number(Number(value || 0).toFixed(2));
const parsePrice = (value, fallback = 0) => {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? money(parsed) : fallback;
};

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT DEFAULT '',
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS raffles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    prize TEXT NOT NULL,
    image_url TEXT NOT NULL,
    price REAL NOT NULL,
    total_numbers INTEGER NOT NULL,
    draw_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    winner_number INTEGER,
    winner_user_id INTEGER,
    created_at TEXT NOT NULL,
    drawn_at TEXT,
    FOREIGN KEY (winner_user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raffle_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'reserved',
    amount REAL NOT NULL,
    pix_code TEXT NOT NULL,
    txid TEXT NOT NULL UNIQUE,
    reserved_at TEXT NOT NULL,
    paid_at TEXT,
    FOREIGN KEY (raffle_id) REFERENCES raffles(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE (raffle_id, number)
  );
  CREATE TABLE IF NOT EXISTS ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reservation_id INTEGER,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id)
  );
  CREATE TABLE IF NOT EXISTS email_outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    created_at TEXT NOT NULL,
    sent_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

try {
  db.exec("ALTER TABLE users ADD COLUMN photo_url TEXT DEFAULT '';");
} catch {
  // Column already exists in databases created before this version.
}

if (!db.prepare('SELECT COUNT(*) AS total FROM users').get().total) {
  db.prepare('INSERT INTO users (name, email, phone, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    'Administrador',
    'admin@businessrifa.local',
    '(85) 99999-0000',
    hashPassword('admin123'),
    'admin',
    now()
  );
  db.prepare('INSERT INTO users (name, email, phone, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    'Cliente Demo',
    'cliente@businessrifa.local',
    '(85) 98888-0000',
    hashPassword('123456'),
    'customer',
    now()
  );
}

if (!db.prepare('SELECT COUNT(*) AS total FROM raffles').get().total) {
  db.prepare(`
    INSERT INTO raffles (title, description, prize, image_url, price, total_numbers, draw_at, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'Rifa Premium iPhone 16 Pro',
    'Rifa online com reserva instantanea de numeros, confirmacao via Pix e sorteio automatico quando todos os numeros pagos ou na data programada.',
    'iPhone 16 Pro 256 GB lacrado',
    'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1200&q=80',
    9.99,
    120,
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 12).toISOString(),
    'active',
    now()
  );
}

for (const [key, value] of Object.entries(defaultSettings)) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING').run(key, value);
}

function setting(key) {
  return db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value || '';
}

if (['97', '97.00', '97,00'].includes(setting('rentalMonthlyPrice'))) {
  db.prepare('UPDATE settings SET value = ? WHERE key = ?').run('59.99', 'rentalMonthlyPrice');
}

function allSettings() {
  return Object.fromEntries(db.prepare('SELECT key, value FROM settings').all().map((item) => [item.key, item.value]));
}

function publicSettings() {
  return Object.fromEntries(
    db.prepare('SELECT key, value FROM settings').all()
      .filter((item) => publicSettingKeys.has(item.key))
      .map((item) => [item.key, item.value])
  );
}

function privatePaymentSettings() {
  return {
    contactEmail: setting('contactEmail'),
    paymentProvider: setting('paymentProvider') || 'pix',
    infinitePayHandle: setting('infinitePayHandle'),
    infinitePayMonthlyDescription: setting('infinitePayMonthlyDescription'),
    infinitePayApiUrl: setting('infinitePayApiUrl'),
    infinitePayApiTokenConfigured: Boolean(setting('infinitePayApiToken')),
    infinitePayPaymentLink: setting('infinitePayPaymentLink'),
    infinitePayWebhookSecretConfigured: Boolean(setting('infinitePayWebhookSecret')),
    pixKey: setting('pixKey'),
    pixMerchant: setting('pixMerchant'),
    city: setting('city'),
    rentalMonthlyPrice: setting('rentalMonthlyPrice') || '59.99'
  };
}

function sendJson(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(data));
}

function publicOrigin(request) {
  const host = request.headers['x-forwarded-host'] || request.headers.host || 'localhost';
  const proto = request.headers['x-forwarded-proto'] || (String(host).includes('localhost') || String(host).includes('127.0.0.1') ? 'http' : 'https');
  return `${proto}://${host}`;
}

function sendText(response, status, body, type = 'text/plain; charset=utf-8') {
  response.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'public, max-age=3600'
  });
  response.end(body);
}

function sendRobots(request, response) {
  const origin = publicOrigin(request);
  sendText(response, 200, `User-agent: *
Allow: /

Sitemap: ${origin}/sitemap.xml
`);
}

function sendSitemap(request, response) {
  const origin = publicOrigin(request);
  const updated = new Date().toISOString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${origin}/</loc>
    <lastmod>${updated}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
  sendText(response, 200, xml, 'application/xml; charset=utf-8');
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) request.destroy();
    });
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function publicUser(user) {
  return user ? { id: user.id, name: user.name, email: user.email, phone: user.phone, photoUrl: user.photo_url || '', role: user.role } : null;
}

function authUser(request) {
  const token = (request.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const session = token ? sessions.get(token) : null;
  return session ? db.prepare('SELECT * FROM users WHERE id = ?').get(session.userId) : null;
}

function requireUser(request, response) {
  const user = authUser(request);
  if (!user) sendJson(response, 401, { message: 'Acesso nao autorizado.' });
  return user;
}

function requireAdmin(request, response) {
  const user = requireUser(request, response);
  if (!user) return null;
  if (user.role !== 'admin') {
    sendJson(response, 403, { message: 'Apenas administradores podem executar esta acao.' });
    return null;
  }
  return user;
}

function createToken(user) {
  const token = randomBytes(32).toString('hex');
  sessions.set(token, { userId: user.id, createdAt: Date.now() });
  return token;
}

function raffleSummary(raffle) {
  const stats = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid,
      SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) AS reserved,
      SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS revenue
    FROM reservations WHERE raffle_id = ?
  `).get(raffle.id);
  const winner = raffle.winner_user_id ? db.prepare('SELECT * FROM users WHERE id = ?').get(raffle.winner_user_id) : null;
  return {
    ...raffle,
    price: money(raffle.price),
    paid: Number(stats.paid || 0),
    reserved: Number(stats.reserved || 0),
    revenue: money(stats.revenue || 0),
    available: Number(raffle.total_numbers) - Number(stats.paid || 0) - Number(stats.reserved || 0),
    winner: publicUser(winner)
  };
}

function numberMap(raffleId) {
  return db.prepare(`
    SELECT r.number, r.status, r.user_id AS userId, u.name AS customer
    FROM reservations r JOIN users u ON u.id = r.user_id
    WHERE r.raffle_id = ? ORDER BY r.number
  `).all(raffleId);
}

function pixPayload({ txid, amount }) {
  return `PIX COPIA E COLA | CHAVE:${setting('pixKey')} | NOME:${setting('pixMerchant')} | CIDADE:${setting('city')} | TXID:${txid} | VALOR:${money(amount)}`;
}

function appendCheckoutParams(baseLink, { txid, amount, description }) {
  if (!baseLink) return '';
  try {
    const checkoutUrl = new URL(baseLink);
    checkoutUrl.searchParams.set('reference', txid);
    checkoutUrl.searchParams.set('amount', String(money(amount)));
    checkoutUrl.searchParams.set('description', description);
    return checkoutUrl.toString();
  } catch {
    return baseLink;
  }
}

function normalizeCheckoutResponse(data) {
  return data?.url || data?.checkout_url || data?.checkoutUrl || data?.payment_url || data?.paymentUrl || data?.link || '';
}

function amountToCents(value) {
  return Math.round(money(value) * 100);
}

async function createInfinitePayCheckout({ txid, amount, description, customer }) {
  const apiUrl = setting('infinitePayApiUrl').trim();
  const apiToken = setting('infinitePayApiToken').trim();
  const paymentLink = setting('infinitePayPaymentLink').trim();
  const handle = setting('infinitePayHandle').trim() || 'cicero-leandro-dos';
  if (!apiUrl || !apiToken) {
    return {
      checkoutUrl: appendCheckoutParams(paymentLink, { txid, amount, description }),
      provider: paymentLink ? 'infinitepay-link' : 'pix',
      status: paymentLink ? 'link' : 'fallback',
      payload: {
        handle,
        items: [{ quantity: 1, price: amountToCents(amount), description }]
      }
    };
  }

  const payload = {
    handle,
    items: [
      {
        quantity: 1,
        price: amountToCents(amount),
        description
      }
    ],
    reference: txid,
    customer,
    metadata: { txid, system: brandName }
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiToken}`
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.message || data?.error || `InfinitePay retornou HTTP ${response.status}`;
    throw new Error(message);
  }

  return {
    checkoutUrl: normalizeCheckoutResponse(data) || appendCheckoutParams(paymentLink, { txid, amount, description }),
    provider: 'infinitepay-api',
    status: 'created',
    raw: data
  };
}

function drawRaffle(raffleId) {
  const raffle = db.prepare('SELECT * FROM raffles WHERE id = ?').get(raffleId);
  if (!raffle) throw new Error('Rifa nao encontrada.');
  if (raffle.status === 'drawn') return raffleSummary(raffle);
  const paid = db.prepare('SELECT * FROM reservations WHERE raffle_id = ? AND status = ? ORDER BY number').all(raffleId, 'paid');
  if (!paid.length) throw new Error('Nao ha numeros pagos para sortear.');
  const winner = paid[randomInt(paid.length)];
  db.prepare('UPDATE raffles SET status = ?, winner_number = ?, winner_user_id = ?, drawn_at = ? WHERE id = ?').run('drawn', winner.number, winner.user_id, now(), raffleId);
  return raffleSummary(db.prepare('SELECT * FROM raffles WHERE id = ?').get(raffleId));
}

function maybeAutoDraw(raffleId) {
  const raffle = db.prepare('SELECT * FROM raffles WHERE id = ?').get(raffleId);
  if (!raffle || raffle.status !== 'active') return null;
  const paid = db.prepare('SELECT COUNT(*) AS total FROM reservations WHERE raffle_id = ? AND status = ?').get(raffleId, 'paid').total;
  const due = new Date(raffle.draw_at).getTime() <= Date.now();
  if (paid < 1 || (paid < raffle.total_numbers && !due)) return null;
  return drawRaffle(raffleId);
}

function financialSummary() {
  const revenue = db.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM ledger WHERE type = 'income'").get().total;
  const pending = db.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM reservations WHERE status = 'reserved'").get().total;
  const paidNumbers = db.prepare("SELECT COUNT(*) AS total FROM reservations WHERE status = 'paid'").get().total;
  const entries = db.prepare(`
    SELECT l.*, r.number, rf.title AS raffleTitle, u.name AS customer
    FROM ledger l
    LEFT JOIN reservations r ON r.id = l.reservation_id
    LEFT JOIN raffles rf ON rf.id = r.raffle_id
    LEFT JOIN users u ON u.id = r.user_id
    ORDER BY l.created_at DESC LIMIT 80
  `).all();
  return { revenue: money(revenue), pending: money(pending), paidNumbers, entries };
}

function queueEmail(user, subject, body) {
  if (!user?.email) return null;
  const result = db.prepare(`
    INSERT INTO email_outbox (user_id, email, subject, body, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(user.id, user.email, subject, body, 'queued', now());
  return db.prepare('SELECT * FROM email_outbox WHERE id = ?').get(result.lastInsertRowid);
}

function emailSummary() {
  return db.prepare(`
    SELECT e.*, u.name AS customer
    FROM email_outbox e
    LEFT JOIN users u ON u.id = e.user_id
    ORDER BY e.created_at DESC
    LIMIT 80
  `).all();
}

async function handleApi(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/api/health') return sendJson(response, 200, { status: 'ok', app: brandName, database: 'SQLite' });

  if (request.method === 'POST' && url.pathname === '/api/auth/register') {
    const body = await readBody(request);
    if (!body.name || !body.email || !body.password) return sendJson(response, 400, { message: 'Nome, e-mail e senha sao obrigatorios.' });
    try {
      const result = db.prepare('INSERT INTO users (name, email, phone, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        String(body.name).trim(),
        String(body.email).trim().toLowerCase(),
        String(body.phone || '').trim(),
        hashPassword(body.password),
        'customer',
        now()
      );
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      queueEmail(user, `Bem-vindo ao ${brandName}`, setting('automaticEmailWelcome'));
      return sendJson(response, 201, { token: createToken(user), user: publicUser(user) });
    } catch {
      return sendJson(response, 409, { message: 'Este e-mail ja esta cadastrado.' });
    }
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/login') {
    const body = await readBody(request);
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(body.email || '').trim().toLowerCase());
    if (!user || !verifyPassword(body.password, user.password_hash)) return sendJson(response, 401, { message: 'E-mail ou senha invalidos.' });
    return sendJson(response, 200, { token: createToken(user), user: publicUser(user) });
  }

  if (request.method === 'PATCH' && url.pathname === '/api/account') {
    const user = requireUser(request, response);
    if (!user) return;
    const body = await readBody(request);
    const name = String(body.name || user.name).trim();
    const phone = String(body.phone || '').trim();
    const photoUrl = String(body.photoUrl || '').trim();
    if (!name) return sendJson(response, 400, { message: 'Nome e obrigatorio.' });
    db.prepare('UPDATE users SET name = ?, phone = ?, photo_url = ? WHERE id = ?').run(name, phone, photoUrl, user.id);
    return sendJson(response, 200, { user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)) });
  }

  if (request.method === 'GET' && url.pathname === '/api/account/reservations') {
    const user = requireUser(request, response);
    if (!user) return;
    const reservations = db.prepare(`
      SELECT r.*, rf.title AS raffleTitle, rf.prize, rf.total_numbers AS totalNumbers
      FROM reservations r
      JOIN raffles rf ON rf.id = r.raffle_id
      WHERE r.user_id = ?
      ORDER BY r.reserved_at DESC
      LIMIT 120
    `).all(user.id);
    return sendJson(response, 200, { reservations });
  }

  if (request.method === 'GET' && url.pathname === '/api/bootstrap') {
    const user = authUser(request);
    return sendJson(response, 200, {
      settings: publicSettings(),
      user: publicUser(user),
      raffles: db.prepare('SELECT * FROM raffles ORDER BY status, draw_at').all().map(raffleSummary),
      finance: user?.role === 'admin' ? financialSummary() : null
    });
  }

  if (request.method === 'POST' && url.pathname === '/api/rental/checkout') {
    if ((setting('paymentProvider') || 'pix') !== 'infinitepay') {
      return sendJson(response, 400, { message: 'InfinitePay nao esta ativo.' });
    }
    const amount = Number(String(setting('rentalMonthlyPrice') || '59.99').replace(',', '.')) || 59.99;
    const txid = `MENSAL${Date.now()}${randomBytes(3).toString('hex').toUpperCase()}`;
    try {
      const checkout = await createInfinitePayCheckout({
        txid,
        amount,
        description: setting('infinitePayMonthlyDescription') || 'Produto de Exemplo',
        customer: {}
      });
      return sendJson(response, 200, { checkout, amount: money(amount), txid });
    } catch (error) {
      return sendJson(response, 502, { message: error.message });
    }
  }

  const raffleId = Number((url.pathname.match(/^\/api\/raffles\/(\d+)$/) || [])[1]);
  if (request.method === 'GET' && raffleId) {
    const raffle = db.prepare('SELECT * FROM raffles WHERE id = ?').get(raffleId);
    if (!raffle) return sendJson(response, 404, { message: 'Rifa nao encontrada.' });
    maybeAutoDraw(raffleId);
    return sendJson(response, 200, { raffle: raffleSummary(db.prepare('SELECT * FROM raffles WHERE id = ?').get(raffleId)), numbers: numberMap(raffleId) });
  }

  if (request.method === 'POST' && url.pathname === '/api/raffles') {
    if (!requireAdmin(request, response)) return;
    const body = await readBody(request);
    const title = String(body.title || '').trim();
    const prize = String(body.prize || title || '').trim();
    const price = parsePrice(body.price, 0);
    const totalNumbers = Math.min(maxRaffleNumbers, Math.max(10, Number(body.totalNumbers || 100)));
    const drawAt = body.drawAt ? new Date(body.drawAt) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    if (!title || !prize || !price) return sendJson(response, 400, { message: 'Titulo, premio e valor da rifa sao obrigatorios.' });
    if (!Number.isFinite(totalNumbers)) return sendJson(response, 400, { message: 'Quantidade de numeros invalida.' });
    if (Number.isNaN(drawAt.getTime())) return sendJson(response, 400, { message: 'Data de sorteio invalida.' });
    const result = db.prepare(`
      INSERT INTO raffles (title, description, prize, image_url, price, total_numbers, draw_at, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title,
      body.description || 'Rifa online com pagamento Pix.',
      prize,
      body.imageUrl || 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80',
      price,
      totalNumbers,
      drawAt.toISOString(),
      'active',
      now()
    );
    return sendJson(response, 201, raffleSummary(db.prepare('SELECT * FROM raffles WHERE id = ?').get(result.lastInsertRowid)));
  }

  if (request.method === 'PATCH' && raffleId) {
    if (!requireAdmin(request, response)) return;
    const raffle = db.prepare('SELECT * FROM raffles WHERE id = ?').get(raffleId);
    if (!raffle) return sendJson(response, 404, { message: 'Rifa nao encontrada.' });
    const body = await readBody(request);
    const title = String(body.title ?? raffle.title).trim();
    const description = String(body.description ?? raffle.description).trim();
    const prize = String(body.prize ?? raffle.prize).trim();
    const imageUrl = String(body.imageUrl ?? raffle.image_url).trim();
    const price = parsePrice(body.price ?? raffle.price, raffle.price);
    const requestedTotal = Number(body.totalNumbers ?? raffle.total_numbers);
    const soldOrReserved = db.prepare('SELECT COUNT(*) AS total FROM reservations WHERE raffle_id = ?').get(raffle.id).total;
    const totalNumbers = Math.min(maxRaffleNumbers, Math.max(Math.max(10, soldOrReserved), requestedTotal));
    const drawAt = body.drawAt ? new Date(body.drawAt) : new Date(raffle.draw_at);
    if (!title || !description || !prize || !imageUrl || !price) return sendJson(response, 400, { message: 'Titulo, descricao, premio, foto e valor sao obrigatorios.' });
    if (!Number.isFinite(totalNumbers)) return sendJson(response, 400, { message: 'Quantidade de numeros invalida.' });
    if (Number.isNaN(drawAt.getTime())) return sendJson(response, 400, { message: 'Data de sorteio invalida.' });
    db.prepare(`
      UPDATE raffles
      SET title = ?, description = ?, prize = ?, image_url = ?, price = ?, total_numbers = ?, draw_at = ?
      WHERE id = ?
    `).run(title, description, prize, imageUrl, price, totalNumbers, drawAt.toISOString(), raffle.id);
    return sendJson(response, 200, raffleSummary(db.prepare('SELECT * FROM raffles WHERE id = ?').get(raffle.id)));
  }

  if (request.method === 'DELETE' && raffleId) {
    if (!requireAdmin(request, response)) return;
    const raffle = db.prepare('SELECT * FROM raffles WHERE id = ?').get(raffleId);
    if (!raffle) return sendJson(response, 404, { message: 'Rifa nao encontrada.' });
    const reservationCount = db.prepare('SELECT COUNT(*) AS total FROM reservations WHERE raffle_id = ?').get(raffle.id).total;
    if (reservationCount > 0) return sendJson(response, 409, { message: 'Nao e possivel apagar rifa com reservas. Edite os dados ou crie uma nova rifa para preservar o historico.' });
    db.prepare('DELETE FROM raffles WHERE id = ?').run(raffle.id);
    return sendJson(response, 200, { message: 'Rifa apagada com sucesso.' });
  }

  if (request.method === 'POST' && url.pathname === '/api/reservations') {
    const user = requireUser(request, response);
    if (!user) return;
    const body = await readBody(request);
    const raffle = db.prepare('SELECT * FROM raffles WHERE id = ?').get(Number(body.raffleId));
    if (!raffle || raffle.status !== 'active') return sendJson(response, 404, { message: 'Rifa indisponivel.' });
    const selected = [...new Set((Array.isArray(body.numbers) ? body.numbers : []).map(Number))]
      .filter((number) => Number.isInteger(number) && number >= 1 && number <= raffle.total_numbers)
      .slice(0, 20);
    if (!selected.length) return sendJson(response, 400, { message: 'Selecione pelo menos um numero.' });
    const created = [];
    try {
      db.exec('BEGIN');
      for (const number of selected) {
        if (db.prepare('SELECT id FROM reservations WHERE raffle_id = ? AND number = ?').get(raffle.id, number)) throw new Error(`Numero ${number} ja foi reservado.`);
        const txid = `RIFA${raffle.id}${String(number).padStart(5, '0')}${randomBytes(3).toString('hex').toUpperCase()}`;
        const amount = money(raffle.price);
        const result = db.prepare(`
          INSERT INTO reservations (raffle_id, user_id, number, status, amount, pix_code, txid, reserved_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(raffle.id, user.id, number, 'reserved', amount, pixPayload({ txid, amount }), txid, now());
        created.push(db.prepare('SELECT * FROM reservations WHERE id = ?').get(result.lastInsertRowid));
      }
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      return sendJson(response, 409, { message: error.message });
    }
    const total = money(created.reduce((sum, item) => sum + item.amount, 0));
    let checkout = { checkoutUrl: '', provider: 'pix', status: 'fallback' };
    let checkoutError = '';
    if ((setting('paymentProvider') || 'pix') === 'infinitepay') {
      try {
        checkout = await createInfinitePayCheckout({
          txid: created[0].txid,
          amount: total,
          description: `${brandName} - reserva de ${created.length} numero(s)`,
          customer: { name: user.name, email: user.email, phone: user.phone }
        });
      } catch (error) {
        checkoutError = error.message;
      }
    }
    queueEmail(
      user,
      `${brandName}: numeros reservados`,
      `${setting('automaticEmailReservation')}\n\nTotal: R$ ${total.toFixed(2)}\nNumeros: ${created.map((item) => item.number).join(', ')}`
    );
    return sendJson(response, 201, { reservations: created, total, checkout, checkoutError });
  }

  if (request.method === 'PATCH' && url.pathname === '/api/admin/settings') {
    if (!requireAdmin(request, response)) return;
    const body = await readBody(request);
    if (body.paymentProvider && !['infinitepay', 'pix'].includes(String(body.paymentProvider))) {
      return sendJson(response, 400, { message: 'Provedor de pagamento invalido.' });
    }
    if (body.rentalMonthlyPrice !== undefined && !parsePrice(body.rentalMonthlyPrice, 0)) {
      return sendJson(response, 400, { message: 'Mensalidade invalida.' });
    }
    if (body.infinitePayHandle !== undefined && !String(body.infinitePayHandle).trim()) {
      return sendJson(response, 400, { message: 'Handle InfinitePay e obrigatorio.' });
    }
    const allowed = new Set([
      'contactEmail',
      'pixKey',
      'pixMerchant',
      'city',
      'rentalMonthlyPrice',
      'paymentProvider',
      'infinitePayHandle',
      'infinitePayMonthlyDescription',
      'infinitePayApiUrl',
      'infinitePayApiToken',
      'infinitePayPaymentLink',
      'infinitePayWebhookSecret'
    ]);
    for (const [key, value] of Object.entries(body)) {
      if (!allowed.has(key)) continue;
      if ((key === 'infinitePayApiToken' || key === 'infinitePayWebhookSecret') && !String(value || '').trim()) continue;
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value || '').trim());
    }
    return sendJson(response, 200, { settings: privatePaymentSettings() });
  }

  const reservationPayId = Number((url.pathname.match(/^\/api\/reservations\/(\d+)\/pay$/) || [])[1]);
  if (request.method === 'POST' && reservationPayId) {
    if (!requireAdmin(request, response)) return;
    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationPayId);
    if (!reservation) return sendJson(response, 404, { message: 'Reserva nao encontrada.' });
    if (reservation.status !== 'paid') {
      db.prepare('UPDATE reservations SET status = ?, paid_at = ? WHERE id = ?').run('paid', now(), reservation.id);
      db.prepare('INSERT INTO ledger (reservation_id, type, description, amount, created_at) VALUES (?, ?, ?, ?, ?)').run(
        reservation.id,
        'income',
        `Pagamento Pix confirmado - numero ${reservation.number}`,
        reservation.amount,
        now()
      );
      const paidUser = db.prepare('SELECT * FROM users WHERE id = ?').get(reservation.user_id);
      queueEmail(
        paidUser,
        `${brandName}: pagamento confirmado`,
        `${setting('automaticEmailPayment')}\n\nNumero confirmado: ${reservation.number}\nValor: R$ ${money(reservation.amount).toFixed(2)}`
      );
    }
    maybeAutoDraw(reservation.raffle_id);
    return sendJson(response, 200, { message: 'Pagamento Pix confirmado.', raffle: raffleSummary(db.prepare('SELECT * FROM raffles WHERE id = ?').get(reservation.raffle_id)) });
  }

  const drawId = Number((url.pathname.match(/^\/api\/raffles\/(\d+)\/draw$/) || [])[1]);
  if (request.method === 'POST' && drawId) {
    if (!requireAdmin(request, response)) return;
    try {
      return sendJson(response, 200, drawRaffle(drawId));
    } catch (error) {
      return sendJson(response, 400, { message: error.message });
    }
  }

  if (request.method === 'GET' && url.pathname === '/api/admin/dashboard') {
    if (!requireAdmin(request, response)) return;
    return sendJson(response, 200, {
      finance: financialSummary(),
      raffles: db.prepare('SELECT * FROM raffles ORDER BY created_at DESC').all().map(raffleSummary),
      users: db.prepare('SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC LIMIT 100').all(),
      reservations: db.prepare(`
        SELECT r.*, rf.title AS raffleTitle, u.name AS customer, u.email AS customerEmail
        FROM reservations r
        JOIN raffles rf ON rf.id = r.raffle_id
        JOIN users u ON u.id = r.user_id
        ORDER BY r.reserved_at DESC LIMIT 120
      `).all(),
      emails: emailSummary(),
      settings: privatePaymentSettings()
    });
  }

  sendJson(response, 404, { message: 'Rota nao encontrada.' });
}

function serveStatic(response, url) {
  const requested = normalize(join(dist, decodeURIComponent(url.pathname)));
  const safePath = requested.startsWith(dist) ? requested : dist;
  const filePath = existsSync(safePath) && statSync(safePath).isFile() ? safePath : join(dist, 'index.html');
  const type = mime[extname(filePath)] || 'application/octet-stream';
  response.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': type.includes('text/html') ? 'no-store, max-age=0' : 'public, max-age=60'
  });
  createReadStream(filePath).pipe(response);
}

createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(request, response, url);
    if (request.method === 'GET' && url.pathname === '/robots.txt') return sendRobots(request, response);
    if (request.method === 'GET' && url.pathname === '/sitemap.xml') return sendSitemap(request, response);
    return serveStatic(response, url);
  } catch (error) {
    return sendJson(response, 500, { message: 'Erro interno.', detail: error.message });
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`${brandName} rodando em http://127.0.0.1:${port}`);
});
