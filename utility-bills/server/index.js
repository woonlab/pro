import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { extractText, getDocumentProxy } from 'unpdf';
import { openDb, EDITABLE_FIELDS } from './db.js';
import { parseBillText } from './parser.js';
import { CATEGORIES, CATEGORY_KEYS } from './categories.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PORT = Number(process.env.PORT ?? 8080);
const DATA_DIR = path.resolve(process.env.DATA_DIR ?? path.join(ROOT, 'data'));
const FILES_DIR = path.join(DATA_DIR, 'files');
const PENDING_DIR = path.join(FILES_DIR, 'pending');
fs.mkdirSync(PENDING_DIR, { recursive: true });

const db = openDb(DATA_DIR);
cleanupPending();

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(basicAuth());
app.use(express.static(path.join(ROOT, 'public')));
// Chart.js를 NAS에서 직접 제공한다(인터넷 없이 집 안에서만 써도 그래프가 나오도록)
app.use('/vendor', express.static(path.join(ROOT, 'node_modules', 'chart.js', 'dist')));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ── 고지서 분석 ───────────────────────────────────────────────
app.post('/api/parse', upload.single('file'), async (req, res) => {
  try {
    let text = req.body?.text ?? '';
    let pending = null;
    if (req.file) {
      const ext = fileExt(req.file.originalname);
      if (ext === '.pdf') text = await pdfToText(req.file.buffer);
      else if (ext === '.txt') text = decodeText(req.file.buffer);
      else return res.status(400).json({ error: 'PDF(.pdf) 또는 텍스트(.txt) 파일만 올릴 수 있습니다.' });
      pending = { id: `${crypto.randomUUID()}${ext}`, name: fixFileName(req.file.originalname) };
      fs.writeFileSync(path.join(PENDING_DIR, pending.id), req.file.buffer);
    }
    if (!text.trim()) {
      return res.status(400).json({
        error: req.file
          ? 'PDF에서 글자를 읽지 못했습니다. 스캔한 이미지 PDF일 수 있어요. 금액을 직접 입력해 주세요.'
          : '분석할 텍스트를 입력해 주세요.',
        pending_file: pending,
      });
    }
    res.json({ text, fields: parseBillText(text), pending_file: pending });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `분석 중 오류가 났습니다: ${err.message}` });
  }
});

// ── 공과금 CRUD ──────────────────────────────────────────────
app.get('/api/categories', (_req, res) => res.json(CATEGORIES));

app.get('/api/bills', (_req, res) => {
  const rows = db
    .prepare(`SELECT id, category, provider, billing_month, amount, usage, usage_unit, due_date, paid, memo,
                     file_name, file_path IS NOT NULL AS has_file, created_at, updated_at
              FROM bills ORDER BY billing_month DESC, category, id DESC`)
    .all();
  res.json(rows);
});

app.get('/api/bills/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM bills WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: '없는 항목입니다.' });
  delete row.file_path;
  res.json(row);
});

app.post('/api/bills', (req, res) => {
  const { value, error } = validate(req.body, true);
  if (error) return res.status(400).json({ error });

  let fileName = null;
  let filePath = null;
  const pf = req.body.pending_file;
  if (pf?.id) {
    if (!/^[0-9a-f-]{36}\.(pdf|txt)$/.test(pf.id)) return res.status(400).json({ error: '잘못된 파일 정보입니다.' });
    const src = path.join(PENDING_DIR, pf.id);
    if (fs.existsSync(src)) {
      filePath = pf.id;
      fileName = String(pf.name ?? pf.id).slice(0, 200);
      fs.renameSync(src, path.join(FILES_DIR, filePath));
    }
  }
  const rawText = typeof req.body.raw_text === 'string' ? req.body.raw_text.slice(0, 200_000) : null;

  const cols = [...Object.keys(value), 'file_name', 'file_path', 'raw_text'];
  const info = db
    .prepare(`INSERT INTO bills (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
    .run(...Object.values(value), fileName, filePath, rawText);
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

app.put('/api/bills/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT 1 FROM bills WHERE id = ?').get(id)) return res.status(404).json({ error: '없는 항목입니다.' });
  const { value, error } = validate(req.body, false);
  if (error) return res.status(400).json({ error });
  const keys = Object.keys(value);
  if (keys.length === 0) return res.json({ id });
  db.prepare(`UPDATE bills SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = datetime('now','localtime') WHERE id = ?`)
    .run(...Object.values(value), id);
  res.json({ id });
});

app.delete('/api/bills/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT file_path FROM bills WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: '없는 항목입니다.' });
  db.prepare('DELETE FROM bills WHERE id = ?').run(id);
  if (row.file_path) fs.rmSync(path.join(FILES_DIR, row.file_path), { force: true });
  res.status(204).end();
});

app.get('/api/bills/:id/file', (req, res) => {
  const row = db.prepare('SELECT file_name, file_path FROM bills WHERE id = ?').get(Number(req.params.id));
  if (!row?.file_path) return res.status(404).json({ error: '저장된 원본 파일이 없습니다.' });
  const ext = fileExt(row.file_path);
  res.type(ext === '.pdf' ? 'application/pdf' : 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(row.file_name ?? row.file_path)}`);
  res.sendFile(row.file_path, { root: FILES_DIR });
});

