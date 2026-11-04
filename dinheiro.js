'use strict';
/* Dinheiro — controle financeiro do Meu Dia.
   Os números reais NÃO ficam neste código: o plano é importado de um arquivo JSON (Mais, Dinheiro, Importar)
   e fica só no aparelho (localStorage, dentro de S.din). Aqui só tem um exemplo fictício. */
const DIN_MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const dMl = mo => DIN_MES[+mo.slice(5, 7) - 1] + '/' + mo.slice(2, 4);
const DIN_VAR = { Mercado: 'mercado', Transporte: 'gasolina', Lazer: 'lazer' }; /* categorias do Porkinho que contam como gasto variável do plano */
const DIN_SKIP = ['Moradia', 'Assinaturas', 'Academia/Suplementos']; /* já estão no plano (fixos e assinaturas): não contar duas vezes */
const dinEssencial = f => f.essencial !== false; /* conta fixa é essencial por padrão; o usuário pode marcar explicitamente como não essencial. Dados pessoais continuam fora do repositório. */
const dinEx = () => { const m = dkey().slice(0, 7); return { exemplo: true, renda: { liquido: 3000, meta: [3500, 4000] }, cartao: { fecha: 19, vence: 25 }, fixos: [{ nome: 'Aluguel (exemplo)', valor: 900, prioridade: 1 }, { nome: 'Luz (exemplo)', valor: 120 }], assinaturas: [{ nome: 'Streaming (exemplo)', valor: 30 }], parcelas: [{ nome: 'Celular (exemplo)', valor: 150, total: 10, atual: 3, atualMes: m }], pontuais: [{ nome: 'Presente (exemplo)', valor: 80, mes: addMo(m, 1) }], variaveis: { mercado: 400, gasolina: 150, lazer: 150 }, colchao: { inicial: 0, programado: 100, folga: 50, metas: [{ valor: 500, ate: addMo(m, 5) }] }, sozinho: { mercado: 600, internet: 80 }, desejos: [{ nome: 'Fone (exemplo)', valor: 200, tipo: 'avista' }] }; };

/* ---------- dados ---------- */
const DIN_AUTO = /praia|imposto de renda|\bir\b|irpf|imprevist/i; /* coisas que o Miranda disse que não vão mais acontecer */
const DIN_NCARD = /serasa|empr[eé]st|jeitto|faccio|aline|nay|financ|casa|obra|mei/i; /* parcelas que NÃO são de cartão (padrão; dá para trocar em Parcelas) */
const dinHid = k => !!((S.din || {}).hide || {})[k];
const isCardP = p => { const o = (S.din || {}).cardP || {}; return o[p.nome] != null ? !!o[p.nome] : !DIN_NCARD.test(p.nome || ''); };
const dinS = () => { if (!S.din) S.din = {}; const d = S.din; d.hide = d.hide || {}; d.cardP = d.cardP || {};
  if (d.plan && !d.clean1) { d.clean1 = 1; const P = d.plan, h = (pre, a, f) => (a || []).forEach(x => { const n = f ? f(x) : x.nome; if (DIN_AUTO.test(n || '')) d.hide[pre + n] = 1; }); h('f:', P.fixos); h('a:', P.assinaturas); h('p:', P.parcelas); h('x:', P.pontuais); h('v:', Object.keys(P.variaveis || {}), x => x); }
  d.saved = d.saved || []; d.cards = d.cards || []; d.paid = d.paid || {}; d.fat = d.fat || {}; d.want = d.want || []; d.over = d.over || {}; d.extra = d.extra || {}; d.extra.fixos = d.extra.fixos || []; d.extra.parcelas = d.extra.parcelas || [];
  d.caixinhas = d.caixinhas || []; d.prem = d.prem || { selic: 13.75, cdi: 13.65, ipca: 4.5, at: '2026-09-16' };
  return d; };
/* plano efetivo = arquivo importado + ajustes e itens que você mexeu no app (sobrevivem a uma nova importação) */
function dinEff() {
  const d = dinS(), P = d.plan; if (!P) return null; const o = d.over, ex = d.extra;
  return Object.assign({}, P, { renda: Object.assign({}, P.renda, o.renda != null ? { liquido: o.renda } : {}), variaveis: Object.assign({}, P.variaveis, o.vars || {}), colchao: Object.assign({}, P.colchao, o.colch || {}), fixos: (P.fixos || []).concat(ex.fixos.map((f, i) => Object.assign({}, f, { _ex: i }))), parcelas: (P.parcelas || []).concat(ex.parcelas.map((p, i) => Object.assign({}, p, { _ex: i }))) });
}
const dinFolga = () => { const c = (dinEff() || {}).colchao || {}; return c.folga == null ? 100 : num(c.folga); };
const dinCardCfg = () => { const c = (dinS().plan || {}).cartao || {}; return { fecha: Math.round(num(c.fecha)) || 19, vence: Math.round(num(c.vence)) || 25 }; };
const dinCardMo = date => +date.slice(8, 10) <= dinCardCfg().fecha ? date.slice(0, 7) : addMo(date.slice(0, 7), 1);
const dinCardFlows = c => { const n = Math.max(1, Math.round(num(c.n)) || 1), f = dinCardMo(c.date), per = num(c.valor) / n; return Array.from({ length: n }, (_, i) => ({ mo: addMo(f, i), v: per, i: i + 1, n })); };
function dinPStart(p) {
  if (p.inicio) return p.inicio;
  const k = Object.keys(p).find(x => /^atual/i.test(x) && typeof p[x] === 'number'), at = k ? p[k] : 1;
  const base = p.atualMes || (k && (k.match(/(\d{4}-\d{2})/) || [])[1]) || dkey().slice(0, 7);
  return addMo(base, -(at - 1));
}
function dinParcelas() {
  const P = dinEff(), out = [];
  (P.parcelas || []).forEach(p => { if (p._ex === undefined && dinHid('p:' + p.nome)) return; const s = dinPStart(p); out.push({ nome: p.nome, valor: num(p.valor), total: p.total, start: s, end: addMo(s, p.total - 1), exi: p._ex }); });
  dinS().cards.forEach(c => { const f = dinCardFlows(c); if (f[0].n > 1) out.push({ nome: c.desc || 'Compra no cartão', valor: f[0].v, total: f[0].n, start: f[0].mo, end: f[f.length - 1].mo, card: true }); });
  return out;
}

/* ---------- motor de cálculo: um mês ---------- */
function dinMonth(mo, o) {
  o = o || {}; const P = dinEff(), d = dinS(), r = {}, ov = (d.shOv || {})[mo] || {}, ovf = (k, v) => ov[k] != null ? num(ov[k]) : v; /* ov = o que você mudou direto na planilha */
  const ln = (nome, valor, x) => Object.assign({ nome, valor }, x || {});
  const sum = a => a.reduce((s, x) => s + x.valor, 0);
  r.fixos = (P.fixos || []).filter(f => f._ex !== undefined || !dinHid('f:' + f.nome)).filter(f => (!f.de || mo >= f.de) && (!f.ate || mo <= f.ate)).map(f => ln(f.nome, ovf('f:' + f.nome, f.porMes ? num(f.porMes[mo]) : num(f.valor)), { pri: f.prioridade || 9, ex: f._ex, ess: dinEssencial(f) })).filter(x => x.valor > 0);
  if (o.extraFixo) r.fixos.push(ln('Internet (morando sozinho)', o.extraFixo, { pri: 9 }));
  r.assin = (P.assinaturas || []).filter(a => !dinHid('a:' + a.nome)).map(a => ln(a.nome, num(a.valor), { opc: !!a.opcional }));
  r.parc = [];
  (P.parcelas || []).forEach(p => { if (p._ex === undefined && dinHid('p:' + p.nome)) return; const s = dinPStart(p), e = addMo(s, p.total - 1); if (mo >= s && mo <= e) r.parc.push(ln(p.nome, ovf('p:' + p.nome, num(p.valor)), { i: moNum(mo) - moNum(s) + 1, n: p.total, ex: p._ex })); });
  d.cards.forEach(c => dinCardFlows(c).forEach(f => { if (f.mo === mo) r.parc.push(ln(c.desc || 'Compra no cartão', f.v, { i: f.i, n: f.n, card: true })); }));
  r.pont = (P.pontuais || []).map((p, ix) => ({ p, ix })).filter(x => x.p.mes === mo && !dinHid('x:' + x.p.nome)).map(x => ln(x.p.nome, ovf('x:' + x.p.nome, num(x.p.valor)), { falta: x.p.valor == null || x.p.valor === '', ix: x.ix }));
  if (ov['a:todas'] != null && r.assin.length) r.assin = [ln('Assinaturas', num(ov['a:todas']))];
  const real = {}, outros = []; let extras = 0;
  ((d.shExtra || {})[mo] || []).forEach(x => outros.push(ln(x.nome, num(x.valor), { planilha: true })));
  S.tx.filter(t => t.date.startsWith(mo)).forEach(t => {
    const v = num(t.amount);
    if (t.type === 'in') { if (t.cat !== 'Salário') extras += v; return; }
    const k = DIN_VAR[t.cat]; if (k) real[k] = (real[k] || 0) + v; else if (!DIN_SKIP.includes(t.cat)) outros.push(ln(t.desc || t.cat, v));
  });
  const pv = Object.fromEntries(Object.entries(P.variaveis || {}).filter(([k]) => !dinHid('v:' + k)));
  r.vars = Object.keys(Object.assign({}, pv, real)).map(k => { const vm = (d.varMes || {})[mo] || {}, pl = k === 'mercado' && o.mercado != null ? o.mercado : (vm[k] != null ? num(vm[k]) : num(pv[k])); return ln(k, Math.max(pl, real[k] || 0), { plan: pl, real: real[k] || 0 }); });
  r.ent = (P.entradas || []).filter(e => e.mes === mo).map(e => ln(e.nome, num(e.valor)));
  r.outros = outros; r.extras = extras + sum(r.ent);
  r.renda = o.renda != null ? o.renda : ovf('renda', num((P.renda || {}).liquido));
  r.colch = num((P.colchao || {}).programado);
  r.tot = { fixos: sum(r.fixos), assin: sum(r.assin), parc: sum(r.parc), pont: sum(r.pont), vars: sum(r.vars), outros: sum(r.outros) };
  r.saidas = r.tot.fixos + r.tot.assin + r.tot.parc + r.tot.pont + r.tot.vars + r.tot.outros + r.colch;
  r.sobra = r.renda + r.extras - r.saidas;
  return r;
}
const dinSem = s => s >= dinFolga() ? 'g' : s >= 0 ? 'y' : 'r';
const dinSug = s => { const P = dinEff().colchao || {}, pr = num(P.programado); return Math.floor((Math.max(0, pr + Math.min(0, s)) + Math.max(0, s - dinFolga())) / 5) * 5; };
const dinSpan = () => Math.max(6, moNum('2027-09') - moNum(dkey().slice(0, 7)) + 1);

