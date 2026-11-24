const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const seedProducts = require('./data/products');

const app = express();
const PORT = process.env.PORT || 3000;
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WH = process.env.STRIPE_WEBHOOK_SECRET || '';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'storage');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const stripe = STRIPE_KEY ? require('stripe')(STRIPE_KEY) : null;
app.set('trust proxy', 1);

/* ------------------------------------------------------------------ */
/* Base de dados (ficheiro JSON com escrita atómica)                   */
/* ------------------------------------------------------------------ */
const DB_FILE = path.join(DATA_DIR, 'db.json');
const DEFAULT_SETTINGS = {
  brand: 'LEDWAVE', brandSub: 'PORTUGAL', logo: '', logoHeight: '40', favicon: '', heroImage1: '', heroImage2: '', showBrandText: true,
  companyName: 'Metrikmirror, Lda.', nif: '', address: '', postcode: '', city: '',
  email: '', phone: '', whatsapp: '', hours: 'Segunda a sexta, 9h00–13h00 e 14h00–18h00',
  instagram: '', facebook: '', linkedin: '',
  ralEntity: '', deliveryDays: '5 a 15 dias úteis',
  announcement: '', showDemoBar: true
};
const DEFAULT_CATEGORIES = [
  { slug: 'totens', name: 'Totens' }, { slug: 'paineis', name: 'Painéis' }, { slug: 'interativos', name: 'Interativos' }
];
function loadDb() {
  let db = {};
  try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch {}
  db.settings = { ...DEFAULT_SETTINGS, ...(db.settings || {}) };
  db.categories ||= DEFAULT_CATEGORIES;
  db.products ||= seedProducts.map((p, i) => ({ id: crypto.randomUUID(), active: true, featured: ['totem-outdoor-p25', 'totem-indoor-p25', 'painel-led-medida'].includes(p.slug), position: i, images: [], ...p }));
  db.orders ||= []; db.quotes ||= []; db.admin ||= {};
  return db;
}
let db = loadDb();
function save() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
  fs.renameSync(tmp, DB_FILE);
}
save();

/* ------------------------------------------------------------------ */
/* Autenticação do backoffice                                         */
/* ------------------------------------------------------------------ */
const SECRET = process.env.SESSION_SECRET || db.admin.secret || (db.admin.secret = crypto.randomBytes(32).toString('hex'));
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin').toLowerCase();
if (!db.admin.hash) {
  const initial = process.env.ADMIN_PASSWORD || crypto.randomBytes(6).toString('base64url');
  setPassword(initial);
  if (!process.env.ADMIN_PASSWORD) console.log(`\n*** Palavra-passe inicial do backoffice (utilizador "${ADMIN_EMAIL}"): ${initial} ***\n`);
}
save();
function setPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  db.admin.salt = salt; db.admin.hash = crypto.scryptSync(pw, salt, 64).toString('hex');
}
function checkPassword(pw) {
  const h = crypto.scryptSync(String(pw), db.admin.salt, 64);
  return crypto.timingSafeEqual(h, Buffer.from(db.admin.hash, 'hex'));
}
const sign = (v) => crypto.createHmac('sha256', SECRET).update(v).digest('base64url');
function makeToken() { const exp = Date.now() + 1000 * 60 * 60 * 12; const v = `${exp}.${db.admin.hash.slice(0, 8)}`; return `${v}.${sign(v)}`; }
function validToken(t) {
  if (!t) return false; const [exp, hv, sig] = t.split('.');
  if (!sig || sign(`${exp}.${hv}`) !== sig) return false;
  return +exp > Date.now() && hv === db.admin.hash.slice(0, 8); // mudar a palavra-passe invalida sessões
}
const cookie = (req, name) => (req.headers.cookie || '').split(';').map((s) => s.trim().split('=')).find(([k]) => k === name)?.[1];
function auth(req, res, next) { if (validToken(cookie(req, 'lw_admin'))) return next(); res.status(401).json({ error: 'Sessão expirada. Entre novamente.' }); }
const attempts = new Map();

