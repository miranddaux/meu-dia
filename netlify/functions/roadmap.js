// Lê (só lê) o Roadmap de Estudos no Notion e devolve o que importa para o app: atrasados, hoje e próximos dias.
// Usa as mesmas variáveis do sync: NOTION_TOKEN e APP_KEY. O id do Roadmap pode ser trocado por NOTION_ROADMAP_DB.
const N = 'https://api.notion.com/v1';
const ROADMAP = '031745177d054d95832de5ae4188279e';
const H = t => ({ Authorization: `Bearer ${t}`, 'Notion-Version': '2022-06-28', 'content-type': 'application/json' });
const plain = a => (a || []).map(x => x.plain_text).join('');
exports.handler = async event => {
  const { NOTION_TOKEN, APP_KEY, NOTION_ROADMAP_DB } = process.env;
  if (!NOTION_TOKEN || !APP_KEY) return { statusCode: 500, body: 'Faltam variáveis no Netlify' };
  if ((event.headers['x-app-key'] || '') !== APP_KEY) return { statusCode: 401, body: 'Chave inválida' };
  const q = event.queryStringParameters || {};
  const date = /^\d{4}-\d{2}-\d{2}$/.test(q.date || '') ? q.date : new Date().toISOString().slice(0, 10);
  const lim = new Date(date + 'T12:00:00Z'); lim.setUTCDate(lim.getUTCDate() + 7);
  const until = lim.toISOString().slice(0, 10);
  try {
    const r = await fetch(`${N}/databases/${NOTION_ROADMAP_DB || ROADMAP}/query`, {
      method: 'POST', headers: H(NOTION_TOKEN),
      body: JSON.stringify({
        filter: { and: [{ property: 'Status', select: { does_not_equal: 'Concluído' } }, { property: 'Data', date: { on_or_before: until } }] },
        sorts: [{ property: 'Data', direction: 'ascending' }], page_size: 40
      })
    });
    const j = await r.json(); if (!r.ok) return { statusCode: 502, body: JSON.stringify(j) };
    const items = (j.results || []).map(p => {
      const g = p.properties || {};
      return {
        id: p.id, url: p.url, title: plain(g['Tópico'] && g['Tópico'].title), date: g.Data && g.Data.date ? g.Data.date.start.slice(0, 10) : '',
        tipo: g.Tipo && g.Tipo.select ? g.Tipo.select.name : '', cat: g.Categoria && g.Categoria.select ? g.Categoria.select.name : '',
        status: g.Status && g.Status.select ? g.Status.select.name : '', xp: g.XP && typeof g.XP.number === 'number' ? g.XP.number : 0,
        crit: plain(g['Critério de conclusão'] && g['Critério de conclusão'].rich_text)
      };
    }).filter(x => x.title && x.date);
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, today: date, items }) };
  } catch (e) { return { statusCode: 500, body: String(e.message) }; }
};