/* colchão: o que já guardei + o que o plano sugere guardar a cada mês */
function dinColch() {
  const P = dinEff(), d = dinS(), c = P.colchao || {}, mo0 = dkey().slice(0, 7);
  const real = num(c.inicial) + d.saved.reduce((a, x) => a + num(x.valor), 0), now = d.saved.filter(x => x.date.startsWith(mo0)).reduce((a, x) => a + num(x.valor), 0);
  const rows = []; let acc = real;
  for (let i = 0; i < dinSpan(); i++) {
    const mo = addMo(mo0, i), m = dinMonth(mo), sug = dinSug(m.sobra), got = i === 0 && now > 0;
    if (!got) acc += sug; rows.push({ mo, sobra: m.sobra, v: got ? now : sug, acc, got });
  }
  const metas = (c.metas || []).map(g => { const hit = rows.find(r => r.acc >= num(g.valor)); return { valor: num(g.valor), ate: g.ate, hit: hit ? hit.mo : '' }; });
  return { real, now, rows, metas, sug0: dinSug(dinMonth(mo0).sobra) };
}

/* semana (segunda a domingo): mercado + gasolina + lazer divididos por 4,33 */
function dinWeek() {
  const P = dinEff(), pv = P.variaveis || {}, plan = (num(pv.mercado) + num(pv.gasolina) + num(pv.lazer)) / 4.33;
  const spent = ws => { const a = dkey(ws), b = dkey(addD(ws, 6)); return S.tx.filter(t => t.type === 'out' && DIN_VAR[t.cat] && t.date >= a && t.date <= b).reduce((s, t) => s + num(t.amount), 0); };
  const ws = wkStart(), s = spent(ws), last = S.tx.length ? Math.max(0, plan - spent(addD(ws, -7))) : 0;
  return { plan, spent: s, left: plan - s, pct: plan ? s / plan * 100 : 0, last };
}

/* primeiro mês em que uma compra cabe sem a sobra ficar abaixo da folga */
function dinFit(w, from) {
  const n = w.tipo === 'parcelado' ? Math.max(2, Math.round(num(w.parcelas)) || 2) : 1, per = num(w.valor) / n;
  for (let i = 0; i < 24; i++) { const mo = addMo(from, i); let ok = true; for (let j = 0; j < n && ok; j++) ok = dinMonth(addMo(mo, j)).sobra - per >= dinFolga(); if (ok) return mo; }
  return '';
}