/* ------------------------------------------------------------------ */
/* Utilitários                                                        */
/* ------------------------------------------------------------------ */
const str = (v, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const ref = (p) => `${p}-` + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
const slugify = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const publicProduct = ({ id, active, position, ...p }) => p;
const activeProducts = () => db.products.filter((p) => p.active).sort((a, b) => a.position - b.position).map(publicProduct);
const ORDER_STATUS = ['pendente', 'pago', 'em preparação', 'enviado', 'instalado', 'concluído', 'cancelado'];
const QUOTE_STATUS = ['novo', 'em análise', 'proposta enviada', 'ganho', 'perdido'];

/* Stripe webhook precisa do corpo em bruto (antes do express.json) */
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe || !STRIPE_WH) return res.sendStatus(400);
  let ev;
  try { ev = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], STRIPE_WH); } catch (e) { return res.status(400).send(`Webhook: ${e.message}`); }
  const s = ev.data.object;
  const o = db.orders.find((x) => x.stripeSession === s.id);
  if (o) {
    if (ev.type === 'checkout.session.completed' || ev.type === 'checkout.session.async_payment_succeeded') {
      if (s.payment_status === 'paid') { o.status = 'pago'; o.paidAt = new Date().toISOString(); }
      else o.paymentNote = 'A aguardar pagamento (Multibanco)';
    }
    if (ev.type === 'checkout.session.async_payment_failed' || ev.type === 'checkout.session.expired') o.paymentNote = 'Pagamento não concluído';
    o.history.push({ at: new Date().toISOString(), text: `Stripe: ${ev.type}` });
    save();
  }
  res.json({ received: true });
});

