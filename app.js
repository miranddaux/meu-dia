'use strict';
/* Meu Dia v3 — app pessoal (PWA). Dados ficam só neste aparelho (localStorage; fotos em IndexedDB). */
const $ = (s, r = document) => r.querySelector(s);
const APP_V = 'v36';
const uid = () => Math.random().toString(36).slice(2, 9);
const pad = n => String(n).padStart(2, '0');
const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const DN = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DF = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const tm = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const brl = n => (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = s => { s = String(s ?? '').trim(); if (!s) return 0; const n = s.includes(',') ? parseFloat(s.replace(/\./g, '').replace(',', '.')) : parseFloat(s); return isNaN(n) ? 0 : n; };
const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const wkStart = (d = new Date()) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); x.setHours(0, 0, 0, 0); return x; };
const short = d => `${d.getDate()}/${d.getMonth() + 1}`;
const sd2 = k => k.split('-').reverse().slice(0, 2).join('/');
const L = ml => (ml / 1000).toFixed(1).replace('.', ',');
const r1 = n => (Math.round(n * 10) / 10).toString().replace('.', ',');
/* ícone: biblioteca única (Pixelarticons), sempre 24 px */
const ic = (n, c = '') => `<svg class="ic ${c}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const ib = (n, label, a, v, cls = 'ghost') => `<button class="btn ico ${cls}" aria-label="${esc(label)}" data-a="${a}" ${v !== undefined ? `data-v="${esc(v)}"` : ''}>${ic(n)}</button>`;

/* ---------- estado ---------- */
let syncT = null, cloudT = null;
const KEY = 'meudia_v1';
const VER = 4;
let S;
const moNum = mo => +mo.slice(0, 4) * 12 + (+mo.slice(5, 7) - 1);
const addMo = (mo, n) => { const t = moNum(mo) + n; return `${Math.floor(t / 12)}-${pad(t % 12 + 1)}`; };
const planCfg = () => Object.assign({ start: 150, add: 50, every: 3, since: dkey().slice(0, 7) }, S.settings.plan || {});
const planTotal = mo => { const c = planCfg(); return num(c.start) + num(c.add) * Math.floor(Math.max(0, moNum(mo) - moNum(c.since)) / Math.max(1, Math.round(num(c.every)) || 3)); };
const activeGoals = () => S.goals.filter(g => num(g.target) > num(g.saved));
const gW = g => num(g.w) || 1;
const sharesOf = list => {
  const ag = list.filter(x => num(x.target) > num(x.saved)), o = {}; list.forEach(x => { o[x.id] = 0; }); if (!ag.length) return o;
  if ((S.settings.plan || {}).focus === false) { const t = ag.reduce((a, x) => a + gW(x), 0); ag.forEach(x => { o[x.id] = gW(x) / t; }); return o; }
  /* Foco (padrão): 1º mini colchão leva tudo; depois colchão grande 60% + o 1º desejo da lista 40% */
  const mini = ag.find(x => /mini/i.test(x.title)); if (mini) { o[mini.id] = 1; return o; }
  const res = ag.find(x => /reserva|colch/i.test(x.title)), des = ag.find(x => x !== res);
  if (res && des) { o[res.id] = 0.6; o[des.id] = 0.4; } else o[(res || des).id] = 1;
  return o;
};
const goalShare = g => sharesOf(S.goals)[g.id] || 0;
const goalM = (g, mo) => Math.round(planTotal(mo) * goalShare(g));
const goalEta = g => {
  const rest = Math.max(0, num(g.target) - num(g.saved)); if (!num(g.target)) return ''; if (rest <= 0) return 'meta batida';
  const mo0 = dkey().slice(0, 7), sim = S.goals.map(x => ({ id: x.id, title: x.title, target: num(x.target), saved: num(x.saved), w: x.w }));
  for (let n = 0; n < 240; n++) {
    const tot = planTotal(addMo(mo0, n)), sh = sharesOf(sim); sim.forEach(x => { x.saved += tot * (sh[x.id] || 0); });
    const me = sim.find(x => x.id === g.id);
    if (me.saved >= me.target) { const f = addMo(mo0, n); return `faltam ${brl(rest)} · ~${n + 1} ${n ? 'meses' : 'mês'} (${f.slice(5)}/${f.slice(0, 4)})`; }
  }
  return `faltam ${brl(rest)} · defina um valor maior por mês`;
};
const goalFields = g => [{ k: 'title', label: 'Meta', value: g.title }, { k: 'target', label: 'Valor alvo (R$)', type: 'number', value: g.target }, { k: 'saved', label: 'Já guardado (R$)', type: 'number', value: g.saved || 0 }, { k: 'w', label: 'Prioridade (quem recebe mais do valor guardado)', type: 'select', value: String(g.w || 1), options: [['1', 'Normal'], ['2', 'Alta'], ['3', 'Máxima']] }];
const goalClean = r => { const o = { ...r }; o.w = num(r.w) || 1; return o; };
const goalDue = (g, k) => { const mo = k.slice(0, 7); return goalShare(g) > 0 && k >= payDay(mo) && !((S.goalPaid || {})[mo] || {})[g.id]; };
/* ---- Dia do pagamento: 5º dia útil (sem sábado, domingo e feriados nacionais) ---- */
const payNth = () => Math.max(1, Math.min(15, Math.round(num((S.settings.plan || {}).payNth)) || 5));
const easterOf = y => { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), dy = (h + l - 7 * m + 114) % 31 + 1; return new Date(y, mo - 1, dy); };
function payDay(mo) {
  const [y, m] = mo.split('-').map(Number), gf = dkey(addD(easterOf(y), -2)), H = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25']; let n = 0;
  for (let d = 1; d <= 31; d++) { const dt = new Date(y, m - 1, d), key = dkey(dt); if (dt.getMonth() !== m - 1) break; if (dt.getDay() === 0 || dt.getDay() === 6 || H.includes(key.slice(5)) || key === gf) continue; if (++n === payNth()) return key; }
  return mo + '-07';
}
const rendaVal = () => { const c = (typeof planCache === 'function') ? planCache(dkey().slice(0, 7)) : null, e = c && c.entradas ? c.entradas.filter(x => /SAL[ÁA]RIO/i.test(x.desc)).reduce((a, x) => a + x.valor, 0) : 0; return e || num(S.settings.renda) || 4000; };
const PLAN_KEY = 'meudia_plan';
const pdays = () => (S.planDays = S.planDays || {});
const pkey = d => String(d).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const ui = { tab: 'hoje', hv: 'hoje', open: {}, mais: 'prog', corpo: 'treino', wo: 0, sd: null, mo: dkey().slice(0, 7), md: dkey(), flash: '', dt: 'detox', ju: 'nay', ix: 0, tm: null, es: 'plano', sub: 'mt', ls: null };

function b(s, e, t, type, x) { return Object.assign({ id: uid(), s, e, t, type }, x || {}); }
const MORN = () => [
  b('05:45', '05:55', 'Oração e agradecimento', 'flex'),
  b('05:55', '06:00', 'Arrumar a cama', 'flex'),
  b('06:00', '07:00', 'Estudo (1h)', 'flex', { study: 1 }),
  b('07:00', '07:30', 'Leitura e café da manhã', 'flex'),
  b('07:30', '08:00', 'Tempo flexível (leitura, cachorro ou o que precisar)', 'flex'),
  b('08:00', '09:00', 'Higiene, me arrumar e preparar para trabalhar', 'flex')
];
const MID = () => [
  b('09:00', '12:00', 'Trabalho', 'fixo'),
  b('12:00', '12:45', 'Almoço e organização básica', 'flex'),
  b('12:45', '13:00', 'Cochilo com alarme', 'flex'),
  b('13:00', '13:45', 'Descanso livre', 'livre'),
  b('13:45', '14:00', 'Preparação para trabalhar', 'flex'),
  b('14:00', '16:00', 'Trabalho', 'fixo'),
  b('16:00', '16:15', 'Pausa: lanche da tarde', 'flex'),
  b('16:15', '17:00', 'Trabalho', 'fixo')
];
function wk(gym) {
  return [...MORN(), ...MID(),
    ...(gym ? [b('17:00', '18:40', 'Treino (parar o trabalho, me arrumar e treinar)', 'flex')] : [b('17:00', '18:40', 'Fim do expediente: livre, caminhada ou ANIMAE', 'livre')]),
    b('18:40', '19:15', 'Passear com o cachorro', 'flex'),
    b('19:15', '20:00', 'Banho e jantar', 'flex'),
    b('20:00', '21:15', 'Tempo livre (sem metas obrigatórias)', 'livre'),
    b('21:15', '22:00', 'Higiene e oração da noite', 'flex'),
    b('22:00', '23:59', 'Dormir (meta; adaptação gradual)', 'fixo')];
}
function college(gym) {
  return [...MORN(), ...MID(),
    ...(gym ? [b('17:00', '18:10', 'Treino curto (parar o trabalho, me arrumar e treinar)', 'flex')] : [b('17:00', '18:10', 'Fim do expediente: livre ou cachorro', 'livre')]),
    b('18:10', '18:50', 'Banho e jantar (rápido)', 'flex'),
    b('18:50', '19:00', 'Ir para a aula', 'flex'),
    b('19:00', '22:00', 'Aula na UNIP (presencial)', 'fixo'),
    b('22:00', '22:45', 'Voltar, higiene e oração da noite', 'flex'),
    b('22:45', '23:59', 'Dormir (meta)', 'fixo')];
}
function sat() {
  return [
    b('07:00', '09:00', 'Manhã tranquila: oração, cuidados pessoais e cachorro', 'livre'),
    b('09:00', '10:00', 'Quarto e organização', 'flex'),
    b('10:00', '10:45', 'Produzir/agendar conteúdo do LinkedIn', 'flex'),
    b('11:00', '12:00', 'Matemática (opcional)', 'flex', { opt: 1 }),
    b('12:00', '13:30', 'Almoço e descanso', 'livre'),
    b('14:00', '18:00', 'Livre: date, passeio, desenho, culinária, filme', 'livre'),
    b('16:00', '17:30', 'ANIMAE: lançamento (opcional, até 90 min)', 'flex', { opt: 1 }),
    b('18:00', '23:00', 'Noite livre', 'livre')
  ];
}
function sun() {
  return [
    b('07:30', '09:00', 'Manhã tranquila e oração', 'livre'),
    b('09:00', '11:30', 'Igreja (inclui deslocamento — ajuste o horário)', 'fixo'),
    b('12:00', '13:00', 'Almoço e convivência', 'livre'),
    b('15:00', '15:20', 'Revisão semanal (20 min)', 'flex'),
    b('15:30', '21:00', 'Descanso e convivência', 'livre'),
    b('21:15', '22:00', 'Desacelerar, oração e preparação', 'flex')
  ];
}
function buildSchedule(col) {
  const f = col ? college : wk, s = {};
  [1, 2, 3].forEach(d => s[d] = f(true)); [4, 5].forEach(d => s[d] = f(false)); s[6] = sat(); s[0] = sun();
  return s;
}
const ALL = [0, 1, 2, 3, 4, 5, 6], WD = [1, 2, 3, 4, 5];
function hb(title, when, days, pts, hard, ord, at) { return { id: uid(), title, when, days, pts, hard, ord, at: at || '' }; }
const DEF_HABITS = () => [
  hb('Oração e agradecimento', 'm', ALL, 0, 1, 1, '05:45'), hb('Arrumar a cama', 'm', ALL, 1, 0, 2, '05:55'), hb('Leitura', 'm', ALL, 1, 0, 4, '07:00'), hb('Café da manhã', 'm', ALL, 0, 1, 5, '07:15'),
  hb('Remédio do cachorro (quando precisar)', 'm', [], 1, 1, 6, ''),
  hb('Almoço', 't', ALL, 0, 1, 1, '12:00'), hb('Cochilo com alarme', 't', WD, 0, 0, 2, '12:45'), hb('Lanche da tarde', 't', ALL, 0, 1, 3, '16:00'), hb('Treino (o treino guiado dá moedas)', 't', [1, 2, 3], 0, 0, 4, '17:00'),
  hb('Quarto e organização', 't', [6], 1, 0, 5, '09:00'), hb('Conteúdo do LinkedIn', 't', [6], 1, 0, 6, '10:00'), hb('Igreja', 'm', [0], 0, 0, 8, '09:00'), hb('Revisão semanal (20 min)', 't', [0], 1, 0, 9, '15:00'),
  hb('Passear com o cachorro', 'n', ALL, 1, 1, 1, '18:40'), hb('Banho e jantar', 'n', ALL, 0, 1, 2, '19:15'), hb('Cuidar da orelha do cachorro', 'n', ALL, 1, 0, 3, '20:30'), hb('Higiene e oração da noite', 'n', ALL, 0, 1, 3, '21:15'), hb('Preparar o dia seguinte', 'n', ALL, 1, 0, 4, '21:45'),
  hb('Cuidado da orelha (ajuste a recorrência)', 'n', ALL, 1, 0, 5, ''), hb('ANIMAE (bloco flexível)', 'n', [2, 4], 1, 0, 6, '20:00')
];
const STARTER = [
  ['Treino A — corpo inteiro (leve)', [['Leg press', 3, '10–12', 90], ['Supino com halteres', 3, '8–12', 90], ['Remada sentada (máquina ou cabo)', 3, '10–12', 90], ['Desenvolvimento com halteres', 2, '10–12', 75], ['Prancha', 3, '30–40 s', 60]]],
  ['Treino B — corpo inteiro (leve)', [['Agachamento goblet', 3, '10–12', 90], ['Puxada na frente', 3, '8–12', 90], ['Supino inclinado (máquina)', 3, '10–12', 90], ['Stiff com halteres', 3, '10–12', 90], ['Elevação lateral', 2, '12–15', 60]]],
  ['Treino C — corpo inteiro (leve)', [['Avanço ou step-up (cada perna)', 3, '10', 90], ['Remada unilateral com halter', 3, '10–12', 75], ['Supino na máquina', 3, '10–12', 90], ['Mesa flexora', 3, '12', 75], ['Abdominal na máquina', 3, '12–15', 60]]]
];
const mkCh = (t, kind = 'detox', days = 14) => ({ id: uid(), title: t, kind, days, start: dkey(), log: {}, rounds: 0, slips: [], completedAt: null });
const FOODS = () => [
  ['Ovo cozido (1 un)', 70, 6], ['Peito de frango grelhado (100 g)', 165, 31], ['Arroz branco cozido (100 g)', 130, 2.5], ['Feijão carioca cozido (100 g)', 76, 4.8],
  ['Batata-doce cozida (100 g)', 86, 1.6], ['Pão francês (1 un)', 150, 4.5], ['Banana (1 un)', 90, 1.1], ['Maçã (1 un)', 70, 0.4], ['Aveia (30 g)', 117, 4.2],
  ['Leite desnatado (200 ml)', 70, 7], ['Whey (1 dose de 30 g)', 120, 24], ['Salada de folhas (1 prato)', 20, 1], ['Azeite (1 colher)', 72, 0], ['Café sem açúcar (1 xícara)', 2, 0]
].map(f => ({ id: uid(), name: f[0], kcal: f[1], prot: f[2], carb: '', fat: '' }));
function defaults() {
  const REWD = [['Episódio extra de anime', 5], ['Filme ou sessão de jogo single-player', 10], ['Jantar com a Nayara', 30], ['Um presente que eu quero (definir)', 80]];
  const th = (theme, track, next = '') => ({ theme, track, link: '', next });
  return {
    v: VER, flags: {},
    settings: {
      gamify: true, welcomed: false, lastBackup: null, dietKcal: '', dietProt: '', waterGoal: 3000, bottle: 1800, cup: 300, college: false, theme: 'auto',
      calc: { sex: 'm', age: '', weight: 108, height: 180, act: 1.375, deficit: 500, target: 95 },
      rewards: REWD.map(r => ({ id: uid(), title: r[0], at: r[1] })), phase: 1, pom: { f: 25, b: 5 }, sync: { url: '/.netlify/functions/sync', key: '', on: false, last: '' }
    },
    schedule: buildSchedule(false), habits: DEF_HABITS(),
    log: {}, prios: {}, hardDay: {}, mood: {},
    study: { 0: th('', ''), 1: th('Front-end (Udemy: aula do professor do dia)', 'Front-end web (Udemy)'), 2: th('Inglês (aula com o Claude)', 'Inglês'), 3: th('Python (Curso em Vídeo, Guanabara)', 'Python (Guanabara)'), 4: th('Produto, UX e UI', 'UI/UX e Product Design'), 5: th('Fixação: flashcards, questões e diagnóstico', 'UI/UX e Product Design'), 6: th('Matemática (opcional)', 'Matemática de apoio') },
    studyLog: {},
    tracks: [
      { id: uid(), group: 'Formação principal', name: 'UI/UX e Product Design', link: '', now: '' },
      { id: uid(), group: 'Complementar — programação', name: 'Python (Guanabara)', link: '', now: '' },
      { id: uid(), group: 'Complementar — programação', name: 'Front-end web (Udemy)', link: '', now: 'Aula que o professor passar no dia' },
      { id: uid(), group: 'Apoio', name: 'Matemática de apoio', link: '', now: 'Divisão' },
      { id: uid(), group: 'Idioma', name: 'Inglês', link: '', now: '' }
    ],
    explore: [], lazer: ['Anime ou série', 'Filme', 'Música', 'Desenho', 'Culinária', 'Leitura', 'Documentário', 'Conversa com alguém', 'Oração', 'Descansar sem fazer nada'],
    workouts: [], weights: [], photos: [], meals: {}, combos: [], pomo: {}, learn: { done: {}, days: {}, xp: 0 }, vida: {},
    plans: STARTER.map(p => ({ id: uid(), name: p[0], ex: p[1].map(e => ({ name: e[0], sets: e[1], reps: e[2], rest: e[3] })) })),
    session: null, foods: FOODS(), water: {},
    challenges: [mkCh('Sem LoL'), mkCh('Sem TikTok')],
    ideas: { done: [], mine: [] },
    spent: [], tx: [], budgets: {}, goals: [], reviews: {}, bills: [], billPaid: {}, pet: [{ id: 'banho', title: 'Banho do cachorro', every: 15, last: '' }]
  };
}
function load() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) { }
  const d = defaults(), ds = d.settings, dc = ds.calc, dsy = ds.sync, dpm = ds.pom;
  S = Object.assign(d, raw || {});
  S.settings = Object.assign(ds, (raw && raw.settings) || {});
  S.settings.calc = Object.assign(dc, (raw && raw.settings && raw.settings.calc) || {});
  S.settings.sync = Object.assign(dsy, (raw && raw.settings && raw.settings.sync) || {});
  S.settings.pom = Object.assign(dpm, (raw && raw.settings && raw.settings.pom) || {});
  if (!S.learn || !S.learn.done) S.learn = { done: {}, days: {}, xp: 0 };
  S.ideas = Object.assign({ done: [], mine: [] }, (raw && raw.ideas) || {});
  S.flags = (raw && raw.flags) || {};
  if (raw) migrate(); else S.flags.fresh = 1;
}
/* migração suave: nunca apaga dado do usuário */
function migrate() {
  const f = S.flags;
  if (!f.v3) {
    f.v3 = 1; S.v = VER;
    const s1 = S.schedule && S.schedule[1];
    if (s1 && s1[0] && /^Levantar, cama/.test(s1[0].t)) { S.schedule = buildSchedule(S.settings.college); }
    const ord = { 'Oração e agradecimento': 1, 'Arrumar a cama': 2 };
    S.habits.forEach(h => {
      if (/^Academia \(o treino guiado/.test(h.title)) { h.title = 'Treino (o treino guiado dá moedas)'; if (h.days.join() === '1,3,5') h.days = [1, 2, 3]; }
      if (h.title === 'Passear com o cachorro') h.title = h.when === 'n' ? 'Passear com o cachorro (noite)' : 'Passear com o cachorro (manhã)';
    });
    const nk = t => t.toLowerCase().replace(/\s*\(.*\)\s*$/, '').trim();
    DEF_HABITS().forEach(h => { if (!S.habits.some(x => x.title.toLowerCase() === h.title.toLowerCase() || (nk(x.title) === nk(h.title) && x.when === h.when))) S.habits.push(h); });
    S.habits.forEach(h => { if (h.ord === undefined) h.ord = (ord[h.title] || 50); });
    S.challenges.forEach(c => { if (!c.kind) c.kind = 'detox'; });
    S.tracks.forEach(t => { if (t.now === undefined) t.now = t.name === 'Matemática de apoio' ? 'Divisão' : ''; });
    if (S.study[1] && S.study[1].theme === 'UI/UX e Product Design' && S.study[4] && S.study[4].theme === 'Programação') {
      const n = defaults().study; [1, 2, 3, 4, 5].forEach(i => { S.study[i] = n[i]; });
      S.tracks.forEach(t => { if (t.name === 'Python') t.name = 'Python (Guanabara)'; if (t.name.startsWith('Front-end web')) { t.name = 'Front-end web (Udemy)'; t.now = t.now || 'Aula que o professor passar no dia'; } });
    }
    if (!S.weights.length) S.weights.push({ id: uid(), date: dkey(), kg: 108 });
    if (S.settings.calc && String(S.settings.calc.weight) === '110') S.settings.calc.weight = 108;
    if (S.settings.calc && S.settings.calc.deficit === 600) S.settings.calc.deficit = 500;
    if (!S.plans || !S.plans.length) S.plans = defaults().plans;
    if (!S.photos) S.photos = []; if (!S.combos) S.combos = [];
    if (!S.foods.some(x => x.name.startsWith('Pão francês'))) FOODS().forEach(x => { if (!S.foods.some(y => y.name === x.name)) S.foods.push(x); });
  }
  if (!f.v4) {
    f.v4 = 1; S.v = VER;
    const g5 = (S.schedule[5] || []).some(x => x.t === 'Treino (com deslocamento)' || x.t === 'Treino curto (55 min)'), g2 = (S.schedule[2] || []).some(x => /^Treino/.test(x.t));
    if (g5 && !g2) { const ns = buildSchedule(S.settings.college); [1, 2, 3, 4, 5].forEach(d => { S.schedule[d] = ns[d]; }); }
    S.habits.forEach(h => { if (/^Treino \(o treino guiado/.test(h.title) && h.days.join() === '1,3,5') h.days = [1, 2, 3]; });
  }
  if (!f.v5) {
    f.v5 = 1;
    S.habits = S.habits.filter(h => h.title !== 'Passear com o cachorro (manhã)');
    S.habits.forEach(h => {
      if (h.title === 'Passear com o cachorro (noite)') h.title = 'Passear com o cachorro';
      if (/^Remédio do cachorro/.test(h.title)) { h.title = 'Remédio do cachorro (quando precisar)'; h.days = []; }
    });
    const AT = {}; DEF_HABITS().forEach(d => { AT[d.title.toLowerCase()] = d.at; });
    S.habits.forEach(h => { if (!h.at) h.at = AT[h.title.toLowerCase()] || ''; });
    if (!S.habits.some(h => h.title === 'Passear com o cachorro')) S.habits.push(DEF_HABITS().find(h => h.title === 'Passear com o cachorro'));
    if ((S.schedule[1] || []).some(x => x.t === 'Remédio do cachorro e passeio')) { const ns = buildSchedule(S.settings.college); [1, 2, 3, 4, 5].forEach(d => { S.schedule[d] = ns[d]; }); }
  }
  if (!f.pet) {
    f.pet = 1;
    S.habits = S.habits.filter(h => h.title !== 'Banho do cachorro (conforme necessidade)');
    if (!S.pet || !S.pet.length) S.pet = [{ id: 'banho', title: 'Banho do cachorro', every: 15, last: '' }];
  }
  if (!f.orelha) {
    f.orelha = 1;
    if (!S.habits.some(h => /orelha/i.test(h.title))) S.habits.push(DEF_HABITS().find(h => /orelha/.test(h.title)));
  }
  if (!f.detox6) {
    f.detox6 = 1;
    S.challenges.forEach(c => {
      if (c.kind === 'detox' && /LoL|TikTok/i.test(c.title) && chDays(c) === 0 && !(c.slips || []).length) backfill(c, 6);
    });
  }
  if (!f.goalfocus1 && S.goals && S.goals.length) {
    f.goalfocus1 = 1;
    if (!S.goals.some(g => /mini/i.test(g.title))) S.goals.push({ id: uid(), title: 'Mini colchão', target: 1000, saved: 0, w: 1, day: 5 });
    if (!S.goals.some(g => /anel/i.test(g.title))) S.goals.push({ id: uid(), title: 'Anel de noivado', target: 3000, saved: 0, w: 1, day: 5 });
    const rk = g => /mini/i.test(g.title) ? 0 : /reserva|colch/i.test(g.title) ? 1 : /anel/i.test(g.title) ? 2 : /ps5/i.test(g.title) ? 3 : /cel|iphone/i.test(g.title) ? 4 : 3.5;
    S.goals = S.goals.map((g, i) => [g, i]).sort((a, b) => rk(a[0]) - rk(b[0]) || a[1] - b[1]).map(x => x[0]);
  }
}
function backfill(c, n) {
  c.start = dkey(addD(new Date(), -n)); c.log = c.log || {};
  for (let i = n; i >= 1; i--) c.log[dkey(addD(new Date(), -i))] = 'ok';
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { alert('Não consegui salvar. Faça um backup agora.'); } if (S.settings.sync && S.settings.sync.on && S.settings.sync.key) { clearTimeout(syncT); syncT = setTimeout(() => doSync(true), 30000); } if (S.settings.sync && S.settings.sync.key) { clearTimeout(cloudT); cloudT = setTimeout(() => doBackup(true), 60000); } }

/* ---------- fotos (IndexedDB) ---------- */
const idb = () => new Promise((res, rej) => { const r = indexedDB.open('meudia_photos', 1); r.onupgradeneeded = () => r.result.createObjectStore('p'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function idbPut(k, v) { const d = await idb(); return new Promise((res, rej) => { const t = d.transaction('p', 'readwrite'); t.objectStore('p').put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); }
async function idbGet(k) { const d = await idb(); return new Promise((res, rej) => { const q = d.transaction('p').objectStore('p').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); }
async function idbDel(k) { const d = await idb(); return new Promise((res, rej) => { const t = d.transaction('p', 'readwrite'); t.objectStore('p').delete(k); t.oncomplete = res; t.onerror = () => rej(t.error); }); }
async function shrink(file, max = 1000) {
  const bmp = await createImageBitmap(file), s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, 'image/jpeg', .82));
}
const urlCache = {};
function hydratePhotos() {
  document.querySelectorAll('img[data-ph]').forEach(async el => {
    const id = el.dataset.ph;
    try { if (!urlCache[id]) { const bl = await idbGet(id); if (bl) urlCache[id] = URL.createObjectURL(bl); } if (urlCache[id]) el.src = urlCache[id]; } catch (e) { }
  });
}

/* ---------- helpers ---------- */
const sched = dow => [...(S.schedule[dow] || [])].sort((a, c) => tm(a.s) - tm(c.s));
const bt = (x, dow) => x.study ? `Estudo: ${(S.study[dow] && S.study[dow].theme) || 'tema do dia'}` : x.t;
const TL = { fixo: 'fixo', flex: 'flexível', livre: 'livre' };
const TLI = { fixo: 'pin', flex: 'sync', livre: 'cloud-sun' };
const ST = ['', 'done', 'partial', 'postponed', 'na'];
const SI = { '': '', done: 'check', partial: 'fill-half', postponed: 'forward', na: 'minus' };
const SL = { '': 'pendente', done: 'feito', partial: 'parcial', postponed: 'adiado', na: 'não se aplica' };
const WH = { m: 'Manhã', t: 'Tarde', n: 'Noite' };
function stOf(k, id) { return (S.log[k] && S.log[k][id]) || ''; }
function chDays(c) { return Object.keys(c.log).filter(k => c.log[k] === 'ok' && k >= c.start).length; }
function earned() {
  let p = 0;
  for (const k in S.log) for (const id in S.log[k]) if (S.log[k][id] === 'done') { const h = S.habits.find(x => x.id === id); if (h && h.pts) p++; }
  p += Object.values(S.studyLog).filter(x => x && x.done).length;
  p += S.workouts.length * 2;
  const g = num(S.settings.waterGoal); if (g > 0) p += Object.keys(S.water).filter(k => S.water[k] >= g).length;
  S.challenges.forEach(c => { p += Object.values(c.log).filter(v => v === 'ok').length + (c.rounds || 0) * 10; });
  p += (S.ideas.done || []).length;
  p += Object.keys((S.road && S.road.done) || {}).length * 3;
  p += Object.keys(S.hardDay || {}).filter(k => S.hardDay[k] && minDone(k)).length * 3;
  p += Object.values(S.pomo || {}).reduce((a, n) => a + Math.min(4, n), 0);
  p += Object.values((S.learn && S.learn.days) || {}).reduce((a, n) => a + Math.min(3, n), 0);
  Object.values(S.vida || {}).forEach(w => { p += Object.values(w.d || {}).filter(Boolean).length; });
  return p;
}
const coins = () => Math.max(0, earned() - S.spent.reduce((a, x) => a + x.cost, 0));
function pctWeek(ws) {
  const today = dkey(); let tot = 0, sc = 0;
  for (let i = 0; i < 7; i++) {
    const d = addD(ws, i), k = dkey(d); if (k > today) break;
    S.habits.forEach(h => { if (!h.days.includes(d.getDay()) || (S.hardDay[k] && !isMin(h))) return; const s = stOf(k, h.id); if (s === 'na') return; tot++; if (s === 'done') sc++; else if (s === 'partial') sc += .5; });
  }
  return tot ? Math.round(100 * sc / tot) : null;
}
const stBtn = (cls, icon, a, v, label) => `<button class="st ${cls}" data-a="${a}" ${v !== undefined ? `data-v="${v}"` : ''} aria-label="${esc(label)}">${icon ? ic(icon) : ''}</button>`;
const sec = (icon, title, right = '') => `<div class="row sp"><h3 class="px">${ic(icon)}<span>${title}</span></h3>${right}</div>`;

/* ---------- formulário em folha ---------- */
function form(title, fields, onSave, onDel) {
  const m = document.createElement('div'); m.className = 'modal'; m.setAttribute('role', 'dialog');
  const fh = f => {
    const v = f.value ?? '';
    if (f.type === 'select') return `<label>${f.label}</label><select name="${f.k}">${f.options.map(o => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(ov)}" ${String(ov) === String(v) ? 'selected' : ''}>${esc(ol)}</option>`; }).join('')}</select>`;
    if (f.type === 'textarea') return `<label>${f.label}</label><textarea name="${f.k}" placeholder="${esc(f.ph || '')}">${esc(v)}</textarea>`;
    if (f.type === 'days') return `<label>${f.label}</label><div class="days">${DN.map((n, i) => `<label>${n}<input type="checkbox" name="${f.k}" value="${i}" ${(v || []).includes(i) ? 'checked' : ''}></label>`).join('')}</div>`;
    return `<label>${f.label}</label><input name="${f.k}" type="${f.type || 'text'}" value="${esc(v)}" placeholder="${esc(f.ph || '')}" ${f.type === 'number' ? 'inputmode="decimal" step="any"' : ''}>`;
  };
  m.innerHTML = `<form class="sheet"><h3 class="px">${title}</h3>${fields.map(fh).join('')}<div class="row act"><button type="button" class="btn ghost" data-x>Cancelar</button>${onDel ? '<button type="button" class="btn danger" data-del>Excluir</button>' : ''}<button class="btn">Salvar</button></div></form>`;
  document.body.appendChild(m);
  const f = m.querySelector('form');
  m.addEventListener('click', e => {
    if (e.target === m || e.target.dataset.x !== undefined) m.remove();
    if (e.target.dataset.del !== undefined && confirm('Excluir?')) { onDel(); m.remove(); save(); render(); }
  });
  f.addEventListener('submit', e => {
    e.preventDefault(); const v = {};
    fields.forEach(fl => { v[fl.k] = fl.type === 'days' ? [...f.querySelectorAll(`[name="${fl.k}"]:checked`)].map(x => +x.value) : f.elements[fl.k].value; });
    onSave(v); m.remove(); save(); render();
  });
}

