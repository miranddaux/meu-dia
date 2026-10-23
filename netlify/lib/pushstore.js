// Guarda os avisos (chaves, aparelhos e agenda) numa linha do Notion: "PUSH (não apagar)", na coluna "Backup" do mesmo banco.
const N = 'https://api.notion.com/v1', TITLE = 'PUSH (não apagar)';
const H = t => ({ Authorization: `Bearer ${t}`, 'Notion-Version': '2022-06-28', 'content-type': 'application/json' });
async function load(env) {
  const { NOTION_TOKEN, NOTION_DB } = env;
  const q = await fetch(`${N}/databases/${NOTION_DB}/query`, { method: 'POST', headers: H(NOTION_TOKEN), body: JSON.stringify({ filter: { property: 'Dia', title: { equals: TITLE } }, page_size: 1 }) });
  const j = await q.json(); if (!q.ok) throw new Error('Notion: ' + JSON.stringify(j).slice(0, 200));
  const row = j.results && j.results[0]; let st = {};
  if (row) { const txt = ((row.properties.Backup && row.properties.Backup.rich_text) || []).map(p => p.plain_text || '').join(''); try { st = JSON.parse(txt) || {}; } catch (e) { st = {}; } }
  return { row, st };
}
async function save(env, row, st) {
  const { NOTION_TOKEN, NOTION_DB } = env, json = JSON.stringify(st), chunks = [];
  if (json.length > 190000) throw new Error('Estado dos avisos grande demais');
  for (let i = 0; i < json.length; i += 2000) chunks.push({ type: 'text', text: { content: json.slice(i, i + 2000) } });
  const props = { Backup: { rich_text: chunks } };
  const r = row
    ? await fetch(`${N}/pages/${row.id}`, { method: 'PATCH', headers: H(NOTION_TOKEN), body: JSON.stringify({ properties: props }) })
    : await fetch(`${N}/pages`, { method: 'POST', headers: H(NOTION_TOKEN), body: JSON.stringify({ parent: { database_id: NOTION_DB }, properties: Object.assign({ Dia: { title: [{ type: 'text', text: { content: TITLE } }] } }, props) }) });
  if (!r.ok) throw new Error('Notion: ' + (await r.text()).slice(0, 200));
  return r.json();
}
module.exports = { load, save };
