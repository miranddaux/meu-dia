// Funções compartilhadas da ponte com a planilha (usadas por planilha.js e mes-novo.mjs).
// Variáveis no Netlify: GOOGLE_SA_JSON (chave da conta de serviço, JSON inteiro), SHEET_ID (id da planilha), APP_KEY (a mesma do app).
// A planilha precisa estar compartilhada (Editor) com o e-mail da conta de serviço. Nada é apagado.
const crypto = require('crypto');
const MES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const b64 = o => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const noPago = s => String(s || '').replace(/\s*PAGO\s*$/i, '').trim();
async function token(sa) {
  const now = Math.floor(Date.now() / 1000), head = b64({ alg: 'RS256', typ: 'JWT' });
  const claim = b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3000 });
  const sig = crypto.createSign('RSA-SHA256').update(head + '.' + claim).sign(sa.private_key, 'base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + head + '.' + claim + '.' + sig });
  const j = await r.json(); if (!r.ok) throw new Error('Google recusou a chave: ' + (j.error_description || j.error));
  return j.access_token;
}
function parse(rows) {
  const entradas = [], despesas = []; let grupo = '', sobra = null;
  rows.forEach((r, i) => {
    const row = i + 1; if (row < 6) return; // linha 6 é a primeira de dados (salário e o 1º gasto)
    const B = r[1], C = r[2], E = r[4], F = r[5], G = r[6];
    if (E && String(E).trim()) grupo = String(E).trim();
    if (B && /^SE SUA PLANILHA/i.test(String(B))) { if (typeof C === 'number') sobra = C; return; }
    if (B && typeof C === 'number' && !/^(TOTAL|NESTE|SE )/i.test(String(B))) entradas.push({ row, desc: String(B).trim(), valor: C });
    if (F && !/^TOTAL/i.test(String(F)) && !/^Se não/i.test(String(F))) {
      const d = String(F).trim(); despesas.push({ row, grupo, desc: noPago(d), pago: /\sPAGO$/i.test(d), valor: typeof G === 'number' ? G : 0, livre: /^LINHA VARI/i.test(d) });
    }
  });
  return { entradas, despesas, sobra };
}

// Linhas de gasto por grupo (ESSENCIAIS, NÃO ESSENCIAIS…): começa na linha 6, o grupo muda quando a coluna E tem texto, para no TOTAL.
function grupos(rows) {
  const out = []; let g = null;
  for (let i = 5; i < rows.length; i++) {
    const r = rows[i] || [], E = r[4] != null ? String(r[4]).trim() : '', F = r[5] != null ? String(r[5]).trim() : '';
    if (/^TOTAL/i.test(E) || /^TOTAL/i.test(F)) break;
    if (E) { g = []; out.push(g); }
    if (g && F) g.push({ row: i + 1, F, G: typeof r[6] === 'number' ? r[6] : (Number(r[6]) || 0) });
  }
  return out;
}
// Deixa cada grupo em sequência: gastos um embaixo do outro (na mesma ordem) e as "LINHA VARIÁVEL" vazias no fim.
// Nada some e os totais não mudam: só a posição. Devolve as escritas necessárias comparando com `antes` (padrão: as próprias linhas).
function ordenar(rows, tab, antes) {
  const cur = grupos(rows), old = grupos(antes || rows), byRow = {}, data = [];
  old.flat().forEach(x => { byRow[x.row] = x; });
  const livre = x => /^LINHA VARI/i.test(x.F) && !x.G;
  cur.forEach(gr => {
    const ord = gr.filter(x => !livre(x)).concat(gr.filter(livre));
    ord.forEach((x, k) => { const row = gr[k].row, o = byRow[row]; if (!o || o.F !== x.F || Math.abs(o.G - x.G) > 0.004) data.push({ range: `'${tab}'!F${row}:G${row}`, values: [[x.F, x.G]] }); });
  });
  return data;
}
// Prepara as linhas do mês seguinte: tira " PAGO" e avança "(PARCELA n/N)". Quando a parcela era a última, a linha vira LINHA VARIÁVEL com 0.
function proximoMes(orig) {
  return orig.map((r, i) => {
    const F = r && r[5]; if (i < 5 || typeof F !== 'string' || !F.trim() || /^TOTAL/i.test(F)) return r;
    const c = r.slice(); let f = noPago(F);
    const m = f.match(/PARCELA\s*(\d+)\s*\/\s*(\d+)/i);
    if (m) { const n = +m[1], N = +m[2]; if (n >= N) { f = 'LINHA VARIÁVEL'; c[6] = 0; } else f = f.replace(m[0], m[0].replace(/\d+(?=\s*\/)/, String(n + 1))); }
    c[5] = f; return c;
  });
}

const base = id => `https://sheets.googleapis.com/v4/spreadsheets/${id}`;
const tabName = (y, m) => `${MES[m - 1]} | ${y}`;
async function api(url, tk, opt = {}) {
  const r = await fetch(url, { ...opt, headers: { Authorization: 'Bearer ' + tk, 'content-type': 'application/json' } });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error((j.error && j.error.message) || 'Erro do Google (' + r.status + ')');
  return j;
}
// Garante que a aba do mês existe. Se não existir, duplica a aba do mês anterior (ou a mais recente), tira os "PAGO" e devolve {created, from}.
async function ensureTab(sheetId, tk, y, m, onlyNear) {
  const meta = await api(`${base(sheetId)}?fields=sheets.properties(sheetId,title,index)`, tk);
  const tabs = meta.sheets.map(s => s.properties), want = tabName(y, m);
  if (tabs.find(t => t.title === want)) return { created: false, tab: want };
  if (onlyNear) { const n = new Date(), d = (y * 12 + m) - (n.getFullYear() * 12 + n.getMonth() + 1); if (d < 0 || d > 1) throw new Error('Não existe aba para ' + want + ' na planilha.'); }
  let src = null, yy = y, mm = m;
  for (let i = 0; i < 24 && !src; i++) { mm--; if (mm < 1) { mm = 12; yy--; } src = tabs.find(t => t.title === tabName(yy, mm)); }
  if (!src) throw new Error('Não achei uma aba de mês para copiar.');
  const last = Math.max(...tabs.map(t => t.index));
  await api(`${base(sheetId)}:batchUpdate`, tk, { method: 'POST', body: JSON.stringify({ requests: [{ duplicateSheet: { sourceSheetId: src.sheetId, newSheetName: want, insertSheetIndex: last + 1 } }] }) });
  // no mês novo: tira os "PAGO", avança as parcelas (5/12 vira 6/12; a última vira LINHA VARIÁVEL) e deixa tudo em sequência
  const orig = (await api(`${base(sheetId)}/values/${encodeURIComponent(`'${want}'!A1:G70`)}?valueRenderOption=UNFORMATTED_VALUE`, tk)).values || [];
  const rows = proximoMes(orig), data = ordenar(rows, want, orig);
  if (data.length) await api(`${base(sheetId)}/values:batchUpdate`, tk, { method: 'POST', body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data }) });
  return { created: true, tab: want, from: src.title };
}
module.exports = { MES, noPago, norm, token, parse, ensureTab, tabName, base, ordenar, proximoMes };