/* ---------- Hoje ---------- */
function mRow(k, h) {
  const s = stOf(k, h.id);
  return `<div class="hab"><div class="t">${h.at ? `<span class="hr">${h.at}</span>` : ''}${esc(h.title)}</div>${stBtn(s, SI[s], 'cyc', h.id, `${h.title}: ${SL[s]}. Toque para mudar`)}</div>`;
}
function waterCard(k) {
  const g = num(S.settings.waterGoal), ml = S.water[k] || 0, B = num(S.settings.bottle) || 1800, Cp = num(S.settings.cup) || 300;
  const on = g ? Math.min(10, Math.floor(ml / g * 10)) : 0;
  return `<div class="card slim">${sec('drop', 'Mana', `<b>${L(ml)}${g ? ' / ' + L(g) : ''} L</b>`)}<div class="segs">${[...Array(10)].map((_, i) => `<i class="${i < on ? 'on' : ''}"></i>`).join('')}</div>${g && ml >= g ? `<div class="mut">Meta batida!${S.settings.gamify ? ' +1 moeda' : ''}</div>` : ''}<div class="row wrap"><button class="btn sm" data-a="water" data-v="${Cp}">+ copo ${Cp}</button><button class="btn sm" data-a="water" data-v="${B}">+ garrafa ${L(B)} L</button><button class="btn sm ghost" data-a="water" data-v="${-Cp}" aria-label="Tirar ${Cp} ml">− ${Cp}</button></div></div>`;
}
function chRow(c, k) {
  const n = Math.min(c.days, chDays(c)), done = c.log[k] === 'ok', fin = !!c.completedAt, started = c.start <= k, det = c.kind !== 'melhorar';
  let btns;
  if (fin) btns = `<div class="banner">${ic('trophy')}<span>Rodada de ${c.days} dias completa!${S.settings.gamify ? ' +10 moedas' : ''}</span></div><button class="btn full" data-a="chnew" data-v="${c.id}">Começar nova rodada</button>`;
  else if (!started) btns = `<div class="mut">A rodada recomeça amanhã. Sem drama.</div>`;
  else btns = `<div class="row"><button class="btn ${done ? 'ghost' : ''}" data-a="chok" data-v="${c.id}">${ic('check')}${done ? (det ? 'Hoje limpo (desfazer)' : 'Feito hoje (desfazer)') : (det ? 'Hoje estou limpo' : 'Fiz hoje')}</button>${det ? `<button class="btn ghost sm" data-a="chslip" data-v="${c.id}">Escorreguei</button>` : ''}</div>`;
  return `<div class="ch"><div class="row sp" data-a="editch" data-v="${c.id}" role="button" tabindex="0"><b>${esc(c.title)}</b><span class="mut">${n}/${c.days} dias${c.rounds ? ` · ${c.rounds} rodada(s)` : ''}</span></div><div class="sqs">${[...Array(c.days)].map((_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>${btns}</div>`;
}
const isMin = h => /^(Oração e agradecimento|Almoço|Higiene e oração da noite)/.test(h.title);
const minHabs = dow => S.habits.filter(h => h.days.includes(dow) && isMin(h));
function minDone(k) { const hs = minHabs(new Date(k + 'T12:00').getDay()); return hs.length >= 3 && hs.every(h => stOf(k, h.id) === 'done'); }
const dayDiff = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 864e5);
function petNext(p) { return p.last ? dkey(addD(new Date(p.last + 'T12:00'), +p.every || 15)) : ''; }
function petCard(k) {
  if (!S.pet || !S.pet.length) return '';
  return `<div class="card">${sec('heart', 'Cuidados dos cachorros', `<button class="btn sm ghost" data-a="addpet">${ic('plus')}Item</button>`)}${S.pet.map(p => { const nx = petNext(p), left = nx ? dayDiff(k, nx) : null, due = left === null || left <= 0; return `<div class="item"><div class="t" data-a="editpet" data-v="${p.id}" role="button" tabindex="0">${esc(p.title)}<div class="mut">A cada ${p.every} dias · ${p.last ? 'último ' + sd2(p.last) : 'sem registro'}${left === null ? '' : left > 0 ? ' · faltam ' + left + ' dia' + (left > 1 ? 's' : '') : left === 0 ? ' · é hoje' : ' · atrasado ' + (-left) + ' dia' + (left < -1 ? 's' : '')}</div></div><button class="btn sm ${due ? '' : 'ghost'}" data-a="petdone" data-v="${p.id}">${ic('check')}Fiz hoje</button></div>`; }).join('')}</div>`;
}
const acc = (key, title, right, body, def) => `<details class="card" data-w="${key}" ${(ui.open[key] !== undefined ? ui.open[key] : def) ? 'open' : ''}><summary><span class="px">${title}</span><span class="mut">${right || ''}</span></summary>${body}</details>`;
function icsSig() { return JSON.stringify([S.habits.filter(h => h.at).map(h => [h.title, h.at, h.days]), S.pet, S.bills.map(b => [b.title, b.day, b.amount]), S.planDays || {}, S.goals.map(g => [g.title, num(g.target) > num(g.saved)]), payNth()]); }
function vHoje() {
  const seg = `<div class="chips"><button class="chip ${ui.hv === 'hoje' ? 'on' : ''}" data-a="hv" data-v="hoje">Hoje</button><button class="chip ${ui.hv === 'semana' ? 'on' : ''}" data-a="hv" data-v="semana">Semana</button></div>`;
  if (ui.hv === 'semana') return seg + vAgenda();
  const n = new Date(), k = dkey(n), dow = n.getDay(), hard = !!S.hardDay[k], mins = n.getHours() * 60 + n.getMinutes();
  const bl = sched(dow), cur = bl.find(x => tm(x.s) <= mins && mins < tm(x.e)), nxt = bl.find(x => tm(x.s) > mins);
  const st = S.study[dow] || {}, sl = S.studyLog[k] || {};
  const pr = S.prios[k] || [{}, {}, {}];
  const habs = S.habits.filter(h => h.days.includes(dow) && (!hard || isMin(h)));
  let out = seg;
  /* 1) Prioridades: sempre no topo */
  const pst = i => { const p = pr[i] || {}; return p.s || (p.d ? 'done' : ''); };
  const pdone = [0, 1, 2].filter(i => pst(i) === 'done').length;
  out += `<div class="card"><div class="row sp"><h3 class="px">${ic('bullseye')}<span>Prioridades</span></h3><span class="mut">${pdone}/3 feitas</span></div>${[0, 1, 2].map(i => { const s = pst(i); return `<div class="pri"><button class="st ${s === 'done' ? 'done' : s === 'no' ? 'no' : ''}" data-a="prcyc" data-v="${i}" aria-label="Prioridade ${i + 1}: ${s === 'done' ? 'feita' : s === 'no' ? 'não feita' : 'pendente'}. Toque para mudar">${s === 'done' ? ic('check') : s === 'no' ? ic('close') : ''}</button><input type="text" data-c="pt" data-v="${i}" value="${esc(pr[i] && pr[i].t)}" placeholder="Prioridade ${i + 1}"></div>`; }).join('')}<div class="mut">Toque no quadrado: feito, não fiz, vazio.</div></div>`;
  out += waterCard(k);
  if (!S.settings.welcomed) out += `<div class="card"><h3 class="px">${ic('mood-happy')}<span>Oi!</span></h3><p class="mut">Tudo fica salvo só neste iPhone. Toque no quadrado para marcar: vazio = pendente, check = feito, meio = parcial, seta = adiado, traço = não se aplica. Moedas vêm de missões, treino, água, estudo e desafios; você troca na Loja (Mais, Loja). Nada vira dívida. Faça backup nos ajustes (ícone no topo).</p><button class="btn sm" data-a="welcome">Entendi</button></div>`;
  /* 2) Agora */
  out += `<div class="card slim"><div class="row sp"><div class="grow">${cur ? `<div class="mut">Agora · ${cur.s}–${cur.e}</div><b>${esc(bt(cur, dow))}</b>` : `<div class="mut">Agora</div><b>Nenhum bloco neste horário</b>`}${nxt ? `<div class="mut">Depois: ${nxt.s} · ${esc(bt(nxt, dow))}</div>` : ''}</div><button class="chip ${hard ? 'on' : ''}" data-a="hard" aria-pressed="${hard}">${ic('shield')}Dia difícil</button></div></div>`;
  if (hard) { const mh = minHabs(dow), md3 = mh.filter(h => stOf(k, h.id) === 'done').length; out += `<div class="banner">${ic('info-box')}<span>${mh.length >= 3 && md3 === mh.length ? 'Dia salvo. Você fez o mínimo e isso conta (+3 moedas). O resto fica para outro dia.' : `Dia difícil: só 3 coisas hoje (${md3}/${mh.length || 3}): orar, almoçar e fechar a noite. O resto fica para outro dia, sem dívida.`}</span></div>`; }
  /* 3) Missões em accordion */
  ['m', 't', 'n'].forEach(w => {
    let items = habs.filter(h => h.when === w).map(h => ({ o: h.ord ?? 50, h }));
    if (w === 'm' && !hard && ((dow >= 1 && dow <= 5) || (st.theme && dow === 6))) items.push({ o: 3, study: 1 });
    if (!items.length) return;
    items.sort((a, c) => ((a.h ? a.h.at : '06:00') ? tm(a.h ? a.h.at : '06:00') : 5000 + a.o) - ((c.h ? c.h.at : '06:00') ? tm(c.h ? c.h.at : '06:00') : 5000 + c.o));
    const done = items.filter(i => i.study ? sl.done : stOf(k, i.h.id) === 'done').length;
    const hr = n.getHours(), curW = hr < 12 ? 'm' : hr < 18 ? 't' : 'n';
    out += acc(w, WH[w], `${done}/${items.length}`, `${w === 'm' ? '<div class="mut">Ordem: oração, cama, estudo, leitura e café.</div>' : ''}${items.map(i => i.study ? `<div class="hab"><div class="t"><span class="hr">06:00</span><b>Estudo:</b> ${esc(st.theme || '—')}${st.next ? `<div class="mut">Próxima ação: ${esc(st.next)}</div>` : ''}${st.link ? `<a href="${esc(st.link)}" target="_blank" rel="noopener">Abrir material</a>` : ''}${pomoMini()}</div>${stBtn(sl.done ? 'done' : '', sl.done ? 'check' : '', 'studydone', undefined, 'Estudo de hoje')}</div>` : mRow(k, i.h)).join('')}`, w === curW);
  });
  if (!hard) {
    out += roadCard();
    const act = S.challenges.filter(c => !c.completedAt || c.log[k]);
    out += acc('des', 'Desafios', `${act.filter(c => c.log[k] === 'ok').length}/${act.length} hoje`, `${act.map(c => chRow(c, k)).join('') || '<div class="mut">Sem desafios ativos. Crie um na aba Desafios.</div>'}<button class="btn sm ghost" data-a="gotodes">Abrir aba</button>`, false);
  }
  const md = S.mood[k] || {};
  out += `<details class="card" data-w="mood" ${ui.open.mood ? 'open' : ''}><summary><span class="px">Como estou</span><span class="mut">opcional, privado</span></summary><div class="mut">Humor</div><div class="chips">${[['mood-sad', 1], ['mood-sad', 2], ['mood-neutral', 3], ['mood-happy', 4], ['mood-happy', 5]].map(([i, v]) => `<button class="chip ${md.m === v ? 'on' : ''}" data-a="mood" data-v="m" data-w="${v}" aria-label="Humor ${v} de 5">${ic(i)}${v}</button>`).join('')}</div><div class="mut">Energia</div><div class="chips">${[1, 2, 3, 4, 5].map(i => `<button class="chip ${md.e === i ? 'on' : ''}" data-a="mood" data-v="e" data-w="${i}" aria-label="Energia ${i} de 5">${ic('battery-full')}${i}</button>`).join('')}</div><input data-c="mnote" value="${esc(md.note)}" placeholder="Nota rápida (só você vê)"></details>`;
  return out;
}

/* ---------- Agenda (Hoje, Semana) ---------- */
function vAgenda() {
  const d = ui.ad ?? new Date().getDay(), today = new Date(), mins = today.getHours() * 60 + today.getMinutes();
  let out = `<div class="chips">${[1, 2, 3, 4, 5, 6, 0].map(i => `<button class="chip ${i === d ? 'on' : ''}" data-a="aday" data-v="${i}">${DN[i]}</button>`).join('')}</div>`;
  out += `<div class="card">${sec('calendar-week', DF[d], `<button class="btn sm" data-a="addblk" data-v="${d}">${ic('plus')}Bloco</button>`)}<div class="mut">Fixo, flexível ou livre. Toque no bloco para reagendar ou editar. Nada vira dívida.${S.settings.college ? ' Modo faculdade ligado.' : ''}</div>`;
  out += sched(d).map(x => { const now = d === today.getDay() && tm(x.s) <= mins && mins < tm(x.e); return `<div class="blk ${now ? 'now' : ''}" data-a="editblk" data-v="${x.id}" data-w="${d}" role="button" tabindex="0"><div class="tm">${x.s}–${x.e}</div><div class="t">${esc(bt(x, d))}${x.opt ? ' <span class="mut">(opcional)</span>' : ''}</div><span class="badge ${x.type}">${ic(TLI[x.type])}${TL[x.type]}</span></div>`; }).join('');
  out += `</div><div class="card"><h3 class="px">Consultas</h3><div class="mut">Para consulta, adicione um bloco fixo no dia e reduza um bloco opcional.</div></div>`;
  return out;
}
const blkFields = x => [
  { k: 't', label: 'Título', value: x.t }, { k: 's', label: 'Início', type: 'time', value: x.s }, { k: 'e', label: 'Fim', type: 'time', value: x.e },
  { k: 'type', label: 'Tipo', type: 'select', value: x.type, options: [['fixo', 'Compromisso fixo'], ['flex', 'Bloco flexível'], ['livre', 'Tempo livre']] }
];

