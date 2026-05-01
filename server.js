const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'gencdernegi2026';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-prod-please';

const TEMPLATE_PATH = path.join(__dirname, 'views', 'template.html');
const CONTENT_PATH = path.join(__dirname, 'data', 'content.json');
const ADMIN_VIEW = path.join(__dirname, 'views', 'admin.html');
const LOGIN_VIEW = path.join(__dirname, 'views', 'login.html');

// ---- in-memory cache, reload on edit -----------------------------------
let TEMPLATE = fs.readFileSync(TEMPLATE_PATH, 'utf8');
let CONTENT = JSON.parse(fs.readFileSync(CONTENT_PATH, 'utf8'));

function reloadContent() {
  CONTENT = JSON.parse(fs.readFileSync(CONTENT_PATH, 'utf8'));
}
function saveContent(next) {
  fs.writeFileSync(CONTENT_PATH, JSON.stringify(next, null, 2), 'utf8');
  CONTENT = next;
}

// ---- public site --------------------------------------------------------
function renderSite() {
  const $ = cheerio.load(TEMPLATE, { decodeEntities: false });
  $('[data-key]').each((_, el) => {
    const key = $(el).attr('data-key');
    const lang = $(el).attr('data-lang');
    const item = CONTENT[key];
    if (!item) return;
    const value = lang === 'en' ? item.en : item.tr;
    if (value != null) $(el).html(value);
  });
  return $.html();
}

app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(express.json({ limit: '2mb' }));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 },
  })
);

app.get('/', (_req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(renderSite());
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));

// ---- auth helpers -------------------------------------------------------
function requireAuth(req, res, next) {
  if (req.session && req.session.authed) return next();
  return res.redirect('/admin/login');
}

// ---- admin --------------------------------------------------------------
app.get('/admin/login', (_req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(fs.readFileSync(LOGIN_VIEW, 'utf8'));
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.authed = true;
    return res.redirect('/admin');
  }
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.status(401).send(
    fs
      .readFileSync(LOGIN_VIEW, 'utf8')
      .replace('<!--ERROR-->', '<div class="err">Kullanıcı adı veya şifre hatalı.</div>')
  );
});

app.post('/admin/logout', requireAuth, (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

app.get('/admin', requireAuth, (_req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(fs.readFileSync(ADMIN_VIEW, 'utf8'));
});

// JSON API for the admin UI
app.get('/admin/api/content', requireAuth, (_req, res) => {
  reloadContent();
  res.json(CONTENT);
});

app.post('/admin/api/content', requireAuth, (req, res) => {
  const next = req.body;
  if (!next || typeof next !== 'object') {
    return res.status(400).json({ error: 'invalid payload' });
  }
  // Merge — never let admin nuke unknown keys, only update tr/en values
  const merged = { ...CONTENT };
  for (const k of Object.keys(next)) {
    if (!merged[k]) continue;
    const incoming = next[k] || {};
    merged[k] = {
      ...merged[k],
      tr: typeof incoming.tr === 'string' ? incoming.tr : merged[k].tr,
      en: typeof incoming.en === 'string' ? incoming.en : merged[k].en,
    };
  }
  saveContent(merged);
  res.json({ ok: true, count: Object.keys(merged).length });
});

app.listen(PORT, () => {
  console.log(`▶ Speak Up Youth on :${PORT}`);
  console.log(`▶ admin: /admin  (user: ${ADMIN_USER})`);
});
