// Avisos no iPhone (Web Push). O app chama aqui para ligar os avisos, mandar a agenda e testar.
// Variáveis no Netlify: NOTION_TOKEN, NOTION_DB, APP_KEY (as mesmas do sync). As chaves dos avisos são criadas sozinhas.
const wp = require('../lib/webpush.js');
const { load, save } = require('../lib/pushstore.js');
const SUBJ = 'https://meudiaa.netlify.app';
const J = (c, o) => ({ statusCode: c, headers: { 'content-type': 'application/json' }, body: JSON.stringify(o) });
exports.handler = async event => {
  const { NOTION_TOKEN, NOTION_DB, APP_KEY } = process.env;
  if (!NOTION_TOKEN || !NOTION_DB || !APP_KEY) return J(500, { erro: 'Faltam variáveis no Netlify' });
  if ((event.headers['x-app-key'] || '') !== APP_KEY) return J(401, { erro: 'Chave inválida' });
  try {
    const { row, st } = await load(process.env);
    let dirty = false;
    if (!st.pub || !st.priv) { const k = wp.generateVAPIDKeys(); st.pub = k.publicKey; st.priv = k.privateKey; dirty = true; }
    st.subs = st.subs || []; st.agenda = st.agenda || []; st.sent = st.sent || {};
    if (event.httpMethod === 'GET') { if (dirty) await save(process.env, row, st); return J(200, { pub: st.pub, aparelhos: st.subs.length, agenda: st.agenda.length }); }
    let b; try { b = JSON.parse(event.body || '{}'); } catch (e) { return J(400, { erro: 'JSON inválido' }); }
    if (b.action === 'sub') {
      const s = b.sub; if (!s || !s.endpoint || !s.keys) return J(400, { erro: 'Aparelho inválido' });
      st.subs = st.subs.filter(x => x.endpoint !== s.endpoint).concat([{ endpoint: s.endpoint, keys: s.keys }]).slice(-4); dirty = true;
    } else if (b.action === 'off') { st.subs = st.subs.filter(x => x.endpoint !== b.endpoint); dirty = true; }
    else if (b.action === 'agenda') {
      const it = (Array.isArray(b.items) ? b.items : []).slice(0, 80).map(x => ({ id: String(x.id || '').slice(0, 90), date: String(x.date || ''), hour: [8, 12, 18].includes(+x.hour) ? +x.hour : 8, title: String(x.title || 'Meu Dia').slice(0, 80), body: String(x.body || '').slice(0, 200) })).filter(x => x.id && /^\d{4}-\d{2}-\d{2}$/.test(x.date));
      st.agenda = it; const ids = new Set(it.map(x => x.id)); Object.keys(st.sent).forEach(k => { if (!ids.has(k)) delete st.sent[k]; }); dirty = true;
    } else if (b.action === 'teste') {
      const V = { pub: st.pub, priv: st.priv, sub: SUBJ }; let ok = 0;
      for (const s of st.subs.slice()) { try { await wp.send(s, { title: 'Meu Dia', body: 'Os avisos estão ligados. Vou te lembrar só do que importa.', tag: 'teste' }, V); ok++; } catch (e) { if (e.statusCode === 404 || e.statusCode === 410) { st.subs = st.subs.filter(x => x.endpoint !== s.endpoint); dirty = true; } } }
      if (dirty) await save(process.env, row, st); return J(200, { ok: true, enviados: ok });
    } else return J(400, { erro: 'Ação inválida' });
    if (dirty) await save(process.env, row, st);
    return J(200, { ok: true, aparelhos: st.subs.length, agenda: st.agenda.length });
  } catch (e) { return J(502, { erro: String(e.message || e) }); }
};