/* ---------- Estudos ---------- */
function vEstudos() { return vPlano(); }
function vPlano() {
  const today = new Date().getDay(), d = ui.sd ?? today, st = S.study[d] || { theme: '', track: '', link: '', next: '' }, k = dkey(), sl = S.studyLog[k] || {};
  let out = `<div class="chips">${[1, 2, 3, 4, 5, 6, 0].map(i => `<button class="chip ${i === d ? 'on' : ''}" data-a="sday" data-v="${i}">${DN[i]}</button>`).join('')}</div>`;
  out += estudoSemana();
  out += roadCard();
  out += histCard();
  out += `<div class="card"><h3 class="px">${DF[d]}${d === today ? ' · hoje' : ''}</h3>
<label>Tema do dia</label><input data-c="sth" value="${esc(st.theme)}" placeholder="Ex.: Front-end (Udemy)">
<label>Trilha</label><select data-c="str">${['', ...S.tracks.map(t => t.name)].map(n => `<option ${n === st.track ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
<label>Link do material (Notion, vídeo, curso)</label><input data-c="sln" type="url" value="${esc(st.link)}" placeholder="https://…">
${st.link ? `<a href="${esc(st.link)}" target="_blank" rel="noopener">${ic('external-link')}Abrir material</a>` : ''}
<label>Próxima ação</label><textarea data-c="snx" placeholder="O que fazer no próximo bloco">${esc(st.next)}</textarea>
${d === today ? `<button class="btn full" data-a="studydone">${ic('check')}${sl.done ? 'Bloco de hoje feito (desfazer)' : 'Marcar bloco de hoje como feito'}</button>` : ''}</div>`;
  out += vTimer();
  const groups = {}; S.tracks.forEach(t => (groups[t.group] = groups[t.group] || []).push(t));
  out += `<div class="card">${sec('list', 'Trilhas', `<button class="btn sm ghost" data-a="addtrack">${ic('plus')}Trilha</button>`)}<div class="mut">UI/UX e Product Design é a formação principal. Programação é complementar. Curiosidade é hobby: fica em Mais, Explorar, sem tarefa.</div>`;
  for (const g in groups) out += `<div class="grp">${esc(g)}</div>` + groups[g].map(t => `<div class="item"><div class="t"><b>${esc(t.name)}</b>${t.now ? `<div class="mut">Aula atual: ${esc(t.now)}</div>` : ''}</div>${t.link ? `<a href="${esc(t.link)}" target="_blank" rel="noopener">abrir</a>` : ''}${ib('edit', 'Editar trilha', 'edittrack', t.id)}</div>`).join('');
  return out + `</div>`;
}
/* ---------- Corpo ---------- */
function lastSet(name) {
  const ws = [...S.workouts].filter(w => w.sets).sort((a, c) => c.date.localeCompare(a.date));
  for (const w of ws) { const s = w.sets.filter(x => x.ex.toLowerCase() === name.toLowerCase()); if (s.length) return s[s.length - 1]; }
  return null;
}
function vCorpo() {
  let out = '';
  if (!S.session) out += `<div class="chips">${[['treino', 'human-run', 'Treino'], ['dieta', 'coffee', 'Dieta'], ['metas', 'scale', 'Metas e peso']].map(([i, c, l]) => `<button class="chip ${ui.corpo === i ? 'on' : ''}" data-a="ctab" data-v="${i}">${ic(c)}${l}</button>`).join('')}</div>`;
  if (ui.flash) { out += `<div class="banner">${ic('info-box')}<span>${esc(ui.flash)}</span></div>`; ui.flash = ''; }
  if (S.session) return out + vSessao();
  return out + (ui.corpo === 'treino' ? vTreino() : ui.corpo === 'dieta' ? vDieta() : vMetas());
}
function progressOf() {
  const by = {};
  [...S.workouts].filter(w => w.sets).sort((a, c) => a.date.localeCompare(c.date)).forEach(w => {
    const m = {}; w.sets.forEach(s => { if (num(s.kg) > (m[s.ex] || 0)) m[s.ex] = num(s.kg); });
    for (const e in m) (by[e] = by[e] || []).push({ d: w.date, kg: m[e] });
  });
  return by;
}
const PHASES = ['Fase 1 · Adaptação: aprenda os movimentos, carga leve, sobrando 3 repetições.', 'Fase 2 · Base: 3 a 4 séries, suba a carga quando completar todas as repetições.', 'Fase 3 · Progressão: 4 séries nos principais e carga subindo aos poucos.'];
function topReps(r) { const m = String(r).match(/(\d+)\D*$/); return /s\b/.test(String(r)) ? 0 : (m ? +m[1] : 0); }
function suggestKg(ex) {
  const ws = [...S.workouts].filter(w => w.sets).sort((a, c) => c.date.localeCompare(a.date));
  for (const w of ws) {
    const sets = w.sets.filter(x => x.ex.toLowerCase() === ex.name.toLowerCase()); if (!sets.length) continue;
    const top = topReps(ex.reps), kg = Math.max(...sets.map(x => num(x.kg)));
    if (top && kg > 0 && sets.length >= ex.sets && sets.every(x => num(x.reps) >= top)) return kg + 2.5;
    return null;
  }
  return null;
}
function vTreino() {
  const ws = dkey(wkStart()), cnt = S.workouts.filter(w => w.date >= ws).length;
  let out = `<div class="banner">${ic('info-box')}<span>Treinos de corpo inteiro às segundas, terças e quartas (mude em Missões e Semana). Pelo menos 2 por semana já funciona. Pare com 1 a 3 repetições de folga. Mostre a um instrutor ou médico antes, principalmente no começo.</span></div>`;
  out += phaseCard();
  out += `<div class="card"><div class="row sp"><div><div class="big">${cnt}<small>/2–3</small></div><div class="mut">treinos nesta semana</div></div><button class="btn sm ghost" data-a="addplan">${ic('plus')}Modelo</button></div></div>`;
  out += S.plans.map(p => `<div class="card"><h3 class="px">${esc(p.name)}</h3><div class="mut">${p.ex.map(e => esc(e.name)).join(' · ')}</div><div class="row"><button class="btn" data-a="startplan" data-v="${p.id}">${ic('play')}Começar</button>${ib('edit', 'Editar treino', 'editplan', p.id)}</div></div>`).join('');
  const pg = progressOf(), names = Object.keys(pg).filter(n => pg[n].length);
  out += `<div class="card">${sec('trending-up', 'Evolução da carga')}${names.map(n => { const a = pg[n], f = a[0].kg, l = a[a.length - 1].kg, mx = Math.max(...a.map(x => x.kg), 1); return `<div class="ev"><div class="row sp"><b>${esc(n)}</b><span class="mut">${f} → ${l} kg${l > f ? ' ▲' : ''}</span></div><div class="mini">${a.slice(-8).map(x => `<i style="height:${Math.max(8, x.kg / mx * 100)}%"></i>`).join('')}</div></div>`; }).join('') || '<div class="mut">Faça treinos guiados e registre a carga: aqui você vê a evolução de cada exercício.</div>'}</div>`;
  out += `<div class="card">${sec('list', 'Histórico', `<button class="btn sm ghost" data-a="addwk">${ic('plus')}Manual</button>`)}${[...S.workouts].sort((a, c) => c.date.localeCompare(a.date)).slice(0, 10).map(w => `<div class="item" data-a="editwk" data-v="${w.id}" role="button" tabindex="0"><div class="t"><b>${esc(w.name || 'Treino')}</b> <span class="mut">${sd2(w.date)}${w.dur ? ' · ' + esc(w.dur) + ' min' : ''}</span><div class="mut pre">${esc(w.notes)}</div></div></div>`).join('') || '<div class="mut">Nenhum treino ainda.</div>'}</div>`;
  return out;
}
function vSessao() {
  const s = S.session, ex = s.ex[s.i];
  const prev = lastSet(ex.name), last = s.done.filter(x => x.ex === ex.name).slice(-1)[0], sg = suggestKg(ex), pre = last || (sg ? { kg: sg, reps: '' } : prev) || {};
  const resting = s.restEnd && s.restEnd > Date.now();
  let out = `<div class="card"><div class="row sp"><span class="mut">${esc(s.name)} · <span id="elap">0:00</span></span><span class="mut">exercício ${s.i + 1}/${s.ex.length}</span></div><div class="bar"><i style="width:${Math.round(s.i / s.ex.length * 100)}%"></i></div>
<h2 class="px">${esc(ex.name)}</h2><div>Série <b>${s.set}</b> de ${ex.sets} · alvo ${esc(ex.reps)} · descanso ${ex.rest}s</div>
${sg && !last ? `<div class="banner">${ic('trending-up')}<span>Você completou tudo da última vez. Sugestão: tente ${r1(sg)} kg.</span></div>` : ''}${prev ? `<div class="mut">Última vez: ${prev.kg || '—'} kg × ${esc(prev.reps)}</div>` : '<div class="mut">Primeira vez: comece leve e anote.</div>'}
<div class="row"><div class="grow"><label>Carga (kg)</label><input id="kg" inputmode="decimal" value="${esc(pre.kg || '')}"></div><div class="grow"><label>Reps / tempo</label><input id="rp" value="${esc(pre.reps ?? '')}"></div></div>
<button class="btn full" data-a="setdone">${ic('check')}Série feita</button>
<div id="rest" class="banner" ${resting ? '' : 'hidden'}>${ic('hourglass')}<span>Descanso <b id="restTxt"></b></span><button class="btn sm ghost" data-a="skiprest">Pular</button></div>
<div class="row"><button class="btn ghost sm" data-a="skipex">${ic('forward')}Pular exercício</button><button class="btn danger sm" data-a="endsess">Encerrar treino</button></div></div>`;
  if (s.done.length) out += `<div class="card"><h3 class="px">Feito hoje</h3>${s.done.map(x => `<div class="mut">${esc(x.ex)} · série ${x.set}: ${x.kg || '—'} kg × ${esc(x.reps)}</div>`).join('')}</div>`;
  return out;
}
const MEALS = ['Café da manhã', 'Lanche', 'Almoço', 'Lanche da tarde', 'Jantar', 'Ceia', 'Outro'];
const sum = (ms, f) => ms.reduce((a, m) => a + num(m[f]), 0);
function vDieta() {
  const k = ui.md, ms = S.meals[k] || [], kc = sum(ms, 'kcal'), pt = sum(ms, 'prot'), cb = sum(ms, 'carb'), ft = sum(ms, 'fat');
  const gk = num(S.settings.dietKcal), gp = num(S.settings.dietProt);
  const yk = dkey(addD(new Date(k + 'T12:00'), -1)), yms = S.meals[yk] || [];
  const nm = k === dkey() ? 'Hoje' : sd2(k);
  let out = `<div class="row sp card slim">${ib('chevron-left', 'Dia anterior', 'dd', -1)}<b>${nm}</b>${ib('chevron-right', 'Próximo dia', 'dd', 1)}</div>`;
  out += `<div class="card">${sec('coffee', 'Resumo do dia')}<div class="grid3"><div><b>${Math.round(kc)}</b><small>kcal${gk ? ' / ' + gk : ''}</small></div><div><b>${Math.round(pt)}</b><small>prot. g${gp ? ' / ' + gp : ''}</small></div><div><b>${gk ? Math.max(0, Math.round(gk - kc)) : '—'}</b><small>kcal restantes</small></div></div>`;
  out += gk ? `<div class="bar ${kc > gk ? 'over' : ''}"><i style="width:${Math.min(100, kc / gk * 100)}%"></i></div>${gp ? `<div class="bar thin"><i style="width:${Math.min(100, pt / gp * 100)}%"></i></div>` : ''}` : `<div class="banner">${ic('info-box')}<span>Defina sua meta em Metas e peso. Falta só a idade para calcular.</span></div>`;
  if (cb || ft) out += `<div class="mut">Carboidrato ${Math.round(cb)} g · Gordura ${Math.round(ft)} g</div>`;
  out += `<div class="row"><button class="btn pri" data-a="build" data-v="${guessMeal()}">${ic('plus')}Montar refeição</button>${yms.length && !ms.length ? `<button class="btn" data-a="repday">${ic('repeat')}Repetir ontem</button>` : ''}</div></div>`;
  out += dietExtra(ms);
  MEALS.forEach(m => {
    const items = ms.filter(x => x.meal === m); const yi = yms.filter(x => x.meal === m);
    if (!items.length && m === 'Outro') return;
    out += `<div class="card slim"><div class="row sp"><h3 class="px">${m}</h3><span class="mut">${items.length ? Math.round(sum(items, 'kcal')) + ' kcal · ' + Math.round(sum(items, 'prot')) + ' g' : ''}</span></div>${items.map(x => `<div class="item" data-a="editmeal" data-v="${x.id}" role="button" tabindex="0"><div class="t">${esc(x.text)}</div><div class="mut">${x.kcal ? esc(x.kcal) + ' kcal' : ''}${x.prot ? '<br>' + esc(x.prot) + ' g' : ''}</div></div>`).join('')}<div class="row wrap"><button class="btn sm ghost" data-a="build" data-v="${m}">${ic('plus')}Adicionar</button>${yi.length && !items.length ? `<button class="btn sm ghost" data-a="repmeal" data-v="${m}">${ic('repeat')}Repetir de ontem</button>` : ''}</div></div>`;
  });
  out += `<div class="card">${sec('checklist', 'Refeições prontas', `<button class="btn sm ghost" data-a="build" data-v="${guessMeal()}">${ic('plus')}Criar</button>`)}<div class="mut">Salve uma refeição que você repete (ex.: arroz, feijão, frango e salada) e lance tudo com um toque.</div>${S.combos.map(c => `<div class="item"><div class="t"><b>${esc(c.name)}</b><div class="mut">${Math.round(sum(c.items, 'kcal'))} kcal · ${Math.round(sum(c.items, 'prot'))} g prot. · ${c.items.length} itens</div></div><button class="btn sm" data-a="usecombo" data-v="${c.id}">Lançar tudo</button>${ib('edit', 'Editar refeição pronta', 'editcombo', c.id)}</div>`).join('') || '<div class="mut">Nenhuma ainda.</div>'}</div>`;
  out += `<div class="card">${sec('list', 'Meus alimentos', `<button class="btn sm ghost" data-a="addfood">${ic('plus')}Salvar</button>`)}<div class="mut">Valores iniciais são aproximados: confira no rótulo ou na tabela TACO e edite.</div>${S.foods.map(f => `<div class="item"><div class="t"><b>${esc(f.name)}</b><div class="mut">${esc(f.kcal)} kcal · ${esc(f.prot)} g prot.</div></div>${ib('edit', 'Editar alimento', 'editfood', f.id)}</div>`).join('')}</div>`;
  return out;
}
/* montar refeição: vários alimentos de uma vez */
let BD = null;
function openBuilder(meal) {
  BD = { meal, q: {}, f: '' };
  const m = document.createElement('div'); m.className = 'modal'; m.id = 'bmodal'; m.setAttribute('role', 'dialog');
  m.innerHTML = `<div class="sheet"><h3 class="px">Montar refeição</h3><label>Refeição</label><select id="bmeal">${MEALS.map(x => `<option ${x === meal ? 'selected' : ''}>${x}</option>`).join('')}</select><input id="bsearch" placeholder="Buscar alimento" aria-label="Buscar alimento"><div id="blist"></div><div class="btot" id="btot"></div><div class="row act"><button type="button" class="btn ghost" data-bx>Fechar</button><button type="button" class="btn ghost" data-bsave>Salvar pronta</button><button type="button" class="btn" data-badd>Adicionar tudo</button></div></div>`;
  document.body.appendChild(m);
  paintBuilder();
  m.addEventListener('click', e => {
    const t = e.target.closest('button'), el = e.target;
    if (el === m || (t && t.dataset.bx !== undefined)) { m.remove(); BD = null; return; }
    if (t && t.dataset.q) { const [id, d] = t.dataset.q.split(':'); BD.q[id] = Math.max(0, Math.round(((BD.q[id] || 0) + Number(d)) * 10) / 10); paintBuilder(); return; }
    if (t && t.dataset.combo) { const c = S.combos.find(x => x.id === t.dataset.combo); addItems(c.items, $('#bmeal').value); m.remove(); BD = null; return; }
    if (t && t.dataset.badd !== undefined) { const it = builderItems(); if (!it.length) return; addItems(it, $('#bmeal').value); m.remove(); BD = null; return; }
    if (t && t.dataset.bsave !== undefined) { const it = builderItems(); if (!it.length) { alert('Escolha ao menos 1 alimento.'); return; } const n = prompt('Nome da refeição pronta (ex.: Almoço padrão)'); if (!n) return; S.combos.push({ id: uid(), name: n, items: it }); save(); alert('Salva em Refeições prontas.'); paintBuilder(); render(); }
  });
  m.querySelector('#bsearch').addEventListener('input', e => { BD.f = e.target.value.toLowerCase(); paintBuilder(); });
}
function builderItems() {
  return S.foods.filter(f => BD.q[f.id] > 0).map(f => { const q = BD.q[f.id]; return { name: q === 1 ? f.name : `${f.name} ×${String(q).replace('.', ',')}`, kcal: Math.round(num(f.kcal) * q * 10) / 10, prot: Math.round(num(f.prot) * q * 10) / 10, carb: f.carb ? num(f.carb) * q : '', fat: f.fat ? num(f.fat) * q : '' }; });
}
function paintBuilder() {
  const lst = $('#blist'); if (!lst) return;
  const combos = S.combos.length && !BD.f ? `<div class="grp">Refeições prontas</div>${S.combos.map(c => `<div class="item"><div class="t"><b>${esc(c.name)}</b><div class="mut">${Math.round(sum(c.items, 'kcal'))} kcal · ${Math.round(sum(c.items, 'prot'))} g</div></div><button class="btn sm" data-combo="${c.id}">Lançar tudo</button></div>`).join('')}<div class="grp">Alimentos</div>` : '';
  lst.innerHTML = combos + S.foods.filter(f => f.name.toLowerCase().includes(BD.f)).map(f => `<div class="item"><div class="t">${esc(f.name)}<div class="mut">${esc(f.kcal)} kcal · ${esc(f.prot)} g</div></div><div class="stepper"><button type="button" class="btn sm ghost" data-q="${f.id}:-0.5" aria-label="Menos">${ic('minus')}</button><b>${String(BD.q[f.id] || 0).replace('.', ',')}</b><button type="button" class="btn sm" data-q="${f.id}:0.5" aria-label="Mais">${ic('plus')}</button></div></div>`).join('');
  const it = builderItems();
  $('#btot').textContent = it.length ? `${it.length} itens · ${Math.round(sum(it, 'kcal'))} kcal · ${Math.round(sum(it, 'prot'))} g proteína` : 'Toque em + para escolher vários alimentos e adicione tudo de uma vez.';
}
function addItems(items, meal) {
  const k = ui.md; S.meals[k] = S.meals[k] || [];
  items.forEach(i => S.meals[k].push({ id: uid(), meal, text: i.name, kcal: i.kcal, prot: i.prot, carb: i.carb, fat: i.fat }));
  save(); ui.flash = `${items.length} item(ns) adicionados em ${meal}.`; render();
}
function calcOut() {
  const c = S.settings.calc, w = num(c.weight), h = num(c.height), a = num(c.age);
  if (!w || !h || !a) return null;
  const bmr = 10 * w + 6.25 * h - 5 * a + (c.sex === 'f' ? -161 : 5), tdee = bmr * num(c.act), def = num(c.deficit), target = tdee - def;
  const tw = num(c.target) || w, perWeek = def * 7 / 7700, toGo = Math.max(0, w - tw);
  return { bmr, tdee, target, def, protGoal: Math.round(1.8 * tw), pMin: Math.round(1.6 * tw), pMax: Math.round(2.2 * tw), perWeek, weeks: perWeek > 0 ? Math.ceil(toGo / perWeek) : 0, w };
}
function vMetas() {
  const c = S.settings.calc, r = calcOut();
  const ws = [...S.weights].sort((a, c2) => a.date.localeCompare(c2.date)), cur = ws.length ? num(ws[ws.length - 1].kg) : num(c.weight);
  let out = `<div class="banner warn">${ic('alert')}<span>Estimativa de ponto de partida (Mifflin-St Jeor). Não é prescrição. Combine com médico ou nutricionista, principalmente pelo seu peso, o treino e qualquer condição de saúde.</span></div>`;
  out += `<div class="card">${sec('scale', 'Peso e evolução', `<button class="btn sm" data-a="addweight">${ic('plus')}Pesar</button>`)}`;
  if (ws.length) {
    const first = num(ws[0].kg), diff = cur - first;
    out += `<div class="grid3"><div><b>${r1(cur)}</b><small>kg agora</small></div><div><b>${diff > 0 ? '+' : ''}${r1(diff)}</b><small>desde o início</small></div><div><b>${num(c.target) ? r1(Math.max(0, cur - num(c.target))) : '—'}</b><small>kg até a meta</small></div></div>`;
    const lastN = ws.slice(-26), mn2 = Math.min(...lastN.map(x => num(x.kg))) - 1, mx2 = Math.max(...lastN.map(x => num(x.kg))) + 1;
    out += `<div class="wchart" tabindex="0" aria-label="Gráfico de peso. Arraste para o lado para ver mais semanas.">${lastN.map(x => `<div class="wc"><small>${r1(num(x.kg))}</small><i style="height:${Math.max(8, Math.round((num(x.kg) - mn2) / (mx2 - mn2) * 96))}px"></i><span>${sd2(x.date)}</span></div>`).join('')}</div>${lastN.length > 6 ? '<div class="mut">Arraste para o lado para ver as outras semanas.</div>' : ''}`;
    const rec = ws.filter(x => x.date >= dkey(addD(new Date(), -21)));
    if (rec.length >= 2) { const a0 = rec[0], a1 = rec[rec.length - 1], days = (new Date(a1.date) - new Date(a0.date)) / 864e5; if (days >= 5) { const pw = (num(a1.kg) - num(a0.kg)) / (days / 7); out += `<div>Ritmo recente: <b>${pw > 0 ? '+' : ''}${r1(pw)} kg/semana</b> <span class="mut">(faixa-alvo: −0,5 a −1)</span></div>`; } }
    out += `<div class="mut">Pese-se 1× por semana, no mesmo horário.</div>`;
  } else out += `<div class="mut">Pese-se 1× por semana, no mesmo horário, para ver a tendência.</div>`;
  out += `</div>`;
  /* fotos */
  const ph = [...S.photos].sort((a, c2) => a.date.localeCompare(c2.date));
  out += `<div class="card">${sec('camera', 'Fotos de evolução', `<label class="btn sm" for="phfile">${ic('plus')}Foto</label>`)}<input id="phfile" type="file" accept="image/*" data-c="photo" hidden><div class="mut">As fotos ficam só neste aparelho (não entram no backup de texto). Tire na mesma luz, no mesmo lugar, a cada 2 a 4 semanas.</div>`;
  if (ph.length >= 2) out += `<div class="cmp"><figure><img data-ph="${ph[0].id}" alt="Primeira foto"><figcaption>${sd2(ph[0].date)}${ph[0].kg ? ' · ' + r1(num(ph[0].kg)) + ' kg' : ''}</figcaption></figure><figure><img data-ph="${ph[ph.length - 1].id}" alt="Foto mais recente"><figcaption>${sd2(ph[ph.length - 1].date)}${ph[ph.length - 1].kg ? ' · ' + r1(num(ph[ph.length - 1].kg)) + ' kg' : ''}</figcaption></figure></div>`;
  out += `<div class="gal">${ph.map(p => `<button class="th" data-a="editph" data-v="${p.id}" aria-label="Foto de ${sd2(p.date)}"><img data-ph="${p.id}" alt=""><span>${sd2(p.date)}</span></button>`).join('')}</div></div>`;
  /* calculadora */
  out += `<div class="card">${sec('bullseye', 'Meta de calorias')}
<label>Sexo</label><select data-c="cc" data-v="sex"><option value="m" ${c.sex !== 'f' ? 'selected' : ''}>Masculino</option><option value="f" ${c.sex === 'f' ? 'selected' : ''}>Feminino</option></select>
<div class="row"><div class="grow"><label>Idade</label><input data-c="cc" data-v="age" inputmode="numeric" value="${esc(c.age)}" placeholder="anos"></div><div class="grow"><label>Altura (cm)</label><input data-c="cc" data-v="height" inputmode="numeric" value="${esc(c.height)}"></div></div>
<div class="row"><div class="grow"><label>Peso atual (kg)</label><input data-c="cc" data-v="weight" inputmode="decimal" value="${esc(c.weight)}"></div><div class="grow"><label>Peso-alvo (kg)</label><input data-c="cc" data-v="target" inputmode="decimal" value="${esc(c.target)}"></div></div>
<label>Nível de atividade</label><select data-c="cc" data-v="act">${[[1.2, 'Sedentário'], [1.375, 'Leve (trabalho sentado, 2–3 treinos e caminhadas)'], [1.55, 'Moderado'], [1.725, 'Intenso']].map(([v, l]) => `<option value="${v}" ${+c.act === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
<label>Déficit diário (kcal)</label><input data-c="cc" data-v="deficit" inputmode="numeric" value="${esc(c.deficit)}"></div>`;
  if (!r) out += `<div class="banner">${ic('info-box')}<span>Preencha a idade (e confira altura e peso) para ver o resultado.</span></div>`;
  else {
    out += `<div class="card">${sec('chart-bar', 'Resultado')}<div class="grid3"><div><b>${Math.round(r.bmr)}</b><small>metabolismo basal</small></div><div><b>${Math.round(r.tdee)}</b><small>gasto por dia</small></div><div><b>${Math.round(r.target)}</b><small>meta kcal</small></div></div>
<div>Proteína: <b>${r.pMin}–${r.pMax} g/dia</b> <span class="mut">(1,6–2,2 g por kg do peso-alvo; sugestão ${r.protGoal} g)</span></div>
<div>Ritmo estimado: <b>≈ ${r1(r.perWeek)} kg/semana</b>${r.weeks ? ` · ≈ ${r.weeks} semanas até ${esc(c.target)} kg` : ''}</div>
<div class="mut">Referência: déficit de 500–750 kcal/dia ≈ 0,5–1 kg por semana. Perder mais rápido costuma custar músculo. Recalcule a cada 4–5 kg perdidos.</div>`;
    if (r.target < r.bmr) out += `<div class="banner warn">${ic('alert')}<span>A meta ficou abaixo do metabolismo basal estimado. Converse com um profissional antes de comer tão pouco.</span></div>`;
    if (r.def > 1000) out += `<div class="banner warn">${ic('alert')}<span>Déficit acima de 1.000 kcal/dia é agressivo. Prefira 500–750.</span></div>`;
    if (r.perWeek > r.w * 0.01) out += `<div class="banner warn">${ic('alert')}<span>Esse ritmo passa de ~1% do peso por semana. Pode custar massa magra.</span></div>`;
    out += `<button class="btn full" data-a="usegoals">${ic('check')}Usar como minhas metas</button></div>`;
  }
  const g = S.settings, rec = Math.round(cur * 35 / 100) * 100;
  out += `<div class="card">${sec('drop', 'Água')}<div class="mut">Pelo seu peso (${r1(cur)} kg), uma referência comum é cerca de 35 ml por kg: ≈ ${L(rec)} L por dia. Comece pela meta que você consegue cumprir e suba aos poucos. Ajuste com calor, treino e orientação médica.</div>
<label>Meta diária (ml)</label><input data-c="ws" data-v="waterGoal" inputmode="numeric" value="${esc(g.waterGoal)}"><button class="btn sm ghost" data-a="waterrec" data-v="${rec}">Usar ${L(rec)} L</button>
<div class="row"><div class="grow"><label>Garrafa (ml)</label><input data-c="ws" data-v="bottle" inputmode="numeric" value="${esc(g.bottle)}"></div><div class="grow"><label>Copo (ml)</label><input data-c="ws" data-v="cup" inputmode="numeric" value="${esc(g.cup)}"></div></div></div>`;
  return out;
}

/* ---------- Desafios ---------- */
const IDEAS = {
  nay: ['Jantar em um lugar que nunca fomos', 'Noite de jogo de tabuleiro, sem celular', 'Piquenique ao pôr do sol', 'Cozinhar uma receita nova juntos', 'Cinema e sobremesa depois', 'Passeio sem destino', 'Cada um escolhe uma música e conta o porquê', 'Escrever um bilhete para o outro', 'Maratona de série com pipoca feita em casa', 'Visitar uma cidade vizinha no sábado'],
  casa: ['Arrumar 1 cantinho da casa em 15 min', 'Trocar um móvel de lugar', 'Planta nova para a casa', 'Noite sem TV: música e conversa', 'Preparar marmitas da semana juntos', 'Limpar um armário e doar o que sobrar'],
  fam: ['Ligar para um familiar sem motivo', 'Almoço de domingo com todos', 'Perguntar a um parente uma história antiga', 'Foto de família para imprimir', 'Convidar alguém para um café', 'Mandar mensagem de gratidão'],
  eu: ['30 min de caminhada sem fone', 'Ler 10 páginas', 'Escrever 3 coisas boas do dia', 'Um hobby sem objetivo por 30 min', 'Dormir antes das 23h', 'Tirar 1 hora do celular']
};
const JT = { nay: 'Com a Nayara', casa: 'Em casa', fam: 'Família', eu: 'Eu melhorando' };
const SUG = ['Caminhar 20 minutos', 'Ler 10 páginas', 'Beber a meta de água', 'Sem refrigerante', 'Elogiar a Nayara uma vez', 'Alongar 10 minutos', 'Dormir antes das 23h', 'Escrever 3 coisas boas do dia', 'Meditar ou orar 5 minutos extras', 'Ligar para alguém da família'];
function vDesafios() {
  if (ui.dt === 'juntos') ui.dt = 'detox';
  let out = `<div class="chips">${[['detox', 'shield', 'Detox'], ['melhorar', 'trending-up', 'Melhorar']].map(([i, c, l]) => `<button class="chip ${ui.dt === i ? 'on' : ''}" data-a="dt" data-v="${i}">${ic(c)}${l}</button>`).join('')}</div>`;
  const k = dkey();
  if (ui.dt === 'juntos') {
    const key = ui.ju, list = [...IDEAS[key], ...(S.ideas.mine || []).filter(x => x.w === key).map(x => x.t)], idea = list[ui.ix % list.length];
    out += `<div class="chips">${Object.keys(JT).map(i => `<button class="chip ${ui.ju === i ? 'on' : ''}" data-a="ju" data-v="${i}">${JT[i]}</button>`).join('')}</div>`;
    out += `<div class="card">${sec('heart', JT[key])}<div class="idea">${esc(idea)}</div><div class="row"><button class="btn ghost" data-a="sort">${ic('shuffle')}Sortear</button><button class="btn" data-a="didit" data-v="${esc(idea)}">${ic('check')}Fizemos</button></div><div class="mut">${(S.ideas.done || []).length} ideias feitas no total. Cada uma vale 1 moeda.</div></div>`;
    out += `<div class="card">${sec('list', 'Minhas ideias', `<button class="btn sm ghost" data-a="addidea">${ic('plus')}Ideia</button>`)}${(S.ideas.mine || []).filter(x => x.w === key).map(x => `<div class="item"><div class="t">${esc(x.t)}</div>${ib('close', 'Remover ideia', 'delidea', x.id)}</div>`).join('') || '<div class="mut">Adicione ideias suas para esta lista.</div>'}</div>`;
    const dn = [...(S.ideas.done || [])].reverse().slice(0, 6);
    if (dn.length) out += `<div class="card"><h3 class="px">Já fizemos</h3>${dn.map(x => `<div class="item"><div class="t">${esc(x.t)}</div><span class="mut">${sd2(x.d)}</span></div>`).join('')}</div>`;
    return out;
  }
  const kind = ui.dt, chs = S.challenges.filter(c => (c.kind || 'detox') === kind);
  out += `<div class="card">${sec(kind === 'detox' ? 'shield' : 'trending-up', kind === 'detox' ? 'Detox' : 'Melhorar', `<button class="btn sm" data-a="addch" data-v="${kind}">${ic('plus')}Desafio</button>`)}<div class="mut">${kind === 'detox' ? 'Se escorregar, a rodada recomeça amanhã. Você não perde as moedas que já ganhou.' : 'Escolha 1 coisa para fazer todo dia por 10, 15 ou 30 dias. Dia perdido não zera nada: marque o próximo.'}</div></div>`;
  out += chs.map(c => `<div class="card">${chRow(c, k)}</div>`).join('') || `<div class="card"><div class="mut">Nenhum desafio aqui ainda.</div></div>`;
  if (kind === 'melhorar') out += `<div class="card">${sec('lightbulb-on', 'Ideias de desafio')}<div class="chips wrapc">${SUG.map((s, i) => `<button class="chip" data-a="sugch" data-v="${i}">${esc(s)}</button>`).join('')}</div><div class="mut">Toque para criar (você escolhe 10, 15 ou 30 dias).</div></div>`;
  return out;
}

/* ---------- Porkinho ---------- */
const CATS = ['Moradia', 'Mercado', 'Transporte', 'Saúde', 'Lazer', 'Estudos', 'Assinaturas', 'Pet', 'Academia/Suplementos', 'Outros'];
const CATS_IN = ['Salário', 'Freelance', 'Outras entradas'];
function monthStats(mo) {
  const t = S.tx.filter(x => x.date.startsWith(mo)); let inn = 0, out = 0; const by = {}, nec = { ess: 0, fix: 0, nao: 0 };
  t.forEach(x => { const v = num(x.amount); if (x.type === 'in') inn += v; else { out += v; by[x.cat] = (by[x.cat] || 0) + v; nec[necOf(x)] += v; } });
  return { t, inn, out, by, nec };
}
function porkSays(st) {
  if (!st.t.length) return 'Ainda não tem lançamentos neste mês. Lance o primeiro e eu começo a somar.';
  const msgs = [];
  if (st.inn - st.out >= 0) msgs.push(`Até aqui o mês está no azul: sobram ${brl(st.inn - st.out)}.`); else msgs.push(`Saiu ${brl(st.out - st.inn)} a mais do que entrou. Sem drama: vale olhar os maiores gastos.`);
  const over = Object.keys(S.budgets).filter(c => num(S.budgets[c]) > 0 && (st.by[c] || 0) > num(S.budgets[c]));
  if (over.length) msgs.push(`${over.join(', ')} passou do limite que você definiu.`);
  const top = Object.entries(st.by).sort((a, c) => c[1] - a[1])[0];
  if (top) msgs.push(`Maior gasto: ${top[0]} (${brl(top[1])}).`);
  return msgs.join(' ');
}
const sheetOn = () => !!(S.settings.sync.key && S.settings.sheetOn !== false);
const txSend = (t, undo) => planQueue({ action: 'auto', month: String(t.date).slice(0, 7), type: t.type, cat: t.cat, desc: t.desc || t.cat, valor: num(t.amount), ...(undo ? { undo: true } : {}) });
const billDue = (b, mo) => `${mo}-${pad(Math.min(28, Math.max(1, Math.round(num(b.day)) || 1)))}`;
function billsCard(mo) {
  const paid = S.billPaid[mo] || {}, tot = S.bills.reduce((a, b) => a + num(b.amount), 0), pg = S.bills.filter(b => paid[b.id]).reduce((a, b) => a + num(b.amount), 0), today = dkey();
  const rows = [...S.bills].sort((a, c) => num(a.day) - num(c.day)).map(b => { const d = billDue(b, mo), ok = !!paid[b.id], late = !ok && d < today; return `<div class="item"><div class="t">${esc(b.title)}<div class="mut">Dia ${Math.min(28, num(b.day) || 1)} · ${brl(num(b.amount))}${late ? ' · venceu' : ''}${ok ? ' · pago' : ''}</div></div><div class="row">${ok ? doneBtn('Pago', 'Desfazer', `data-a="paybill" data-v="${b.id}" data-w="${mo}"`) : `<button class="btn sm" data-a="paybill" data-v="${b.id}" data-w="${mo}">${ic('check')}Paguei</button>`}${ib('edit', 'Editar conta', 'editbill', b.id)}</div></div>`; }).join('');
  return `<div class="card">${sec('calendar', 'Contas fixas', `<button class="btn sm ghost" data-a="addbill">${ic('plus')}Conta</button>`)}${S.bills.length ? `<div class="mut">Pago ${brl(pg)} de ${brl(tot)} neste mês.</div><div class="bar"><i style="width:${tot ? Math.min(100, pg / tot * 100) : 0}%"></i></div>` : '<div class="mut">Cadastre aluguel, internet, cartão e assinaturas. O app lembra perto do vencimento e, ao tocar Paguei, já lança a saída.</div>'}${rows}${S.bills.length ? `<button class="btn sm ghost" data-a="icsfin">${ic('download')}Avisar no iPhone</button>` : ''}</div>`;
}
const billFields = b => [{ k: 'title', label: 'Nome', value: b.title }, { k: 'amount', label: 'Valor (R$)', type: 'number', value: b.amount }, { k: 'day', label: 'Dia do vencimento (1 a 28)', type: 'number', value: b.day }, { k: 'cat', label: 'Categoria', type: 'select', value: b.cat || 'Moradia', options: CATS }];
function billAlerts() {
  const k = dkey(), mo = k.slice(0, 7), paid = S.billPaid[mo] || {}, out = [];
  S.bills.forEach(b => { if (paid[b.id]) return; const d = billDue(b, mo), diff = Math.round((new Date(d + 'T12:00') - new Date(k + 'T12:00')) / 864e5); if (diff < 0) out.push(`${b.title} venceu dia ${d.slice(8)}`); else if (diff <= 3) out.push(`${b.title} vence ${diff === 0 ? 'hoje' : diff === 1 ? 'amanhã' : 'em ' + diff + ' dias'}`); });
  Object.values(pdays()).forEach(p => { const it = (planCache(mo) || {}).despesas; const row = it && it.find(x => pkey(x.desc) === pkey(p.t)); if (row && (row.pago || !row.valor)) return; const d = billDue({ day: p.day }, mo), diff = Math.round((new Date(d + 'T12:00') - new Date(k + 'T12:00')) / 864e5); if (diff < 0) out.push(`${p.t} venceu dia ${d.slice(8)}`); else if (diff <= 3) out.push(`${p.t} vence ${diff === 0 ? 'hoje' : diff === 1 ? 'amanhã' : 'em ' + diff + ' dias'}`); });
  const last = S.tx.map(x => x.date).sort().pop();
  if (S.tx.length && last && (new Date(k + 'T12:00') - new Date(last + 'T12:00')) / 864e5 >= 3) out.push('Faz uns dias sem lançar no Porkinho');
  return out;
}
function planoInner() {
  const renda = rendaVal(), c = planCfg(), mo = dkey().slice(0, 7), tot = planTotal(mo), ev = Math.max(1, Math.round(num(c.every)) || 3);
  const nxt = addMo(c.since, (Math.floor(Math.max(0, moNum(mo) - moNum(c.since)) / ev) + 1) * ev);
  const b = `<div class="grid3 sm"><div><b>${brl(renda)}</b><small>renda (planilha)</small></div><div><b>${brl(tot)}</b><small>guardar por mês</small></div><div><b>${Math.round(tot / renda * 100)}%</b><small>da renda</small></div></div><div class="mut">Começa pouco e sobe ${brl(num(c.add))} a cada ${ev} meses. Próximo aumento: ${nxt.slice(5)}/${nxt.slice(0, 4)} (${brl(planTotal(nxt))}/mês).</div><div class="mut">Regra simples: no dia do pagamento, guarde primeiro, depois gaste o resto. Deixe o depósito automático no app do banco e use o Meu Dia só para conferir.</div>`;
  return `${b}<button class="btn sm ghost" data-a="plano">${ic('sliders')}Ajustar plano</button>`;
}
function granaAll(parts) {
  const P = {};
  const mo = ui.mo, [y, m] = mo.split('-').map(Number), st = monthStats(mo);
  const nm = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  let out = `<div class="row sp card slim">${ib('chevron-left', 'Mês anterior', 'mo', -1)}<b class="cap1">${nm}</b>${ib('chevron-right', 'Próximo mês', 'mo', 1)}</div>`;
  out += `<div class="card">${sec('wallet', 'Porkinho')}<div class="mut">${esc(porkSays(st))}</div></div>`;
  out += `<div class="grid3"><div><b class="ok">${brl(st.inn)}</b><small>entradas</small></div><div><b class="warnc">${brl(st.out)}</b><small>saídas</small></div><div><b>${brl(st.inn - st.out)}</b><small>saldo</small></div></div>`;
  out += `<button class="btn full pri" data-a="addtx">${ic('plus')}Lançar</button>`;
  const goalRow = g => {
    const p = num(g.target) ? Math.min(100, num(g.saved) / num(g.target) * 100) : 0, done = num(g.target) > 0 && num(g.saved) >= num(g.target), sh = goalShare(g), key = 'g_' + g.id;
    const tag = done ? ['batida', 'ok'] : sh > 0 ? ['agora', 'now'] : ['na fila', 'wait'];
    return `<details class="goal" data-w="${key}" ${ui.open[key] ? 'open' : ''}><summary><span class="gt"><b>${esc(g.title)}</b><span class="tag ${tag[1]}">${tag[0]}</span></span><span class="mut">${Math.round(p)}%</span></summary><div class="bar"><i style="width:${p}%"></i></div><div class="row sp"><span class="mut">${brl(num(g.saved))} de ${brl(num(g.target))}</span>${sh ? `<b>${brl(goalM(g, mo))}/mês</b>` : ''}</div><div class="mut">${goalEta(g)}</div><div class="row">${((S.goalPaid || {})[mo] || {})[g.id] ? `<span class="btn sm done" role="status">${ic('check')}Guardado</span>` : ''}<button class="btn sm ghost" data-a="goaladd" data-v="${g.id}">+ guardar outro valor</button>${ib('edit', 'Editar meta', 'editgoal', g.id)}</div></details>`;
  };
  const howto = `<details class="how"><summary>Como usar</summary><ol class="mut"><li>No 5º dia útil o sino avisa quanto guardar.</li><li>Faça o depósito no PicPay (ou deixe automático).</li><li>Toque <b>Guardei</b> no sino. O app soma na meta e lança na planilha.</li><li>Etiqueta <b>agora</b> recebe o dinheiro neste mês. <b>Na fila</b> espera a vez.</li><li>Toque na meta para ver valor, prazo e botões.</li></ol></details>`;
  P.metas = acc('gmetas', 'Metas maiores (anel, PS5, celular)', brl(planTotal(mo)) + '/mês', `${planoInner()}${S.goals.map(goalRow).join('') || '<div class="mut">Toque em Ajustar para criar o colchão, o anel e o PS5.</div>'}<button class="btn sm ghost" data-a="addgoal">${ic('plus')}Meta</button>${howto}`, true);
  P.bills = billsCard(mo);
  P.plan = planCard(mo);
  const cats = Object.entries(st.by).sort((a, c) => c[1] - a[1]);
  P.cat = acc('gcat', 'Gastos por categoria', cats.length ? brl(st.out) : '', `${st.out ? `<div class="grid3 sm">${NEC.map(([k, l]) => `<div><b>${brl(st.nec[k])}</b><small>${l.replace(' (todo mês)', '')}</small></div>`).join('')}</div>` : ''}${cats.map(([c, v]) => { const lim = num(S.budgets[c]); const w = lim ? Math.min(100, v / lim * 100) : (st.out ? v / st.out * 100 : 0); return `<div><div class="row sp"><span>${esc(c)}</span><span class="mut">${brl(v)}${lim ? ' / ' + brl(lim) : ''}</span></div><div class="bar ${lim && v > lim ? 'over' : ''}"><i style="width:${w}%"></i></div></div>`; }).join('') || '<div class="mut">Sem gastos ainda.</div>'}<button class="btn sm ghost" data-a="budget">Definir limite por categoria</button>`, false);
  P.tx = acc('gtx', 'Lançamentos', st.t.length ? st.t.length + ' no mês' : '', `${[...st.t].sort((a, c) => c.date.localeCompare(a.date)).map(x => `<div class="item" data-a="edittx" data-v="${x.id}" role="button" tabindex="0"><div class="t">${esc(x.desc || x.cat)}<div class="mut">${sd2(x.date)} · ${esc(x.cat)}${x.type === 'in' ? '' : ' · ' + NEC.find(n => n[0] === necOf(x))[1].replace(' (todo mês)', '')}</div></div><b class="${x.type === 'in' ? 'ok' : 'warnc'}">${x.type === 'in' ? '+' : '−'}${brl(num(x.amount))}</b></div>`).join('') || '<div class="mut">Nada lançado neste mês.</div>'}`, false);
  if (parts) return P;
  return out + P.metas + P.bills + P.plan + P.cat + P.tx;
}
function vGrana() { return granaAll(false); }
const granaParts = () => granaAll(true);

/* ---------- Mais ---------- */
function vMais() {
  const tabs = [['din', 'coin', 'Dinheiro'], ['eu', 'mood-happy', 'Eu'], ['prog', 'chart-bar', 'Progresso'], ...(S.settings.gamify ? [['loja', 'coin', 'Loja']] : []), ['vida', 'heart', 'Roda da vida'], ['hab', 'checklist', 'Missões'], ['exp', 'lightbulb-on', 'Explorar'], ['laz', 'cloud-sun', 'Tempo livre'], ['rev', 'note', 'Revisão']];
  if (ui.mais !== 'cfg' && !tabs.find(t => t[0] === ui.mais)) ui.mais = 'prog';
  const out = `<div class="chips">${tabs.map(([i, c, l]) => `<button class="chip ${ui.mais === i ? 'on' : ''}" data-a="mtab" data-v="${i}">${ic(c)}${l}</button>`).join('')}</div>`;
  return out + ({ din: vDinheiro, eu: vEu, vida: vVida, prog: vProg, loja: vLoja, pork: vGrana, hab: vHab, exp: vExp, laz: vLaz, rev: vRev, cfg: vCfg }[ui.mais])();
}
function vLoja() {
  const bal = coins(), rw = [...S.settings.rewards].sort((a, c) => a.at - c.at);
  let out = `<div class="card center">${ic('coin', 'xl')}<div class="big">${bal}</div><div class="mut">moedas disponíveis</div></div>`;
  out += `<div class="card">${sec('gift', 'Loja', `<button class="btn sm ghost" data-a="addrw">${ic('plus')}Prêmio</button>`)}<div class="mut">Os prêmios e os preços são seus. Sugestão: prêmios que não sejam comida nem descanso básico.</div>${rw.map(r => `<div class="item"><div class="t"><b>${esc(r.title)}</b><div class="mut">${r.at} moedas</div></div><button class="btn sm ${bal >= r.at ? '' : 'ghost'}" data-a="buyrw" data-v="${r.id}">Resgatar</button>${ib('edit', 'Editar prêmio', 'editrw', r.id)}</div>`).join('')}</div>`;
  out += `<div class="card"><h3 class="px">Como ganhar</h3><div class="mut">+1 por missão marcada (as que você definir) · +1 bloco de estudo · +2 treino guiado concluído · +1 meta de água · +1 por dia limpo ou feito nos desafios · +10 por rodada completa · +1 por ideia feita com a Nayara, em casa ou na família · +1 por pomodoro (até 4 por dia) · +1 por lição de Aprender (até 3 por dia) · +1 por ação da Evolução da vida. Moedas não expiram e nunca são tiradas.</div></div>`;
  out += `<div class="card">${sec('lightbulb-on', 'Ideias de prêmios')}<div class="mut">Toque para adicionar à sua loja (você edita o preço depois).</div>${REW.map((g, gi) => `<div class="grp">${g[0]}</div><div class="chips wrapc">${g[1].map((r, i) => `<button class="chip" data-a="addrwsug" data-v="${gi}" data-w="${i}">${esc(r[0])} · ${r[1]}</button>`).join('')}</div>`).join('')}</div>`;
  const bd = BADGES();
  out += `<div class="card">${sec('trophy', 'Conquistas', `<span class="mut">${bd.filter(x => x[1]).length}/${bd.length}</span>`)}${bd.map(([n, ok]) => `<div class="item"><div class="t ${ok ? '' : 'mut'}">${esc(n)}</div>${ok ? ic('check') : ic('pin', 'sm')}</div>`).join('')}</div>`;
  if (S.spent.length) out += `<div class="card"><h3 class="px">Resgatados</h3>${[...S.spent].reverse().slice(0, 8).map(x => `<div class="item"><div class="t">${esc(x.title)}</div><span class="mut">${sd2(x.date)} · −${x.cost}</span></div>`).join('')}</div>`;
  return out;
}
function dayReport(k = dkey()) {
  const dt = new Date(k + 'T12:00'), dow = dt.getDay();
  const hs = S.habits.filter(h => h.days.includes(dow) && (!S.hardDay[k] || isMin(h))), dn = hs.filter(h => stOf(k, h.id) === 'done').length;
  const wk = S.workouts.filter(w => w.date === k).map(w => w.name).join(', ');
  const ms = S.meals[k] || [], md = S.mood[k] || {}, st = S.study[dow] || {}, pr = (S.prios[k] || []).map(p => p && p.t).filter(Boolean);
  const wts = S.weights.find(x => x.date === k), ch = S.challenges.map(c => `${c.title}: ${Math.min(c.days, chDays(c))}/${c.days}${c.log[k] === 'ok' ? ' (hoje ok)' : ''}`).join('; ');
  return `Sistema XP · registro do dia ${k}\nMissões: ${dn}/${hs.length}\nEstudo: ${(S.studyLog[k] && S.studyLog[k].done) ? 'feito' : 'não feito'} — ${st.theme || '—'}\nÁgua: ${L(S.water[k] || 0)} L\nTreino: ${wk || '—'}\nDieta: ${Math.round(sum(ms, 'kcal'))} kcal, ${Math.round(sum(ms, 'prot'))} g proteína\nPeso: ${wts ? r1(num(wts.kg)) + ' kg' : '—'}\nDesafios: ${ch || '—'}\nHumor/energia: ${md.m || '—'}/${md.e || '—'}\nPrioridades: ${pr.join(' | ') || '—'}\nPomodoros: ${S.pomo[k] || 0} · Lições: ${S.learn.days[k] || 0}\nMoedas: ${coins()}`;
}
function weekSummary(ws) {
  const days = [...Array(7)].map((_, i) => addD(ws, i)), ks = days.map(d => dkey(d)), today = dkey(), past = ks.filter(k => k <= today), a = ks[0], z = ks[6];
  const pw = pctWeek(ws), sd = days.filter(d => d.getDay() >= 1 && d.getDay() <= 5 && S.studyLog[dkey(d)] && S.studyLog[dkey(d)].done).length, sdMax = days.filter(d => d.getDay() >= 1 && d.getDay() <= 5 && dkey(d) <= today).length;
  const wk = S.workouts.filter(w => w.date >= a && w.date <= z).length, g = num(S.settings.waterGoal), wd = days.filter(d => g && (S.water[dkey(d)] || 0) >= g && dkey(d) <= today).length;
  const pom = ks.reduce((t, k) => t + (S.pomo[k] || 0), 0), les = ks.reduce((t, k) => t + (S.learn.days[k] || 0), 0), hardN = ks.filter(k => S.hardDay[k]).length;
  const rdn = Object.values((S.road && S.road.done) || {}).filter(d => d >= a && d <= z).length;
  const wts = S.weights.filter(x => x.date >= a && x.date <= z).sort((p, q) => p.date.localeCompare(q.date)), dw = wts.length >= 2 ? num(wts[wts.length - 1].kg) - num(wts[0].kg) : null;
  const wins = [], adj = [];
  if (pw !== null && pw >= 70) wins.push(`Missões em ${pw}%`); if (sd >= 3) wins.push(`${sd} dias de estudo`); if (wk >= 3) wins.push(`${wk} treinos`); if (pom >= 4) wins.push(`${pom} pomodoros`); if (les >= 3) wins.push(`${les} lições`); if (rdn) wins.push(`${rdn} tarefa${rdn > 1 ? 's' : ''} do Roadmap concluída${rdn > 1 ? 's' : ''}`); if (hardN) wins.push(`${hardN} dia${hardN > 1 ? 's' : ''} difícil${hardN > 1 ? 'is' : ''} atravessado${hardN > 1 ? 's' : ''} sem zerar`);
  if (sdMax >= 3 && sd < Math.ceil(sdMax / 2)) adj.push('Estudo da manhã ficou abaixo da metade. Tente começar só com 10 minutos.');
  if (g && past.length >= 3 && wd < Math.ceil(past.length / 2)) adj.push('Água abaixo da meta na maior parte dos dias. Deixe uma garrafa à vista.');
  if (pw !== null && pw < 50) adj.push('Poucas missões feitas. Escolha 3 que importam e deixe as outras como bônus.');
  if (!adj.length) adj.push('Mantenha o ritmo. Escolha só uma coisa para melhorar na próxima semana.');
  const txt = `Sistema XP · resumo da semana ${short(ws)} a ${short(addD(ws, 6))}\nMissões: ${pw === null ? '—' : pw + '%'} · Estudos: ${sd}/${sdMax || 5} · Treinos: ${wk} · Água na meta: ${wd} dias\nPomodoros: ${pom} · Lições: ${les} · Roadmap concluído: ${rdn} · Dias difíceis: ${hardN}\nPeso: ${dw === null ? '—' : (dw > 0 ? '+' : '') + r1(dw) + ' kg'}\nO que foi bem: ${wins.join('; ') || '—'}\nAjuste sugerido: ${adj[0]}`;
  return { wins, adj, txt, pom, les, rdn, hardN, dw };
}
const pvSeg = () => `<div class="chips">${[['sem', 'Semana'], ['mes', 'Mês']].map(([i, l]) => `<button class="chip ${(ui.pv || 'sem') === i ? 'on' : ''}" data-a="pv" data-v="${i}">${l}</button>`).join('')}</div>`;
function vProg() { return pvSeg() + ((ui.pv || 'sem') === 'mes' ? vMes() : vProgSem()); }
function vProgSem() {
  const ws = wkStart(addD(new Date(), 7 * ui.wo)), days = [...Array(7)].map((_, i) => addD(ws, i)), today = dkey();
  const hs = S.habits.filter(h => days.some(d => h.days.includes(d.getDay())));
  const pw = pctWeek(ws);
  const sd = days.filter(d => d.getDay() >= 1 && d.getDay() <= 5 && S.studyLog[dkey(d)] && S.studyLog[dkey(d)].done).length;
  const wkc = S.workouts.filter(w => w.date >= dkey(ws) && w.date <= dkey(addD(ws, 6))).length;
  const g = num(S.settings.waterGoal), wd = days.filter(d => g && (S.water[dkey(d)] || 0) >= g).length;
  const moods = days.map(d => S.mood[dkey(d)]).filter(x => x && x.m);
  const wsum = weekSummary(ws);
  let out = `<div class="row sp card slim">${ib('chevron-left', 'Semana anterior', 'wo', -1)}<b>${short(ws)} – ${short(addD(ws, 6))}${ui.wo === 0 ? ' (esta semana)' : ''}</b>${ib('chevron-right', 'Próxima semana', 'wo', 1)}</div>`;
  out += `<div class="card">${sec('trending-up', 'Resumo da semana')}<div class="grp">O que foi bem</div><div>${wsum.wins.length ? wsum.wins.map(x => '· ' + esc(x)).join('<br>') : '<span class="mut">Semana ainda começando.</span>'}</div><div class="grp">Ajuste sugerido</div><div>${esc(wsum.adj[0])}</div><div class="mut">Regras simples do app. Para uma análise completa, cole o resumo no Claude com Sistema XP.</div><button class="btn full" data-a="copyweek" data-v="${ui.wo}">${ic('copy')}Copiar resumo da semana</button></div>`;
  out += `<div class="grid3"><div><b>${pw === null ? '—' : pw + '%'}</b><small>missões</small></div><div><b>${sd}/5</b><small>estudos</small></div><div><b>${wkc}</b><small>treinos</small></div></div>`;
  out += `<div class="grid3"><div><b>${wd}/7</b><small>água na meta</small></div><div><b>${S.challenges.map(c => chDays(c)).reduce((a, x) => a + x, 0)}</b><small>dias de desafio</small></div><div><b>${S.settings.gamify ? coins() : '—'}</b><small>moedas</small></div></div>`;
  out += `<div class="card"><h3 class="px">Missões da semana</h3><div class="scroll"><table class="g"><tr><th></th>${days.map(d => `<th>${DN[d.getDay()][0]}</th>`).join('')}</tr>${hs.map(h => `<tr><td>${esc(h.title.replace(/ \(.*\)/, ''))}</td>${days.map(d => { const k = dkey(d); if (!h.days.includes(d.getDay())) return '<td class="mut">·</td>'; const s = stOf(k, h.id); return `<td>${k > today ? '' : (SI[s] ? ic(SI[s], 'sm') : '<span class="mut">○</span>')}</td>`; }).join('')}</tr>`).join('')}<tr><td>Estudo</td>${days.map(d => { const k = dkey(d), w = d.getDay(); if (w === 0) return '<td class="mut">·</td>'; return `<td>${k > today ? '' : (S.studyLog[k] && S.studyLog[k].done ? ic('check', 'sm') : '<span class="mut">○</span>')}</td>`; }).join('')}</tr><tr><td>Água</td>${days.map(d => { const k = dkey(d); return `<td>${k > today ? '' : (g && (S.water[k] || 0) >= g ? ic('check', 'sm') : '<span class="mut">○</span>')}</td>`; }).join('')}</tr></table></div><div class="mut">check feito · meio parcial · seta adiado · traço não se aplica · ○ em aberto. Sem sequência a perder.</div></div>`;
  const hist = [3, 2, 1, 0].map(i => { const w = wkStart(addD(new Date(), -7 * i)); return { l: short(w), p: pctWeek(w) }; });
  out += `<div class="card"><h3 class="px">Últimas 4 semanas</h3><div class="hist">${hist.map(h => `<div style="height:${h.p || 0}%"><small>${h.p === null ? '' : h.p + '%'}</small></div>`).join('')}</div><div class="row sp mut">${hist.map(h => `<span>${h.l}</span>`).join('')}</div></div>`;
  if (moods.length) out += `<div class="card"><h3 class="px">Humor médio (privado)</h3><div class="big">${(moods.reduce((a, x) => a + x.m, 0) / moods.length).toFixed(1)} / 5</div></div>`;
  const st = monthStats(dkey().slice(0, 7));
  out += `<div class="card"><h3 class="px">Dinheiro este mês</h3><div class="mut">Entradas ${brl(st.inn)} · Saídas ${brl(st.out)} · Saldo ${brl(st.inn - st.out)}</div></div>`;
  out += `<div class="card">${sec('note', 'Resumo para o Notion')}<div class="mut">Copie o resumo do dia e cole em qualquer conversa com o Claude começando por <b>Sistema XP</b>. Ele registra na sua planilha.</div><button class="btn pri full" data-a="notion">${ic('copy')}Copiar resumo de hoje</button></div>`;
  return out;
}
function vHab() {
  let out = `<div class="card">${sec('checklist', 'Missões recorrentes', `<button class="btn sm" data-a="addhab">${ic('plus')}Nova</button>`)}<div class="mut">Escudo = aparece no Dia difícil. Moeda = dá moeda. Comida, descanso e fé não dão moeda por padrão.</div>`;
  ['m', 't', 'n'].forEach(w => { const hs = S.habits.filter(h => h.when === w).sort((a, c) => (a.ord ?? 50) - (c.ord ?? 50)); if (!hs.length) return; out += `<div class="grp">${WH[w]}</div>` + hs.map(h => `<div class="item" data-a="edithab" data-v="${h.id}" role="button" tabindex="0"><div class="t">${esc(h.title)}<div class="mut">${h.days.length === 7 ? 'todo dia' : h.days.map(d => DN[d]).join(', ') || 'sem dias'}</div></div><span class="row">${h.hard ? ic('shield', 'sm') : ''}${h.pts ? ic('coin', 'sm') : ''}</span></div>`).join(''); });
  return out + '</div>';
}
function vExp() {
  return `<div class="card">${sec('lightbulb-on', 'Quero explorar', `<button class="btn sm" data-a="addexp">${ic('plus')}Item</button>`)}<div class="mut">Hobby: história, biologia, psicologia, medicina, o que bater vontade. Sem prazo, sem tarefa, sem atraso.</div>${S.explore.map(x => `<div class="item"><div class="t"><b>${esc(x.title)}</b><div class="mut">${esc(x.subject)}</div></div>${x.link ? `<a href="${esc(x.link)}" target="_blank" rel="noopener">abrir</a>` : ''}${ib('edit', 'Editar', 'editexp', x.id)}</div>`).join('') || '<div class="mut">Lista vazia: tudo bem.</div>'}</div>`;
}
function vLaz() {
  return `<div class="card">${sec('cloud-sun', 'Tempo livre', `<button class="btn sm" data-a="addlaz">${ic('plus')}Ideia</button>`)}<div class="mut">Só ideias, para quando bater a dúvida. Os horários livres nunca são preenchidos automaticamente.</div><div class="chips wrapc">${S.lazer.map((x, i) => `<button class="chip" data-a="dellaz" data-v="${i}">${esc(x)}</button>`).join('')}</div><div class="mut">Toque numa ideia para remover.</div></div>`;
}
function vRev() {
  const ws = wkStart(), wk = dkey(ws), r = S.reviews[wk] || {}, pw = pctWeek(ws);
  const sd = [1, 2, 3, 4, 5].filter(i => { const d = addD(ws, i - 1); return S.studyLog[dkey(d)] && S.studyLog[dkey(d)].done; }).length;
  let out = `<div class="card"><h3 class="px">Revisão · ${short(ws)}</h3><div class="mut">Leva uns 20 minutos. Missões: ${pw === null ? '—' : pw + '%'} · Estudos: ${sd}/5 · Treinos: ${S.workouts.filter(w => w.date >= wk).length}</div>
<label>O que funcionou?</label><textarea data-c="rv" data-v="ok">${esc(r.ok)}</textarea>
<label>O que ajustar?</label><textarea data-c="rv" data-v="adj">${esc(r.adj)}</textarea>
<label>Prioridades da próxima semana</label><input data-c="rv" data-v="p1" value="${esc(r.p1)}" placeholder="1"><input data-c="rv" data-v="p2" value="${esc(r.p2)}" placeholder="2"><input data-c="rv" data-v="p3" value="${esc(r.p3)}" placeholder="3"></div>`;
  const past = Object.keys(S.reviews).filter(k => k !== wk).sort().reverse().slice(0, 4);
  if (past.length) out += `<div class="card"><h3 class="px">Anteriores</h3>${past.map(k => `<details><summary><span>Semana de ${sd2(k)}</span></summary><div class="mut">Funcionou: ${esc(S.reviews[k].ok)}<br>Ajustar: ${esc(S.reviews[k].adj)}</div></details>`).join('')}</div>`;
  return out;
}
function vCfg() {
  const s = S.settings;
  return `<div class="card">${sec('clock', 'Rotina')}<div class="row sp"><span>Modo faculdade (aulas seg a sex, 19h–22h)</span><button class="chip ${s.college ? 'on' : ''}" data-a="college" aria-pressed="${!!s.college}">${s.college ? 'Ligado' : 'Desligado'}</button></div><div class="mut">Liga a agenda de dias de aula: treino mais curto, jantar rápido e sono até 22h45. O estudo das 06h às 07h continua. Seus blocos antigos de seg a sex são trocados (sábado e domingo não mudam).</div><button class="btn ghost full" data-a="newroutine">Aplicar minha rotina nova (06h–07h, treino 17h30)</button></div>
<div class="card">${sec('coin', 'Moedas')}<div class="row sp"><span>Moedas e Loja</span><button class="chip ${s.gamify ? 'on' : ''}" data-a="gam" aria-pressed="${!!s.gamify}">${s.gamify ? 'Ligadas' : 'Desligadas'}</button></div><div class="mut">Só progresso acumulado: sem ranking, punição, sorteio ou perda de moedas.</div></div>
<div class="card">${sec('sun', 'Aparência')}<div class="chips">${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']].map(([v, l]) => `<button class="chip ${(s.theme || 'auto') === v ? 'on' : ''}" data-a="theme" data-v="${v}">${l}</button>`).join('')}</div></div>
<div class="card">${sec('clock', 'Avisos no iPhone')}<div class="mut">O iPhone não deixa um app avisar com ele fechado. O jeito certo é o app Calendário: ele avisa missões, prioridades, contas do Porkinho e cuidados dos cachorros. Baixe, abra e toque em Adicionar tudo. Quando algo mudar, o app avisa na Home para atualizar (não duplica).</div><button class="btn full" data-a="ics">${ic('download')}Baixar avisos (Calendário)</button><div class="grp">Cuidados dos cachorros (só avisam)</div>${(S.pet || []).map(p => `<div class="item"><div class="t">${esc(p.title)}<div class="mut">A cada ${p.every} dias${p.last ? ' · último ' + sd2(p.last) : ''}</div></div>${ib('edit', 'Editar ' + p.title, 'editpet', p.id)}</div>`).join('')}<button class="btn sm ghost" data-a="addpet">${ic('plus')}Cuidado</button></div>
<div class="card">${sec('sync', 'Sincronizar com o Notion')}<div class="row sp"><span>Enviar o dia automaticamente</span><button class="chip ${s.sync.on ? 'on' : ''}" data-a="synctog" aria-pressed="${!!s.sync.on}">${s.sync.on ? 'Ligado' : 'Desligado'}</button></div><label>Endereço da função</label><input data-c="syncurl" value="${esc(s.sync.url)}"><label>Chave do app</label><input data-c="synckey" type="password" autocomplete="off" value="${esc(s.sync.key)}" placeholder="a mesma do Netlify (APP_KEY)"><button class="btn full" data-a="syncnow">${ic('upload')}Enviar hoje agora</button><div class="mut">${s.sync.last ? 'Último envio: ' + new Date(s.sync.last).toLocaleString('pt-BR') : 'Ainda não enviou.'} Depois de configurar, o dia vai para o banco "Meu Dia, registro diário" no Notion.</div><div class="mut">Versão do app: ${APP_V}</div></div>
<div class="card">${sec('link', 'Links')}<label>Notion (Career OS / Faculdade Miranda)</label><input data-c="notion" type="url" value="${esc(s.notion || '')}" placeholder="https://notion.so/…">${s.notion ? `<a href="${esc(s.notion)}" target="_blank" rel="noopener">${ic('external-link')}Abrir Notion</a>` : ''}<div class="mut">O Notion segue como fonte principal. Use Mais, Progresso, Copiar resumo para registrar o dia via Claude (Sistema XP).</div></div>
<div class="card">${sec('save', 'Backup')}<div class="banner">${ic('upload')}<span>${s.sync.key ? (s.cloudLast ? 'Backup na nuvem (Notion): ' + new Date(s.cloudLast).toLocaleString('pt-BR') + '. Ele se atualiza sozinho depois que você registra algo.' : 'Backup na nuvem ainda não feito. Toque em Fazer backup agora.') : 'Para ligar o backup na nuvem, coloque a chave do app no card do Notion (acima).'}</span></div><button class="btn pri full" data-a="cbk">${ic('upload')}Fazer backup na nuvem agora</button><button class="btn ghost full" data-a="crest">${ic('download')}Restaurar da nuvem</button><div class="mut">Seus dados também ficam neste aparelho. Exporte de vez em quando um arquivo (as fotos não entram no backup). Exporte de tempos em tempos (as fotos não entram no backup).${s.lastBackup ? ' Último arquivo: ' + s.lastBackup.split('-').reverse().join('/') : ''}</div>
<button class="btn full" data-a="export">${ic('download')}Exportar backup</button>
<button class="btn ghost full" data-a="copy">${ic('copy')}Copiar backup (texto)</button>
<label>Restaurar de arquivo</label><input type="file" accept=".json,application/json" data-c="restore">
<button class="btn ghost full" data-a="paste">${ic('upload')}Restaurar colando texto</button>
<button class="btn danger full" data-a="wipe">${ic('trash')}Apagar tudo</button></div>`;
}

/* ---------- render / nav ---------- */
const TABS = [['hoje', 'sun', 'Hoje'], ['corpo', 'human-run', 'Corpo'], ['estudos', 'book-open', 'Estudos'], ['desafios', 'shield', 'Desafios'], ['mais', 'more-horizontal', 'Mais']];
function render() {
  const n = new Date(), k = dkey(n), hr = n.getHours();
  const titles = { hoje: [hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite', `${DF[n.getDay()]}, ${n.getDate()}/${n.getMonth() + 1}`], corpo: ['Corpo', 'Treino, dieta, metas e peso'], estudos: ['Estudos', '1 hora pela manhã, 06h às 07h'], desafios: ['Desafios', 'Detox e melhorar'], mais: ['Mais', 'Progresso, loja, finanças e ajustes'] };
  const [h, p] = titles[ui.tab];
  const nn = notifs().length, hud = `<div class="hud"><button data-a="notif" aria-label="Avisos${nn ? ': ' + nn : ''}">${ic('bell')}${nn ? `<span class="nbadge">${nn}</span>` : ''}</button><button data-a="cfg" aria-label="Ajustes">${ic('sliders')}</button>${S.settings.gamify ? `<button data-a="loja" aria-label="Moedas: abrir loja">${ic('coin')}<span>${coins()}</span></button>` : ''}<span>${ic('drop')}<span>${L(S.water[k] || 0)}/${L(num(S.settings.waterGoal))} L</span></span></div>`;
  $('#top').innerHTML = `${hud}<h1 class="px">${h}</h1><p>${p}</p>`;
  $('#view').innerHTML = { hoje: vHoje, corpo: vCorpo, estudos: vEstudos, desafios: vDesafios, mais: vMais }[ui.tab]();
  $('#nav').innerHTML = TABS.map(([i, c, l]) => `<button class="${ui.tab === i ? 'on' : ''}" data-a="tab" data-v="${i}" aria-label="${l}" ${ui.tab === i ? 'aria-current="page"' : ''}>${ic(c)}<span>${l}</span></button>`).join('');
  hydratePhotos();
  document.querySelectorAll('.chips').forEach(c => { const on = c.querySelector('.on'); if (on) c.scrollLeft = Math.max(0, on.offsetLeft - (c.clientWidth - on.offsetWidth) / 2); });
  document.querySelectorAll('.wchart').forEach(c => { c.scrollLeft = c.scrollWidth; });
}

/* ---------- ações ---------- */
function finishSession() {
  const s = S.session; if (!s) return;
  if (s.done.length) {
    const by = {}; s.done.forEach(x => (by[x.ex] = by[x.ex] || []).push(x));
    const notes = Object.keys(by).map(e => `${e}: ${by[e].map(x => `${x.kg || '—'}kg×${x.reps}`).join(', ')}`).join('\n');
    S.workouts.push({ id: uid(), date: dkey(), name: s.name, dur: String(Math.max(1, Math.round((Date.now() - s.start) / 60000))), notes, sets: s.done });
    ui.flash = `Treino concluído!${S.settings.gamify ? ' +2 moedas' : ''}`;
  }
  S.session = null; ui.corpo = 'treino';
}
function parsePlan(txt) {
  return String(txt).split('\n').map(l => l.split('|').map(x => x.trim())).filter(p => p[0]).map(p => ({ name: p[0], sets: Math.max(1, Math.round(num(p[1]) || 3)), reps: p[2] || '8–12', rest: Math.round(num(p[3]) || 90) }));
}
const planText = p => p.ex.map(e => `${e.name} | ${e.sets} | ${e.reps} | ${e.rest}`).join('\n');
const planFields = p => [{ k: 'name', label: 'Nome do treino', value: p.name }, { k: 'ex', label: 'Exercícios (um por linha: nome | séries | reps | descanso em segundos)', type: 'textarea', value: p.ex ? planText(p) : '', ph: 'Leg press | 3 | 10–12 | 90' }];
const chFields = c => [{ k: 'title', label: 'Nome', value: c.title }, { k: 'days', label: 'Duração', type: 'select', value: c.days, options: [[10, '10 dias'], [14, '14 dias'], [15, '15 dias'], [30, '30 dias']] }, { k: 'done', label: 'Quantos dias já cumpri (antes de hoje)', type: 'number', value: c.log ? Math.min(c.days, chDays(c)) : 0 }];
function newCh(kind, title, days, done) {
  const c = mkCh(title || 'Desafio', kind, Math.max(1, Math.round(num(days) || 14)));
  if (num(done) > 0) backfill(c, Math.min(c.days - 1, Math.round(num(done))));
  S.challenges.push(c);
}
const A = {
  tab: v => { ui.tab = v; window.scrollTo(0, 0); },
  cfg: () => { ui.tab = 'mais'; ui.mais = 'cfg'; window.scrollTo(0, 0); },
  icsskip: () => { S.settings.icsSkip = dkey(); save(); },
  icsfin: () => { downloadIcs('fin'); return false; },
  prcyc: v => { const k = dkey(); S.prios[k] = S.prios[k] || [{}, {}, {}]; const p = S.prios[k][v] = S.prios[k][v] || {}, cs = p.s || (p.d ? 'done' : ''); p.s = cs === '' ? 'done' : cs === 'done' ? 'no' : ''; p.d = p.s === 'done'; save(); },
  hv: v => { ui.hv = v; },
  es: v => { ui.es = v; ui.ls = null; },
  loja: () => { ui.tab = 'mais'; ui.mais = 'loja'; window.scrollTo(0, 0); },
  gotolearn: () => { ui.tab = 'estudos'; ui.es = 'aprender'; ui.ls = null; window.scrollTo(0, 0); },
  gotodes: () => { ui.tab = 'desafios'; window.scrollTo(0, 0); },
  welcome: () => { S.settings.welcomed = true; save(); },
  cyc: v => { const k = dkey(); S.log[k] = S.log[k] || {}; const i = ST.indexOf(S.log[k][v] || ''); const nx = ST[(i + 1) % ST.length]; if (nx) S.log[k][v] = nx; else delete S.log[k][v]; save(); },
  hard: () => { const k = dkey(); S.hardDay[k] = !S.hardDay[k]; save(); },
  studydone: () => { const k = dkey(); S.studyLog[k] = { done: !(S.studyLog[k] && S.studyLog[k].done) }; save(); },
  mood: (v, w) => { const k = dkey(); S.mood[k] = S.mood[k] || {}; S.mood[k][v] = S.mood[k][v] === +w ? undefined : +w; save(); ui.open.mood = true; },
  water: v => { const k = dkey(); S.water[k] = Math.max(0, (S.water[k] || 0) + Number(v)); save(); },
  waterrec: v => { S.settings.waterGoal = String(v); save(); },
  chok: v => { const c = S.challenges.find(x => x.id === v), k = dkey(); if (c.log[k] === 'ok') { delete c.log[k]; if (c.completedAt === k) { c.completedAt = null; c.rounds = Math.max(0, (c.rounds || 1) - 1); } } else { c.log[k] = 'ok'; if (!c.completedAt && chDays(c) >= c.days) { c.completedAt = k; c.rounds = (c.rounds || 0) + 1; } } save(); },
  chslip: v => { if (!confirm('Registrar que escorregou hoje? A rodada recomeça amanhã e você não perde as moedas já ganhas.')) return false; const c = S.challenges.find(x => x.id === v), k = dkey(); delete c.log[k]; c.slips.push(k); c.start = dkey(addD(new Date(), 1)); c.completedAt = null; save(); },
  chnew: v => { const c = S.challenges.find(x => x.id === v), k = dkey(); c.start = k; delete c.log[k]; c.completedAt = null; save(); },
  addch: v => { form('Novo desafio', [{ k: 'title', label: 'Nome', ph: v === 'melhorar' ? 'Ex.: Caminhar 20 minutos' : 'Ex.: Sem refrigerante' }, { k: 'days', label: 'Duração', type: 'select', value: 14, options: [[10, '10 dias'], [14, '14 dias'], [15, '15 dias'], [30, '30 dias']] }, { k: 'done', label: 'Quantos dias já cumpri (antes de hoje)', type: 'number', value: 0 }], r => newCh(v || 'detox', r.title, r.days, r.done)); return false; },
  sugch: v => { const t = SUG[+v]; form('Criar desafio', [{ k: 'title', label: 'Nome', value: t }, { k: 'days', label: 'Duração', type: 'select', value: 15, options: [[10, '10 dias'], [15, '15 dias'], [30, '30 dias']] }], r => newCh('melhorar', r.title, r.days, 0)); return false; },
  editch: v => { const c = S.challenges.find(x => x.id === v); form('Editar desafio', chFields(c), r => { c.title = r.title; c.days = Math.max(1, Math.round(num(r.days) || 14)); const have = chDays(c), want = Math.round(num(r.done)); if (want > have && !c.completedAt) { const t0 = c.start; backfill(c, Math.min(c.days - 1, want)); if (t0 < c.start) c.start = t0; } }, () => { S.challenges = S.challenges.filter(x => x.id !== v); }); return false; },
  dt: v => { ui.dt = v; },
  ju: v => { ui.ju = v; ui.ix = Math.floor(Math.random() * 50); },
  sort: () => { ui.ix = Math.floor(Math.random() * 50); },
  didit: v => { S.ideas.done.push({ t: v, d: dkey(), w: ui.ju }); ui.ix++; save(); toast('+1 moeda. Que legal!'); },
  addidea: () => { form('Nova ideia', [{ k: 't', label: 'Ideia' }], r => { if (r.t) S.ideas.mine.push({ id: uid(), w: ui.ju, t: r.t }); }); return false; },
  delidea: v => { S.ideas.mine = S.ideas.mine.filter(x => x.id !== v); save(); },
  aday: v => { ui.ad = +v; },
  addblk: v => { form('Novo bloco', blkFields({ t: '', s: '09:00', e: '10:00', type: 'flex' }), r => { S.schedule[v].push({ id: uid(), ...r }); }); return false; },
  editblk: (v, w) => { const x = S.schedule[w].find(y => y.id === v); form('Editar bloco', blkFields(x), r => Object.assign(x, r), () => { S.schedule[w] = S.schedule[w].filter(y => y.id !== v); }); return false; },
  sday: v => { ui.sd = +v; },
  addtrack: () => { form('Nova trilha', [{ k: 'name', label: 'Nome' }, { k: 'group', label: 'Grupo', value: 'Complementar' }, { k: 'now', label: 'Aula atual (opcional)' }, { k: 'link', label: 'Link do material', type: 'url' }], r => S.tracks.push({ id: uid(), ...r })); return false; },
  edittrack: v => { const t = S.tracks.find(x => x.id === v); form('Editar trilha', [{ k: 'name', label: 'Nome', value: t.name }, { k: 'group', label: 'Grupo', value: t.group }, { k: 'now', label: 'Aula atual', value: t.now }, { k: 'link', label: 'Link', type: 'url', value: t.link }], r => Object.assign(t, r), () => { S.tracks = S.tracks.filter(x => x.id !== v); }); return false; },
  tmstop: () => { ui.tm = null; },
  ctab: v => { ui.corpo = v; },
  startplan: v => { const p = S.plans.find(x => x.id === v); if (S.session && !confirm('Já existe um treino em andamento. Substituir?')) return false; S.session = { planId: p.id, name: p.name, ex: p.ex.map(e => ({ ...e })), i: 0, set: 1, done: [], restEnd: null, start: Date.now() }; save(); },
  setdone: () => { const s = S.session, ex = s.ex[s.i]; s.done.push({ ex: ex.name, set: s.set, kg: num($('#kg').value), reps: $('#rp').value }); if (s.set >= ex.sets) { s.i++; s.set = 1; if (s.i >= s.ex.length) { finishSession(); save(); return; } } else s.set++; s.restEnd = Date.now() + ex.rest * 1000; save(); },
  skiprest: () => { S.session.restEnd = null; save(); },
  skipex: () => { const s = S.session; s.i++; s.set = 1; s.restEnd = null; if (s.i >= s.ex.length) finishSession(); save(); },
  endsess: () => { if (!confirm('Encerrar o treino agora? O que você já fez fica salvo.')) return false; finishSession(); save(); },
  nextphase: () => { if (!confirm('Avançar de fase? Cada exercício ganha +1 série (máximo 4).')) return false; S.plans.forEach(p => p.ex.forEach(e => { e.sets = Math.min(4, +e.sets + 1); })); S.settings.phase = Math.min(3, (S.settings.phase || 1) + 1); S.settings.phaseSince = dkey(); save(); },
  addplan: () => { form('Novo modelo de treino', planFields({ name: '' }), r => S.plans.push({ id: uid(), name: r.name || 'Treino', ex: parsePlan(r.ex) })); return false; },
  editplan: v => { const p = S.plans.find(x => x.id === v); form('Editar treino', planFields(p), r => { p.name = r.name; p.ex = parsePlan(r.ex); }, () => { S.plans = S.plans.filter(x => x.id !== v); }); return false; },
  addwk: () => { form('Registrar treino', [{ k: 'date', label: 'Dia', type: 'date', value: dkey() }, { k: 'name', label: 'Nome', ph: 'Ex.: Treino A' }, { k: 'dur', label: 'Duração (min)', type: 'number' }, { k: 'notes', label: 'Exercícios, séries, cargas', type: 'textarea', ph: 'Supino 3x10 40kg…' }], r => S.workouts.push({ id: uid(), ...r })); return false; },
  editwk: v => { const w = S.workouts.find(x => x.id === v); form('Editar treino', [{ k: 'date', label: 'Dia', type: 'date', value: w.date }, { k: 'name', label: 'Nome', value: w.name }, { k: 'dur', label: 'Duração (min)', type: 'number', value: w.dur }, { k: 'notes', label: 'Exercícios', type: 'textarea', value: w.notes }], r => Object.assign(w, r), () => { S.workouts = S.workouts.filter(x => x.id !== v); }); return false; },
  addweight: () => { form('Peso', [{ k: 'date', label: 'Dia', type: 'date', value: dkey() }, { k: 'kg', label: 'kg', type: 'number' }], r => { S.weights.push({ id: uid(), ...r }); S.settings.calc.weight = r.kg; }); return false; },
  editph: v => { const p = S.photos.find(x => x.id === v); form('Foto', [{ k: 'date', label: 'Dia', type: 'date', value: p.date }, { k: 'kg', label: 'Peso nesse dia (kg, opcional)', type: 'number', value: p.kg }], r => Object.assign(p, r), () => { S.photos = S.photos.filter(x => x.id !== v); idbDel(v).catch(() => { }); }); return false; },
  usegoals: () => { const r = calcOut(); if (!r) return false; S.settings.dietKcal = String(Math.round(r.target)); S.settings.dietProt = String(r.protGoal); save(); ui.corpo = 'dieta'; ui.flash = 'Metas salvas. Ajuste depois de 2–3 semanas olhando seu peso real.'; },
  dd: v => { ui.md = dkey(addD(new Date(ui.md + 'T12:00'), +v)); },
  build: v => { openBuilder(v); return false; },
  repday: () => { const yk = dkey(addD(new Date(ui.md + 'T12:00'), -1)), k = ui.md; S.meals[k] = [...(S.meals[k] || []), ...(S.meals[yk] || []).map(x => ({ ...x, id: uid() }))]; save(); ui.flash = 'Dia de ontem copiado.'; },
  repmeal: v => { const yk = dkey(addD(new Date(ui.md + 'T12:00'), -1)), k = ui.md; S.meals[k] = [...(S.meals[k] || []), ...(S.meals[yk] || []).filter(x => x.meal === v).map(x => ({ ...x, id: uid() }))]; save(); },
  usecombo: v => { const c = S.combos.find(x => x.id === v); addItems(c.items, guessMeal()); return false; },
  editcombo: v => { const c = S.combos.find(x => x.id === v); form('Refeição pronta', [{ k: 'name', label: 'Nome', value: c.name }], r => { c.name = r.name; }, () => { S.combos = S.combos.filter(x => x.id !== v); }); return false; },
  editmeal: v => { const k = ui.md, m = S.meals[k].find(x => x.id === v); form('Editar item', mealFields(m), r => Object.assign(m, r), () => { S.meals[k] = S.meals[k].filter(x => x.id !== v); }); return false; },
  addfood: () => { form('Salvar alimento', foodFields({}), r => S.foods.push({ id: uid(), ...r })); return false; },
  editfood: v => { const f = S.foods.find(x => x.id === v); form('Editar alimento', foodFields(f), r => Object.assign(f, r), () => { S.foods = S.foods.filter(x => x.id !== v); }); return false; },
  mo: v => { const [y, m] = ui.mo.split('-').map(Number), d = new Date(y, m - 1 + +v, 1); ui.mo = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; },
  loja_pork: () => { ui.tab = 'mais'; ui.mais = 'din'; window.scrollTo(0, 0); },
  petdone: v => { const p = S.pet.find(x => x.id === v); p.last = dkey(); toast('Anotado. Próximo em ' + p.every + ' dias.'); save(); },
  addpet: () => { form('Novo cuidado', [{ k: 'title', label: 'Nome', value: '' }, { k: 'every', label: 'A cada quantos dias', type: 'number', value: 15 }], r => S.pet.push({ id: uid(), title: r.title || 'Cuidado', every: Math.max(1, Math.round(num(r.every)) || 15), last: '' })); return false; },
  editpet: v => { const p = S.pet.find(x => x.id === v); form('Editar cuidado', [{ k: 'title', label: 'Nome', value: p.title }, { k: 'every', label: 'A cada quantos dias', type: 'number', value: p.every }, { k: 'last', label: 'Último feito', type: 'date', value: p.last }], r => { p.title = r.title || p.title; p.every = Math.max(1, Math.round(num(r.every)) || 15); p.last = r.last; }, () => { S.pet = S.pet.filter(x => x.id !== v); }); return false; },
  addbill: () => { form('Nova conta fixa', billFields({ day: 5, cat: 'Moradia' }), r => S.bills.push({ id: uid(), ...r })); return false; },
  editbill: v => { const b = S.bills.find(x => x.id === v); form('Editar conta', billFields(b), r => Object.assign(b, r), () => { S.bills = S.bills.filter(x => x.id !== v); }); return false; },
  paybill: (v, mo) => { const b = S.bills.find(x => x.id === v), pm = S.billPaid[mo] = S.billPaid[mo] || {};
    if (pm[v]) { const ot = S.tx.find(x => x.id === pm[v]); S.tx = S.tx.filter(x => x.id !== pm[v]); delete pm[v]; if (ot && ot.sent && sheetOn()) planQueue({ action: 'auto', month: mo, type: 'out', bill: true, undo: true, cat: b.cat || 'Moradia', desc: b.title, valor: num(b.amount) }); } else { const id = uid(), td = dkey(), sent = sheetOn(); S.tx.push({ id, type: 'out', date: td.startsWith(mo) ? td : billDue(b, mo), cat: b.cat || 'Moradia', desc: b.title, amount: b.amount, nec: 'fix', sent }); pm[v] = id; toast('Lançado como saída.'); if (sent) planQueue({ action: 'auto', month: mo, type: 'out', bill: true, cat: b.cat || 'Moradia', desc: b.title, valor: num(b.amount) }); }
    save(); },
  ics: () => { form('Lembretes no Calendário', [{ k: 'w', label: 'O que incluir', type: 'select', value: 'all', options: [['all', 'Missões com horário + contas e finanças'], ['hard', 'Só missões essenciais + contas e finanças'], ['fin', 'Só contas e finanças']] }], r => downloadIcs(r.w)); return false; },
  addtx: () => { const on = sheetOn(); txSheet({ type: 'out', date: dkey(), sheet: on ? 'auto' : 'none' }, 'Lançar', r => { const sh = r.sheet; delete r.sheet; const t = { id: uid(), ...r, sent: sh === 'auto' }; S.tx.push(t); if (sh === 'auto') txSend(t); else toast('Lançado.'); }); return false; },
  edittx: v => { const x = S.tx.find(y => y.id === v); txSheet({ ...x, sheet: x.sent ? 'auto' : 'none' }, 'Editar lançamento', r => { delete r.sheet; const o = { ...x }; Object.assign(x, r); if (o.sent && sheetOn() && (o.amount !== x.amount || o.desc !== x.desc || o.cat !== x.cat || o.date.slice(0, 7) !== x.date.slice(0, 7) || o.type !== x.type)) { txSend(o, true); txSend(x); } }, () => { S.tx = S.tx.filter(y => y.id !== v); if (x.sent && sheetOn()) txSend(x, true); }); return false; },
  budget: () => { form('Limite mensal por categoria (0 = sem limite)', CATS.map(c => ({ k: c, label: c, type: 'number', value: S.budgets[c] || '' })), r => { S.budgets = r; }); return false; },
  addgoal: () => { form('Nova meta', goalFields({}), r => S.goals.push({ id: uid(), ...goalClean(r) })); return false; },
  editgoal: v => { const g = S.goals.find(x => x.id === v); form('Editar meta', goalFields(g), r => Object.assign(g, goalClean(r)), () => { S.goals = S.goals.filter(x => x.id !== v); }); return false; },
  plano: () => {
    const c = planCfg(), first = !S.goals.length;
    form('Plano de guardar', [{ k: 'renda', label: 'Renda líquida por mês (R$). Se a planilha tem a linha SALÁRIO, ela manda', type: 'number', value: rendaVal() }, { k: 'start', label: 'Começar guardando por mês (R$)', type: 'number', value: c.start }, { k: 'add', label: 'Subir quanto (R$)', type: 'number', value: c.add }, { k: 'every', label: 'A cada quantos meses', type: 'number', value: c.every },
      ...(first ? [{ k: 'reserva', label: 'Criar meta Reserva de emergência (R$ alvo). Sugestão: 6 meses de gastos essenciais', type: 'number', value: '' }, { k: 'ps5', label: 'Criar meta PS5 (R$ alvo, deixe vazio se não quiser)', type: 'number', value: '' }, { k: 'cel', label: 'Criar meta Celular (R$ alvo, deixe vazio se não quiser)', type: 'number', value: '' }] : [])], r => {
      S.settings.renda = String(num(r.renda) || 4000);
      S.settings.plan = { start: num(r.start) || 0, add: num(r.add) || 0, every: Math.max(1, Math.round(num(r.every)) || 3), since: (S.settings.plan && S.settings.plan.since) || dkey().slice(0, 7) };
      if (first) [['Reserva de emergência', r.reserva, 3], ['PS5', r.ps5, 1], ['Celular', r.cel, 1]].forEach(([t, v, w]) => { if (num(v) > 0) S.goals.push({ id: uid(), title: t, target: num(v), saved: 0, w, day: 5 }); });
    }); return false;
  },
  goalpaid: v => { const g = S.goals.find(x => x.id === v), mo = dkey().slice(0, 7); if (!g) return false; const val = goalM(g, mo); S.goalPaid = S.goalPaid || {}; (S.goalPaid[mo] = S.goalPaid[mo] || {})[v] = true; g.saved = num(g.saved) + val; toast('Guardado. Boa!'); save(); if (S.settings.sync.key && S.settings.sheetOn !== false && val > 0) planQueue({ action: 'auto', month: mo, type: 'out', cat: 'Outros', desc: 'Guardar: ' + g.title, hint: 'RESERVA|GUARDAR', valor: val }); },
  goaladd: v => { const g = S.goals.find(x => x.id === v); form('Guardar para ' + esc(g.title), [{ k: 'a', label: 'Quanto? (R$)', type: 'number' }], r => { g.saved = num(g.saved) + num(r.a); if (num(r.a) > 0 && sheetOn()) planQueue({ action: 'auto', month: dkey().slice(0, 7), type: 'out', cat: 'Outros', desc: 'Guardar: ' + g.title, hint: 'RESERVA|GUARDAR', valor: num(r.a) }); }); return false; },
  mtab: v => { ui.mais = v; },
  wo: v => { ui.wo += +v; },
  addhab: () => { form('Nova missão', habFields({ when: 'm', days: ALL, pts: 1, hard: 0 }), r => S.habits.push(hfix({ id: uid(), ord: 50, ...r }))); return false; },
  edithab: v => { const h = S.habits.find(x => x.id === v); form('Editar missão', habFields(h), r => Object.assign(h, hfix(r)), () => { S.habits = S.habits.filter(x => x.id !== v); }); return false; },
  addexp: () => { form('Quero explorar', expFields({}), r => S.explore.push({ id: uid(), ...r })); return false; },
  editexp: v => { const x = S.explore.find(y => y.id === v); form('Editar', expFields(x), r => Object.assign(x, r), () => { S.explore = S.explore.filter(y => y.id !== v); }); return false; },
  addlaz: () => { form('Nova ideia', [{ k: 't', label: 'Ideia' }], r => { if (r.t) S.lazer.push(r.t); }); return false; },
  dellaz: v => { if (confirm('Remover esta ideia?')) { S.lazer.splice(+v, 1); save(); } else return false; },
  gam: () => { S.settings.gamify = !S.settings.gamify; save(); },
  theme: v => { S.settings.theme = v; save(); applyTheme(); },
  college: () => { const on = !S.settings.college; if (!confirm(on ? 'Ligar o modo faculdade? Seus blocos de segunda a sexta serão trocados pela agenda de dias de aula.' : 'Desligar o modo faculdade e voltar à rotina sem aulas? Seus blocos de segunda a sexta serão trocados.')) return false; S.settings.college = on; const ns = buildSchedule(on); [1, 2, 3, 4, 5].forEach(d => { S.schedule[d] = ns[d]; }); save(); },
  newroutine: () => { if (!confirm('Trocar os blocos de segunda a sexta pela rotina nova? Sábado e domingo não mudam.')) return false; const ns = buildSchedule(S.settings.college); [1, 2, 3, 4, 5].forEach(d => { S.schedule[d] = ns[d]; }); const have = t => S.habits.some(h => h.title === t); DEF_HABITS().forEach(h => { if (!have(h.title)) S.habits.push(h); }); save(); toast('Rotina nova aplicada.'); },
  copyweek: async v => { const t = weekSummary(wkStart(addD(new Date(), 7 * (+v || 0)))).txt; try { await navigator.clipboard.writeText(t); toast('Resumo da semana copiado.'); } catch (e) { prompt('Copie o resumo:', t); } return false; },
  notion: async () => { const t = dayReport(); try { await navigator.clipboard.writeText(t); toast('Resumo copiado. Cole no chat com o Claude.'); } catch (e) { prompt('Copie o resumo:', t); } return false; },
  addrw: () => { form('Novo prêmio', [{ k: 'title', label: 'Prêmio' }, { k: 'at', label: 'Preço em moedas', type: 'number', value: 10 }], r => S.settings.rewards.push({ id: uid(), title: r.title, at: Math.max(1, Math.round(num(r.at))) })); return false; },
  editrw: v => { const r0 = S.settings.rewards.find(x => x.id === v); form('Editar prêmio', [{ k: 'title', label: 'Prêmio', value: r0.title }, { k: 'at', label: 'Preço em moedas', type: 'number', value: r0.at }], r => { r0.title = r.title; r0.at = Math.max(1, Math.round(num(r.at))); }, () => { S.settings.rewards = S.settings.rewards.filter(x => x.id !== v); }); return false; },
  buyrw: v => { const r0 = S.settings.rewards.find(x => x.id === v); if (coins() < r0.at) { alert(`Faltam ${r0.at - coins()} moedas para este prêmio.`); return false; } if (!confirm(`Resgatar "${r0.title}" por ${r0.at} moedas?`)) return false; S.spent.push({ id: uid(), title: r0.title, cost: r0.at, date: dkey() }); save(); },
  export: async () => {
    S.settings.lastBackup = dkey(); save();
    const name = `meu-dia-backup-${dkey()}.json`, file = new File([JSON.stringify(S, null, 1)], name, { type: 'application/json' });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); render(); return; } } catch (e) { if (e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; a.click(); render();
  },
  copy: async () => { S.settings.lastBackup = dkey(); save(); try { await navigator.clipboard.writeText(JSON.stringify(S)); alert('Backup copiado. Cole em um lugar seguro (Notas, e-mail para você).'); } catch (e) { alert('Não consegui copiar. Use "Exportar backup".'); } render(); },
  paste: () => { form('Colar backup', [{ k: 't', label: 'Cole aqui o texto do backup', type: 'textarea' }], r => restore(r.t)); return false; },
  wipe: () => { if (confirm('Apagar TODOS os dados deste aparelho? Isso não dá para desfazer.') && confirm('Tem certeza? Faça um backup antes se precisar.')) { localStorage.removeItem(KEY); load(); save(); } }
};
function guessMeal() { const h = new Date().getHours(); return h < 10 ? 'Café da manhã' : h < 12 ? 'Lanche' : h < 15 ? 'Almoço' : h < 18 ? 'Lanche da tarde' : h < 22 ? 'Jantar' : 'Ceia'; }
const mealFields = m => [{ k: 'meal', label: 'Refeição', type: 'select', value: m.meal, options: MEALS }, { k: 'text', label: 'O que comi', type: 'textarea', value: m.text }, { k: 'kcal', label: 'kcal', type: 'number', value: m.kcal }, { k: 'prot', label: 'Proteína (g)', type: 'number', value: m.prot }, { k: 'carb', label: 'Carboidrato (g, opcional)', type: 'number', value: m.carb }, { k: 'fat', label: 'Gordura (g, opcional)', type: 'number', value: m.fat }];
const foodFields = f => [{ k: 'name', label: 'Alimento / porção', value: f.name }, { k: 'kcal', label: 'kcal', type: 'number', value: f.kcal }, { k: 'prot', label: 'Proteína (g)', type: 'number', value: f.prot }, { k: 'carb', label: 'Carboidrato (g, opcional)', type: 'number', value: f.carb }, { k: 'fat', label: 'Gordura (g, opcional)', type: 'number', value: f.fat }];
/* ---- Lançar rápido: valor primeiro, categoria em 1 toque ---- */
function txSheet(t0, title, onSave, onDel) {
  const st = { type: t0.type || 'out', cat: t0.cat || '', nec: t0.nec || '' }, hasSheet = !!S.settings.sync.key;
  const m = document.createElement('div'); m.className = 'modal'; m.setAttribute('role', 'dialog');
  m.innerHTML = `<div class="sheet qa"><h3 class="px">${title}</h3>
<div class="chips wrapc" id="qt"><button type="button" class="chip" data-t="out">Saída</button><button type="button" class="chip" data-t="in">Entrada</button></div>
<div class="amt"><span>R$</span><input name="amount" inputmode="decimal" autocomplete="off" placeholder="0,00" value="${esc(t0.amount ?? '')}" aria-label="Valor em reais"></div>
<label>Categoria</label><div class="chips wrapc" id="qc"></div>
<div id="qnw"><label>Esse gasto é</label><div class="chips wrapc" id="qn"></div></div>
<input name="desc" placeholder="O que foi? (opcional)" value="${esc(t0.desc || '')}" aria-label="Descrição">
<details class="more"><summary>Mais opções</summary><label>Data</label><input type="date" name="date" value="${esc(t0.date || dkey())}">${hasSheet ? `<label>Na planilha</label><select name="sheet"><option value="auto" ${t0.sheet !== 'none' ? 'selected' : ''}>Enviar automático (soma na linha certa)</option><option value="none" ${t0.sheet === 'none' ? 'selected' : ''}>Não enviar</option></select>` : ''}</details>
<div class="row act"><button type="button" class="btn ghost" data-x>Cancelar</button>${onDel ? '<button type="button" class="btn danger" data-del>Excluir</button>' : ''}<button type="button" class="btn" data-save>Salvar</button></div></div>`;
  document.body.appendChild(m);
  const q = sel => m.querySelector(sel), amt = q('[name=amount]'), sv = q('[data-save]');
  const freq = () => { const c = {}; S.tx.slice(-80).forEach(x => { if (x.type === st.type) c[x.cat] = (c[x.cat] || 0) + 1; }); return [...(st.type === 'in' ? CATS_IN : CATS)].sort((a, b) => (c[b] || 0) - (c[a] || 0)); };
  const ok = () => num(amt.value) > 0 && !!st.cat;
  const draw = () => {
    q('#qt').querySelectorAll('.chip').forEach(b => b.classList.toggle('on', b.dataset.t === st.type));
    q('#qc').innerHTML = freq().map(c => `<button type="button" class="chip ${c === st.cat ? 'on' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
    q('#qn').innerHTML = NEC.map(([k, l]) => `<button type="button" class="chip ${k === (st.nec || necOf({ cat: st.cat })) ? 'on' : ''}" data-n="${k}">${esc(l.replace(' (todo mês)', ''))}</button>`).join('');
    q('#qnw').hidden = st.type === 'in'; sv.classList.toggle('dis', !ok());
  };
  m.addEventListener('click', e => {
    e.stopPropagation();
    const b = e.target.closest('button');
    if (e.target === m || (b && b.dataset.x !== undefined)) { m.remove(); return; }
    if (!b) return;
    if (b.dataset.t) { st.type = b.dataset.t; st.cat = ''; st.nec = ''; draw(); }
    else if (b.dataset.c) { st.cat = b.dataset.c; st.nec = ''; draw(); }
    else if (b.dataset.n) { st.nec = b.dataset.n; draw(); }
    else if (b.dataset.del !== undefined) { if (confirm('Excluir?')) { onDel(); m.remove(); save(); render(); } }
    else if (b.dataset.save !== undefined) {
      if (!ok()) { toast(num(amt.value) > 0 ? 'Escolha a categoria.' : 'Coloque o valor.'); return; }
      const r = { type: st.type, cat: st.cat, amount: num(amt.value), desc: q('[name=desc]').value.trim(), date: q('[name=date]').value || dkey(), nec: st.type === 'in' ? '' : (st.nec || necOf({ cat: st.cat })) };
      const sh = q('[name=sheet]'); r.sheet = sh ? sh.value : 'none';
      onSave(r); m.remove(); save(); render();
    }
  });
  amt.addEventListener('input', () => sv.classList.toggle('dis', !ok()));
  m.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); sv.click(); } });
  draw(); setTimeout(() => { if (!amt.value) amt.focus(); }, 30);
}
/* Botões: primário (amarelo) = ação principal; .ghost = secundário; .link = terciário; .done = já feito (verde, sem clique); .dis/disabled = indisponível */
const doneBtn = (label, undoLabel, attrs) => `<span class="btn sm done" role="status">${ic('check')}${label}</span><button class="btn sm link" ${attrs}>${undoLabel || 'Desfazer'}</button>`;
const NEC = [['ess', 'Essencial'], ['fix', 'Fixo (todo mês)'], ['nao', 'Não essencial']];
const necOf = x => x.nec || (['Moradia', 'Saúde', 'Mercado', 'Transporte'].includes(x.cat) ? 'ess' : ['Assinaturas'].includes(x.cat) ? 'fix' : 'nao');
const txFields = x => [{ k: 'type', label: 'Tipo', type: 'select', value: x.type, options: [['out', 'Saída'], ['in', 'Entrada']] }, { k: 'date', label: 'Data', type: 'date', value: x.date }, { k: 'cat', label: 'Categoria', type: 'select', value: x.cat, options: [...CATS, ...CATS_IN] }, { k: 'nec', label: 'Esse gasto é (só para saída)', type: 'select', value: necOf(x), options: NEC }, { k: 'desc', label: 'Descrição', value: x.desc }, { k: 'amount', label: 'Valor (R$)', type: 'number', value: x.amount }];
const habFields = h => [{ k: 'title', label: 'Nome', value: h.title }, { k: 'when', label: 'Período', type: 'select', value: h.when, options: [['m', 'Manhã'], ['t', 'Tarde'], ['n', 'Noite']] }, { k: 'at', label: 'Horário (opcional)', type: 'time', value: h.at || '' }, { k: 'days', label: 'Dias', type: 'days', value: h.days }, { k: 'pts', label: 'Dá moeda?', type: 'select', value: h.pts ? 1 : 0, options: [[1, 'Sim'], [0, 'Não']] }, { k: 'hard', label: 'Aparece no Dia difícil?', type: 'select', value: h.hard ? 1 : 0, options: [[1, 'Sim'], [0, 'Não']] }];
const hfix = h => Object.assign(h, { pts: +h.pts, hard: +h.hard });
const expFields = x => [{ k: 'title', label: 'Título', value: x.title }, { k: 'subject', label: 'Assunto', value: x.subject, ph: 'História, biologia…' }, { k: 'link', label: 'Link', type: 'url', value: x.link }];
function restore(txt) {
  try { const d = JSON.parse(txt); if (!d || !d.schedule || !d.habits) throw 0; if (!confirm('Substituir os dados atuais pelo backup?')) return; localStorage.setItem(KEY, JSON.stringify(d)); load(); save(); render(); alert('Backup restaurado.'); } catch (e) { alert('Esse arquivo não parece um backup do Meu Dia.'); }
}
function toast(t) { let e = $('#toast'); if (!e) { e = document.createElement('div'); e.id = 'toast'; e.setAttribute('role', 'status'); document.body.appendChild(e); } e.textContent = t; e.className = 'on'; clearTimeout(toast.t); toast.t = setTimeout(() => e.className = '', 2200); }
function applyTheme() { const t = S.settings.theme || 'auto'; if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t); }

/* ---------- campos (change) ---------- */
const C = {
  pt: (v, i) => { const k = dkey(); S.prios[k] = S.prios[k] || [{}, {}, {}]; S.prios[k][i] = Object.assign(S.prios[k][i] || {}, { t: v }); save(); },
  pd: (v, i, el) => { const k = dkey(); S.prios[k] = S.prios[k] || [{}, {}, {}]; S.prios[k][i] = Object.assign(S.prios[k][i] || {}, { d: el.checked }); save(); },
  mnote: v => { const k = dkey(); S.mood[k] = S.mood[k] || {}; S.mood[k].note = v; save(); },
  sth: v => stSet('theme', v), str: v => stSet('track', v), sln: v => { stSet('link', v); render(); }, snx: v => stSet('next', v),
  rv: (v, f) => { const wk = dkey(wkStart()); S.reviews[wk] = S.reviews[wk] || {}; S.reviews[wk][f] = v; save(); },
  cc: (v, f) => { S.settings.calc[f] = v; save(); render(); },
  ws: (v, f) => { S.settings[f] = v; save(); render(); },
  notion: v => { S.settings.notion = v; save(); render(); },
  restore: async (v, w, el) => { const f = el.files[0]; if (f) restore(await f.text()); },
  photo: async (v, w, el) => {
    const f = el.files[0]; if (!f) return;
    try { const bl = await shrink(f), id = uid(), ws = [...S.weights].sort((a, c) => a.date.localeCompare(c.date)); await idbPut(id, bl); S.photos.push({ id, date: dkey(), kg: ws.length ? ws[ws.length - 1].kg : '' }); save(); toast('Foto salva neste aparelho.'); render(); } catch (e) { alert('Não consegui salvar a foto.'); }
  }
};
function stSet(f, v) { const d = ui.sd ?? new Date().getDay(); S.study[d] = S.study[d] || { theme: '', track: '', link: '', next: '' }; S.study[d][f] = v; save(); }

/* ================= v4: Pomodoro, Aprender, Evolução, Sync ================= */
const POMS = [[25, 5, '25 + 5'], [50, 10, '50 + 10']];
function pomToday() { return S.pomo[dkey()] || 0; }
function pomoMini() {
  const n = pomToday(), t = ui.tm;
  const run = t ? `<b class="tmq">--:--</b>` : '';
  const body = t
    ? `<div class="mut">${t.mode === 'f' ? 'Foco rodando.' : 'Pausa.'}</div><div class="row"><button class="btn sm ghost" data-a="tmstop">${ic('close')}Parar</button></div>`
    : `<div class="mut">Usa o do PC? Marque o ciclo aqui. Vale 1 moeda (até 4 por dia).</div><div class="row"><button class="btn sm ghost" data-a="pomadd">+1 ciclo feito</button>${n ? `<button class="btn link" data-a="pomsub">desfazer</button>` : ''}<button class="btn link" data-a="tmstart">foco de ${S.settings.pom.f} min aqui</button></div>`;
  return `<details class="pomo-mini" data-w="pomo" ${ui.open.pomo ? 'open' : ''}><summary>${ic('hourglass', 'sm')}<span>Pomodoro · hoje ${n}</span>${run}</summary>${body}</details>`;
}
function vTimer() {
  const t = ui.tm, n = pomToday(), pm = S.settings.pom;
  let out = `<div class="card">${sec('hourglass', 'Pomodoro', `<span class="mut">hoje: ${n} ${n === 1 ? 'ciclo' : 'ciclos'}</span>`)}`;
  if (t) out += `<div class="mut">${t.mode === 'f' ? 'Foco: só uma coisa, sem celular.' : (t.long ? 'Pausa longa: levante, beba água.' : 'Pausa curta: respire e alongue.')}</div><div class="big" id="tmTxt" aria-live="off">--:--</div><div class="row"><button class="btn ghost" data-a="tmstop">${ic('close')}Parar</button><button class="btn ghost" data-a="tmskip">${ic('forward')}Pular</button></div>`;
  else out += `<div class="mut">Foco e pausa, em ciclos. A cada 4 ciclos, uma pausa longa. Cada ciclo vale 1 moeda (até 4 por dia).</div><div class="chips">${POMS.map(p => `<button class="chip ${pm.f === p[0] ? 'on' : ''}" data-a="pomset" data-v="${p[0]}">${p[2]} min</button>`).join('')}</div><button class="btn pri full" data-a="tmstart">${ic('play')}Iniciar foco de ${pm.f} min</button>`;
  return out + `<div class="sqs">${[...Array(8)].map((_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div></div>`;
}
Object.assign(A, {
  pomset: v => { const p = POMS.find(x => x[0] === +v); S.settings.pom = { f: p[0], b: p[1] }; save(); },
  pomadd: () => { const k = dkey(); S.pomo[k] = (S.pomo[k] || 0) + 1; save(); toast('Ciclo registrado.'); },
  pomsub: () => { const k = dkey(); S.pomo[k] = Math.max(0, (S.pomo[k] || 0) - 1); save(); },
  tmstart: () => { ui.tm = { mode: 'f', end: Date.now() + S.settings.pom.f * 60000 }; },
  tmskip: () => { ui.tm.end = Date.now() - 1; tickTimer(); return false; }
});
function tickTimer() {
  const t = ui.tm; if (!t || t.end > Date.now()) return;
  if (t.mode === 'f') {
    const k = dkey(); S.pomo[k] = (S.pomo[k] || 0) + 1; save();
    const long = S.pomo[k] % 4 === 0, mins = long ? 15 : S.settings.pom.b;
    ui.tm = { mode: 'b', long, end: Date.now() + mins * 60000 }; toast(`Foco concluído! Pausa de ${mins} min.`);
  } else { ui.tm = null; toast('Pausa acabou. Quando quiser, inicie outro foco.'); }
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  render();
}

/* ---- Aprender (estilo Duolingo, sem punição) ---- */
const LV = ['Iniciante', 'Intermediário', 'Avançado'];
const lid = (s, v, i) => `${s}:${v}:${i}`;
const lessonsDone = () => Object.keys(S.learn.done).length;
const learnToday = () => S.learn.days[dkey()] || 0;
function levelOpen(sid, v) {
  if (v === 0) return true;
  const prev = LEARN.subjects.find(s => s.id === sid).data[v - 1];
  const dn = prev.filter((_, i) => S.learn.done[lid(sid, v - 1, i)]).length;
  return dn >= Math.ceil(prev.length * .7);
}
function stars(r) { return !r ? 0 : r.best >= 100 ? 3 : r.best >= 75 ? 2 : 1; }
function vAprender() {
  if (ui.ls) return vLesson();
  const sid = ui.sub || 'mt', sub = LEARN.subjects.find(s => s.id === sid), td = learnToday();
  let out = `<div class="card">${sec('zap', 'Aprender', `<b>${S.learn.xp} XP</b>`)}<div class="mut">Lições curtas (cerca de 5 min), do iniciante ao avançado. Errou? A pergunta volta no fim da lição. Sem vidas, sem punição. Meta do dia: 1 lição.</div><div class="bar"><i style="width:${Math.min(100, td / 1 * 100)}%"></i></div><div class="mut">${td >= 1 ? 'Meta de hoje batida!' : 'Hoje: 0/1 lição'} · ${lessonsDone()} lições concluídas no total</div></div>`;
  out += `<div class="chips">${LEARN.subjects.map(s => `<button class="chip ${s.id === sid ? 'on' : ''}" data-a="lsubj" data-v="${s.id}">${ic(s.icon)}${s.name}</button>`).join('')}</div>`;
  sub.data.forEach((lv, v) => {
    const open = levelOpen(sid, v);
    out += `<div class="card"><div class="row sp"><h3 class="px">${LV[v]}</h3>${open ? '' : `<span class="mut">${ic('pin', 'sm')}Faça 70% do nível anterior</span>`}</div>` + lv.map((l, i) => { const r = S.learn.done[lid(sid, v, i)], st = stars(r); return `<div class="item ${open ? '' : 'lock'}"><div class="t"><b>${esc(l.t)}</b><div class="mut">${r ? `Melhor: ${r.best}% · ${r.n}×` : 'Nova lição'}</div></div><span class="stars" aria-label="${st} de 3 estrelas">${[1, 2, 3].map(x => `<i class="${x <= st ? 'on' : ''}"></i>`).join('')}</span><button class="btn sm ${r ? 'ghost' : ''}" data-a="lstart" data-v="${lid(sid, v, i)}" ${open ? '' : 'disabled'}>${r ? 'Refazer' : 'Começar'}</button></div>`; }).join('') + `</div>`;
  });
  return out;
}
function shuf(a) { return [...a].sort(() => Math.random() - .5); }
function lessonCur() { const L = ui.ls; return L.q[0]; }
function vLesson() {
  const L = ui.ls;
  if (L.done) {
    return `<div class="card center">${ic('trophy', 'xl')}<h2 class="px">Lição concluída!</h2><div class="big">${L.score}%</div><div class="mut">+${L.gain} XP${S.settings.gamify && L.coin ? ' · +1 moeda' : ''}</div><div class="mut">${L.mist ? `Você errou ${L.mist} e refez: é assim que se aprende.` : 'Sem erros. Mandou bem!'}</div><button class="btn full" data-a="lquit">Continuar</button><button class="btn ghost full" data-a="lstart" data-v="${L.id}">Fazer de novo</button></div>`;
  }
  const q = lessonCur(), tot = L.total, doneN = tot - L.q.length;
  let out = `<div class="card"><div class="row sp"><button class="btn sm ghost" data-a="lquit" aria-label="Sair da lição">${ic('close')}Sair</button><span class="mut">${esc(L.title)}</span></div><div class="bar"><i style="width:${Math.round(doneN / tot * 100)}%"></i></div>`;
  if (q[0] === 'm') {
    out += `<div class="h2">${esc(q[1])}</div>` + L.opts.map((o, i) => { const cls = L.fb ? (o === q[2] ? 'right' : (i === L.sel ? 'wrong' : '')) : ''; return `<button class="opt ${cls}" data-a="lsel" data-v="${i}" ${L.fb ? 'disabled' : ''}>${esc(o)}</button>`; }).join('');
  } else if (q[0] === 'n') {
    out += `<div class="h2">${esc(q[1])}</div><input id="lsin" inputmode="decimal" autocomplete="off" placeholder="Sua resposta" value="${esc(L.val || '')}" ${L.fb ? 'disabled' : ''}>${L.fb ? '' : `<button class="btn full" data-a="lcheck">Conferir</button>`}`;
  } else {
    out += `<div class="h2">Traduza para o inglês:</div><div class="idea">${esc(q[1])}</div><div class="ans">${L.pick.map((i, k) => `<button class="w" data-a="lunpick" data-v="${k}" ${L.fb ? 'disabled' : ''}>${esc(L.bank[i])}</button>`).join('') || '<span class="mut">Toque nas palavras abaixo</span>'}</div><div class="bank">${L.bank.map((w, i) => `<button class="w ${L.pick.includes(i) ? 'used' : ''}" data-a="lpick" data-v="${i}" ${L.fb || L.pick.includes(i) ? 'disabled' : ''}>${esc(w)}</button>`).join('')}</div>${L.fb ? '' : `<button class="btn full" data-a="lcheck" ${L.pick.length ? '' : 'disabled'}>Conferir</button>`}`;
  }
  if (L.fb) out += `<div class="banner ${L.ok ? '' : 'warn'}">${ic(L.ok ? 'check' : 'info-box')}<span>${L.ok ? 'Certo!' : `Resposta: <b>${esc(q[0] === 'm' ? q[2] : q[0] === 'n' ? fmt2(q[2]) : q[2])}</b>.`}${q[0] !== 'o' && q[q[0] === 'm' ? 4 : 3] ? ` ${esc(q[q[0] === 'm' ? 4 : 3])}` : ''}${L.ok ? '' : ' Essa volta no fim da lição.'}</span></div><button class="btn full pri" data-a="lnext">Continuar</button>`;
  return out + `</div>`;
}
const fmt2 = n => String(n).replace('.', ',');
function lessonPrep() {
  const L = ui.ls, q = lessonCur(); L.fb = false; L.sel = -1; L.val = ''; L.pick = [];
  if (q[0] === 'm') L.opts = shuf([q[2], ...q[3]]);
  if (q[0] === 'o') L.bank = shuf([...q[2].split(' '), ...(q[3] ? q[3].split(' ') : [])]);
}
const same = (a, b) => String(a).toLowerCase().replace(/[.,!?]/g, '').replace(/\s+/g, ' ').trim() === String(b).toLowerCase().replace(/[.,!?]/g, '').replace(/\s+/g, ' ').trim();
function lessonAnswer(ok) {
  const L = ui.ls, q = lessonCur(); L.fb = true; L.ok = ok;
  if (!ok) { if (!L.wrongSet.has(q)) { L.wrongSet.add(q); L.mist++; } L.q.push(q.slice()); L.wrongSet.add(L.q[L.q.length - 1]); }
}
Object.assign(A, {
  lsubj: v => { ui.sub = v; },
  lstart: v => { const [s, lv, li] = v.split(':'), sub = LEARN.subjects.find(x => x.id === s), qs = LEARN.build(s, +lv, +li); ui.sub = s; ui.ls = { id: v, title: `${sub.name} · ${sub.data[+lv][+li].t}`, q: qs, total: qs.length, mist: 0, wrongSet: new Set(), done: false }; lessonPrep(); window.scrollTo(0, 0); },
  lquit: () => { if (ui.ls && !ui.ls.done && !confirm('Sair da lição? O progresso desta lição não é salvo.')) return false; ui.ls = null; },
  lsel: v => { const L = ui.ls, q = lessonCur(); if (L.fb) return false; L.sel = +v; lessonAnswer(L.opts[+v] === q[2]); },
  lcheck: () => {
    const L = ui.ls, q = lessonCur(); if (L.fb) return false;
    if (q[0] === 'n') { const el = $('#lsin'); L.val = el.value; const v = parseFloat(String(el.value).replace(',', '.')); if (isNaN(v)) { toast('Digite um número.'); return false; } lessonAnswer(Math.abs(v - Number(q[2])) < 0.011); }
    else lessonAnswer(same(L.pick.map(i => L.bank[i]).join(' '), q[2]));
  },
  lpick: v => { const L = ui.ls; if (!L.fb && !L.pick.includes(+v)) L.pick.push(+v); },
  lunpick: v => { const L = ui.ls; if (!L.fb) L.pick.splice(+v, 1); },
  lnext: () => {
    const L = ui.ls; if (L.ok) L.q.shift(); else L.q.shift();
    if (!L.q.length) {
      const score = Math.max(0, Math.round(100 * (L.total - L.mist) / L.total)), k = dkey(), id = L.id, prev = S.learn.done[id];
      const first = !prev, gain = 10 + (L.mist === 0 ? 5 : 0);
      S.learn.done[id] = { best: Math.max(score, prev ? prev.best : 0), n: (prev ? prev.n : 0) + 1, last: k };
      S.learn.xp += gain; S.learn.days[k] = (S.learn.days[k] || 0) + 1; save();
      Object.assign(L, { done: true, score, gain, coin: S.learn.days[k] <= 3 });
      return;
    }
    lessonPrep();
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'lsin') { e.preventDefault(); A.lcheck(); render(); const nx = document.querySelector('[data-a=lnext]'); if (nx) nx.focus(); } });

/* ---- Evolução (roda da vida) ---- */
const AREAS = [
  ['esp', 'Espiritual', 'sun', ['Orar 5 min a mais', 'Ler um trecho da Bíblia', 'Escrever 3 gratidões', 'Ir à igreja com a mente presente', '10 min de silêncio sem celular']],
  ['emo', 'Emocional', 'mood-happy', ['Escrever como me sinto (5 min)', 'Caminhar 20 min sem fone', 'Conversar com alguém sobre algo pesado', 'Dormir antes das 23h', 'Respirar fundo 3 vezes ao dia']],
  ['rel', 'Relacionamento (Nayara)', 'heart', ['Date sem celular', 'Elogio sincero', 'Perguntar como foi o dia dela e ouvir', 'Fazer algo da lista dela', 'Planejar o próximo passeio']],
  ['fam', 'Família (pais)', 'users', ['Ligar para meus pais', 'Almoçar com a família', 'Mandar mensagem de gratidão', 'Perguntar uma história antiga', 'Ajudar em uma tarefa em casa']],
  ['pro', 'Profissional', 'trophy', ['Candidatar a 1 vaga', 'Postar no LinkedIn', 'Avançar 1h no portfólio ou projeto', 'Pedir feedback a alguém', 'Atualizar um case']],
  ['cor', 'Corpo e saúde', 'human-run', ['Fechar os 3 treinos', 'Água na meta 5 dias', 'Pesar e registrar', 'Dormir 7h ou mais em 4 noites', 'Registrar refeições 5 dias']],
  ['fin', 'Dinheiro', 'wallet', ['Lançar os gastos da semana', 'Guardar um valor pequeno', 'Revisar assinaturas', 'Definir o limite do mês'] ]
];
const vwk = (o = 0) => dkey(wkStart(addD(new Date(), 7 * o)));
function vVida() {
  const wk = vwk(), cur = S.vida[wk] || { s: {}, a: {}, d: {} }, pv = S.vida[vwk(-1)] || { s: {} };
  let out = `<div class="card">${sec('heart', 'Evolução da vida')}<div class="mut">Uma vez por semana, dê uma nota de 0 a 10 para cada área e escolha UMA ação pequena. Sem cobrança: é um retrato honesto, não uma prova. Fazer a ação vale 1 moeda.</div></div>`;
  AREAS.forEach(([id, nm, icn, acts]) => {
    const sc = cur.s[id], ps = pv.s[id], act = cur.a[id], dn = cur.d[id];
    const hist = [3, 2, 1, 0].map(o => (S.vida[vwk(-o)] || { s: {} }).s[id]);
    out += `<div class="card"><div class="row sp"><h3 class="px">${ic(icn)}<span>${nm}</span></h3><span class="mut">${ps !== undefined ? 'semana passada: ' + ps : ''}</span></div>
<div class="row"><button class="btn sm ghost" data-a="vscore" data-v="${id}" data-w="-1" aria-label="Diminuir nota">${ic('minus')}</button><div class="big grow center1">${sc === undefined ? '–' : sc}<small>/10</small></div><button class="btn sm" data-a="vscore" data-v="${id}" data-w="1" aria-label="Aumentar nota">${ic('plus')}</button></div>
<div class="mini">${hist.map(h => `<i style="height:${h === undefined ? 4 : Math.max(8, h * 10)}%;${h === undefined ? 'opacity:.3' : ''}"></i>`).join('')}</div>
<div class="mut">Ação da semana</div>${act ? `<div class="row sp"><b>${esc(act)}</b><button class="chip ${dn ? 'on' : ''}" data-a="vdone" data-v="${id}">${ic('check')}${dn ? 'Feito' : 'Marcar feito'}</button></div><button class="btn sm ghost" data-a="vact" data-v="${id}">Trocar ação</button>` : `<div class="chips wrapc">${acts.map((a, i) => `<button class="chip" data-a="vpick" data-v="${id}" data-w="${i}">${esc(a)}</button>`).join('')}<button class="chip" data-a="vact" data-v="${id}">${ic('plus')}Outra</button></div>`}</div>`;
  });
  return out;
}
Object.assign(A, {
  vscore: (id, d) => { const wk = vwk(); S.vida[wk] = S.vida[wk] || { s: {}, a: {}, d: {} }; const c = S.vida[wk].s[id]; S.vida[wk].s[id] = Math.max(0, Math.min(10, (c === undefined ? 5 : c) + (c === undefined ? 0 : +d))); save(); },
  vpick: (id, i) => { const wk = vwk(); S.vida[wk] = S.vida[wk] || { s: {}, a: {}, d: {} }; S.vida[wk].a[id] = AREAS.find(a => a[0] === id)[3][+i]; save(); },
  vact: id => { form('Ação da semana', [{ k: 't', label: 'O que vou fazer (algo pequeno)', value: ((S.vida[vwk()] || { a: {} }).a[id]) || '' }], r => { const wk = vwk(); S.vida[wk] = S.vida[wk] || { s: {}, a: {}, d: {} }; if (r.t) S.vida[wk].a[id] = r.t; }); return false; },
  vdone: id => { const v = S.vida[vwk()]; v.d[id] = !v.d[id]; save(); }
});

/* ---- Loja e conquistas ---- */
const REW = [
  ['Pequenos', [['Episódio extra de anime', 5], ['Escolher o filme ou série da noite', 5], ['Sobremesa especial', 8], ['1 hora de jogo single-player', 8], ['Café ou lanche num lugar legal', 10]]],
  ['Médios', [['Sessão de desenho livre sem meta (2 h)', 15], ['Sábado de manhã sem agenda', 20], ['Cinema', 25], ['Jantar com a Nayara', 30], ['Livro ou mangá novo', 30]]],
  ['Grandes', [['Passeio de um dia inteiro', 60], ['Presente que eu quero', 80], ['Curso ou ferramenta que eu queria', 100], ['Fim de semana de viagem', 150]]],
  ['Cofrinho', [['Transferir R$ 20 para minha reserva (eu faço de verdade)', 50]]]
];
Object.assign(A, { addrwsug: (g, i) => { const r = REW[+g][1][+i]; if (S.settings.rewards.some(x => x.title === r[0])) { toast('Já está na sua loja.'); return false; } S.settings.rewards.push({ id: uid(), title: r[0], at: r[1] }); save(); toast('Prêmio adicionado.'); } });
const BADGES = () => {
  const lw = lessonsDone(), sdays = Object.values(S.studyLog).filter(x => x && x.done).length, wg = num(S.settings.waterGoal), wd = wg ? Object.keys(S.water).filter(k => S.water[k] >= wg).length : 0;
  const pom = Object.values(S.pomo).reduce((a, x) => a + x, 0), rounds = S.challenges.reduce((a, c) => a + (c.rounds || 0), 0), best = Math.max(0, ...S.challenges.map(chDays));
  return [['Primeiro treino guiado', S.workouts.length >= 1], ['10 treinos', S.workouts.length >= 10], ['7 dias limpos em um desafio', best >= 7], ['Primeira rodada completa', rounds >= 1], ['7 estudos de manhã', sdays >= 7], ['30 estudos de manhã', sdays >= 30], ['Primeira lição', lw >= 1], ['10 lições', lw >= 10], ['Todas as lições de um nível', LEARN.subjects.some(s => s.data.some((lv, v) => lv.every((_, i) => S.learn.done[lid(s.id, v, i)])))], ['10 pomodoros', pom >= 10], ['Água na meta 7 dias', wd >= 7], ['Primeira foto de evolução', S.photos.length >= 1], ['Primeira roda da vida', Object.keys(S.vida).length >= 1], ['4 revisões semanais', Object.keys(S.reviews).length >= 4]];
};

const hid = t => { let h = 5381; for (const c of String(t)) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return h.toString(36); };
function downloadIcs(w) {
  const BY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'], now = new Date(), stamp = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z', ev = [];
  const D8 = d => dkey(d).replace(/-/g, ''), T = t => t.replace(':', '') + '00', esc2 = t => String(t).replace(/([,;\\])/g, '\\$1');
  const add = (title, d, t, rrule, alarm, mins, uidx) => {
    const [h, m] = t.split(':').map(Number), e = new Date(2000, 0, 1, h, m + (mins || 15)), et = pad(e.getHours()) + ':' + pad(e.getMinutes());
    ev.push(['BEGIN:VEVENT', `UID:md-${hid(title + rrule + (uidx || ''))}@meudia`, `DTSTAMP:${stamp}`, `DTSTART:${D8(d)}T${T(t)}`, `DTEND:${D8(d)}T${T(et)}`, ...(rrule ? [`RRULE:${rrule}`] : []), `SUMMARY:${esc2(title)}`, ...[].concat(alarm || 'PT0S').flatMap(tr => ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc2(title)}`, `TRIGGER:${tr}`, 'END:VALARM']), 'END:VEVENT'].join('\r\n'));
  };
  if (w !== 'fin') S.habits.filter(h => h.at && h.days.length && (w === 'all' || h.hard)).forEach(h => {
    const first = [0, 1, 2, 3, 4, 5, 6].map(i => addD(now, i)).find(d => h.days.includes(d.getDay()));
    add(h.title.replace(/ \(.*\)/, ''), first, h.at, 'FREQ=WEEKLY;BYDAY=' + (h.days.length === 7 ? BY.join(',') : h.days.map(x => BY[x]).join(',')));
  });
  add('Anotar as 3 prioridades do dia', now, '06:45', 'FREQ=DAILY', 'PT0S', 10);
  add('Fechar o dia: marcar as prioridades (feito ou não)', now, '21:30', 'FREQ=DAILY', 'PT0S', 10);
  const sun = [0, 1, 2, 3, 4, 5, 6].map(i => addD(now, i)).find(d => d.getDay() === 0);
  add('Lançar os gastos da semana no Porkinho', sun, '20:00', 'FREQ=WEEKLY;BYDAY=SU', 'PT0S', 10);
  add('Revisar Porkinho: limites e metas', new Date(now.getFullYear(), now.getMonth() + 1, 1), '09:00', 'FREQ=MONTHLY;BYMONTHDAY=1', 'PT0S', 15);
  (S.pet || []).forEach(p => { const nx = petNext(p) || dkey(now), d0 = new Date((nx < dkey(now) ? dkey(now) : nx) + 'T12:00'); add(p.title, d0, '09:00', `FREQ=DAILY;INTERVAL=${+p.every || 15}`, ['-PT12H', 'PT0S'], 30); });
  S.bills.forEach(b => { const dd = Math.min(28, Math.max(1, Math.round(num(b.day)) || 1)), d0 = new Date(now.getFullYear(), now.getMonth() + (now.getDate() > dd ? 1 : 0), dd); add(`Conta: ${b.title}`, d0, '09:00', `FREQ=MONTHLY;BYMONTHDAY=${dd}`, ['-P3D', '-P1D', 'PT0S'], 15); });
  Object.values(pdays()).forEach(p => { const dd = p.day, d0 = new Date(now.getFullYear(), now.getMonth() + (now.getDate() > dd ? 1 : 0), dd); add(`Conta: ${p.t}`, d0, '09:00', `FREQ=MONTHLY;BYMONTHDAY=${dd}`, ['-P3D', '-P1D', 'PT0S'], 15); });
  if (activeGoals().length) for (let i = 0; i < 12; i++) { const mo = addMo(dkey(now).slice(0, 7), i), pd = payDay(mo); if (pd < dkey(now)) continue; add('Dia do pagamento: guardar para suas metas', new Date(pd + 'T12:00'), '09:00', '', ['PT0S'], 15, pd); }
  { const d0 = new Date(now.getFullYear(), now.getMonth() + (now.getDate() > 20 ? 1 : 0), 20); add('DAS do MEI vence hoje (dia 20)', d0, '09:00', 'FREQ=MONTHLY;BYMONTHDAY=20', ['-P3D', 'PT0S'], 15);
    const y0 = new Date(now.getFullYear() + (now.getMonth() > 4 ? 1 : 0), 4, 15); add('Declaração anual do MEI (DASN-SIMEI) vence 31/05', y0, '09:00', 'FREQ=YEARLY;BYMONTH=5;BYMONTHDAY=15', ['-P7D', 'PT0S'], 15); }
  const txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Meu Dia//PT', 'CALSCALE:GREGORIAN', ...ev, 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/calendar' })); a.download = 'meu-dia-lembretes.ics'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  S.settings.icsHash = icsSig(); save();
  toast(`${ev.length} lembretes prontos. Abra o arquivo e toque em Adicionar tudo.`);
}

/* ---- Sync com o Notion (via função do Netlify) ---- */
function reportData(k = dkey()) {
  const dt = new Date(k + 'T12:00'), dow = dt.getDay(), hs = S.habits.filter(h => h.days.includes(dow) && (!S.hardDay[k] || isMin(h))), dn = hs.filter(h => stOf(k, h.id) === 'done').length;
  const ms = S.meals[k] || [], md = S.mood[k] || {}, wts = S.weights.find(x => x.date === k), wv = vwk(), vi = S.vida[wv] || { s: {} };
  return {
    date: k, missoesPct: hs.length ? Math.round(100 * dn / hs.length) : 0, estudo: !!(S.studyLog[k] && S.studyLog[k].done), pomodoros: S.pomo[k] || 0, licoes: S.learn.days[k] || 0,
    aguaL: Math.round((S.water[k] || 0) / 100) / 10, treino: S.workouts.filter(w => w.date === k).map(w => w.name).join(', '), kcal: Math.round(sum(ms, 'kcal')), prot: Math.round(sum(ms, 'prot')),
    peso: wts ? num(wts.kg) : null, desafios: S.challenges.map(c => `${c.title}: ${Math.min(c.days, chDays(c))}/${c.days}`).join('; '), humor: md.m || null, energia: md.e || null, moedas: coins(),
    vida: AREAS.map(a => `${a[1]} ${vi.s[a[0]] ?? '-'}`).join(' · '), resumo: (S.hardDay[k] ? 'DIA DIFÍCIL (mínimo de 3). ' : '') + dayReport(k) + (dow === 0 ? '\n\n' + weekSummary(wkStart(new Date(k + 'T12:00'))).txt : '')
  };
}
async function doSync(quiet) {
  const sy = S.settings.sync; if (!sy.key) { if (!quiet) toast('Defina a chave em Ajustes (ícone no topo).'); return; }
  try {
    const r = await fetch(sy.url || '/.netlify/functions/sync', { method: 'POST', headers: { 'content-type': 'application/json', 'x-app-key': sy.key }, body: JSON.stringify(reportData()), keepalive: true });
    if (!r.ok) throw new Error(r.status);
    sy.last = new Date().toISOString(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { }
    if (!quiet) toast('Enviado ao Notion.');
  } catch (e) { if (!quiet) toast('Não consegui enviar. Veja Ajustes, Notion.'); }
  if (ui.tab === 'mais' && ui.mais === 'cfg') render();
}
const cloudUrl = () => (S.settings.sync.url || '/.netlify/functions/sync').replace(/sync$/, 'backup');
async function doBackup(quiet) {
  const sy = S.settings.sync; if (!sy.key) { if (!quiet) toast('Defina a chave do app no card do Notion.'); return false; }
  try {
    const copy = JSON.parse(JSON.stringify(S)); copy.settings.sync.key = '';
    const r = await fetch(cloudUrl(), { method: 'POST', headers: { 'content-type': 'application/json', 'x-app-key': sy.key }, body: JSON.stringify({ json: JSON.stringify(copy) }), keepalive: false });
    if (!r.ok) throw new Error(r.status + ' ' + (await r.text()).slice(0, 120));
    S.settings.cloudLast = new Date().toISOString(); S.settings.cloudErr = ''; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { }
    if (!quiet) toast('Backup salvo na nuvem.');
  } catch (e) { S.settings.cloudErr = String(e.message || e); if (!quiet) alert('Não consegui salvar o backup na nuvem: ' + S.settings.cloudErr); }
  if (ui.tab === 'mais' && ui.mais === 'cfg') render();
}
async function doCloudRestore() {
  const sy = S.settings.sync; if (!sy.key) { alert('Primeiro coloque a chave do app no card do Notion.'); return; }
  try {
    const r = await fetch(cloudUrl(), { headers: { 'x-app-key': sy.key } });
    if (!r.ok) throw new Error(r.status === 404 ? 'Ainda não existe backup na nuvem.' : 'Erro ' + r.status);
    const j = await r.json(), d = JSON.parse(j.json);
    d.settings = d.settings || {}; d.settings.sync = Object.assign({}, d.settings.sync, { key: sy.key, url: sy.url, on: true });
    d.settings.cloudLast = j.at;
    restore(JSON.stringify(d));
  } catch (e) { alert('Não consegui restaurar da nuvem: ' + (e.message || e)); }
}
Object.assign(A, { cbk: () => { doBackup(false); return false; }, crest: () => { doCloudRestore(); return false; }, syncnow: () => { doSync(false); return false; }, synctog: () => { S.settings.sync.on = !S.settings.sync.on; save(); } });
Object.assign(C, { syncurl: v => { S.settings.sync.url = v.trim(); save(); }, synckey: v => { S.settings.sync.key = v.trim(); save(); } });

/* ---- Estudo do dia vindo do Roadmap (Notion, só leitura) ---- */
const ROAD_KEY = 'meudia_road';
function roadLoad() { if (ui.road) return ui.road; try { ui.road = JSON.parse(localStorage.getItem(ROAD_KEY)) || {}; } catch (e) { ui.road = {}; } return ui.road; }
async function roadFetch(force) {
  const sy = S.settings.sync, rd = roadLoad(); if (!sy.key || ui.roadBusy) return;
  if (!force && rd.at && Date.now() - rd.at < 10 * 60 * 1000 && rd.date === dkey()) return;
  ui.roadBusy = true; if (force) render();
  try {
    const base = (sy.url || '/.netlify/functions/sync').replace(/sync$/, 'roadmap');
    const r = await fetch(`${base}?date=${dkey()}`, { headers: { 'x-app-key': sy.key } });
    if (!r.ok) throw new Error(r.status);
    const j = await r.json(); ui.road = { at: Date.now(), date: dkey(), items: j.items || [], err: '' };
    try { localStorage.setItem(ROAD_KEY, JSON.stringify(ui.road)); } catch (e) { }
  } catch (e) { ui.road = Object.assign(roadLoad(), { err: String(e.message || e) }); }
  ui.roadBusy = false; if (!document.querySelector('.modal') && !document.activeElement.matches('input,textarea,select')) render();
}
function roadCard() {
  const sy = S.settings.sync, k = dkey();
  if (!sy.key) return acc('road', 'Estudo do Roadmap', '', `<div class="mut">Ligue o Notion nos ajustes (ícone no topo) para ver aqui o estudo do dia.</div>`, false);
  const rd = roadLoad(); setTimeout(() => roadFetch(false), 0);
  const items = (rd.items || []).filter(x => x.date <= dkey(addD(k, 7)));
  const hoje = items.filter(x => x.date === k), atr = items.filter(x => x.date < k), prox = items.filter(x => x.date > k).slice(0, 4);
  const row = (x, tag) => { const dn = x.status === 'Concluído'; return `<div class="road ${dn ? 'dn' : ''}"><div class="rt"><a class="t" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a>${dn ? doneBtn('Concluído', 'Desfazer', `data-a="roaddone" data-v="${esc(x.id)}"`) : `<button class="btn sm" data-a="roaddone" data-v="${esc(x.id)}">${ic('check')}Feito</button>`}</div><span class="mut">${esc([x.tipo, x.cat].filter(Boolean).join(' · '))}${tag ? ' · ' + tag : ''}${x.xp ? ' · ' + x.xp + ' XP' : ''}</span>${x.crit && !dn ? `<span class="mut">Pronto quando: ${esc(x.crit)}</span>` : ''}</div>`; };
  const dd = d => d.split('-').reverse().slice(0, 2).join('/');
  let b = '';
  if (hoje.length) b += `<div class="grp">Hoje</div>` + hoje.map(x => row(x, '')).join('');
  if (atr.length) b += `<div class="grp">Para retomar</div>` + atr.slice(-3).map(x => row(x, dd(x.date))).join('') + (atr.length > 3 ? `<div class="mut">+${atr.length - 3} mais no Notion.</div>` : '');
  if (prox.length) b += `<div class="grp">Próximos dias</div>` + prox.map(x => row(x, dd(x.date))).join('');
  if (!b) b = `<div class="mut">${rd.err ? 'Não consegui ler o Roadmap agora (' + esc(rd.err) + '). Mostrando o que tinha salvo.' : rd.at ? 'Nada marcado no Roadmap para hoje.' : 'Carregando…'}</div>`;
  else if (rd.err) b += `<div class="mut">Sem conexão agora. Mostrando o último que carregou.</div>`;
  const pend = hoje.filter(x => x.status !== 'Concluído').length;
  return acc('road', 'Estudo do Roadmap', hoje.length ? `${hoje.length - pend}/${hoje.length} hoje` : (atr.length ? `${atr.length} p/ retomar` : ''), `${b}<div class="row"><button class="btn sm ghost" data-a="roadrefresh">${ic('reload')}Atualizar</button></div><div class="mut">Feito marca como Concluído no Notion. Para adiar ou anotar, use o Sistema XP no Claude.</div>`, !!pend);
}
/* ---- Histórico: aulas feitas (Roadmap Concluído + log de inglês), só leitura ---- */
const HIST_KEY = 'meudia_hist';
const histArea = c => c === 'Inglês' ? 'Inglês' : ['Código', 'ADS', 'Arquitetura'].includes(c) ? 'Código' : ['UI Design', 'UX Research', 'Figma', 'Design System', 'Produto', 'Métricas', 'Psicologia', 'Agile', 'Projeto Portfolio'].includes(c) ? 'UX/UI' : 'Outros';
function histLoad() { if (ui.hist) return ui.hist; try { ui.hist = JSON.parse(localStorage.getItem(HIST_KEY)) || {}; } catch (e) { ui.hist = {}; } return ui.hist; }
async function histFetch(force) {
  const sy = S.settings.sync, h = histLoad(); if (!sy.key || ui.histBusy) return;
  if (!force && h.at && Date.now() - h.at < 15 * 60 * 1000) return;
  ui.histBusy = true;
  try {
    const base = (sy.url || '/.netlify/functions/sync').replace(/sync$/, 'roadmap');
    const r = await fetch(`${base}?hist=1&date=${dkey()}`, { headers: { 'x-app-key': sy.key } });
    if (!r.ok) throw new Error(r.status);
    const j = await r.json(); ui.hist = { at: Date.now(), done: j.done || [], english: j.english || [], enErr: j.englishErr || '', err: '' };
    try { localStorage.setItem(HIST_KEY, JSON.stringify(ui.hist)); } catch (e) { }
  } catch (e) { ui.hist = Object.assign(histLoad(), { err: String(e.message || e) }); }
  ui.histBusy = false; if (!document.querySelector('.modal') && !document.activeElement.matches('input,textarea,select')) render();
}
function histCard() {
  const sy = S.settings.sync; if (!sy.key) return '';
  const h = histLoad(); setTimeout(() => histFetch(false), 0);
  const done = h.done || [], en = h.english || [];
  const wk = dkey(addD(dkey(), -7)), by = {};
  done.forEach(x => { const a = histArea(x.cat); (by[a] = by[a] || { n: 0, w: 0, xp: 0 }); by[a].n++; by[a].xp += x.xp || 0; if (x.date >= wk) by[a].w++; });
  const xpT = done.reduce((s, x) => s + (x.xp || 0), 0), dd = d => d.split('-').reverse().slice(0, 2).join('/');
  let b = '';
  if (done.length) {
    b += `<div class="grid3 sm">${['Inglês', 'UX/UI', 'Código'].map(a => `<div><b>${(by[a] || { w: 0 }).w}</b><span class="mut">${a} (7 dias)</span></div>`).join('')}</div>`;
    b += `<div class="mut">Últimos 45 dias: ${done.length} concluídos · ${xpT} XP${by.Outros ? ' · ' + by.Outros.n + ' em outras áreas' : ''}</div>`;
    b += `<div class="grp">Últimas aulas feitas</div>` + done.slice(0, 8).map(x => `<div class="road dn"><div class="rt"><a class="t" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a></div><span class="mut">${dd(x.date)} · ${esc([x.tipo, x.cat].filter(Boolean).join(' · '))}${x.xp ? ' · ' + x.xp + ' XP' : ''}</span></div>`).join('');
  } else b += `<div class="mut">${h.err ? 'Não consegui ler agora (' + esc(h.err) + ').' : h.at ? 'Nada concluído nos últimos 45 dias no Roadmap.' : 'Carregando…'}</div>`;
  if (en.length) b += `<div class="grp">Inglês por semana</div>` + en.slice(0, 4).map(x => `<div class="road"><div class="rt"><a class="t" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title || 'Semana ' + dd(x.date))}</a></div><span class="mut">${x.min ? x.min + ' min' : 'sem minutos'}${x.frentes.length ? ' · ' + esc(x.frentes.join(', ')) : ''}${x.aula ? ' · aula 1:1' : ''}${x.nivel ? ' · ' + esc(x.nivel) : ''}${x.sens ? ' · ' + esc(x.sens) : ''}</span></div>`).join('');
  else if (h.enErr) b += `<div class="mut">Log de inglês: o Notion não deixou ler (${esc(h.enErr)}). No Notion, abra essa tabela, ••• Conexões, e adicione "Meu Dia".</div>`;
  b += `<div class="row"><button class="btn sm ghost" data-a="histrefresh">${ic('reload')}Atualizar</button></div><div class="mut">Só leitura: o que você registra no Notion (ou pede ao Claude para registrar) aparece aqui.</div>`;
  return acc('hist', 'Aulas feitas', done.length ? `${done.filter(x => x.date >= wk).length} nesta semana` : '', b, false);
}
Object.assign(A, { histrefresh: () => { histFetch(true); return false; } });
async function roadSet(id, status) {
  const sy = S.settings.sync, rd = roadLoad(), it = (rd.items || []).find(x => x.id === id); if (!it || ui.roadBusy) return;
  ui.roadBusy = true;
  try {
    const base = (sy.url || '/.netlify/functions/sync').replace(/sync$/, 'roadmap');
    const r = await fetch(base, { method: 'POST', headers: { 'content-type': 'application/json', 'x-app-key': sy.key }, body: JSON.stringify({ id, status }) });
    if (!r.ok) throw new Error(r.status);
    S.road = S.road || { done: {} };
    if (status === 'Concluído') { it.prev = it.status; it.status = 'Concluído'; S.road.done[id] = dkey(); if (!(S.studyLog[dkey()] && S.studyLog[dkey()].done)) S.studyLog[dkey()] = { done: true }; toast('Concluído no Notion. +3 moedas.'); }
    else { it.status = it.prev && it.prev !== 'Concluído' ? it.prev : 'Não iniciado'; delete S.road.done[id]; toast('Voltou para aberto no Notion.'); }
    try { localStorage.setItem(ROAD_KEY, JSON.stringify(rd)); } catch (e) { } save();
  } catch (e) { toast('Não consegui falar com o Notion (' + (e.message || e) + ').'); }
  ui.roadBusy = false; render();
}
Object.assign(A, { roadrefresh: () => { roadFetch(true); return false; }, roaddone: v => { const it = (roadLoad().items || []).find(x => x.id === v); if (it) roadSet(v, it.status === 'Concluído' ? (it.prev && it.prev !== 'Concluído' ? it.prev : 'Não iniciado') : 'Concluído'); return false; } });

/* ---- Central de avisos (sino no topo): Guardei / Paguei / Depois ---- */
const snzd = id => ((S.snz || {})[id]) === dkey();
function notifs() {
  const k = dkey(), mo = k.slice(0, 7), out = [], add = (id, icon, text, acts) => { if (!snzd(id)) out.push({ id, icon, text, acts }); };
  S.goals.filter(g => goalDue(g, k)).forEach(g => add(`g:${g.id}:${mo}`, 'flag', `Dia do pagamento: guardar ${brl(goalM(g, mo))} para ${g.title}.`, [['Guardei', 'goalpaid', g.id, '']]));
  const paid = S.billPaid[mo] || {}, rel = d => { const diff = Math.round((new Date(d + 'T12:00') - new Date(k + 'T12:00')) / 864e5); return diff < 0 ? 'venceu dia ' + d.slice(8) : diff <= 3 ? 'vence ' + (diff === 0 ? 'hoje' : diff === 1 ? 'amanhã' : 'em ' + diff + ' dias') : ''; };
  S.bills.forEach(b => { if (paid[b.id]) return; const r = rel(billDue(b, mo)); if (r) add(`b:${b.id}:${mo}`, 'wallet', `${b.title} ${r} (${brl(num(b.amount))}).`, [['Paguei', 'paybill', b.id, mo]]); });
  Object.values(pdays()).forEach(p => { const it = (planCache(mo) || {}).despesas, row = it && it.find(x => pkey(x.desc) === pkey(p.t)); if (row && (row.pago || !row.valor)) return; const r = rel(billDue({ day: p.day }, mo)); if (r) add(`p:${pkey(p.t)}:${mo}`, 'wallet', `${p.t} ${r}.`, [['Abrir Dinheiro', 'loja_pork', '', '']]); });
  dinNotifs(add, k, mo);
  const last = S.tx.map(x => x.date).sort().pop();
  if (S.tx.length && last && (new Date(k + 'T12:00') - new Date(last + 'T12:00')) / 864e5 >= 3) add(`t:${k}`, 'wallet', 'Faz uns dias sem lançar gastos no Porkinho.', [['Lançar', 'addtx', '', '']]);
  if (S.settings.icsHash !== icsSig()) add(`i:${k}`, 'clock', S.settings.icsHash ? 'Seus lembretes mudaram. Atualize no Calendário.' : 'Ative os avisos no iPhone (missões, contas, cachorros).', [[S.settings.icsHash ? 'Atualizar' : 'Ativar', 'ics', '', '']]);
  const lb = S.settings.lastBackup, cl = S.settings.cloudLast ? S.settings.cloudLast.slice(0, 10) : null; if ((!lb || (new Date(k) - new Date(lb)) / 864e5 > 14) && (!cl || (new Date(k) - new Date(cl)) / 864e5 > 3)) add(`k:${k}`, 'save', 'Faz um tempo sem backup. Ajustes (ícone no topo), Fazer backup na nuvem agora.', []);
  return out;
}
function notifHtml() {
  const l = notifs(), k = dkey(), pd = payDay(k.slice(0, 7)), dd = pd.split('-').reverse().slice(0, 2).join('/');
  return `<div class="sheet"><h3 class="px">${ic('bell')}<span>Avisos</span></h3><div class="mut">Pagamento (5º dia útil) deste mês: ${dd}${k === pd ? ' · hoje' : ''}.</div>` +
    (l.length ? l.map(n => `<div class="road"><div class="rt"><span class="t">${ic(n.icon)} ${esc(n.text)}</span></div><div class="row">${n.acts.map(a => `<button class="btn sm" data-a="${a[1]}" data-v="${esc(a[2])}" data-w="${esc(a[3])}">${esc(a[0])}</button>`).join('')}<button class="btn sm link" data-a="snz" data-v="${esc(n.id)}">Deixar para depois</button></div></div>`).join('') : `<div class="mut">Tudo em dia. Nada pendente agora.</div>`) +
    `<div class="row act"><button type="button" class="btn ghost" data-x>Fechar</button></div></div>`;
}
function notifOpen() {
  let m = document.querySelector('.modal.notif');
  if (!m) {
    m = document.createElement('div'); m.className = 'modal notif'; m.setAttribute('role', 'dialog'); document.body.appendChild(m);
    m.addEventListener('click', e => {
      e.stopPropagation();
      if (e.target === m || e.target.closest('[data-x]')) { m.remove(); return; }
      const el = e.target.closest('[data-a]'); if (!el) return; const f = A[el.dataset.a]; if (!f) return;
      if (['ics', 'addtx', 'loja_pork'].includes(el.dataset.a)) m.remove();
      f(el.dataset.v, el.dataset.w, el); save(); render();
      if (document.body.contains(m)) m.innerHTML = notifHtml();
    });
  }
  m.innerHTML = notifHtml();
}
Object.assign(A, { notif: () => { notifOpen(); return false; }, snz: v => { S.snz = S.snz || {}; Object.keys(S.snz).forEach(x => { if (S.snz[x] !== dkey()) delete S.snz[x]; }); S.snz[v] = dkey(); toast('Aviso volta amanhã.'); } });

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || e.target.closest('.modal')) return;
  const f = A[el.dataset.a]; if (!f) return;
  const r = f(el.dataset.v, el.dataset.w, el);
  if (r !== false && !(r instanceof Promise)) render();
});
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role=button][data-a]')) { e.preventDefault(); e.target.click(); } });
document.addEventListener('change', e => { const el = e.target.closest('[data-c]'); if (el && C[el.dataset.c]) C[el.dataset.c](el.value, el.dataset.v, el); });
document.addEventListener('toggle', e => { const d = e.target; if (d.tagName === 'DETAILS' && d.dataset.w) ui.open[d.dataset.w] = d.open; }, true);

dinInit(); euInit(); dietInit(); load(); applyTheme(); save(); render();
if (notifs().some(n => n.id.startsWith('g:')) && S.settings.notifSeen !== dkey()) { S.settings.notifSeen = dkey(); save(); notifOpen(); }
setInterval(() => {
  const s = S.session, t = $('#restTxt'), el = $('#elap');
  if (s && el) { const m = Math.floor((Date.now() - s.start) / 1000); el.textContent = `${Math.floor(m / 60)}:${pad(m % 60)}`; }
  if (s && t) {
    const left = Math.ceil(((s.restEnd || 0) - Date.now()) / 1000), box = $('#rest');
    if (left > 0) t.textContent = `${Math.floor(left / 60)}:${pad(left % 60)}`;
    else if (s.restEnd) { s.restEnd = null; save(); if (box) box.hidden = true; if (navigator.vibrate) navigator.vibrate(200); }
  }
  const tts = document.querySelectorAll('#tmTxt,.tmq');
  if (ui.tm) { const left = Math.ceil((ui.tm.end - Date.now()) / 1000); if (left > 0) { tts.forEach(tt => { tt.textContent = `${pad(Math.floor(left / 60))}:${pad(left % 60)}`; }); } else tickTimer(); }
}, 1000);
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
document.addEventListener('visibilitychange', () => { if (!document.hidden) planFlush(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && S.settings.sync.on && S.settings.sync.key) doSync(true); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && !document.querySelector('.modal') && !document.activeElement.matches('input,textarea,select')) render(); });

