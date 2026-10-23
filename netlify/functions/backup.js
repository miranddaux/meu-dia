// Backup do app inteiro no Notion (uma linha "BACKUP (não apagar)" no mesmo banco do registro diário).
// GET devolve o último backup; POST grava um novo. Precisa da coluna "Backup" (texto) no banco.
// Variáveis no Netlify: NOTION_TOKEN, NOTION_DB, APP_KEY (as mesmas do sync).
const N = 'https://api.notion.com/v1';
const H = t => ({ Authorization: `Bearer ${t}`, 'Notion-Version': '2022-06-28', 'content-type': 'application/json' });
const TITLE = 'BACKUP (não apagar)';
const MAX = 195000; // 100 pedaços de 2000 letras é o limite de uma propriedade do Notion
exports.handler = async event => {
  const { NOTION_TOKEN, NOTION_DB, APP_KEY } = process.env;
  if (!NOTION_TOKEN || !NOTION_DB || !APP_KEY) return { statusCode: 500, body: 'Faltam variáveis no Netlify' };
  if ((event.headers['x-app-key'] || '') !== APP_KEY) return { statusCode: 401, body: 'Chave inválida' };
  try {
    const q = await fetch(`${N}/databases/${NOTION_DB}/query`, { method: 'POST', headers: H(NOTION_TOKEN), body: JSON.stringify({ filter: { property: 'Dia', title: { equals: TITLE } }, page_size: 1 }) });
    const qj = await q.json(); if (!q.ok) return { statusCode: 502, body: JSON.stringify(qj) };
    const row = qj.results && qj.results[0];
    if (event.httpMethod === 'GET') {
      if (!row) return { statusCode: 404, body: 'Ainda não existe backup na nuvem' };
      const parts = (row.properties.Backup && row.properties.Backup.rich_text) || [];
      const json = parts.map(p => p.plain_text || '').join('');
      if (!json) return { statusCode: 404, body: 'Backup vazio' };
      return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ json, at: row.last_edited_time }) };
    }
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'GET ou POST' };
    let d; try { d = JSON.parse(event.body); } catch (e) { return { statusCode: 400, body: 'JSON inválido' }; }
    const json = String(d.json || '');
    if (!json || json.length > MAX) return { statusCode: 413, body: 'Backup grande demais para o Notion (' + json.length + ')' };
    try { const t = JSON.parse(json); if (!t.schedule || !t.habits) throw 0; } catch (e) { return { statusCode: 400, body: 'Isso não parece um backup do Meu Dia' }; }
    const chunks = []; for (let i = 0; i < json.length; i += 2000) chunks.push({ type: 'text', text: { content: json.slice(i, i + 2000) } });
    const props = { Backup: { rich_text: chunks } };
    const r = row
      ? await fetch(`${N}/pages/${row.id}`, { method: 'PATCH', headers: H(NOTION_TOKEN), body: JSON.stringify({ properties: props }) })
      : await fetch(`${N}/pages`, { method: 'POST', headers: H(NOTION_TOKEN), body: JSON.stringify({ parent: { database_id: NOTION_DB }, properties: Object.assign({ Dia: { title: [{ type: 'text', text: { content: TITLE } }] } }, props) }) });
    if (!r.ok) return { statusCode: 502, body: await r.text() };
    return { statusCode: 200, body: JSON.stringify({ ok: true, size: json.length, created: !row }) };
  } catch (e) { return { statusCode: 500, body: String(e.message) }; }
};