app.get('/api/export.csv', (_req, res) => {
  const label = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));
  const rows = db.prepare('SELECT * FROM bills ORDER BY billing_month, category').all();
  const head = ['청구월', '종류', '기관', '금액(원)', '사용량', '단위', '납기일', '납부', '메모'];
  const esc = (v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const lines = rows.map((r) =>
    [r.billing_month, label[r.category] ?? r.category, r.provider, r.amount, r.usage, r.usage_unit, r.due_date, r.paid ? 'Y' : 'N', r.memo]
      .map(esc).join(','));
  res.type('text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="bills.csv"`);
  res.send('﻿' + [head.join(','), ...lines].join('\r\n')); // BOM: 엑셀에서 한글 안 깨지게
});

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: '파일이 너무 큽니다(최대 20MB).' });
  res.status(err.status ?? err.statusCode ?? 500).json({ error: err.message });
});

app.listen(PORT, () => console.log(`공과금 정리 앱: http://localhost:${PORT}  (데이터: ${DATA_DIR})`));

// ── 도우미 ───────────────────────────────────────────────────
function validate(body, requireAll) {
  const out = {};
  for (const f of EDITABLE_FIELDS) {
    if (!(f in (body ?? {}))) continue;
    let v = body[f];
    if (v === '' || v === undefined) v = null;
    out[f] = v;
  }
  if (requireAll || 'category' in out) {
    if (!CATEGORY_KEYS.includes(out.category)) return { error: '종류를 선택해 주세요.' };
  }
  if (requireAll || 'billing_month' in out) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(out.billing_month ?? '')) return { error: '청구월을 YYYY-MM 형식으로 입력해 주세요.' };
  }
  if (requireAll || 'amount' in out) {
    const n = Number(String(out.amount ?? '').replace(/,/g, ''));
    if (!Number.isFinite(n) || n < 0 || out.amount === null) return { error: '금액을 숫자로 입력해 주세요.' };
    out.amount = Math.round(n);
  }
  if ('usage' in out && out.usage !== null) {
    const n = Number(String(out.usage).replace(/,/g, ''));
    if (!Number.isFinite(n) || n < 0) return { error: '사용량은 숫자로 입력해 주세요.' };
    out.usage = n;
  }
  if ('due_date' in out && out.due_date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(out.due_date)) {
    return { error: '납기일은 YYYY-MM-DD 형식이어야 합니다.' };
  }
  if ('paid' in out) out.paid = out.paid ? 1 : 0;
  for (const f of ['provider', 'usage_unit', 'memo']) {
    if (f in out && out[f] !== null) out[f] = String(out[f]).slice(0, 500);
  }
  return { value: out };
}

async function pdfToText(buffer) {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join('\n') : text;
}

function decodeText(buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('euc-kr').decode(buffer); // 윈도우 메모장의 옛 한글 인코딩
  }
}

function fileExt(name) {
  return path.extname(String(name)).toLowerCase();
}

// multer는 파일 이름을 latin1로 넘겨주므로 한글 이름을 UTF-8로 되돌린다
function fixFileName(name) {
  const fixed = Buffer.from(name, 'latin1').toString('utf8');
  return fixed.includes('�') ? name : fixed;
}

// 분석만 하고 저장하지 않은 파일은 하루 뒤 지운다
function cleanupPending() {
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  for (const f of fs.readdirSync(PENDING_DIR)) {
    const p = path.join(PENDING_DIR, f);
    if (fs.statSync(p).mtimeMs < dayAgo) fs.rmSync(p, { force: true });
  }
}

// APP_USER / APP_PASSWORD 환경 변수를 넣으면 로그인 창이 뜬다(외부에서 접속할 때 권장)
function basicAuth() {
  const user = process.env.APP_USER;
  const pass = process.env.APP_PASSWORD;
  if (!user || !pass) return (_req, _res, next) => next();
  const expected = Buffer.from(`${user}:${pass}`);
  return (req, res, next) => {
    const [scheme, encoded] = (req.headers.authorization ?? '').split(' ');
    const given = scheme === 'Basic' && encoded ? Buffer.from(encoded, 'base64') : Buffer.alloc(0);
    if (given.length === expected.length && crypto.timingSafeEqual(given, expected)) return next();
    res.setHeader('WWW-Authenticate', 'Basic realm="utility-bills", charset="UTF-8"');
    res.status(401).send('로그인이 필요합니다.');
  };
}