/* ---- Planilha financeira (Google Sheets, via função do Netlify) ---- */
const planUrl = () => ((S.settings.sync.url || '/.netlify/functions/sync').replace(/sync$/, 'planilha'));
function planCache(mo) { try { const c = JSON.parse(localStorage.getItem(PLAN_KEY) || 'null'); return c && c.mo === mo ? c : null; } catch (e) { return null; } }
async function planLoad(mo, quiet) {
  const sy = S.settings.sync; if (!sy.key || ui.planBusy) return;
  ui.planBusy = true; if (!quiet) render();
  try {
    await planFlush();
    const r = await fetch(`${planUrl()}?month=${mo}`, { headers: { 'x-app-key': sy.key } });
    if (!r.ok) throw new Error((await r.text()).slice(0, 160));
    ui.plan = Object.assign(await r.json(), { mo, at: Date.now(), err: '' });
    if (ui.plan.created) toast(`Criei a aba ${ui.plan.tab} a partir de ${ui.plan.from}. Revise os valores.`);
    try { localStorage.setItem(PLAN_KEY, JSON.stringify(ui.plan)); } catch (e) { }
  } catch (e) { ui.plan = Object.assign(planCache(mo) || { mo }, { err: String(e.message || e), at: Date.now() }); }
  ui.planBusy = false; if (!document.querySelector('.modal') && !document.activeElement.matches('input,textarea,select')) render();
}
async function planSend(b) {
  const sy = S.settings.sync;
  const r = await fetch(planUrl(), { method: 'POST', headers: { 'content-type': 'application/json', 'x-app-key': sy.key }, body: JSON.stringify(b) });
  if (!r.ok) throw new Error((await r.text()).slice(0, 160));
}
async function planFlush() {
  const q = S.sheetQ || []; if (!q.length || !S.settings.sync.key) return;
  const rest = [];
  for (const b of q) { try { await planSend(b); } catch (e) { if (/mudou|Sem linha|inválid/i.test(String(e.message))) { toast('Planilha: ' + e.message); } else rest.push(b); } }
  S.sheetQ = rest; save();
}
async function planQueue(b) {
  S.sheetQ = (S.sheetQ || []).concat([b]); save();
  try { await planFlush(); toast(S.sheetQ.length ? 'Sem conexão. Envio na próxima vez que abrir.' : 'Gasto enviado para a planilha.'); if (!S.sheetQ.length) planLoad(b.month, true); } catch (e) { }
}
async function planPost(b) {
  try { await planSend(b); toast('Planilha atualizada.'); return true; } catch (e) { toast('Planilha: ' + (e.message || e)); return false; }
}
function planCard(mo) {
  const sy = S.settings.sync; if (!(ui.plan && ui.plan.mo === mo)) { const c = planCache(mo); if (c) ui.plan = c; } const p = ui.plan && ui.plan.mo === mo ? ui.plan : null;
  if (sy.key && !ui.planBusy && (!p || Date.now() - (p.at || 0) > 300000)) setTimeout(() => planLoad(mo, true), 0);
  const head = sec('calendar', 'Planilha do mês', `<button class="btn sm ghost" data-a="planload" data-v="${mo}" ${ui.planBusy ? 'disabled' : ''}>${ic('reload')}${ui.planBusy ? 'Atualizando' : 'Atualizar'}</button>`);
  if (!sy.key) return `<div class="card">${head}<div class="mut">Ligue o Notion nos ajustes (ícone no topo) para criar a chave do app. A planilha usa a mesma.</div></div>`;
  let b = '';
  if (!p) b = `<div class="mut">${ui.planBusy ? 'Carregando…' : 'Buscando na planilha…'}</div>`;
  else if (p.err) b = `<div class="banner warn"><span>${esc(p.err)}</span></div>`;
  else {
    const L2 = p.despesas.filter(x => !x.livre || x.valor > 0), pg = L2.filter(x => x.pago).reduce((a, x) => a + x.valor, 0), tt = L2.reduce((a, x) => a + x.valor, 0);
    b = `<div class="mut">${esc(p.tab)}${(S.sheetQ || []).length ? ' · ' + S.sheetQ.length + ' envio(s) pendente(s)' : ''} · pago ${brl(pg)} de ${brl(tt)}${typeof p.sobra === 'number' ? ' · sobra prevista ' + brl(p.sobra) : ''}</div><div class="bar"><i style="width:${tt ? Math.min(100, pg / tt * 100) : 0}%"></i></div>`;
    let g = '';
    b += L2.map(x => { const h = x.grupo !== g ? `<div class="grp">${esc(x.grupo)}</div>` : ''; g = x.grupo; return `${h}<div class="item"><div class="t">${esc(x.desc)}<div class="mut">${brl(x.valor)}${x.pago ? ' · pago' : ''}</div></div><div class="row"><button class="btn sm ghost" data-a="plandia" data-v="${esc(x.desc)}" aria-label="Dia do vencimento de ${esc(x.desc)}">${pdays()[pkey(x.desc)] ? 'Dia ' + pdays()[pkey(x.desc)].day : '+ dia'}</button>${x.pago ? doneBtn('Pago', 'Desfazer', `data-a="planpago" data-v="${x.row}" data-w="${esc(x.desc)}"`) : `<button class="btn sm" data-a="planpago" data-v="${x.row}" data-w="${esc(x.desc)}">${ic('check')}Paguei</button>`}</div></div>`; }).join('');
  }
  return `<div class="card">${head}${b}${typeof dinMonth === 'function' && dinPlanOk() ? `<button class="btn full" data-a="planenviar" data-v="${mo}">${ic('upload')}Atualizar a planilha com o plano do app</button>` : ''}<label class="row"><input type="checkbox" data-c="sheettog" ${S.settings.sheetOn !== false ? 'checked' : ''}><span>Sugerir envio de novos gastos para a planilha</span></label></div>`;
}
Object.assign(A, {
  plandia: v => { const k = pkey(v), c = pdays()[k]; form('Dia do vencimento', [{ k: 'day', label: `${v}: dia do mês (1 a 28). Deixe vazio para tirar o aviso.`, type: 'number', value: c ? c.day : '' }], r => { const d = Math.round(num(r.day)); if (d >= 1 && d <= 28) pdays()[k] = { t: v, day: d }; else delete pdays()[k]; }); return false; },
  planload: v => { planLoad(v); return false; },
  planpago: async (v, d) => { const p = ui.plan, it = p && p.despesas.find(x => x.row === +v); if (!it) return false; const np = !it.pago; it.pago = np; render(); const ok = await planPost({ action: 'pago', month: ui.mo, row: +v, desc: d, paid: np }); if (!ok) it.pago = !np; planLoad(ui.mo, true); return false; }
});
Object.assign(C, { sheettog: (v, i, el) => { S.settings.sheetOn = el.checked; save(); } });
setTimeout(planFlush, 1500);

