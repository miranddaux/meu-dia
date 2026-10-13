// Ponte com a planilha financeira (Google Sheets). GET lê o mês; POST marca "PAGO", soma ou lança uma linha nova.
// Variáveis no Netlify: GOOGLE_SA_JSON (chave da conta de serviço, JSON inteiro), SHEET_ID (id da planilha), APP_KEY (a mesma do app).
// A planilha precisa estar compartilhada (Editor) com o e-mail da conta de serviço. Nada é apagado.
const { MES, noPago, norm, token, parse, ensureTab, tabName, base } = require('../lib/planilha-lib.js');
exports.handler = async event => {
  const { GOOGLE_SA_JSON, SHEET_ID, APP_KEY } = process.env;
  if (!GOOGLE_SA_JSON || !SHEET_ID || !APP_KEY) return { statusCode: 500, body: 'Faltam variáveis no Netlify (GOOGLE_SA_JSON, SHEET_ID)' };
  if ((event.headers['x-app-key'] || '') !== APP_KEY) return { statusCode: 401, body: 'Chave inválida' };
  let sa; try { sa = JSON.parse(GOOGLE_SA_JSON); } catch (e) { return { statusCode: 500, body: 'GOOGLE_SA_JSON não é um JSON válido' }; }
  const body = event.httpMethod === 'POST' ? (() => { try { return JSON.parse(event.body); } catch (e) { return null; } })() : (event.queryStringParameters || {});
  if (!body || !/^\d{4}-\d{2}$/.test(body.month || '')) return { statusCode: 400, body: 'Mês inválido' };
  const [y, m] = body.month.split('-').map(Number); if (m < 1 || m > 12) return { statusCode: 400, body: 'Mês inválido' };
  const tab = tabName(y, m), vbase = base(SHEET_ID) + '/values/';
  try {
    const tk = await token(sa), H = { Authorization: 'Bearer ' + tk, 'content-type': 'application/json' };
    const read = async () => { const r = await fetch(vbase + encodeURIComponent(`'${tab}'!A1:G70`) + '?valueRenderOption=UNFORMATTED_VALUE', { headers: H }); const j = await r.json(); if (!r.ok) throw new Error((j.error && j.error.message) || 'Erro ao ler a planilha'); return j.values || []; };
    const put = async (cell, v) => { const r = await fetch(vbase + encodeURIComponent(`'${tab}'!${cell}`) + '?valueInputOption=USER_ENTERED', { method: 'PUT', headers: H, body: JSON.stringify({ values: [[v]] }) }); if (!r.ok) throw new Error('Erro ao escrever: ' + (await r.text()).slice(0, 200)); };
    const made = await ensureTab(SHEET_ID, tk, y, m, true);
    const rows = await read(), data = parse(rows);
    if (event.httpMethod !== 'POST') return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, tab, created: made.created, from: made.from, ...data }) };
    const ac = body.action, v = Math.round(Number(body.valor) * 100) / 100;
    const find = () => { const it = data.despesas.find(x => x.row === body.row); if (!it || norm(it.desc) !== norm(body.desc)) throw new Error('A linha mudou na planilha. Atualize e tente de novo.'); return it; };
    if (ac === 'pago') { const it = find(); await put('F' + it.row, it.desc + (body.paid ? ' PAGO' : '')); }
    else if (ac === 'soma') { const it = find(); if (!isFinite(v) || v <= 0) throw new Error('Valor inválido'); await put('G' + it.row, Math.round((it.valor + v) * 100) / 100); }
    else if (ac === 'entrada') { const it = data.entradas.find(x => x.row === body.row); if (!it || norm(it.desc) !== norm(body.desc)) throw new Error('A linha mudou na planilha. Atualize e tente de novo.'); if (!isFinite(v) || v <= 0) throw new Error('Valor inválido'); await put('C' + it.row, Math.round((it.valor + v) * 100) / 100); }
    else if (ac === 'nova') {
      if (!isFinite(v) || v <= 0) throw new Error('Valor inválido');
      const slot = data.despesas.find(x => x.livre && !x.valor); if (!slot) throw new Error('Sem linha livre neste mês (LINHA VARIÁVEL).');
      await put('F' + slot.row, String(body.desc || 'Gasto').slice(0, 80)); await put('G' + slot.row, v);
    } else return { statusCode: 400, body: 'Ação inválida' };
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true }) };
  } catch (e) { return { statusCode: 502, body: String(e.message || e) }; }
};