/* ---------- telas ---------- */
const dTxt = { g: 'Pode gastar com calma', y: 'Atenção: está apertado', r: 'Não gaste: o mês está no vermelho' };
function dinEmpty() {
  return `<div class="card">${sec('wallet', 'Dinheiro')}<div class="mut">Aqui você vê, sem fazer conta: quanto sobra no mês, quanto pode gastar na semana, quando cada parcela acaba e quanto já tem no colchão.</div><div class="mut">1. Peça o arquivo de dados financeiros ao Claude (no chat).<br>2. Salve no iPhone, em Arquivos.<br>3. Toque abaixo e escolha o arquivo. Os valores ficam só neste aparelho.</div><label>Importar dados financeiros</label><input type="file" accept=".json,application/json" data-c="dinimport"><button class="btn ghost full" data-a="dinex">${ic('lightbulb-on')}Ver com dados de exemplo</button></div>` + `<div class="row sp card slim"><button class="chip" data-a="mo" data-v="-1" aria-label="Mês anterior">‹</button><b class="cap1">${new Date(+ui.mo.slice(0, 4), +ui.mo.slice(5, 7) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</b><button class="chip" data-a="mo" data-v="1" aria-label="Próximo mês">›</button></div>` + planCard(ui.mo) + anoCard();
}
function vDinheiro() {
  const d = dinS(); if (!d.plan) return dinEmpty();
  const P = dinEff(), mo = ui.mo, m = dinMonth(mo), sem = dinSem(m.sobra), folga = dinFolga(), paid = d.paid[mo] || {};
  const dv = ui.dv === 'y' ? 'y' : 'm';
  const seg = `<div class="chips"><button class="chip ${dv === 'm' ? 'on' : ''}" data-a="dv" data-v="m">Mês</button><button class="chip ${dv === 'y' ? 'on' : ''}" data-a="dv" data-v="y">Ano</button></div>`;
  if (dv === 'y') return seg + dinAnoCard(P);
  let out = seg + `<div class="row sp card slim">${ib('chevron-left', 'Mês anterior', 'mo', -1)}<b class="cap1">${new Date(+mo.slice(0, 4), +mo.slice(5, 7) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</b>${ib('chevron-right', 'Próximo mês', 'mo', 1)}</div>`;
  out += P.exemplo ? `<div class="banner warn">${ic('info-box')}<span>Dados de exemplo. Importe o seu arquivo em “Dados” lá embaixo.</span></div>` : '';
  /* 1) posso gastar? */
  const can = num(ui.dinCan), after = m.sobra - can;
  let cr = '';
  if (can > 0) { const fit = after >= folga ? '' : dinFit({ valor: can, tipo: 'avista' }, addMo(mo, 1)); cr = after >= folga ? `Pode. Sobra ${brl(after)} no mês.` : after >= 0 ? `Cabe, mas aperta: sobra só ${brl(after)}.` : `Não cabe neste mês (faltam ${brl(-after)}).${fit ? ' Primeiro mês que cabe: ' + dMl(fit) + '.' : ' Não cabe até o fim do plano.'}`; }
  out += `<div class="card"><div class="row"><div class="dsem ${sem}" role="img" aria-label="${dTxt[sem]}"></div><div class="grow"><b>${dTxt[sem]}</b><div class="mut">Sobra prevista em ${dMl(mo)}: <b class="${m.sobra < 0 ? 'neg' : ''}">${brl(m.sobra)}</b></div>${m.ent.length ? `<div class="mut">Entra a mais: ${m.ent.map(e => esc(e.nome) + ' ' + brl(e.valor)).join(', ')}</div>` : ''}</div></div><div class="grid3 sm"><div><b>${brl(m.renda + m.extras)}</b><small>entra</small></div><div><b>${brl(m.saidas)}</b><small>sai (com colchão)</small></div><div><b class="${m.sobra < 0 ? 'neg' : ''}">${brl(m.sobra)}</b><small>sobra</small></div></div><label>Posso gastar? Quanto custa (R$)</label><input data-c="dincan" inputmode="decimal" value="${can ? esc(String(ui.dinCan)) : ''}" placeholder="0,00">${cr ? `<div class="banner ${after >= folga ? '' : 'warn'}"><span>${cr}</span></div>` : ''}<button class="btn pri full" data-a="addtx">${ic('plus')}Lançar gasto ou entrada</button><button class="btn sm ghost" data-a="dinplano">${ic('sliders')}Ajustar renda, mercado, gasolina e colchão</button></div>`;
  out += planCard(mo) + casaCard() + caixinhasCard() + '<div class="grp">Mais detalhes</div>';
  /* 2) semana */
  const w = dinWeek(), warn = w.pct >= 100 ? 'Passou do dinheiro da semana.' : w.pct >= 80 ? 'Você já usou mais de 80% da semana.' : '';
  out += `<div class="card">${sec('calendar-week', 'Dinheiro da semana', `<b>${brl(w.plan)}</b>`)}<div class="mut">Mercado, gasolina e lazer. Gastou ${brl(w.spent)} · ${w.left >= 0 ? 'ainda tem ' + brl(w.left) : 'passou ' + brl(-w.left)}.</div><div class="bar ${w.pct > 100 ? 'over' : ''}"><i style="width:${Math.min(100, w.pct)}%"></i></div>${warn ? `<div class="banner warn"><span>${warn}</span></div>` : ''}${w.last > 1 ? `<div class="mut">Semana passada sobrou ${brl(w.last)}. Pode ir para o colchão.</div>` : ''}${m.vars.map(v => `<div><div class="row sp"><span>${esc(v.nome)}</span><span class="mut">${brl(v.real)} / ${brl(v.plan)} no mês</span></div><div class="bar thin ${v.real > v.plan ? 'over' : ''}"><i style="width:${v.plan ? Math.min(100, v.real / v.plan * 100) : 0}%"></i></div></div>`).join('')}</div>`;
  /* 3) contas do mês */
  const items = [];
  m.fixos.slice().sort((a, c) => (c.ess ? 1 : 0) - (a.ess ? 1 : 0) || a.pri - c.pri || c.valor - a.valor).forEach(x => items.push({ k: 'f:' + x.nome, nome: x.nome, valor: x.valor, sub: [x.ess ? 'essencial' : 'não essencial', x.pri === 1 ? 'pagar primeiro' : ''].filter(Boolean).join(' · '), ed: x.ex !== undefined ? ['dineditfixo', x.ex] : null }));
  m.pont.forEach(x => items.push({ k: 'x:' + x.nome, nome: x.nome, valor: x.valor, falta: x.falta, ix: x.ix, sub: 'só neste mês' }));
  m.parc.forEach(x => items.push({ k: 'p:' + x.nome, nome: x.nome, valor: x.valor, sub: `parcela ${x.i} de ${x.n}${x.card ? ' · cartão' : ''}`, ed: x.ex !== undefined ? ['dineditparc', x.ex] : null }));
  if (m.assin.length) items.push({ k: 'a:todas', nome: `Assinaturas (${m.assin.length})`, valor: m.tot.assin, sub: m.assin.map(a => a.nome).join(', ') });
  const itot = items.reduce((a, x) => a + x.valor, 0), ipg = items.filter(x => paid[x.k]).reduce((a, x) => a + x.valor, 0);
  out += acc('dcontas', 'Contas do mês', `${brl(ipg)} de ${brl(itot)}`, `<div class="bar"><i style="width:${itot ? Math.min(100, ipg / itot * 100) : 0}%"></i></div>${items.map(x => `<div class="item"><div class="t">${esc(x.nome)}<div class="mut">${x.falta ? 'falta definir o valor' : brl(x.valor)}${x.sub ? ' · ' + esc(x.sub) : ''}</div></div><div class="row">${x.falta ? `<button class="btn sm ghost" data-a="dineditpont" data-v="${x.ix}">Definir valor</button>` : paid[x.k] ? doneBtn('Pago', 'Desfazer', `data-a="dinpaid" data-v="${esc(x.k)}" data-w="${mo}"`) : `<button class="btn sm" data-a="dinpaid" data-v="${esc(x.k)}" data-w="${mo}">${ic('check')}Paguei</button>`}${x.ed ? ib('edit', 'Editar ' + x.nome, x.ed[0], x.ed[1]) : /^a:/.test(x.k) ? '' : `<button class="btn sm ghost" data-a="dinhide" data-v="${esc(x.k)}">Tirar</button>`}</div></div>`).join('') || '<div class="mut">Nada para pagar neste mês.</div>'}<div class="row wrap"><button class="btn sm ghost" data-a="dinaddfixo">${ic('plus')}Conta fixa</button><button class="btn sm ghost" data-a="dinaddparc">${ic('plus')}Parcela</button></div><div class="mut">No 5º dia útil o sino lembra de pagar primeiro o terreno, a obra ou a casa. Os gastos do dia a dia entram pelo botão Lançar.</div>`, true);
  /* 4) parcelas */
  const ps = dinParcelas().filter(p => p.end >= mo).sort((a, c) => a.end.localeCompare(c.end));
  const pItem = p => { const i = Math.max(0, moNum(mo) - moNum(p.start) + 1), restantes = Math.max(0, p.total - Math.max(0, i - 1)); return `<div class="item"><div class="t"><b>${esc(p.nome)}</b><div class="mut">${i > 0 ? `${i} de ${p.total}` : 'começa em ' + dMl(p.start)} · ${brl(p.valor)}/mês · faltam ${brl(restantes * p.valor)}</div><div class="bar thin"><i style="width:${Math.min(100, Math.max(0, i) / p.total * 100)}%"></i></div></div><span class="mut">acaba ${dMl(p.end)}</span>${p.card ? '' : `<button class="btn sm ghost" data-a="dincardp" data-v="${esc(p.nome)}">${isCardP(p) ? 'É cartão' : 'Não é cartão'}</button>`}${p.exi !== undefined ? ib('edit', 'Editar parcela', 'dineditparc', p.exi) : ''}${p.exi === undefined && !p.card ? `<button class="btn sm ghost" data-a="dinhide" data-v="${esc('p:' + p.nome)}">Tirar</button>` : ''}</div>`; };
  const pc = ps.filter(p => p.card || isCardP(p)), po = ps.filter(p => !(p.card || isCardP(p))), act = a => a.filter(p => p.start <= mo && p.end >= mo).reduce((t, p) => t + p.valor, 0);
  out += acc('dparc', 'Parcelas', ps.length ? brl(m.tot.parc) + '/mês' : '', `${pc.length ? `<div class="grp">No cartão · ${brl(act(pc))} na fatura deste mês</div>${pc.map(pItem).join('')}` : ''}${po.length ? `<div class="grp">Fora do cartão · ${brl(act(po))} este mês</div>${po.map(pItem).join('')}` : ''}${ps.length ? '' : '<div class="mut">Nenhuma parcela. Boa!</div>'}${ps.length ? `<div class="mut">Última parcela termina em ${dMl(ps[ps.length - 1].end)}. A cada fim, a sobra do mês sobe. “É cartão” junta as parcelas numa linha só (fatura) na planilha.</div>` : ''}<button class="btn sm ghost" data-a="dinaddparc">${ic('plus')}Parcela</button>`, false);
  /* 5) linha do tempo */
  const tl = []; for (let i = 0; i < dinSpan(); i++) { const mm = addMo(mo, i), x = dinMonth(mm); tl.push([mm, x]); }
  out += acc('dlinha', 'Linha do tempo', `até ${dMl(tl[tl.length - 1][0])}`, `<div class="mut">Sobra de cada mês depois de pagar tudo e separar o colchão programado.</div>${tl.map(([mm, x]) => `<div class="item"><div class="t"><span class="sem ${dinSem(x.sobra)}"></span><b>${dMl(mm)}</b><div class="mut">${x.fixos.filter(f => f.pri === 1).map(f => esc(f.nome.split(' (')[0]) + ' ' + brl(f.valor)).join(' · ') || 'sem casa/obra'} · parcelas ${brl(x.tot.parc)}${x.pont.some(p => p.falta) ? ' · falta valor de gasto pontual' : ''}</div></div><b class="${x.sobra < 0 ? 'neg' : ''}">${brl(x.sobra)}</b></div>`).join('')}`, false);
  /* 6) colchão */
  const c = dinColch(), cg = (P.colchao || {}).metas || [], top = cg.length ? num(cg[cg.length - 1].valor) : 0;
  out += acc('dcolch', 'Colchão', brl(c.real), `${top ? `<div class="bar"><i style="width:${Math.min(100, c.real / top * 100)}%"></i></div>` : ''}<div class="mut">Guardado: ${brl(c.real)}${top ? ' de ' + brl(top) : ''}.</div>${c.metas.map(g => `<div class="row sp"><span>Meta ${brl(g.valor)}${g.ate ? ' até ' + dMl(g.ate) : ''}</span><span class="${g.hit && (!g.ate || g.hit <= g.ate) ? 'ok' : 'neg'}">${g.hit ? 'bate em ' + dMl(g.hit) : 'não bate no plano'}</span></div>`).join('')}<div class="grp">Sugestão de guardar por mês</div>${c.rows.slice(0, 8).map(r => `<div class="row sp"><span>${dMl(r.mo)}</span><span class="mut">${r.got ? 'guardou ' : ''}${brl(r.v)} · total ${brl(r.acc)}</span></div>`).join('')}<div class="mut">Regra: ${brl(num((P.colchao || {}).programado))} fixos + o que sobrar acima de ${brl(dinFolga())}. Sobrou dinheiro da semana? Vai para o colchão.</div><div class="row">${c.now > 0 ? doneBtn('Guardado neste mês', 'Desfazer', 'data-a="dinunsave"') : `<button class="btn" data-a="dinsave">${ic('check')}Guardei</button>`}${c.now > 0 ? `<button class="btn sm ghost" data-a="dinsave">+ outro valor</button>` : ''}</div>`, true);
  /* 7) cenários */
  const mm3 = [...new Set([mo, mo > '2027-06' ? mo : '2027-06', mo > '2027-09' ? mo : '2027-09'])], so = P.sozinho || { mercado: 750, internet: 90 };
  const rendas = [num((P.renda || {}).liquido), ...((P.renda || {}).meta || [])];
  const scen = (o, rs) => rs.map(rv => `<div class="grp">${rv === rendas[0] ? 'Hoje · ' : 'Se eu ganhasse · '}${brl(rv)}</div><div class="grid3 sm">${mm3.map(x => { const s = dinMonth(x, Object.assign({ renda: rv }, o)).sobra; return `<div><b class="${s < 0 ? 'neg' : ''}">${brl(s)}</b><small>${dMl(x)}</small></div>`; }).join('')}</div>`).join('');
  out += acc('dcen', 'Cenários', '', `<div class="mut">Sobra do mês em cada renda.</div>${scen({}, rendas)}<div class="grp" style="margin-top:16px">Morando sozinho (mercado ${brl(num(so.mercado))} + internet ${brl(num(so.internet))})</div>${scen({ mercado: num(so.mercado), extraFixo: num(so.internet) }, rendas)}`, false);
  /* 8) lista de desejos */
  const wants = [...(P.desejos || []).map((x, i) => ({ ...x, src: 'p', classe: x.classe || 'compra' })), ...d.want.map(x => ({ ...x, src: 'a', classe: x.classe || 'compra' }))];
  out += acc('ddes', 'Lista de desejos', wants.length ? wants.length + '' : '', `<div class="mut">O app diz o primeiro mês em que cabe sem a sobra ficar abaixo de ${brl(dinFolga())}. Comprar sempre atrasa um pouco o colchão.</div>${wants.map(x => { const f = dinFit(x, mo), n = x.tipo === 'parcelado' ? Math.max(2, Math.round(num(x.parcelas)) || 2) : 1; return `<div class="item"><div class="t"><b>${esc(x.nome)}</b><div class="mut">${esc(({compra:'Compra',investimento:'Investimento',necessidade:'Necessidade',lazer:'Lazer/viagem'})[x.classe] || 'Compra')} · ${brl(num(x.valor))}${n > 1 ? ` em ${n}x de ${brl(num(x.valor) / n)}` : ' à vista'} · ${f ? (f === mo ? 'cabe agora' : 'cabe em ' + dMl(f)) : 'não cabe até o fim do plano'}</div></div>${x.src === 'a' ? ib('edit', 'Editar desejo', 'dineditwant', x.id) : ''}</div>`; }).join('') || '<div class="mut">Nada na lista.</div>'}<button class="btn sm ghost" data-a="dinaddwant">${ic('plus')}Desejo</button>`, false);
  /* 9) cartão parado + gastos pontuais */
  const cf = dinCardCfg(), nowCard = d.cards.flatMap(dinCardFlows).filter(f => f.mo === mo).reduce((a, f) => a + f.v, 0);
  const vd = `${mo}-${pad(cf.vence)}`;
  out += acc('dcard', 'Cartão parado', `fecha dia ${cf.fecha} · vence dia ${cf.vence}`, `<div class="mut">Meta: não usar o cartão. Se precisar, lance aqui e o app mostra em qual fatura cai.</div><div class="mut">Novas compras na fatura de ${dMl(mo)}: <b>${brl(nowCard)}</b>.</div>${d.cards.map(cd => { const f = dinCardFlows(cd); return `<div class="item"><div class="t">${esc(cd.desc || 'Compra')}<div class="mut">${sd2(cd.date)} · ${brl(num(cd.valor))}${f[0].n > 1 ? ` em ${f[0].n}x` : ''} · 1ª fatura ${dMl(f[0].mo)}</div></div>${ib('edit', 'Editar compra no cartão', 'dineditcard', cd.id)}</div>`; }).join('')}<div class="row">${d.fat[mo] ? doneBtn('Fatura paga', 'Desfazer', `data-a="dinfat" data-v="${mo}"`) : `<button class="btn" data-a="dinfat" data-v="${mo}">${ic('check')}Paguei a fatura (vence ${sd2(vd)})</button>`}</div><button class="btn sm ghost" data-a="dincard">${ic('plus')}Compra no cartão</button>`, false);
  const pont = (P.pontuais || []).map((p, ix) => ({ p, ix })).filter(x => x.p.mes >= mo).sort((a, c) => a.p.mes.localeCompare(c.p.mes));
  out += acc('dpont', 'Gastos pontuais futuros', pont.length + '', `<div class="mut">Presentes, viagens, anuais. Entram na sobra do mês marcado.</div>${pont.map(x => `<div class="item"><div class="t">${esc(x.p.nome)}<div class="mut">${dMl(x.p.mes)} · ${x.p.valor == null || x.p.valor === '' ? 'falta definir o valor' : brl(num(x.p.valor))}</div></div>${ib('edit', 'Editar gasto pontual', 'dineditpont', x.ix)}</div>`).join('') || '<div class="mut">Nada marcado.</div>'}<button class="btn sm ghost" data-a="dinaddpont">${ic('plus')}Gasto pontual</button>`, false);
  /* 10) lançamentos do mês */
  const G = granaParts();
  out += G.cat + G.tx + G.metas + (S.bills.length ? G.bills : '');
  /* 10b) gerenciar plano: tirar / voltar itens */
  const hd = d.hide, mg = (pre, arr, f) => (arr || []).map(x => { const n = f ? f(x) : x.nome, k = pre + n; return `<div class="item"><div class="t">${esc(n)}${f ? '' : `<div class="mut">${brl(num(x.valor))}${x.total ? ' · ' + x.total + 'x' : ''}${x.mes ? ' · ' + dMl(x.mes) : ''}</div>`}</div>${hd[k] ? `<button class="btn sm" data-a="dinshow" data-v="${esc(k)}">Voltar</button>` : `<button class="btn sm ghost" data-a="dinhide" data-v="${esc(k)}">Tirar</button>`}</div>`; }).join('');
  const PL = d.plan || {};
  out += acc('dger', 'Tirar ou adicionar no plano', Object.keys(hd).length ? Object.keys(hd).length + ' tirado(s)' : '', `<div class="mut">“Tirar” some do plano em todos os meses (e da planilha no próximo envio). “Voltar” traz de volta.</div><div class="grp">Contas fixas</div>${mg('f:', PL.fixos)}<div class="grp">Assinaturas</div>${mg('a:', PL.assinaturas)}<div class="grp">Parcelas</div>${mg('p:', PL.parcelas)}<div class="grp">Gastos pontuais</div>${mg('x:', PL.pontuais)}<div class="grp">Gastos do mês (mercado, gasolina…)</div>${mg('v:', Object.keys(PL.variaveis || {}), x => x)}<div class="row wrap"><button class="btn sm ghost" data-a="dinaddfixo">${ic('plus')}Conta fixa</button><button class="btn sm ghost" data-a="dinaddparc">${ic('plus')}Parcela</button><button class="btn sm ghost" data-a="dinaddpont">${ic('plus')}Gasto pontual</button></div>`, false);
  /* 11) dados */
  out += acc('ddados', 'Dados', P.exemplo ? 'exemplo' : '', `<div class="mut">Versão do app: ${APP_V}. Tudo fica só neste aparelho. Para atualizar o plano, importe o arquivo novo: seus lançamentos, pagamentos e o que guardou continuam.</div><label>Importar dados financeiros</label><input type="file" accept=".json,application/json" data-c="dinimport"><button class="btn full" data-a="dincopy">${ic('copy')}Copiar resumo do mês (para o Claude)</button><button class="btn ghost full" data-a="dinexport">${ic('download')}Exportar tudo do Dinheiro</button><button class="btn danger full" data-a="dinwipe">${ic('trash')}Apagar dados do Dinheiro</button>${S.casa && S.casa.planilha ? `<a class="btn ghost full" href="${esc(S.casa.planilha)}" target="_blank" rel="noopener">${ic('external-link')}Abrir a planilha</a>` : ''}`, false);
  return out;
}