/* ---------- planilha: mês a mês e ano a ano ---------- */
const ANO_KEY = 'meudia_ano', ANO_MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
function anoCache(y) { try { const c = JSON.parse(localStorage.getItem(ANO_KEY) || 'null'); return c && c.year === y ? c : null; } catch (e) { return null; } }
async function anoLoad(y, quiet) {
  const sy = S.settings.sync; if (!sy.key || ui.anoBusy) return;
  ui.anoBusy = true; if (!quiet) render();
  try {
    const r = await fetch(`${planUrl()}?action=ano&year=${y}`, { headers: { 'x-app-key': sy.key } });
    if (!r.ok) throw new Error((await r.text()).slice(0, 160));
    ui.ano = Object.assign(await r.json(), { year: y, at: Date.now(), err: '' });
    try { localStorage.setItem(ANO_KEY, JSON.stringify(ui.ano)); } catch (e) { }
  } catch (e) { ui.ano = Object.assign(anoCache(y) || { year: y, meses: [] }, { err: String(e.message || e), at: Date.now() }); }
  ui.anoBusy = false; if (!document.querySelector('.modal') && !document.activeElement.matches('input,textarea,select')) render();
}
function anoCard() {
  const sy = S.settings.sync, y = ui.year || +ui.mo.slice(0, 4);
  if (!(ui.ano && ui.ano.year === y)) { const c = anoCache(y); if (c) ui.ano = c; }
  const a = ui.ano && ui.ano.year === y ? ui.ano : null;
  if (sy.key && !ui.anoBusy && (!a || Date.now() - (a.at || 0) > 300000)) setTimeout(() => anoLoad(y, true), 0);
  const head = `<div class="row sp"><button class="chip" data-a="anoy" data-v="-1" aria-label="Ano anterior">‹</button><b class="cap1">${y}</b><button class="chip" data-a="anoy" data-v="1" aria-label="Próximo ano">›</button></div>`;
  let b = '';
  if (!sy.key) b = '<div class="mut">Coloque a chave do app (⚙️, card do Notion) para puxar os meses da planilha.</div>';
  else if (!a) b = `<div class="mut">${ui.anoBusy ? 'Carregando…' : 'Buscando na planilha…'}</div>`;
  else {
    if (a.err) b += `<div class="banner warn"><span>${esc(a.err)}</span></div>`;
    const ms = a.meses || [];
    if (!ms.length) b += `<div class="mut">Ainda não há abas de ${y} na planilha.</div>`;
    else {
      const T = ms.reduce((o, m) => ({ e: o.e + m.entradas, d: o.d + m.despesas, s: o.s + m.sobra }), { e: 0, d: 0, s: 0 }), mx = Math.max(1, ...ms.map(m => Math.abs(m.sobra)));
      b += `<div class="grid3 sm"><div><b class="ok">${brl(T.e)}</b><small>entradas no ano</small></div><div><b class="warnc">${brl(T.d)}</b><small>saídas no ano</small></div><div><b>${brl(T.s)}</b><small>sobra no ano</small></div></div>`;
      b += `<table class="g"><tr><th>Mês</th><th>Entrou</th><th>Saiu</th><th>Sobra</th></tr>${ms.map(m => `<tr data-a="anomes" data-v="${m.mes}" role="button" tabindex="0" style="cursor:pointer${m.mes === ui.mo ? ';font-weight:700' : ''}"><td>${ANO_MES[+m.mes.slice(5, 7) - 1]}${m.mes === ui.mo ? ' ✓' : ''}</td><td>${brl(m.entradas)}</td><td>${brl(m.despesas)}</td><td style="color:${m.sobra < 0 ? 'var(--warn)' : 'inherit'}">${brl(m.sobra)}</td></tr>`).join('')}</table><div class="mut">Toque num mês para abrir os detalhes dele (planilha do mês, acima). Os números vêm da planilha.</div>`;
    }
  }
  return `<div class="card">${sec('calendar', 'Ano a ano (planilha)', `<button class="btn sm ghost" data-a="anoload" ${ui.anoBusy ? 'disabled' : ''}>${ic('reload')}${ui.anoBusy ? 'Atualizando' : 'Atualizar'}</button>`)}${head}${b}</div>`;
}
Object.assign(A, { anoy: v => { ui.year = (ui.year || +ui.mo.slice(0, 4)) + Number(v); return true; }, anomes: v => { ui.mo = v; return true; }, anoload: () => { anoLoad(ui.year || +ui.mo.slice(0, 4)); return false; } });



