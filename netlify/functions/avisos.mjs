// Agendada: a cada 15 min, das 6h às 22h45 (horário de Brasília). Manda os avisos da agenda que são de hoje, já passaram da hora e ainda não foram enviados.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const wp = require('../lib/webpush.js');
const { load, save } = require('../lib/pushstore.js');
export default async () => {
  const env = process.env; if (!env.NOTION_TOKEN || !env.NOTION_DB) return new Response('sem variáveis', { status: 500 });
  const { row, st } = await load(env); if (!row || !st.pub || !(st.subs || []).length) return new Response('sem aparelhos');
  const pt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()), g = t => pt.find(x => x.type === t).value;
  const hoje = `${g('year')}-${g('month')}-${g('day')}`, agora = +g('hour') * 60 + +g('minute'), mins = a => { const [h, m] = String(a.at || '08:00').split(':'); return +h * 60 + +m; };
  st.sent = st.sent || {}; const dev = (st.agenda || []).filter(a => a.date === hoje && mins(a) <= agora && agora - mins(a) <= 240 && !st.sent[a.id]);
  if (!dev.length) return new Response('nada para hoje');
  const V = { pub: st.pub, priv: st.priv, sub: 'https://meudiaa.netlify.app' };
  let n = 0;
  for (const a of dev) {
    let algum = false;
    for (const s of st.subs.slice()) { try { await wp.send(s, { title: a.title, body: a.body, tag: a.id }, V); algum = true; } catch (e) { if (e.statusCode === 404 || e.statusCode === 410) st.subs = st.subs.filter(x => x.endpoint !== s.endpoint); } }
    if (algum) { st.sent[a.id] = hoje; n++; }
  }
  await save(env, row, st); console.log('avisos enviados', n);
  return new Response('enviados ' + n);
};
export const config = { schedule: '*/15 9-23,0-1 * * *' };