/* resumo do mês em texto, para colar no chat e eu atualizar a planilha */
function dinSummary() {
  const d = dinS(), mo = dkey().slice(0, 7), m = dinMonth(mo), paid = d.paid[mo] || {}, c = dinColch(), w = dinWeek();
  const L2 = [`Dinheiro · ${dMl(mo)} · gerado em ${sd2(dkey())}`, `Sobra prevista: ${brl(m.sobra)} (${dTxt[dinSem(m.sobra)]})`, `Entradas extras no mês: ${brl(m.extras)}`, `Semana: gastou ${brl(w.spent)} de ${brl(w.plan)}`, `Variáveis no mês: ${m.vars.map(v => `${v.nome} ${brl(v.real)}/${brl(v.plan)}`).join(' · ')}`, `Outros gastos fora do plano: ${m.outros.map(o => `${o.nome} ${brl(o.valor)}`).join(', ') || 'nenhum'}`, `Essenciais do mês: ${m.fixos.filter(f => f.ess).map(f => `${f.nome} ${brl(f.valor)}`).join(', ') || 'nenhum'}`, `Pagos: ${Object.keys(paid).map(k => k.slice(2)).join(', ') || 'nenhum ainda'}`, `Colchão guardado: ${brl(c.real)}${c.now > 0 ? ' (guardou ' + brl(c.now) + ' neste mês)' : ''}`, `Cartão neste mês: ${d.cards.flatMap(dinCardFlows).filter(f => f.mo === mo).length ? brl(d.cards.flatMap(dinCardFlows).filter(f => f.mo === mo).reduce((a, f) => a + f.v, 0)) : 'nada novo'}`, `Fatura paga: ${d.fat[mo] ? 'sim' : 'não'}`];
  return L2.join('\n');
}