/* ---------- plano do app -> planilha (valores e parcelas de cada mês) ---------- */
const dinPlanOk = () => { try { const P = dinEff(); return !!(P && P.renda && !P.exemplo); } catch (e) { return false; } };
function planoLinhas(mo) {
  const m = dinMonth(mo), L = [], cl = n => String(n).replace(/\s*\(exemplo\)/i, '');
  m.fixos.forEach(f => L.push({ nome: cl(f.nome), valor: f.valor }));
  const as = m.assin.reduce((a, x) => a + x.valor, 0); if (as > 0) L.push({ nome: 'Assinaturas', valor: as, hint: 'ADOBE|ASSINAT|FIGMA|CLAUDE|CRUNCHY' });
  m.parc.forEach(x => L.push({ nome: cl(x.nome), valor: x.valor, sub: `${cl(x.nome)} (parcela ${x.i}/${x.n})` }));
  m.pont.forEach(x => { if (x.valor > 0) L.push({ nome: cl(x.nome), valor: x.valor }); });
  const VN = { mercado: ['Alimentação', 'ALIMENT|MERCADO'], gasolina: ['Gasolina', 'GASOLINA|COMBUST|TRANSP'], lazer: ['Lazer', 'LAZER'] };
  m.vars.forEach(v => { const t = VN[v.nome] || [v.nome, '']; if (v.plan > 0) L.push({ nome: t[0], valor: v.plan, hint: t[1] }); });
  if (m.colch > 0) L.push({ nome: 'Reserva de emergência', valor: m.colch, hint: 'RESERVA|COLCH' });
  return { linhas: L, renda: m.renda };
}
async function planoPost(mo, apply) {
  const x = planoLinhas(mo), r = await fetch(planUrl(), { method: 'POST', headers: { 'content-type': 'application/json', 'x-app-key': S.settings.sync.key }, body: JSON.stringify({ action: 'plano', month: mo, renda: x.renda, linhas: x.linhas, apply })});
  if (!r.ok) throw new Error((await r.text()).slice(0, 200)); return r.json();
}
Object.assign(A, {
  planenviar: async mo => {
    if (!S.settings.sync.key) { toast('Ligue a sincronização primeiro.'); return false; }
    const m = document.createElement('div'); m.className = 'modal'; m.setAttribute('role', 'dialog');
    m.innerHTML = '<div class="sheet"><h3 class="px">Plano do app → planilha</h3><div class="mut">Conferindo a planilha…</div></div>'; document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m || e.target.dataset.x !== undefined) m.remove(); });
    try {
      const j = await planoPost(mo, false), up = j.atualizar, nv = j.novas, tot = up.length + nv.length + (j.renda ? 1 : 0);
      const li = (a, b) => `<div class="row sp"><span>${esc(a)}</span><span class="mut">${b}</span></div>`;
      m.querySelector('.sheet').innerHTML = `<h3 class="px">Plano do app → planilha</h3><div class="mut">${esc(j.tab)} · ${tot ? tot + ' mudança(s). Nada é apagado.' : 'A planilha já está igual ao plano.'}</div>${j.renda ? li('Salário', `${brl(j.renda.de)} → <b>${brl(j.renda.para)}</b>`) : ''}${up.length ? '<div class="grp">Valores que mudam</div>' + up.map(u => li(u.nome, `${brl(u.de)} → <b>${brl(u.para)}</b>${u.pago ? ' · já pago' : ''}`)).join('') : ''}${nv.length ? '<div class="grp">Linhas novas</div>' + nv.map(n => li(n.nome, `<b>${brl(n.para)}</b>`)).join('') : ''}${j.semLugar.length ? `<div class="banner warn"><span>Sem linha livre para: ${esc(j.semLugar.join(', '))}. Inclua na planilha.</span></div>` : ''}${j.soPlanilha.length ? `<div class="grp">Só na planilha (não mexo)</div>` + j.soPlanilha.map(u => li(u.nome, brl(u.valor))).join('') : ''}<div class="row act"><button class="btn ghost" data-x>Fechar</button>${tot ? '<button class="btn" data-ok>Enviar este mês</button><button class="btn ghost" data-ok3>Este mês + 3 próximos</button>' : ''}</div>`;
      const go = async n => {
        const out = []; m.querySelector('.sheet').innerHTML = '<h3 class="px">Enviando…</h3>';
        for (let i = 0; i < n; i++) { const mm = addMo(mo, i); try { const r = await planoPost(mm, true); out.push(`${r.tab}: ${r.atualizar.length + r.novas.length + (r.renda ? 1 : 0)} mudança(s)`); } catch (e) { out.push(`${mm}: ${String(e.message || e).slice(0, 80)}`); } }
        m.querySelector('.sheet').innerHTML = `<h3 class="px">Pronto</h3>${out.map(o => `<div class="mut">${esc(o)}</div>`).join('')}<div class="row act"><button class="btn" data-x>Fechar</button></div>`; planLoad(mo, true);
      };
      const ok = m.querySelector('[data-ok]'), ok3 = m.querySelector('[data-ok3]'); if (ok) ok.onclick = () => go(1); if (ok3) ok3.onclick = () => go(4);
    } catch (e) { m.querySelector('.sheet').innerHTML = `<h3 class="px">Não deu</h3><div class="banner warn"><span>${esc(String(e.message || e))}</span></div><div class="row act"><button class="btn" data-x>Fechar</button></div>`; }
    return false;
  }
});
