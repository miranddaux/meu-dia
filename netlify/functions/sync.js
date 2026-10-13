// Recebe o resumo do dia do app Meu Dia e grava no Notion (cria ou atualiza a linha do dia).
// Variáveis no Netlify: NOTION_TOKEN (integração do Notion), NOTION_DB (id do banco), APP_KEY (senha do app).
const N = 'https://api.notion.com/v1';
const H = t => ({ Authorization: `Bearer ${t}`, 'Notion-Version': '2022-06-28', 'content-type': 'application/json' });
const txt = s => [{ type: 'text', text: { content: String(s || '').slice(0, 1900) } }];
exports.handler = async event => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'POST only' };
  const { NOTION_TOKEN, NOTION_DB, APP_KEY } = process.env;
  if (!NOTION_TOKEN || !NOTION_DB || !APP_KEY) return { statusCode: 500, body: 'Faltam variáveis no Netlify' };
  if ((event.headers['x-app-key'] || '') !== APP_KEY) return { statusCode: 401, body: 'Chave inválida' };
  let d; try { d = JSON.parse(event.body); } catch (e) { return { statusCode: 400, body: 'JSON inválido' }; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date || '')) return { statusCode: 400, body: 'Data inválida' };
  const num = v => (typeof v === 'number' && isFinite(v) ? v : null);
  const props = {
    Dia: { title: txt(`${d.date.split('-').reverse().join('/')} · ${d.missoesPct}% das missões`) },
    Data: { date: { start: d.date } },
    'Missões %': { number: num(d.missoesPct) }, 'Estudo feito': { checkbox: !!d.estudo }, Pomodoros: { number: num(d.pomodoros) }, 'Lições': { number: num(d.licoes) },
    'Água (L)': { number: num(d.aguaL) }, Treino: { rich_text: txt(d.treino) }, kcal: { number: num(d.kcal) }, 'Proteína (g)': { number: num(d.prot) },
    'Peso (kg)': { number: num(d.peso) }, Desafios: { rich_text: txt(d.desafios) }, Humor: { number: num(d.humor) }, Energia: { number: num(d.energia) },
    Moedas: { number: num(d.moedas) }, 'Roda da vida': { rich_text: txt(d.vida) }, Resumo: { rich_text: txt(d.resumo) }
  };
  try {
    const q = await fetch(`${N}/databases/${NOTION_DB}/query`, { method: 'POST', headers: H(NOTION_TOKEN), body: JSON.stringify({ filter: { property: 'Data', date: { equals: d.date } }, page_size: 1 }) });
    const qj = await q.json(); if (!q.ok) return { statusCode: 502, body: JSON.stringify(qj) };
    const id = qj.results && qj.results[0] && qj.results[0].id;
    const r = id ? await fetch(`${N}/pages/${id}`, { method: 'PATCH', headers: H(NOTION_TOKEN), body: JSON.stringify({ properties: props }) })
      : await fetch(`${N}/pages`, { method: 'POST', headers: H(NOTION_TOKEN), body: JSON.stringify({ parent: { database_id: NOTION_DB }, properties: props }) });
    if (!r.ok) return { statusCode: 502, body: await r.text() };
    return { statusCode: 200, body: JSON.stringify({ ok: true, updated: !!id }) };
  } catch (e) { return { statusCode: 500, body: String(e.message) }; }
};
