// One-time extraction: read views/original.html, pair TR/EN [data-lang] elements,
// assign data-key="kN" to both elements of each pair, save:
//   - views/template.html  (HTML with data-key attrs added)
//   - data/content.json    (map of keys to { tr, en, label })
//
// Run:  node extract.js
//
// Re-running is safe — it always rebuilds from views/original.html.

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ORIGINAL = path.join(__dirname, 'views', 'original.html');
const TEMPLATE_OUT = path.join(__dirname, 'views', 'template.html');
const CONTENT_OUT = path.join(__dirname, 'data', 'content.json');

const html = fs.readFileSync(ORIGINAL, 'utf8');
const $ = cheerio.load(html, { decodeEntities: false });

// Manual override of button copy — less robotic, more "human"
const COPY_OVERRIDES = {
  // matched by Turkish text content
  'Başvur →': { tr: 'Aramıza Katıl', en: 'Take a Seat' },
  'Başvuruya Git': { tr: 'Yerini Şimdi Ayır', en: 'Claim Your Seat' },
  'Forum Hakkında': { tr: 'Forumu Tanı', en: 'Inside the Forum' },
};

const content = {};
const seen = new WeakSet();
let counter = 0;

const all = $('[data-lang]').toArray();

for (let i = 0; i < all.length; i++) {
  const el = all[i];
  if (seen.has(el)) continue;

  const lang = $(el).attr('data-lang');
  if (lang !== 'tr') continue; // pair always starts with TR (active-lang)

  // Find matching EN partner (next [data-lang="en"] sibling at same level)
  let partner = null;
  let next = el.next;
  while (next) {
    if (next.type === 'tag' && $(next).attr && $(next).attr('data-lang') === 'en') {
      partner = next;
      break;
    }
    if (next.type === 'tag') break; // stop on any other tag
    next = next.next;
  }

  counter += 1;
  const key = `k${String(counter).padStart(3, '0')}`;

  // Strip stray JS-style escape sequences that leaked into the HTML source
  // (e.g. "Avrupa\'nın" -> "Avrupa'nın"). Only touches \' and \"
  const cleanEscapes = (s) => (s == null ? s : s.replace(/\\'/g, "'").replace(/\\"/g, '"'));

  const trText = cleanEscapes($(el).html());
  const enText = partner ? cleanEscapes($(partner).html()) : '';

  // Apply overrides
  const trim = (s) => (s || '').replace(/\s+/g, ' ').trim();
  let trVal = trText;
  let enVal = enText;
  const trKey = trim(trText);
  if (COPY_OVERRIDES[trKey]) {
    trVal = COPY_OVERRIDES[trKey].tr;
    enVal = COPY_OVERRIDES[trKey].en;
  }

  // Build a short human-readable label for admin UI
  const plain = $('<div>').html(trVal).text().replace(/\s+/g, ' ').trim();
  const label = plain.length > 60 ? plain.slice(0, 60) + '…' : plain;

  content[key] = {
    tr: trVal,
    en: enVal,
    label: label || `(boş #${counter})`,
    section: detectSection($, el),
  };

  $(el).attr('data-key', key);
  if (partner) $(partner).attr('data-key', key);

  seen.add(el);
  if (partner) seen.add(partner);
}

function detectSection($, el) {
  // Walk up to find the nearest <section> id or class to group fields
  let cur = el;
  while (cur && cur.parent) {
    cur = cur.parent;
    if (cur.name === 'section') {
      const id = $(cur).attr('id');
      if (id) return id;
      const cls = ($(cur).attr('class') || '').split(/\s+/)[0];
      if (cls) return cls;
    }
    if (cur.name === 'nav') return 'nav';
    if (cur.name === 'footer') return 'footer';
  }
  return 'genel';
}

fs.writeFileSync(TEMPLATE_OUT, $.html(), 'utf8');
fs.mkdirSync(path.dirname(CONTENT_OUT), { recursive: true });
fs.writeFileSync(CONTENT_OUT, JSON.stringify(content, null, 2), 'utf8');

console.log(`✔ ${counter} text pairs extracted`);
console.log(`✔ template:  ${TEMPLATE_OUT}`);
console.log(`✔ content:   ${CONTENT_OUT}`);