app.use(express.json({ limit: '12mb' }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

/* ------------------------------------------------------------------ */
/* API pública                                                        */
/* ------------------------------------------------------------------ */
app.get('/api/config', (req, res) => res.json({ payments: stripe ? 'stripe' : 'demo', settings: db.settings, categories: db.categories }));
app.get('/api/products', (req, res) => res.json(activeProducts()));

app.post('/api/checkout', async (req, res) => {
  const { items, customer } = req.body || {};
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Carrinho vazio.' });
  const lines = [];
  for (const it of items.slice(0, 30)) {
    const p = db.products.find((x) => x.slug === it.slug && x.active);
    const qty = Math.max(1, Math.min(50, parseInt(it.qty, 10) || 1));
    if (!p || !p.price) return res.status(400).json({ error: 'Há um produto no carrinho que já não está disponível.' });
    lines.push({ slug: p.slug, name: p.name, unit: p.price, qty });
  }
  const c = {
    name: str(customer?.name), company: str(customer?.company), nif: str(customer?.nif, 20),
    email: str(customer?.email).toLowerCase(), phone: str(customer?.phone, 30), address: str(customer?.address),
    postcode: str(customer?.postcode, 10), city: str(customer?.city, 80), notes: str(customer?.notes, 1000)
  };
  if (!c.name || !/^\S+@\S+\.\S+$/.test(c.email) || !c.address || !/^\d{4}-\d{3}$/.test(c.postcode)) {
    return res.status(400).json({ error: 'Preencha nome, email, morada e código postal (formato 0000-000).' });
  }
  const total = lines.reduce((s, l) => s + l.unit * l.qty, 0);
  const now = new Date().toISOString();
  const order = { id: crypto.randomUUID(), ref: ref('LW'), createdAt: now, status: 'pendente', lines, total, customer: c, notes: '', mode: stripe ? 'stripe' : 'manual', history: [{ at: now, text: 'Encomenda criada no site' }] };

  if (!stripe) { db.orders.push(order); save(); return res.json({ mode: 'demo', ref: order.ref, total }); }
  try {
    const origin = `${req.protocol}://${req.get('host')}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lines.map((l) => ({ quantity: l.qty, price_data: { currency: 'eur', unit_amount: l.unit, product_data: { name: l.name } } })),
      customer_email: c.email, locale: 'pt', tax_id_collection: { enabled: true },
      metadata: { ref: order.ref, nif: c.nif },
      success_url: `${origin}/#/sucesso?ref=${order.ref}`, cancel_url: `${origin}/#/carrinho`
    });
    order.stripeSession = session.id; db.orders.push(order); save();
    res.json({ mode: 'stripe', url: session.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Não foi possível iniciar o pagamento. Tente novamente.' });
  }
});

app.post('/api/quote', (req, res) => {
  const b = req.body || {};
  const now = new Date().toISOString();
  const q = {
    id: crypto.randomUUID(), ref: ref('ORC'), createdAt: now, status: 'novo', notes: '',
    type: str(b.type, 40) || 'compra', product: str(b.product, 80), name: str(b.name), company: str(b.company),
    email: str(b.email).toLowerCase(), phone: str(b.phone, 30), city: str(b.city, 80), message: str(b.message, 2000),
    history: [{ at: now, text: 'Pedido recebido no site' }]
  };
  if (!q.name || (!q.email && !q.phone)) return res.status(400).json({ error: 'Indique o nome e um email ou telefone.' });
  db.quotes.push(q); save();
  res.json({ ok: true, ref: q.ref });
});

/* ------------------------------------------------------------------ */
/* API do backoffice                                                  */
/* ------------------------------------------------------------------ */
const A = express.Router();
A.post('/login', (req, res) => {
  const ip = req.ip; const a = attempts.get(ip) || { n: 0, t: Date.now() };
  if (Date.now() - a.t > 15 * 60e3) { a.n = 0; a.t = Date.now(); }
  if (a.n >= 8) return res.status(429).json({ error: 'Demasiadas tentativas. Aguarde 15 minutos.' });
  const { user, password } = req.body || {};
  if (String(user || '').toLowerCase() !== ADMIN_EMAIL || !checkPassword(password || '')) {
    a.n++; attempts.set(ip, a); return res.status(401).json({ error: 'Utilizador ou palavra-passe incorretos.' });
  }
  attempts.delete(ip);
  res.setHeader('Set-Cookie', `lw_admin=${makeToken()}; HttpOnly; Path=/; SameSite=Strict; Max-Age=43200${req.secure ? '; Secure' : ''}`);
  res.json({ ok: true });
});
A.post('/logout', (req, res) => { res.setHeader('Set-Cookie', 'lw_admin=; HttpOnly; Path=/; Max-Age=0'); res.json({ ok: true }); });
A.use(auth);
A.get('/me', (req, res) => res.json({ user: ADMIN_EMAIL, payments: stripe ? 'stripe' : 'demo', webhook: !!STRIPE_WH }));

A.get('/dashboard', (req, res) => {
  const valid = db.orders.filter((o) => o.status !== 'cancelado');
  const paid = valid.filter((o) => o.status !== 'pendente');
  const since = Date.now() - 30 * 864e5;
  res.json({
    orders: db.orders.length, pendingOrders: db.orders.filter((o) => o.status === 'pendente').length,
    revenue: paid.reduce((s, o) => s + o.total, 0),
    revenue30: paid.filter((o) => Date.parse(o.createdAt) > since).reduce((s, o) => s + o.total, 0),
    newQuotes: db.quotes.filter((q) => q.status === 'novo').length, quotes: db.quotes.length,
    products: db.products.length, activeProducts: db.products.filter((p) => p.active).length,
    recentOrders: db.orders.slice(-6).reverse(), recentQuotes: db.quotes.slice(-6).reverse()
  });
});

// Produtos
A.get('/products', (req, res) => res.json([...db.products].sort((a, b) => a.position - b.position)));
function cleanProduct(b, existing = {}) {
  const lines = (v) => (Array.isArray(v) ? v : String(v || '').split('\n')).map((s) => String(s).trim()).filter(Boolean).slice(0, 30);
  const specs = {};
  if (b.specs && typeof b.specs === 'object' && !Array.isArray(b.specs)) Object.entries(b.specs).forEach(([k, v]) => { if (k.trim()) specs[k.trim().slice(0, 60)] = String(v).slice(0, 200); });
  const money = (v) => (v === '' || v === null || v === undefined ? null : Math.round(parseFloat(String(v).replace(',', '.')) * 100) || null);
  const eurInt = (v) => (v === '' || v === null || v === undefined ? null : Math.round(parseFloat(String(v).replace(',', '.'))) || null);
  const rental = eurInt(b.rentalFirstDay) ? { firstDay: eurInt(b.rentalFirstDay), extraDay: eurInt(b.rentalExtraDay) || 0 } : null;
  return {
    ...existing,
    name: str(b.name, 120) || existing.name, slug: slugify(b.slug || b.name || existing.slug),
    category: db.categories.some((c) => c.slug === b.category) ? b.category : db.categories[0].slug,
    art: ['totem', 'totem-out', 'touch', 'floor', 'elevator', 'board', 'wall'].includes(b.art) ? b.art : 'totem',
    tagline: str(b.tagline, 200), description: str(b.description, 4000),
    highlights: lines(b.highlights), specs, images: lines(b.images).filter((u) => /^(https?:\/\/|\/uploads\/)/.test(u)).slice(0, 10),
    quoteOnly: !!b.quoteOnly, price: b.quoteOnly ? null : money(b.price), rental,
    active: b.active !== false, featured: !!b.featured, stockNote: str(b.stockNote, 80),
    updatedAt: new Date().toISOString()
  };
}
A.post('/products', (req, res) => {
  const p = cleanProduct(req.body || {}, { id: crypto.randomUUID(), position: db.products.length, createdAt: new Date().toISOString() });
  if (!p.name) return res.status(400).json({ error: 'O produto precisa de um nome.' });
  if (db.products.some((x) => x.slug === p.slug)) p.slug += '-' + crypto.randomBytes(2).toString('hex');
  db.products.push(p); save(); res.json(p);
});
A.put('/products/:id', (req, res) => {
  const i = db.products.findIndex((p) => p.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Produto não encontrado.' });
  const p = cleanProduct(req.body || {}, db.products[i]);
  if (db.products.some((x) => x.slug === p.slug && x.id !== p.id)) return res.status(400).json({ error: 'Já existe outro produto com este endereço (slug).' });
  db.products[i] = p; save(); res.json(p);
});
A.post('/products/reorder', (req, res) => {
  (req.body?.ids || []).forEach((id, i) => { const p = db.products.find((x) => x.id === id); if (p) p.position = i; });
  save(); res.json({ ok: true });
});
A.post('/products/:id/duplicate', (req, res) => {
  const p = db.products.find((x) => x.id === req.params.id); if (!p) return res.sendStatus(404);
  const c = { ...structuredClone(p), id: crypto.randomUUID(), name: p.name + ' (cópia)', slug: p.slug + '-copia-' + crypto.randomBytes(2).toString('hex'), active: false, position: db.products.length };
  db.products.push(c); save(); res.json(c);
});
A.delete('/products/:id', (req, res) => { db.products = db.products.filter((p) => p.id !== req.params.id); save(); res.json({ ok: true }); });

// Imagens
A.post('/upload', (req, res) => {
  const m = /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,(.+)$/.exec(req.body?.data || '');
  if (!m) return res.status(400).json({ error: 'Formato de imagem não suportado (use JPG, PNG, WEBP ou GIF).' });
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 8 * 1024 * 1024) return res.status(400).json({ error: 'Imagem demasiado grande (máx. 8 MB).' });
  const ext = { png: 'png', jpeg: 'jpg', jpg: 'jpg', webp: 'webp', gif: 'gif', 'svg+xml': 'svg' }[m[1]];
  const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  res.json({ url: `/uploads/${name}` });
});

// Copia imagens externas (ex.: ledviewbrasil.com) para o servidor, para não depender do site de origem.
A.post('/products/localize-images', async (req, res) => {
  let copied = 0, failed = [];
  for (const p of db.products) {
    for (let i = 0; i < (p.images || []).length; i++) {
      const u = p.images[i]; if (!/^https?:\/\//.test(u)) continue;
      try {
        const r = await fetch(u, { signal: AbortSignal.timeout(15000) });
        const type = r.headers.get('content-type') || '';
        if (!r.ok || !type.startsWith('image/')) throw new Error(String(r.status));
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length > 8 * 1024 * 1024) throw new Error('grande');
        const ext = (type.split('/')[1] || 'jpg').replace('jpeg', 'jpg').replace('svg+xml', 'svg').split(';')[0];
        const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
        fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
        p.images[i] = `/uploads/${name}`; copied++;
      } catch { failed.push(u); }
    }
  }
  save(); res.json({ copied, failed });
});

// Encomendas
A.get('/orders', (req, res) => res.json([...db.orders].reverse()));
A.put('/orders/:id', (req, res) => {
  const o = db.orders.find((x) => x.id === req.params.id); if (!o) return res.sendStatus(404);
  const b = req.body || {};
  if (b.status && ORDER_STATUS.includes(b.status) && b.status !== o.status) { o.history.push({ at: new Date().toISOString(), text: `Estado: ${o.status} → ${b.status}` }); o.status = b.status; }
  if (typeof b.notes === 'string') o.notes = b.notes.slice(0, 4000);
  if (typeof b.invoice === 'string') o.invoice = b.invoice.slice(0, 60);
  if (typeof b.tracking === 'string') o.tracking = b.tracking.slice(0, 200);
  save(); res.json(o);
});
A.delete('/orders/:id', (req, res) => { db.orders = db.orders.filter((o) => o.id !== req.params.id); save(); res.json({ ok: true }); });

// Orçamentos
A.get('/quotes', (req, res) => res.json([...db.quotes].reverse()));
A.put('/quotes/:id', (req, res) => {
  const q = db.quotes.find((x) => x.id === req.params.id); if (!q) return res.sendStatus(404);
  const b = req.body || {};
  if (b.status && QUOTE_STATUS.includes(b.status) && b.status !== q.status) { q.history.push({ at: new Date().toISOString(), text: `Estado: ${q.status} → ${b.status}` }); q.status = b.status; }
  if (typeof b.notes === 'string') q.notes = b.notes.slice(0, 4000);
  if (b.value !== undefined) q.value = b.value === '' ? null : Math.round(parseFloat(String(b.value).replace(',', '.')) * 100) || null;
  save(); res.json(q);
});
A.delete('/quotes/:id', (req, res) => { db.quotes = db.quotes.filter((q) => q.id !== req.params.id); save(); res.json({ ok: true }); });

// Clientes (agregados das encomendas e orçamentos)
A.get('/customers', (req, res) => {
  const map = new Map();
  const touch = (key, base) => { if (!map.has(key)) map.set(key, { ...base, orders: 0, quotes: 0, spent: 0, last: '' }); return map.get(key); };
  db.orders.forEach((o) => { const c = touch(o.customer.email, { name: o.customer.name, company: o.customer.company, email: o.customer.email, phone: o.customer.phone, nif: o.customer.nif, city: o.customer.city }); c.orders++; if (o.status !== 'cancelado' && o.status !== 'pendente') c.spent += o.total; c.last = o.createdAt > c.last ? o.createdAt : c.last; });
  db.quotes.forEach((q) => { const c = touch(q.email || q.phone, { name: q.name, company: q.company, email: q.email, phone: q.phone, city: q.city }); c.quotes++; c.last = q.createdAt > c.last ? q.createdAt : c.last; });
  res.json([...map.values()].sort((a, b) => (b.last > a.last ? 1 : -1)));
});

// Exportação CSV
A.get('/export/:what.csv', (req, res) => {
  const csv = (rows) => rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  const eur = (c) => (c / 100).toFixed(2).replace('.', ',');
  let out;
  if (req.params.what === 'encomendas') out = csv([['Referência', 'Data', 'Estado', 'Cliente', 'Empresa', 'NIF', 'Email', 'Telefone', 'Morada', 'Código postal', 'Localidade', 'Produtos', 'Total (€)', 'Fatura'],
    ...db.orders.map((o) => [o.ref, o.createdAt.slice(0, 10), o.status, o.customer.name, o.customer.company, o.customer.nif, o.customer.email, o.customer.phone, o.customer.address, o.customer.postcode, o.customer.city, o.lines.map((l) => `${l.qty}x ${l.name}`).join(', '), eur(o.total), o.invoice || ''])]);
  else if (req.params.what === 'orcamentos') out = csv([['Referência', 'Data', 'Estado', 'Tipo', 'Produto', 'Nome', 'Empresa', 'Email', 'Telefone', 'Localidade', 'Mensagem', 'Valor proposta (€)'],
    ...db.quotes.map((q) => [q.ref, q.createdAt.slice(0, 10), q.status, q.type, q.product, q.name, q.company, q.email, q.phone, q.city, q.message, q.value ? eur(q.value) : ''])]);
  else return res.sendStatus(404);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.what}-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send('﻿' + out);
});

// Definições
A.get('/settings', (req, res) => res.json({ settings: db.settings, categories: db.categories }));
A.put('/settings', (req, res) => {
  const b = req.body || {};
  if (b.settings) for (const k of Object.keys(DEFAULT_SETTINGS)) if (k in b.settings) db.settings[k] = typeof DEFAULT_SETTINGS[k] === 'boolean' ? !!b.settings[k] : str(String(b.settings[k] ?? ''), 500);
  if (Array.isArray(b.categories)) {
    const cats = b.categories.map((c) => ({ slug: slugify(c.slug || c.name), name: str(c.name, 60) })).filter((c) => c.slug && c.name);
    if (cats.length) db.categories = cats;
  }
  for (const k of ['logo', 'favicon', 'heroImage1', 'heroImage2']) if (db.settings[k] && !/^(https:\/\/|\/uploads\/)/.test(db.settings[k])) db.settings[k] = '';
  db.settings.logoHeight = String(Math.min(120, Math.max(20, parseInt(db.settings.logoHeight, 10) || 40)));
  save(); res.json({ settings: db.settings, categories: db.categories });
});
A.post('/password', (req, res) => {
  const { current, next } = req.body || {};
  if (!checkPassword(current || '')) return res.status(400).json({ error: 'A palavra-passe atual está errada.' });
  if (!next || next.length < 8) return res.status(400).json({ error: 'A nova palavra-passe tem de ter pelo menos 8 caracteres.' });
  setPassword(next); save();
  res.setHeader('Set-Cookie', `lw_admin=${makeToken()}; HttpOnly; Path=/; SameSite=Strict; Max-Age=43200${req.secure ? '; Secure' : ''}`);
  res.json({ ok: true });
});
A.get('/backup', (req, res) => {
  const { admin, ...safe } = db;
  res.setHeader('Content-Disposition', `attachment; filename="ledwave-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(safe);
});
app.use('/api/admin', A);
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

app.listen(PORT, () => console.log(`LEDWAVE Portugal na porta ${PORT} (pagamentos: ${stripe ? 'Stripe' : 'demo'})`));