function dinNotifs(add, k, mo) {
  const d = dinS(); if (!d.plan || d.plan.exemplo) return;
  const paid = d.paid[mo] || {}, rel = dt => Math.round((new Date(dt + 'T12:00') - new Date(k + 'T12:00')) / 864e5);
  if (k >= payDay(mo)) dinMonth(mo).fixos.filter(f => f.pri === 1 && !paid['f:' + f.nome]).forEach(f => add(`dp:${f.nome}:${mo}`, 'flag', `Dia do pagamento: pague primeiro ${f.nome} (${brl(f.valor)}).`, [['Paguei', 'dinpaid', 'f:' + f.nome, mo]]));
  const vd = `${mo}-${pad(dinCardCfg().vence)}`, df = rel(vd);
  if (df <= 3 && !d.fat[mo]) add(`df:${mo}`, 'wallet', `Fatura do cartão ${df < 0 ? 'venceu dia ' + vd.slice(8) : df === 0 ? 'vence hoje' : 'vence em ' + df + ' dia' + (df > 1 ? 's' : '')}.`, [['Paguei', 'dinfat', mo, '']]);
}

/* ---------- ações ---------- */
async function dinImport(txt) {
  let j; try { j = JSON.parse(txt); } catch (e) { alert('Esse arquivo não parece um JSON válido.'); return; }
  if (j && j.ajustes) { if (j.visao && typeof visaoImport === 'function') await visaoImport(j.visao); return dinAjustes(j.ajustes); }
  if (j && j.visao && typeof visaoImport === 'function') return visaoImport(j.visao);
  const d = dinS(), full = j && j.plan && !j.fixos, P = full ? j.plan : j;
  if (!P || !P.renda || !Array.isArray(P.fixos)) { alert('Esse arquivo não parece o de dados financeiros.'); return; }
  if (d.plan && !d.plan.exemplo && !confirm('Trocar o plano pelo arquivo novo? Seus lançamentos, pagamentos e o que guardou continuam.')) return;
  ['assinaturas', 'parcelas', 'pontuais', 'desejos', 'entradas'].forEach(k => { P[k] = P[k] || []; });
  d.plan = P; d.importedAt = new Date().toISOString();
  if (full) { d.saved = j.saved || []; d.cards = j.cards || []; d.paid = j.paid || {}; d.fat = j.fat || {}; d.want = j.want || []; d.over = j.over || {}; d.extra = j.extra || {}; }
  save(); render(); toast('Dados financeiros importados.');
}
function dinInit() {
  dinCxInit();
  Object.assign(A, {
    gotodin: () => { ui.tab = 'mais'; ui.mais = 'din'; window.scrollTo(0, 0); },
    dinplano: () => {
      const P = dinEff(), v = P.variaveis || {}, c = P.colchao || {};
      form('Ajustar números', [{ k: 'renda', label: 'Salário que cai na conta (R$)', type: 'number', value: num((P.renda || {}).liquido) }, { k: 'mercado', label: 'Mercado por mês (R$)', type: 'number', value: num(v.mercado) }, { k: 'gasolina', label: 'Gasolina por mês (R$)', type: 'number', value: num(v.gasolina) }, { k: 'lazer', label: 'Lazer por mês (R$)', type: 'number', value: num(v.lazer) }, { k: 'prog', label: 'Colchão programado por mês (R$)', type: 'number', value: num(c.programado) }, { k: 'folga', label: 'Folga mínima que quero manter (R$)', type: 'number', value: dinFolga() }], r => {
        const o = dinS().over; o.renda = num(r.renda); o.vars = { mercado: num(r.mercado), gasolina: num(r.gasolina), lazer: num(r.lazer) }; o.colch = { programado: num(r.prog), folga: num(r.folga) };
      }); return false;
    },
    dinhide: v => { dinS().hide[v] = 1; save(); toast('Tirei do plano.'); }, dinshow: v => { delete dinS().hide[v]; save(); },
    dincardp: v => { const d = dinS(), p = (d.plan.parcelas || []).concat(d.extra.parcelas).find(x => x.nome === v); d.cardP[v] = !(p ? isCardP(p) : true); save(); },
    dinaddfixo: () => { dinFixoForm(-1); return false; }, dineditfixo: v => { dinFixoForm(+v); return false; },
    dinaddparc: () => { dinParcForm(-1); return false; }, dineditparc: v => { dinParcForm(+v); return false; },
    dinex: () => { dinS().plan = dinEx(); save(); },
    dinpaid: (v, w) => { const d = dinS(); d.paid[w] = d.paid[w] || {}; if (d.paid[w][v]) delete d.paid[w][v]; else d.paid[w][v] = 1; save(); if (typeof planMarcar === 'function') planMarcar(v, w, !!d.paid[w][v]); },
    dinfat: v => { const d = dinS(); if (d.fat[v]) delete d.fat[v]; else d.fat[v] = 1; save(); },
    dinsave: () => { const c = dinColch(); form('Guardei no colchão', [{ k: 'valor', label: 'Quanto guardei (R$)', type: 'number', value: c.now > 0 ? '' : c.sug0 }, { k: 'date', label: 'Data', type: 'date', value: dkey() }], r => { if (num(r.valor) > 0) dinS().saved.push({ id: uid(), date: r.date || dkey(), valor: num(r.valor) }); }); return false; },
    dinunsave: () => { const d = dinS(), mo = dkey().slice(0, 7), i = d.saved.map(x => x.date.startsWith(mo)).lastIndexOf(true); if (i >= 0) d.saved.splice(i, 1); save(); },
    dincard: () => { dinCardForm({}); return false; },
    dineditcard: v => { const cd = dinS().cards.find(x => x.id === v); if (cd) dinCardForm(cd); return false; },
    dinaddpont: () => { dinPontForm(-1); return false; },
    dineditpont: v => { dinPontForm(+v); return false; },
    dinaddwant: () => { dinWantForm({}); return false; },
    dineditwant: v => { const x = dinS().want.find(y => y.id === v); if (x) dinWantForm(x); return false; },
    dincopy: () => { const t = dinSummary(); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Resumo copiado. Cole no chat com o Claude.'), () => prompt('Copie o resumo:', t)); return false; },
    dinexport: () => { const d = dinS(), b = new Blob([JSON.stringify({ plan: d.plan, saved: d.saved, cards: d.cards, paid: d.paid, fat: d.fat, want: d.want, over: d.over, extra: d.extra }, null, 1)], { type: 'application/json' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `dinheiro-backup-${dkey()}.json`; a.click(); return false; },
    dinwipe: () => { if (confirm('Apagar todos os dados do Dinheiro neste aparelho? Os gastos do Porkinho não são apagados.')) { delete S.din; save(); } }
  });
  Object.assign(C, {
    dinimport: async (v, w, el) => { const f = el.files[0]; if (f) await dinImport(await f.text()); },
    dincan: v => { ui.dinCan = v; render(); }
  });
}
function dinCardForm(cd) {
  const mo = dkey().slice(0, 7);
  form(cd.id ? 'Editar compra no cartão' : 'Compra no cartão', [{ k: 'desc', label: 'O que foi', value: cd.desc || '' }, { k: 'valor', label: 'Valor total (R$)', type: 'number', value: cd.valor || '' }, { k: 'n', label: 'Em quantas vezes (1 = uma vez só)', type: 'number', value: cd.n || 1 }, { k: 'date', label: 'Data da compra', type: 'date', value: cd.date || dkey() }], r => {
    if (!(num(r.valor) > 0)) return;
    const o = { id: cd.id || uid(), desc: r.desc.trim(), valor: num(r.valor), n: Math.max(1, Math.round(num(r.n)) || 1), date: r.date || dkey() }, d = dinS();
    if (cd.id) d.cards[d.cards.findIndex(x => x.id === cd.id)] = o; else d.cards.push(o);
    const f = dinCardMo(o.date); toast(`Cartão parado: foi para a fatura de ${dMl(f)} (vence dia ${dinCardCfg().vence}).`);
  }, cd.id ? () => { const d = dinS(); d.cards = d.cards.filter(x => x.id !== cd.id); } : null);
}
function dinPontForm(ix) {
  const P = dinS().plan, p = ix >= 0 ? P.pontuais[ix] : {};
  form(ix >= 0 ? 'Editar gasto pontual' : 'Gasto pontual', [{ k: 'nome', label: 'Nome', value: p.nome || '' }, { k: 'valor', label: 'Valor (R$). Deixe vazio se ainda não sabe', type: 'number', value: p.valor == null ? '' : p.valor }, { k: 'mes', label: 'Mês (ano-mês, ex.: 2026-12)', value: p.mes || addMo(dkey().slice(0, 7), 1) }], r => {
    const o = { nome: r.nome.trim() || 'Gasto', valor: r.valor === '' ? null : num(r.valor), mes: /^\d{4}-\d{2}$/.test(r.mes.trim()) ? r.mes.trim() : dkey().slice(0, 7) };
    if (ix >= 0) P.pontuais[ix] = o; else P.pontuais.push(o);
  }, ix >= 0 ? () => { P.pontuais.splice(ix, 1); } : null);
}
function dinWantForm(x) {
  form(x.id ? 'Editar meta de compra' : 'Meta de compra', [
    { k: 'nome', label: 'O que quero', value: x.nome || '' },
    { k: 'valor', label: 'Valor (R$)', type: 'number', value: x.valor || '' },
    { k: 'classe', label: 'Tipo', type: 'select', value: x.classe || 'compra', options: [['compra', 'Compra / consumo'], ['investimento', 'Investimento em mim / trabalho'], ['necessidade', 'Necessidade'], ['lazer', 'Lazer / viagem']] },
    { k: 'parcelas', label: 'Em quantas vezes (1 = à vista)', type: 'number', value: x.tipo === 'parcelado' ? x.parcelas : 1 }
  ], r => {
    const n = Math.round(num(r.parcelas)) || 1;
    const o = { id: x.id || uid(), nome: r.nome.trim() || 'Meta', valor: num(r.valor), classe: r.classe || 'compra', tipo: n > 1 ? 'parcelado' : 'avista', parcelas: n };
    const d = dinS();
    if (x.id) d.want[d.want.findIndex(y => y.id === x.id)] = o; else d.want.push(o);
  }, x.id ? () => { const d = dinS(); d.want = d.want.filter(y => y.id !== x.id); } : null);
}

function dinFixoForm(ix) {
  const d = dinS(), f = ix >= 0 ? d.extra.fixos[ix] : {};
  form(ix >= 0 ? 'Editar conta fixa' : 'Conta fixa nova', [{ k: 'nome', label: 'Nome', value: f.nome || '' }, { k: 'valor', label: 'Valor por mês (R$)', type: 'number', value: f.valor || '' }, { k: 'essencial', label: 'Classificação', type: 'select', value: f.essencial === false ? 'nao' : 'sim', options: [['sim', 'Essencial (saúde, moradia, contas básicas)'], ['nao', 'Não essencial']] }, { k: 'ate', label: 'Até qual mês? (ex.: 2027-04). Vazio = para sempre', value: f.ate || '' }, { k: 'pri', label: 'Prioridade de pagamento', type: 'select', value: String(f.prioridade || 2), options: [['1', 'Pagar primeiro'], ['2', 'Normal']] }], r => {
    if (!(num(r.valor) > 0)) return;
    const o = { nome: r.nome.trim() || 'Conta', valor: num(r.valor), essencial: r.essencial !== 'nao', prioridade: +r.pri || 2 }; if (/^\d{4}-\d{2}$/.test(r.ate.trim())) o.ate = r.ate.trim();
    if (ix >= 0) d.extra.fixos[ix] = o; else d.extra.fixos.push(o);
  }, ix >= 0 ? () => { d.extra.fixos.splice(ix, 1); } : null);
}
function dinParcForm(ix) {
  const d = dinS(), p = ix >= 0 ? d.extra.parcelas[ix] : {};
  form(ix >= 0 ? 'Editar parcela' : 'Parcela nova', [{ k: 'nome', label: 'O que é', value: p.nome || '' }, { k: 'valor', label: 'Valor da parcela (R$)', type: 'number', value: p.valor || '' }, { k: 'total', label: 'Total de parcelas', type: 'number', value: p.total || '' }, { k: 'atual', label: 'Qual parcela é a deste mês? (1 se começa agora)', type: 'number', value: p.atual || 1 }], r => {
    if (!(num(r.valor) > 0) || !(num(r.total) >= 1)) return;
    const o = { nome: r.nome.trim() || 'Parcela', valor: num(r.valor), total: Math.round(num(r.total)), atual: Math.max(1, Math.round(num(r.atual)) || 1), atualMes: p.atualMes || dkey().slice(0, 7) };
    if (ix >= 0) d.extra.parcelas[ix] = o; else d.extra.parcelas.push(o);
  }, ix >= 0 ? () => { d.extra.parcelas.splice(ix, 1); } : null);
}

/* visão do ano: plano do app mês a mês + o que foi lançado + o que está na planilha */
function dinAnoCard(P) {
  const y = ui.year || +ui.mo.slice(0, 4), sy = S.settings.sync;
  if (!(ui.ano && ui.ano.year === y)) { const c = anoCache(y); if (c) ui.ano = c; }
  const a = ui.ano && ui.ano.year === y ? ui.ano : null;
  if (sy.key && !ui.anoBusy && (!a || Date.now() - (a.at || 0) > 300000)) setTimeout(() => anoLoad(y, true), 0);
  const rows = []; for (let k = 1; k <= 12; k++) { const mm = `${y}-${pad(k)}`, x = dinMonth(mm), st = monthStats(mm), sh = a && (a.meses || []).find(z => z.mes === mm); rows.push({ mm, k, entra: x.renda + x.extras, sai: x.saidas, sobra: x.sobra, gastei: st.out, sh }); }
  const T = rows.reduce((o, r) => ({ e: o.e + r.entra, s: o.s + r.sai, so: o.so + r.sobra, g: o.g + r.gastei }), { e: 0, s: 0, so: 0, g: 0 });
  const head = `<div class="row sp card slim"><button class="chip" data-a="anoy" data-v="-1" aria-label="Ano anterior">‹</button><b class="cap1">${y}</b><button class="chip" data-a="anoy" data-v="1" aria-label="Próximo ano">›</button></div>`;
  const body = `<div class="grid3 sm"><div><b class="ok">${brl(T.e)}</b><small>entra no ano</small></div><div><b class="warnc">${brl(T.s)}</b><small>sai (plano)</small></div><div><b class="${T.so < 0 ? 'neg' : ''}">${brl(T.so)}</b><small>sobra</small></div></div><table class="g"><tr><th>Mês</th><th>Plano sai</th><th>Gastei</th><th>Sobra</th></tr>${rows.map(r => `<tr data-a="anomes" data-v="${r.mm}" role="button" tabindex="0" style="cursor:pointer${r.mm === dkey().slice(0, 7) ? ';font-weight:700' : ''}"><td>${ANO_MES[r.k - 1]}</td><td>${brl(r.sai)}</td><td>${r.gastei ? brl(r.gastei) : '–'}</td><td class="${r.sobra < 0 ? 'neg' : ''}">${brl(r.sobra)}</td></tr>`).join('')}</table><div class="mut">Toque num mês para abrir. “Gastei” é o que você lançou no app.${a ? ' Na planilha, a sobra de ' + (a.meses || []).map(z => ANO_MES[+z.mes.slice(5, 7) - 1] + ' ' + brl(z.sobra)).join(' · ') + '.' : ''}</div>`;
  return head + `<div class="card">${sec('calendar', 'Ano a ano', sy.key ? `<button class="btn sm ghost" data-a="anoload" ${ui.anoBusy ? 'disabled' : ''}>${ic('reload')}${ui.anoBusy ? 'Atualizando' : 'Planilha'}</button>` : '')}${body}</div>`;
}

/* ---------- arquivo de ajustes (dados pessoais ficam só no aparelho, nunca no código) ----------
   { "ajustes": { fixos:[{nome,valor,essencial,prioridade,de,ate}], pontuais:[{nome,valor,mes}], encerrar:[{nome,pagoEm}],
                  caixinhas:[{nome,instituicao,produto,tipo,pctCdi,saldo,liquidez,fgc}], lembretes:[{title,date,time,note}] } } */
function dinAjustes(a) {
  const d = dinS(), P = d.plan, out = [], same = (x, y) => String(x || '').trim().toLowerCase() === String(y || '').trim().toLowerCase();
  (a.fixos || []).forEach(f => { const i = d.extra.fixos.findIndex(x => same(x.nome, f.nome)); const o = Object.assign({}, i >= 0 ? d.extra.fixos[i] : {}, f, { valor: num(f.valor) }); if (i >= 0) d.extra.fixos[i] = o; else d.extra.fixos.push(o); out.push('conta fixa ' + f.nome); });
  if ((a.pontuais || []).length) { if (!P) { alert('Importe primeiro o arquivo do plano financeiro. Depois importe os ajustes.'); return; } P.pontuais = P.pontuais || []; (a.pontuais || []).forEach(x => { const i = P.pontuais.findIndex(y => same(y.nome, x.nome) && y.mes === x.mes); const o = { nome: x.nome, valor: num(x.valor), mes: x.mes }; if (i >= 0) P.pontuais[i] = o; else P.pontuais.push(o); out.push('gasto de ' + dMl(x.mes) + ' ' + x.nome); }); }
  (a.encerrar || []).forEach(e => { const rx = new RegExp(String(e.nome).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); const mo = e.pagoEm; d.paid[mo] = d.paid[mo] || {};
    [...((P && P.fixos) || []), ...d.extra.fixos].filter(f => rx.test(f.nome || '')).forEach(f => { f.ate = mo; d.paid[mo]['f:' + f.nome] = 1; });
    ((P && P.pontuais) || []).filter(x => rx.test(x.nome || '')).forEach(x => { if (x.mes > mo) d.hide['x:' + x.nome] = 1; else d.paid[x.mes] = Object.assign(d.paid[x.mes] || {}, { ['x:' + x.nome]: 1 }); });
    ((P && P.parcelas) || []).filter(x => rx.test(x.nome || '')).forEach(x => { d.hide['p:' + x.nome] = 1; });
    out.push(e.nome + ' pago, sai dos próximos meses'); });
  (a.ate || []).forEach(x => { let n = 0; [...((P && P.fixos) || []), ...d.extra.fixos].filter(f => same(f.nome, x.nome)).forEach(f => { f.ate = x.ate; n++; }); if (n) out.push(x.nome + ': até ' + dMl(x.ate)); });
  (a.caixinhasRenomear || []).forEach(r => { const de = d.caixinhas.find(x => same(x.nome, r.de)); if (de && !d.caixinhas.some(x => same(x.nome, r.para))) { de.nome = r.para; if (r.tipo) de.tipo = r.tipo; out.push(`caixinha ${r.de} agora é ${r.para}`); } });
  (a.caixinhas || []).forEach(c => { const i = d.caixinhas.findIndex(x => same(x.nome, c.nome)); const o = Object.assign({ id: uid(), tipo: 'colchao', liquidez: 'diária', fgc: true }, i >= 0 ? d.caixinhas[i] : {}, c, { saldo: i >= 0 ? num(d.caixinhas[i].saldo) : num(c.saldo), pctCdi: num(c.pctCdi) }); if (i >= 0) d.caixinhas[i] = o; else d.caixinhas.push(o); out.push('caixinha ' + c.nome + (i >= 0 ? ' (saldo mantido)' : '')); });
  (a.lembretes || []).forEach(r => { S.reminders = S.reminders || []; if (!S.reminders.some(x => same(x.title, r.title) && x.date === r.date)) S.reminders.push({ id: uid(), title: r.title, date: r.date, time: r.time || '', note: r.note || '', done: false }); out.push('lembrete ' + r.title); });
  (a.lembretesRemover || []).forEach(t => { const rx = new RegExp(String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), n0 = (S.reminders || []).length; S.reminders = (S.reminders || []).filter(x => !rx.test(x.title || '')); if ((S.reminders || []).length < n0) out.push('lembrete tirado: ' + t); });
  (a.variaveisMes || []).forEach(v => { if (!v || !v.cat || !/^\d{4}-\d{2}$/.test(v.mes || '')) return; d.varMes = d.varMes || {}; d.varMes[v.mes] = d.varMes[v.mes] || {}; d.varMes[v.mes][v.cat] = num(v.valor); out.push(`${v.cat} em ${v.mes}: ${brl(num(v.valor))}`); });
  (a.remover || []).forEach(nm => { const rx = new RegExp(String(nm).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); ((P && P.pontuais) || []).filter(x => rx.test(x.nome || '')).forEach(x => { d.hide['x:' + x.nome] = 1; }); d.want = (d.want || []).filter(x => !rx.test(x.nome || x.title || '')); out.push(nm + ': fora do plano'); });
  if (a.xpNotion && typeof a.xpNotion.total === 'number') { S.xpNotion = Object.assign({}, S.xpNotion, a.xpNotion, { at: Date.now() }); out.push('XP do Notion: ' + a.xpNotion.total.toLocaleString('pt-BR') + ' (' + (a.xpNotion.n || 0) + ' tópicos concluídos)'); }
  (a.estudoFeito || []).forEach(k => { if (/^\d{4}-\d{2}-\d{2}$/.test(k)) { S.studyLog[k] = Object.assign({}, S.studyLog[k], { done: true }); out.push('Estudo feito em ' + k.split('-').reverse().slice(0, 2).join('/')); } });
  if (a.casa && typeof a.casa === 'object') { const o = S.casa || {}; S.casa = Object.assign({}, o, a.casa, { ok: o.ok || {}, juntado: o.juntado != null ? o.juntado : num(a.casa.juntado), at: dkey() }); out.push('Casa 2027: metas de renda, entrada, marcos e pendências'); }
  if (a.treino) { if (num(a.treino.proteinaG) > 0) { S.settings.dietProt = String(Math.round(num(a.treino.proteinaG))); out.push('Meta de proteína: ' + S.settings.dietProt + ' g'); } if (num(a.treino.aguaMl) > 0) { S.settings.waterGoal = String(Math.round(num(a.treino.aguaMl))); out.push('Meta de água: ' + L(num(a.treino.aguaMl)) + ' L'); } }
  save(); render(); alert('Ajustes aplicados:\n· ' + out.join('\n· '));
}
/* ---------- Casa 2027: os números vêm do arquivo de ajustes (nada pessoal fica no código) ----------
   casa: { planilha, renda, rendaPrecisa, extraMeta, mudaEm, cenarios:[{extra,muda}], caixinha, metas:[{nome,valor,ate,depois}],
           passos:[{t,ate}], marcos:[{mes,t}], pendencias:[{t,quem}] } */
const casaCx = nome => dinS().caixinhas.find(x => String(x.nome).trim().toLowerCase() === String(nome || '').trim().toLowerCase());
function casaCard() {
  const c = S.casa; if (!c) return '';
  const ok = c.ok || (c.ok = {}), hoje = dkey().slice(0, 7), r = num(c.renda), need = num(c.rendaPrecisa || c.rendaMin), cxs = dinS().caixinhas;
  const cx = c.caixinha ? casaCx(c.caixinha) : null, saldo = cx ? num(cx.saldo) : 0;
  const passos = c.passos || [], prox = passos.findIndex((p, i) => !ok['s' + i]);
  const pend = c.pendencias || [], abertas = pend.map((p, i) => ({ p, i })).filter(x => !ok['p' + x.i]), feitas = pend.length - abertas.length;
  const marcos = (c.marcos || []).filter(m => m.mes >= hoje).slice(0, 4);
  const metas = (c.metas || []).filter(m => !m.ate || m.ate >= hoje), m1 = metas[0];
  const mItem = (m, i) => { const v = num(m.valor), base = i === 0 ? saldo : (m1 && m1.ate >= hoje && i > 0 ? 0 : saldo), falta = Math.max(0, v - base), n = m.ate ? Math.max(1, moNum(m.ate) - moNum(hoje)) : 1, wait = i > 0 && m1 && m1.ate >= hoje;
    return `<div class="item"><div class="t"><b>${i + 1}. ${esc(m.nome)}</b><div class="mut">${wait ? `${brl(v)} até ${dMl(m.ate)} · começa depois da meta 1` : `${brl(base)} de ${brl(v)} · até ${dMl(m.ate)}${falta ? ' · guarde ' + brl(falta / n) + '/mês' : ' · pronto!'}`}</div><div class="bar thin"><i style="width:${wait || !v ? 0 : Math.min(100, base / v * 100)}%"></i></div></div></div>`; };
  const outras = cxs.filter(x => x !== cx && (x.tipo || 'colchao') !== 'colchao');
  const cz = c.colchao || {}, czx = cz.caixinha ? casaCx(cz.caixinha) : null, czs = czx ? num(czx.saldo) : 0, czm = num(cz.meta);
  const body = `<div class="banner"><span>${ic('home')}<b>Dá para morar sozinho em ${c.mudaEm ? dMl(c.mudaEm) : '—'}</b>${c.extraMeta ? ` se você ganhar <b>${brl(num(c.extraMeta))} a mais</b> por mês (freela ou aumento).` : ''}</span></div>
${(c.cenarios || []).length ? `<div class="grid3 sm">${c.cenarios.map(x => `<div><b class="${x.muda ? '' : 'neg'}">${x.muda ? dMl(x.muda) : 'não dá'}</b><small>${x.rotulo ? esc(x.rotulo) : num(x.extra) ? '+' + brl(num(x.extra)) + '/mês' : 'só com a renda de hoje'}</small></div>`).join('')}</div>` : ''}
<div class="mut">Renda de hoje ${brl(r)}. Mínimo para o plano fechar: <b>${brl(need)}</b> por mês.${c.rendaIdeal ? ` Ideal: <b>${brl(num(c.rendaIdeal))}</b> (quita o Norival mais rápido e sobra para guardar).` : ''}</div>
<div class="grp">Caixinha ${esc(c.caixinha || 'Casa')} · ${brl(saldo)}</div>
${outras.length ? `<div class="banner warn"><span>Você tem mais ${outras.length} caixinha(s): ${outras.map(x => esc(x.nome)).join(', ')}.</span><button class="btn sm" data-a="casajuntar">Juntar tudo</button></div>` : ''}
${cx ? '' : `<button class="btn sm" data-a="casacx" data-v="${esc(c.caixinha || 'Casa')}">${ic('plus')}Criar a caixinha ${esc(c.caixinha || 'Casa')}</button>`}
${metas.map(mItem).join('')}${cx ? `<button class="btn sm ghost" data-a="cxedit" data-v="${cx.id}">${ic('coin')}Atualizar o saldo da caixinha</button>` : ''}
${c.pais ? `<div class="mut">Seus pais: <b>${esc(c.pais)}</b></div>` : ''}
${czm ? `<div class="grp">${esc(cz.caixinha || 'Mini colchão')} (separado) · ${brl(czs)}</div><div class="item"><div class="t"><b>Reserva para emergências</b><div class="mut">${brl(czs)} de ${brl(czm)} · R$ 150 por mês já estão no plano. Depois de chegar lá, investir.</div><div class="bar thin"><i style="width:${Math.min(100, czs / czm * 100)}%"></i></div></div>${czx ? `<button class="btn sm ghost" data-a="cxedit" data-v="${czx.id}">Atualizar</button>` : `<button class="btn sm" data-a="casacx" data-v="${esc(cz.caixinha || 'Mini colchão')}">${ic('plus')}Criar</button>`}</div>` : ''}
${(c.ideias || []).length ? `<details class="sub"${ui.open.dcasai ? ' open' : ''} data-w="dcasai"><summary><b>Como ganhar mais · ${c.ideias.length} caminhos</b></summary>${c.ideias.map((x, i) => `<div class="item"><div class="t"><b>${i + 1}. ${esc(x.t)}</b>${x.d ? `<div class="mut">${esc(x.d)}</div>` : ''}</div>${x.quanto ? `<span class="mut">${esc(x.quanto)}</span>` : ''}</div>`).join('')}</details>` : ''}
${passos.length ? `<div class="grp">Passo a passo · ${passos.filter((p, i) => ok['s' + i]).length} de ${passos.length}</div>${passos.map((p, i) => `<div class="item${i === prox ? ' now' : ''}"><div class="t" style="${ok['s' + i] ? 'opacity:.55;text-decoration:line-through' : ''}">${i === prox ? '<b>Agora: </b>' : ''}${esc(p.t)}${p.ate ? `<div class="mut">${/^\d{4}-\d{2}$/.test(p.ate) ? 'até ' + dMl(p.ate) : esc(p.ate)}</div>` : ''}</div><button class="btn sm ${ok['s' + i] ? '' : 'ghost'}" data-a="casapasso" data-v="${i}" aria-pressed="${!!ok['s' + i]}">${ok['s' + i] ? ic('check') + 'Feito' : 'Feito?'}</button></div>`).join('')}` : ''}
${marcos.length ? `<details class="sub"${ui.open.dcasam ? ' open' : ''} data-w="dcasam"><summary><b>Próximos marcos</b></summary>${marcos.map(m => `<div class="item"><div class="t"><b>${dMl(m.mes)}</b><div class="mut">${esc(m.t)}</div></div></div>`).join('')}</details>` : ''}
${pend.length ? `<details class="sub"${ui.open.dcasap ? ' open' : ''} data-w="dcasap"><summary><b>Pendências · ${abertas.length} para resolver</b></summary>${abertas.map(x => `<div class="item"><div class="t">${esc(x.p.t)}${x.p.quem ? `<div class="mut">com ${esc(x.p.quem)}</div>` : ''}</div><button class="btn sm ghost" data-a="casaok" data-v="${x.i}" aria-pressed="false">${ic('check')}Resolvi</button></div>`).join('') || '<div class="mut">Tudo resolvido!</div>'}${feitas ? `<details class="sub"><summary>Resolvidas (${feitas})</summary>${pend.map((p, i) => ok['p' + i] ? `<div class="item"><div class="t" style="opacity:.6;text-decoration:line-through">${esc(p.t)}</div><button class="btn sm ghost" data-a="casaok" data-v="${i}" aria-pressed="true">Desfazer</button></div>` : '').join('')}</details>` : ''}</details>` : ''}
${c.planilha ? `<a class="btn ghost full" href="${esc(c.planilha)}" target="_blank" rel="noopener">${ic('external-link')}Abrir a planilha (aba CASA)</a>` : ''}<div class="mut">Estimativa para planejar, não é aconselhamento financeiro. Mudou algo? Ajuste a planilha e importe os ajustes de novo.</div>`;
  return acc('dcasa', 'Casa 2027', c.mudaEm ? 'mudar em ' + dMl(c.mudaEm) : '', body, true);
}
/* ---------- caixinhas: onde está o dinheiro guardado (colchão, investimento, meta de compra) ---------- */
const CX_TIPO = { colchao: 'Colchão / reserva', invest: 'Investimento', meta: 'Meta de compra' };
const cxMes = c => { const pr = dinS().prem, cdi = num(pr.cdi) / 100 * num(c.pctCdi || 100) / 100; return num(c.saldo) * (Math.pow(1 + cdi, 1 / 12) - 1); };
function caixinhasCard() {
  const d = dinS(), cx = d.caixinhas, tot = cx.reduce((a, c) => a + num(c.saldo), 0), rend = cx.reduce((a, c) => a + cxMes(c), 0), pr = d.prem;
  const grp = Object.keys(CX_TIPO).map(t => { const l = cx.filter(c => (c.tipo || 'colchao') === t); return l.length ? `<div class="grp">${CX_TIPO[t]} · ${brl(l.reduce((a, c) => a + num(c.saldo), 0))}</div>` + l.map(c => `<div class="item" data-a="cxedit" data-v="${c.id}" role="button" tabindex="0"><div class="t"><b>${esc(c.nome)}</b><div class="mut">${esc([c.instituicao, c.produto].filter(Boolean).join(' · '))}${c.pctCdi ? ' · ' + num(c.pctCdi) + '% do CDI' : ''} · ${esc(c.liquidez || 'diária')}${c.fgc ? ' · FGC' : ''} · rende ~${brl(cxMes(c))}/mês</div></div><b>${brl(num(c.saldo))}</b></div>`).join('') : ''; }).join('');
  return acc('dcx', 'Onde está o meu dinheiro', brl(tot), `<div class="grid3 sm"><div><b>${brl(tot)}</b><small>guardado</small></div><div><b>${brl(rend)}</b><small>rende/mês (bruto)</small></div><div><b>${num(pr.cdi).toLocaleString('pt-BR')}%</b><small>CDI ao ano</small></div></div>${grp || '<div class="mut">Nenhuma caixinha ainda.</div>'}<div class="mut">Estimativa antes do imposto, com CDI de ${num(pr.cdi).toLocaleString('pt-BR')}% (Selic ${num(pr.selic).toLocaleString('pt-BR')}% desde ${sd2(pr.at)}). Não é aconselhamento financeiro.</div><div class="row wrap"><button class="btn sm" data-a="cxadd">${ic('plus')}Caixinha</button><button class="btn sm ghost" data-a="cxprem">${ic('sliders')}Atualizar Selic e CDI</button></div>`, true);
}
function cxForm(c) {
  const d = dinS();
  form(c.id ? 'Editar caixinha' : 'Nova caixinha', [{ k: 'nome', label: 'Nome', value: c.nome || '' }, { k: 'tipo', label: 'Para quê', type: 'select', value: c.tipo || 'colchao', options: Object.entries(CX_TIPO) }, { k: 'instituicao', label: 'Banco', value: c.instituicao || '' }, { k: 'produto', label: 'Produto (RDB, CDB, Tesouro Selic…)', value: c.produto || '' }, { k: 'pctCdi', label: 'Rende quantos % do CDI', type: 'number', value: c.pctCdi || 100 }, { k: 'saldo', label: 'Saldo hoje (R$)', type: 'number', value: c.saldo || '' }, { k: 'liquidez', label: 'Quando posso sacar', type: 'select', value: c.liquidez || 'diária', options: ['diária', 'no vencimento', 'carência'] }], r => {
    const o = Object.assign({}, c, { id: c.id || uid(), nome: r.nome.trim() || 'Caixinha', tipo: r.tipo, instituicao: r.instituicao.trim(), produto: r.produto.trim(), pctCdi: num(r.pctCdi), saldo: num(r.saldo), liquidez: r.liquidez, fgc: c.fgc !== false });
    const i = d.caixinhas.findIndex(x => x.id === o.id); if (i >= 0) d.caixinhas[i] = o; else d.caixinhas.push(o);
  }, c.id ? () => { d.caixinhas = d.caixinhas.filter(x => x.id !== c.id); } : null);
}
function dinCxInit() { Object.assign(A, {
  casaok: v => { const c = S.casa; if (!c) return false; c.ok = c.ok || {}; c.ok['p' + v] = !c.ok['p' + v]; save(); },
  casapasso: v => { const c = S.casa; if (!c) return false; c.ok = c.ok || {}; c.ok['s' + v] = !c.ok['s' + v]; save(); },
  casajuntar: () => { const c = S.casa, d = dinS(); if (!c) return false; const nome = c.caixinha || 'Casa'; let cx = casaCx(nome); const out = d.caixinhas.filter(x => x !== cx); if (!out.length) return false;
    const tot = out.reduce((a, x) => a + num(x.saldo), 0); if (!confirm(`Juntar ${out.map(x => x.nome).join(', ')} na caixinha ${nome}? O saldo (${brl(tot)}) é somado e as outras somem do app. No banco, faça a mesma coisa.`)) return false;
    if (!cx) { cx = { id: uid(), nome, tipo: 'meta', instituicao: 'Nubank', produto: 'Caixinha', pctCdi: 100, saldo: 0, liquidez: 'diária', fgc: true }; d.caixinhas.push(cx); }
    cx.saldo = num(cx.saldo) + tot; d.caixinhas = d.caixinhas.filter(x => x === cx); save(); toast('Tudo numa caixinha só: ' + brl(cx.saldo)); },
  casacx: v => { cxForm({ nome: v, tipo: /reserva|colch/i.test(v) ? 'colchao' : 'meta', instituicao: 'Nubank', produto: 'Caixinha', pctCdi: 100 }); return false; },
  cxadd: () => { cxForm({}); return false; },
  cxedit: v => { const c = dinS().caixinhas.find(x => x.id === v); if (c) cxForm(c); return false; },
  cxprem: () => { const p = dinS().prem; form('Selic e CDI (atualize depois de cada Copom)', [{ k: 'selic', label: 'Selic (% ao ano)', type: 'number', value: p.selic }, { k: 'cdi', label: 'CDI (% ao ano)', type: 'number', value: p.cdi }, { k: 'ipca', label: 'Inflação 12 meses (%)', type: 'number', value: p.ipca }], r => { Object.assign(p, { selic: num(r.selic), cdi: num(r.cdi), ipca: num(r.ipca), at: dkey() }); }); return false; }
}); }
