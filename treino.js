'use strict';
/* =====================================================================
   Treino de musculação + cardio progressivo (segunda a sexta)
   Separado em: DADOS (programa e semanas) · REGRAS (semana, séries, progressão)
   · ESTADO (S.tr, salvo no localStorage junto com o resto do app) · TELAS · AÇÕES.
   Para mudar exercícios: edite TR_DAYS abaixo. Para mudar o cardio: TR_WEEKS
   (ou, sem mexer no código, em Corpo → Treino → Ajustes do treino).
   Nenhum dado pessoal fica aqui: peso, medidas e cargas ficam só no aparelho.
   ===================================================================== */

/* ---------- DADOS ---------- */
/** @typedef {{id:string,name:string,muscleGroup:string,repMin:number,repMax:number,defaultSets:[number,number],restSeconds:number,category:'composto'|'isolador',order:number,inc:number}} Exercise */
/** @typedef {{weight:number|'',reps:number|'',rir:number,completed:boolean}} ExerciseSet */
/** @typedef {{day:number,key:string,name:string,exercises:Exercise[]}} WorkoutDay */

// atalho: ex(id, nome, grupo, repMin, repMax, [séries mín, máx], descanso s, categoria, salto de carga kg)
const ex = (id, name, muscleGroup, repMin, repMax, defaultSets, restSeconds, category, inc) => ({ id, name, muscleGroup, repMin, repMax, defaultSets, restSeconds, category, inc });
const TR_DAYS = [
  { day: 1, key: 'upper', name: 'Upper', sub: 'Parte de cima', exercises: [
    ex('supino-reto', 'Supino reto (máquina ou barra)', 'Peitoral', 6, 10, [2, 3], 150, 'composto', 2.5),
    ex('remada-apoiada', 'Remada apoiada', 'Costas', 6, 10, [2, 3], 150, 'composto', 2.5),
    ex('supino-incl-halter', 'Supino inclinado com halteres', 'Peitoral', 8, 12, [2, 2], 120, 'composto', 2),
    ex('puxada-alta', 'Puxada alta', 'Costas', 8, 12, [2, 2], 120, 'composto', 2.5),
    ex('elev-lateral', 'Elevação lateral', 'Ombros', 12, 20, [2, 3], 75, 'isolador', 1),
    ex('triceps-corda', 'Tríceps corda', 'Tríceps', 10, 15, [2, 2], 75, 'isolador', 2.5),
    ex('rosca-direta', 'Rosca direta', 'Bíceps', 10, 15, [2, 2], 75, 'isolador', 1)] },
  { day: 2, key: 'lower', name: 'Lower', sub: 'Pernas e abdômen', exercises: [
    ex('leg-press', 'Leg press', 'Quadríceps', 8, 12, [2, 3], 150, 'composto', 5),
    ex('stiff', 'Stiff / levantamento romeno', 'Posterior de coxa', 6, 10, [2, 3], 150, 'composto', 2.5),
    ex('mesa-flexora', 'Mesa flexora', 'Posterior de coxa', 10, 15, [2, 2], 90, 'isolador', 2.5),
    ex('extensora', 'Cadeira extensora', 'Quadríceps', 10, 15, [2, 2], 90, 'isolador', 2.5),
    ex('panturrilha', 'Panturrilha', 'Panturrilha', 10, 15, [2, 3], 75, 'isolador', 5),
    ex('abdomen', 'Abdômen', 'Abdômen', 10, 20, [2, 2], 60, 'isolador', 0)] },
  { day: 3, key: 'push', name: 'Push', sub: 'Peito, ombro e tríceps', exercises: [
    ex('supino-incl', 'Supino inclinado', 'Peitoral', 6, 10, [2, 3], 150, 'composto', 2.5),
    ex('chest-press', 'Chest press', 'Peitoral', 8, 12, [2, 2], 120, 'composto', 2.5),
    ex('desenvolvimento', 'Desenvolvimento de ombros', 'Ombros', 8, 12, [2, 2], 120, 'composto', 2),
    ex('elev-lateral', 'Elevação lateral', 'Ombros', 12, 20, [2, 3], 75, 'isolador', 1),
    ex('triceps-frances', 'Tríceps francês ou no cabo', 'Tríceps', 10, 15, [2, 2], 75, 'isolador', 2.5),
    ex('triceps-corda', 'Tríceps corda', 'Tríceps', 10, 15, [2, 2], 75, 'isolador', 2.5)] },
  { day: 4, key: 'pull', name: 'Pull', sub: 'Costas e bíceps', exercises: [
    ex('puxada-alta', 'Puxada alta', 'Costas', 8, 12, [2, 3], 120, 'composto', 2.5),
    ex('remada-apoiada', 'Remada apoiada', 'Costas', 8, 12, [2, 3], 120, 'composto', 2.5),
    ex('pullover', 'Pullover / pulldown no cabo', 'Costas', 10, 15, [2, 2], 75, 'isolador', 2.5),
    ex('crucifixo-inverso', 'Crucifixo inverso', 'Ombro posterior', 12, 20, [2, 3], 75, 'isolador', 1),
    ex('rosca-direta', 'Rosca direta', 'Bíceps', 8, 12, [2, 2], 75, 'isolador', 1),
    ex('rosca-martelo', 'Rosca martelo', 'Bíceps', 10, 15, [2, 2], 75, 'isolador', 1)] },
  { day: 5, key: 'legs', name: 'Legs', sub: 'Pernas e abdômen', exercises: [
    ex('leg-press', 'Leg press ou hack squat', 'Quadríceps', 8, 12, [2, 3], 150, 'composto', 5),
    ex('stiff', 'Stiff / levantamento romeno', 'Posterior de coxa', 8, 10, [2, 2], 150, 'composto', 2.5),
    ex('mesa-flexora', 'Mesa flexora', 'Posterior de coxa', 10, 15, [2, 3], 90, 'isolador', 2.5),
    ex('extensora', 'Cadeira extensora', 'Quadríceps', 10, 15, [2, 2], 90, 'isolador', 2.5),
    ex('panturrilha', 'Panturrilha', 'Panturrilha', 10, 15, [2, 3], 75, 'isolador', 5),
    ex('abdomen', 'Abdômen', 'Abdômen', 10, 20, [2, 2], 60, 'isolador', 0)] }
];
TR_DAYS.forEach(d => d.exercises.forEach((e, i) => { e.order = i + 1; }));

/** Semanas de adaptação. sets: 'min' = menor número de séries; 'main' = os 2 primeiros compostos no máximo; 'max' = programa padrão.
 *  cardio: [mínimo, até] em minutos. rirN: valor que já vem marcado no campo RIR. */
const TR_WEEKS = [
  { n: 1, sets: 'min', rir: '3–4', rirN: 3, cardio: [10, 10], foco: 'Readaptação. Cargas leves e técnica perfeita. Não chegue à falha.' },
  { n: 2, sets: 'min', rir: '3', rirN: 3, cardio: [10, 12], foco: 'Cargas ainda conservadoras. Melhore a execução.' },
  { n: 3, sets: 'main', rir: '2–3', rirN: 2, cardio: [12, 15], foco: 'Começa a progressão. Os exercícios principais ganham a 3ª série.' },
  { n: 4, sets: 'max', rir: '2', rirN: 2, cardio: [15, 15], foco: 'Volume perto do programa padrão.' },
  { n: 5, sets: 'max', rir: '2', rirN: 2, cardio: [15, 18], foco: 'Progressão normal de carga e repetições.' },
  { n: 6, sets: 'max', rir: '1–2', rirN: 2, cardio: [20, 20], foco: 'Programa padrão estabelecido.' }
];
const TR_STD = { n: 7, sets: 'max', rir: '1–2', rirN: 2, cardio: [20, 20], foco: 'Programa padrão. Se estiver bem, o cardio pode subir aos poucos até 30 min (em Ajustes do treino).' };
const TR_CARDIO = ['Caminhada na esteira', 'Bicicleta', 'Elíptico', 'Caminhada na rua'];
const TR_FEEL = ['Muito leve', 'Leve', 'Bom', 'Pesado', 'Muito pesado'];
const TR_CK = [['e', 'Energia'], ['s', 'Sono'], ['d', 'Dor muscular'], ['m', 'Motivação']];

/* ---------- ESTADO ---------- */
function TR() {
  if (!S.tr) S.tr = { start: '', hist: [], cardio: [], measures: [], cur: null, pre: null, cfg: { autoRest: true, cardioType: TR_CARDIO[0], cardioMin: '' } };
  const t = S.tr; t.hist = t.hist || []; t.cardio = t.cardio || []; t.measures = t.measures || []; t.cfg = Object.assign({ autoRest: true, cardioType: TR_CARDIO[0], cardioMin: '' }, t.cfg || {});
  if (!S.flags.treino5) { /* treino passa a ser de segunda a sexta (nada é apagado) */
    S.flags.treino5 = 1;
    (S.habits || []).forEach(h => { if (/^Treino/i.test(h.title)) h.days = [1, 2, 3, 4, 5]; });
    [4, 5].forEach(d => (S.schedule[d] || []).forEach(b => { if (b.s === '17:00' && /^Fim do expediente/i.test(b.t)) { b.t = S.settings.college ? 'Treino curto (parar o trabalho, me arrumar e treinar)' : 'Treino (parar o trabalho, me arrumar e treinar)'; b.type = 'flex'; } }));
  }
  return t;
}

/* ---------- REGRAS ---------- */
const trDays = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 864e5);
function trWeekNo(k = dkey()) { const t = TR(); if (!t.start) return 1; return Math.max(1, Math.floor(trDays(t.start, k) / 7) + 1); }
function trWeek(k) { const n = trWeekNo(k); return n <= 6 ? TR_WEEKS[n - 1] : TR_STD; }
function trSetsFor(e, w) { const [mn, mx] = e.defaultSets; return w.sets === 'min' ? mn : w.sets === 'main' ? (e.order <= 2 && e.category === 'composto' ? mx : mn) : mx; }
function trCardioMin(w) { const c = num(TR().cfg.cardioMin); return c > 0 ? [c, c] : w.cardio; }
const trDay = d => TR_DAYS.find(x => x.day === d);
const trDone = k => TR().hist.filter(h => h.date === k && h.completed);
const kgf = n => (n === '' || n == null) ? '—' : r1(num(n));
function trEst(day, w) { /* duração estimada: séries × (execução + descanso) + cardio + aquecimento */
  const sec = day.exercises.reduce((a, e) => a + trSetsFor(e, w) * (40 + e.restSeconds), 0), c = trCardioMin(w)[1];
  const m = sec / 60 + c + 5; return [Math.round(m * 0.85 / 5) * 5, Math.round(m * 1.15 / 5) * 5];
}
/** Último registro do exercício: prefere o mesmo dia do programa (mesma faixa de repetições). */
function trLast(id, day, beforeId) {
  const H = TR().hist.filter(h => h.completed && h.id !== beforeId).sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
  const pick = hs => { for (const h of hs) { const e = h.ex.find(x => x.id === id && x.sets.some(s => s.completed)); if (e) return { h, e }; } return null; };
  return pick(H.filter(h => h.day === day)) || pick(H);
}
const e1rm = s => num(s.weight) * (1 + num(s.reps) / 30);
function trBest(id, exceptId) { let b = null; TR().hist.filter(h => h.completed && h.id !== exceptId).forEach(h => h.ex.filter(e => e.id === id).forEach(e => e.sets.filter(s => s.completed && num(s.weight) > 0 && num(s.reps) > 0).forEach(s => { if (!b || e1rm(s) > e1rm(b)) b = s; }))); return b; }
/** Cuidado do check-in: dor muscular alta, energia ou sono muito baixos, ou dor em articulação → não sugerir aumento. */
function trCaution(ck) { return !!ck && (num(ck.d) >= 4 || (num(ck.e) && num(ck.e) <= 2) || (num(ck.s) && num(ck.s) <= 1) || ck.j === true); }
/** Double progression. Devolve {tipo, txt, kg?}. Nunca muda a carga sozinho: só recomenda. */
function trAdvice(e, cur) {
  const w = trWeek(cur.date), L = trLast(e.id, cur.day, cur.id), inc = e.inc != null ? e.inc : ((TR_DAYS.flatMap(d => d.exercises).find(x => x.id === e.id) || {}).inc || 0);
  if (!L) return { tipo: 'novo', txt: 'Primeira vez: escolha uma carga leve, em que você termina com cerca de ' + w.rir + ' repetições sobrando. Anote e pronto.' };
  const done = L.e.sets.filter(s => s.completed), kg = Math.max(...done.map(s => num(s.weight)));
  if (trCaution(cur.check)) return { tipo: 'cuidado', txt: 'Hoje pode ser melhor manter ou reduzir a intensidade. Repita a carga da última vez (ou um pouco menos).' };
  if (w.n <= 2) return { tipo: 'manter', txt: 'Semana de adaptação: mantenha a carga e capriche na técnica.' };
  const top = done.length >= L.e.plan && done.every(s => num(s.reps) >= L.e.repMax), failed = done.some(s => s.rir !== '' && s.rir != null && num(s.rir) < 1);
  if (top && !failed && kg > 0 && inc > 0) return { tipo: 'subir', kg: kg + inc, txt: `Você atingiu o topo da faixa de repetições (${done.map(s => s.reps).join(' / ')}). Considere aumentar ligeiramente a carga no treino de hoje: ${r1(kg + inc)} kg, ou o menor salto disponível.` };
  if (top && failed) return { tipo: 'manter', txt: 'Você bateu o topo, mas chegou perto da falha. Mantenha a carga mais uma vez e sobre ao menos 1 repetição.' };
  const P = trLast(e.id, cur.day, L.h.id), pk = P ? Math.max(...P.e.sets.filter(s => s.completed).map(s => num(s.weight))) : 0;
  if (P && kg > pk) return { tipo: 'manter', txt: 'Você subiu a carga da última vez. É normal as repetições caírem um pouco. Mantenha e vá subindo as repetições.' };
  return { tipo: 'manter', txt: `Mantenha ${kg ? r1(kg) + ' kg' : 'a carga'} e tente 1 repetição a mais em alguma série. Quando fizer ${L.e.repMax} em todas, a carga sobe.` };
}
function trNewSession(dayNo, check) {
  const t = TR(), k = dkey(); if (!t.start) t.start = dkey(wkStart());
  const day = trDay(dayNo), w = trWeek(k), cur = { id: uid(), date: k, day: dayNo, key: day.key, name: day.name, week: w.n, start: Date.now(), check: check || null, i: 0, restEnd: null, restTot: 0, fin: false, completed: false };
  cur.ex = day.exercises.map(e => { const plan = trSetsFor(e, w), L = trLast(e.id, dayNo, null), lastKg = L ? (L.e.sets.filter(s => s.completed).map(s => num(s.weight)).pop() || '') : ''; return { id: e.id, name: e.name, muscle: e.muscleGroup, repMin: e.repMin, repMax: e.repMax, plan, rest: e.restSeconds, cat: e.category, inc: e.inc, done: false, sets: [...Array(plan)].map(() => ({ weight: lastKg, reps: '', rir: w.rirN, completed: false })) }; });
  const cm = trCardioMin(w); cur.cardio = { type: t.cfg.cardioType, intensity: 'Leve', target: cm[0], upto: cm[1], startAt: null, min: '', done: false };
  return cur;
}
function trStats() {
  const t = TR(), H = t.hist.filter(h => h.completed), ws = dkey(wkStart()), pws = dkey(addD(wkStart(), -7));
  const inW = (h, a) => h.date >= a && h.date <= dkey(addD(new Date(a + 'T12:00'), 6));
  const vol = h => h.ex.reduce((a, e) => a + e.sets.filter(s => s.completed).reduce((b, s) => b + num(s.weight) * num(s.reps), 0), 0);
  const cmin = a => H.filter(h => inW(h, a) && h.cardio && h.cardio.done).reduce((x, h) => x + num(h.cardio.min), 0) + t.cardio.filter(c => inW(c, a)).reduce((x, c) => x + num(c.min), 0);
  const days = a => new Set(H.filter(h => inW(h, a)).map(h => h.date)).size;
  let streak = 0, full = 0; for (let i = 0; i < 104; i++) { const a = dkey(addD(wkStart(), -7 * i)), n = days(a); if (n >= 5) full++; if (i === 0 && n < 3) continue; if (n >= 3) streak++; else if (i > 0) break; }
  const wv = H.filter(h => inW(h, ws)).reduce((a, h) => a + vol(h), 0), pv = H.filter(h => inW(h, pws)).reduce((a, h) => a + vol(h), 0);
  return { week: days(ws), total: new Set(H.map(h => h.date)).size, streak, full, wv, pv, cw: cmin(ws), vol };
}
function trWeightAvg() { /* média dos últimos 7 dias × 7 dias anteriores (reduz o ruído de retenção de líquido) */
  const W = (S.weights || []).filter(x => num(x.kg) > 0), k = dkey(), a7 = dkey(addD(new Date(), -6)), b7 = dkey(addD(new Date(), -13));
  const avg = l => l.length ? l.reduce((x, y) => x + num(y.kg), 0) / l.length : null;
  const cur = W.filter(x => x.date >= a7 && x.date <= k), prev = W.filter(x => x.date >= b7 && x.date < a7);
  return { cur: avg(cur), prev: avg(prev), n: cur.length };
}

/* ---------- TELAS ---------- */
function trBadge(w) { return w.n <= 6 ? `<span class="badge trb">ADAPTAÇÃO · SEMANA ${w.n} DE 6</span>` : '<span class="badge trb">PROGRAMA PADRÃO</span>'; }
const mmss = s => `${Math.floor(s / 60)}:${pad(s % 60)}`;
function trMain() {
  const t = TR(), k = dkey(), dow = new Date().getDay(), w = trWeek(k), cur = t.cur;
  if (cur && cur.fin) return trFinish(cur);
  if (cur) return trSession(cur);
  let out = `<div class="banner">${ic('heart')}<span><b>Não preciso me destruir hoje. Preciso conseguir voltar amanhã.</b></span></div>`;
  const pick = ui.trDay || (dow >= 1 && dow <= 5 ? dow : 0), done = trDone(k);
  if (done.length && !ui.trDay) {
    const h = done[done.length - 1];
    out += `<div class="card"><div class="row sp"><h3 class="px">${ic('check')}<span>Treino de hoje concluído</span></h3>${trBadge(w)}</div><div class="mut">${esc(DF[dow])} · ${esc(h.name.toUpperCase())} · ${h.duration} min${h.cardio && h.cardio.done ? ' · cardio ' + h.cardio.min + ' min' : ''}</div><div class="mut">Agora é recuperar: comer bem, beber água e dormir.</div></div>`;
  } else if (!pick) {
    out += `<div class="card"><div class="row sp"><h3 class="px">${ic('bed')}<span>Hoje é descanso</span></h3>${trBadge(w)}</div><div class="mut">Sábado e domingo: descanso, recuperação ou uma caminhada leve, se der vontade.</div><div class="row wrap"><button class="btn sm ghost" data-a="trwalk">${ic('human-run')}Registrar caminhada</button></div><div class="mut">Faltou algum treino na semana? Escolha abaixo.</div>${trDayChips(0)}</div>`;
  } else {
    const day = trDay(pick), [a, b] = trEst(day, w), pre = t.pre || {};
    out += `<div class="card">${trBadge(w)}<div><div class="mut">TREINO DE HOJE · ${esc(DF[pick].toUpperCase())}</div><div class="big">${esc(day.name.toUpperCase())}</div><div class="mut">${esc(day.sub)}</div></div>
<div class="mut">Duração estimada: ${a}–${b} min · ${day.exercises.length} exercícios · pare com ${w.rir} repetições sobrando</div><div class="mut">${esc(w.foco)}</div>
${trDayChips(pick)}
<details data-w="trlist" ${ui.open.trlist ? 'open' : ''}><summary><span><b>Ver os exercícios</b></span><span class="mut">${ic('chevron-right', 'sm')}</span></summary>${day.exercises.map(e => `<div class="item"><div class="t"><b>${esc(e.name)}</b><div class="mut">${esc(e.muscleGroup)} · ${trSetsFor(e, w)} × ${e.repMin}–${e.repMax} · descanso ${mmss(e.restSeconds)}</div></div></div>`).join('')}<div class="mut">Cardio: ${trCardioTxt(w)}</div></details>
<h3 class="px">${ic('mood-happy')}<span>Como você está hoje?</span></h3>
${TR_CK.map(([c, l]) => `<div class="trck"><span>${l}</span><div class="trscale" role="group" aria-label="${l} de 1 a 5">${[1, 2, 3, 4, 5].map(n => `<button class="chip ${num(pre[c]) === n ? 'on' : ''}" data-a="trck" data-v="${c}" data-w="${n}" aria-pressed="${num(pre[c]) === n}">${n}</button>`).join('')}</div></div>`).join('')}
<div class="row sp"><span>Dor em alguma articulação?</span><div class="row"><button class="chip ${pre.j === false ? 'on' : ''}" data-a="trck" data-v="j" data-w="0">Não</button><button class="chip ${pre.j === true ? 'on' : ''}" data-a="trck" data-v="j" data-w="1">Sim</button></div></div>
${trCaution(pre) ? `<div class="banner warn">${ic('alert')}<span>Hoje pode ser melhor manter ou reduzir a intensidade. O app não vai sugerir aumento de carga hoje. (Não é diagnóstico médico, é só gestão do treino.)</span></div>` : ''}
<button class="btn pri full" data-a="trstart" data-v="${pick}">${ic('play')}Começar treino</button></div>`;
  }
  out += trEvolution() + trBody() + trGoals() + trSettings();
  return out;
}
function trDayChips(sel) { return `<div class="chips">${TR_DAYS.map(d => `<button class="chip ${sel === d.day ? 'on' : ''}" data-a="trpick" data-v="${d.day}">${DF[d.day].slice(0, 3)} · ${d.name}</button>`).join('')}</div>`; }
function trCardioTxt(w) { const [a, b] = trCardioMin(w); return `${a === b ? a : a + '–' + b} min de ${esc(TR().cfg.cardioType.toLowerCase())}, leve a moderado`; }
function trSession(cur) {
  const e = cur.ex[cur.i], nDone = cur.ex.filter(x => x.done).length, w = trWeek(cur.date);
  let out = `<div class="card slim trtop"><div class="row sp"><b>${esc(DF[new Date(cur.date + 'T12:00').getDay()].toUpperCase())} · ${esc(cur.name.toUpperCase())}</b><span class="mut"><span id="trElap">0:00</span></span></div>
${trBadge(w)}<div class="row sp"><span class="mut">Progresso</span><b>${nDone} / ${cur.ex.length} exercícios</b></div><div class="bar"><i style="width:${Math.round(nDone / cur.ex.length * 100)}%"></i></div>
<div class="sdots">${cur.ex.map((x, i) => `<button class="trdot ${x.done ? 'ok' : ''} ${i === cur.i && !cur.inCardio ? 'on' : ''}" data-a="trgo" data-v="${i}" aria-label="${esc(x.name)}${x.done ? ', feito' : ''}">${i + 1}</button>`).join('')}<button class="trdot ${cur.cardio.done ? 'ok' : ''} ${cur.inCardio ? 'on' : ''}" data-a="trgo" data-v="c" aria-label="Cardio">${ic('human-run', 'sm')}</button></div></div>`;
  out += `<div id="trRest" class="banner trrest" ${cur.restEnd && cur.restEnd > Date.now() ? '' : 'hidden'}>${ic('hourglass')}<span>Descanso <b id="trRestTxt"></b></span><button class="btn sm ghost" data-a="trrest" data-v="30">+30s</button><button class="btn sm ghost" data-a="trrest" data-v="0">Pular</button></div>`;
  if (cur.check && trCaution(cur.check)) out += `<div class="banner warn">${ic('alert')}<span>Hoje pode ser melhor manter ou reduzir a intensidade.</span></div>`;
  out += cur.inCardio ? trCardioCard(cur) : trExCard(cur, e, w);
  out += `<div class="row"><button class="btn ghost sm grow" data-a="trend">${ic('check')}Concluir treino</button><button class="btn danger sm" data-a="trcancel">Cancelar</button></div>`;
  out += `<div class="mut">${ic('alert', 'sm')} Dor aguda, tontura, falta de ar ou dor no peito: pare o exercício e procure orientação profissional.</div>`;
  return out;
}
function trExCard(cur, e, w) {
  const L = trLast(e.id, cur.day, cur.id), adv = trAdvice(e, cur), hist = trRecent(e.id, cur.id);
  const lastTxt = L ? `${kgf(Math.max(...L.e.sets.filter(s => s.completed).map(s => num(s.weight))))} kg · ${L.e.sets.filter(s => s.completed).map(s => s.reps).join(' / ')} reps · ${sd2(L.h.date)}` : 'Primeira vez';
  return `<div class="card"><div class="row sp"><div class="grow"><h2 class="px">${esc(e.name.toUpperCase())}</h2><div class="mut">${esc(e.muscle)} · ${e.cat}</div></div>${e.done ? `<span class="badge ok">${ic('check', 'sm')}feito</span>` : ''}</div>
<div class="grid3"><div><b>${e.plan} × ${e.repMin}–${e.repMax}</b><small>meta</small></div><div><b>RIR ${esc(w.rir)}</b><small>repetições sobrando</small></div><div><b>${mmss(e.rest)}</b><small>descanso (min)</small></div></div>
<div class="mut">Último treino: <b>${lastTxt}</b></div>
<div class="banner ${adv.tipo === 'subir' ? '' : adv.tipo === 'cuidado' ? 'warn' : ''}">${ic(adv.tipo === 'subir' ? 'trending-up' : adv.tipo === 'cuidado' ? 'alert' : 'info-box')}<span>${esc(adv.txt)}</span>${adv.tipo === 'subir' ? `<button class="btn sm ghost" data-a="trusekg" data-v="${adv.kg}">Usar ${r1(adv.kg)} kg</button>` : ''}</div>
<div class="trsets"><div class="trh"><span></span><span>Carga (kg)</span><span>Reps</span><span>RIR</span><span></span></div>${e.sets.map((s, si) => `<div class="trset ${s.completed ? 'done' : ''}"><b>S${si + 1}</b><input inputmode="decimal" aria-label="Carga da série ${si + 1} em kg" data-c="trset" data-v="${cur.i}:${si}:weight" value="${esc(s.weight === '' ? '' : r1(num(s.weight)))}" placeholder="kg"><input inputmode="numeric" aria-label="Repetições da série ${si + 1}" data-c="trset" data-v="${cur.i}:${si}:reps" value="${esc(s.reps)}" placeholder="${e.repMin}–${e.repMax}"><select aria-label="Repetições sobrando na série ${si + 1}" data-c="trset" data-v="${cur.i}:${si}:rir">${[0, 1, 2, 3, 4, 5].map(n => `<option value="${n}" ${num(s.rir) === n ? 'selected' : ''}>${n === 5 ? '5+' : n}</option>`).join('')}</select><button class="st ${s.completed ? 'done' : ''}" data-a="trsetok" data-v="${si}" aria-label="Série ${si + 1} ${s.completed ? 'feita. Toque para desfazer' : 'feita?'}">${ic('check')}</button></div>`).join('')}</div>
<div class="row"><button class="btn ghost sm" data-a="traddset">${ic('plus')}Série</button><span class="mut grow">Toque no ✓ quando terminar a série. O descanso começa sozinho.</span></div>
<button class="btn pri full" data-a="trexok">${ic('check')}CONCLUIR EXERCÍCIO</button>
${hist ? `<details data-w="trhist" ${ui.open.trhist ? 'open' : ''}><summary><span><b>Histórico recente</b></span><span class="mut">${ic('chevron-right', 'sm')}</span></summary>${hist}</details>` : ''}</div>`;
}
function trRecent(id, exceptId) {
  const rows = TR().hist.filter(h => h.completed && h.id !== exceptId).sort((a, b) => b.date.localeCompare(a.date)).map(h => ({ h, e: h.ex.find(x => x.id === id) })).filter(x => x.e && x.e.sets.some(s => s.completed)).slice(0, 4);
  return rows.map(({ h, e }) => `<div class="mut">${sd2(h.date)} · ${esc(h.name)}: ${e.sets.filter(s => s.completed).map(s => `${kgf(s.weight)}×${s.reps}`).join(', ')}</div>`).join('');
}
function trCardioCard(cur) {
  const c = cur.cardio, running = !!c.startAt;
  return `<div class="card"><div class="row sp"><h2 class="px">${ic('human-run')}<span>CARDIO DE HOJE</span></h2>${c.done ? `<span class="badge ok">${ic('check', 'sm')}feito</span>` : ''}</div>
<div class="grid3"><div><b>${c.target === c.upto ? c.target : c.target + '–' + c.upto} min</b><small>tempo</small></div><div><b>${esc(c.type.split(' ')[0])}</b><small>tipo</small></div><div><b>${esc(c.intensity)}</b><small>intensidade</small></div></div>
<label>Tipo</label><select data-c="trcardio" data-v="type">${TR_CARDIO.map(x => `<option ${x === c.type ? 'selected' : ''}>${x}</option>`).join('')}</select>
<div class="chips">${['Leve', 'Moderada'].map(x => `<button class="chip ${c.intensity === x ? 'on' : ''}" data-a="trcint" data-v="${x}">${x}</button>`).join('')}</div>
<div class="center1"><div class="big" id="trCardioTxt">${running ? '' : c.target + ':00'}</div><div class="mut">Sem correr no começo. Dá para conversar enquanto anda.</div></div>
${c.done ? '' : running ? `<button class="btn ghost full" data-a="trcstop">${ic('pause')}Parar o cronômetro</button>` : `<button class="btn pri full" data-a="trcgo">${ic('play')}Iniciar</button>`}
<label>Minutos feitos</label><input inputmode="numeric" data-c="trcardio" data-v="min" value="${esc(c.min)}" placeholder="${c.target}">
<button class="btn ${c.done ? 'ghost' : 'pri'} full" data-a="trcok">${ic('check')}${c.done ? 'Cardio registrado (desfazer)' : 'Concluir cardio'}</button></div>`;
}
function trFinish(cur) {
  const sets = cur.ex.reduce((a, e) => a + e.sets.filter(s => s.completed).length, 0), vol = trStats().vol(cur), exd = cur.ex.filter(e => e.done || e.sets.some(s => s.completed)).length;
  return `<div class="card center"><h2 class="px">${ic('trophy')}<span>TREINO CONCLUÍDO</span></h2>
<div class="grid3"><div><b>${cur.duration} min</b><small>tempo total</small></div><div><b>${exd} / ${cur.ex.length}</b><small>exercícios</small></div><div><b>${sets}</b><small>séries</small></div></div>
<div class="grid3"><div><b>${Math.round(vol).toLocaleString('pt-BR')} kg</b><small>volume aproximado</small></div><div><b>${cur.cardio.done ? cur.cardio.min + ' min' : '—'}</b><small>cardio</small></div><div><b>${(cur.records || []).length}</b><small>recordes</small></div></div>
${(cur.records || []).length ? `<div class="banner">${ic('trophy')}<span>Novo marco: ${esc(cur.records.join(', '))}.</span></div>` : ''}
<div class="mut">Calorias: o app não estima, para não inventar número.</div>
<h3 class="px">Como foi o treino?</h3><div class="chips wrapc">${TR_FEEL.map((f, i) => `<button class="chip" data-a="trfeel" data-v="${i + 1}">${f}</button>`).join('')}</div>
<button class="btn ghost sm" data-a="trfeel" data-v="0">Salvar sem responder</button></div>`;
}
function trEvolution() {
  const st = trStats(), t = TR(), H = t.hist.filter(h => h.completed), ids = {};
  H.forEach(h => h.ex.forEach(e => { if (e.sets.some(s => s.completed && num(s.reps) > 0)) (ids[e.id] = ids[e.id] || { name: e.name, l: [] }).l.push({ d: h.date + h.start, s: e.sets.filter(s => s.completed && num(s.reps) > 0).sort((a, b) => e1rm(b) - e1rm(a) || num(b.reps) - num(a.reps))[0] }); }));
  const rowsEx = Object.keys(ids).map(id => { const l = ids[id].l.sort((a, b) => String(a.d).localeCompare(String(b.d))), f = l[0].s, b = trBest(id) || f, up = e1rm(b) > e1rm(f) + 0.01; return `<div class="item"><div class="t"><b>${esc(ids[id].name)}</b><div class="mut">${kgf(f.weight)} kg × ${f.reps} → ${kgf(b.weight)} kg × ${b.reps}${up ? ' ▲' : ''}</div></div>${up ? `<span class="badge">${ic('trophy', 'sm')}recorde</span>` : ''}</div>`; }).join('');
  const dv = st.pv ? Math.round((st.wv - st.pv) / st.pv * 100) : null;
  const body = `<div class="grid3"><div><b>${st.week}/5</b><small>treinos na semana</small></div><div><b>${st.total}</b><small>treinos feitos</small></div><div><b>${st.streak}</b><small>semanas seguidas (3+)</small></div></div>
<div class="grid3"><div><b>${Math.round(st.wv).toLocaleString('pt-BR')}</b><small>volume da semana (kg)${dv !== null ? ` · ${dv > 0 ? '+' : ''}${dv}%` : ''}</small></div><div><b>${st.cw} min</b><small>cardio na semana</small></div><div><b>${st.full}</b><small>semanas completas (5/5)</small></div></div>
<div class="mut">Evolução não é só o peso na balança. Subir de 20 kg × 8 para 30 kg × 10 também é evolução.</div>
${rowsEx || '<div class="mut">Termine o primeiro treino para ver a evolução de cada exercício.</div>'}`;
  return acc('trevo', `${ic('trending-up')}<span>Evolução do treino</span>`, `${st.week}/5 na semana`, body, true);
}
function trBody() {
  const a = trWeightAvg(), t = TR(), M = [...t.measures].sort((x, y) => x.date.localeCompare(y.date)), f = M[0], l = M[M.length - 1];
  const dif = a.cur != null && a.prev != null ? a.cur - a.prev : null;
  const mk = [['cintura', 'Cintura'], ['peito', 'Peito'], ['braco', 'Braço'], ['quadril', 'Quadril'], ['coxa', 'Coxa']];
  const body = `<div class="grid3"><div><b>${a.cur != null ? r1(a.cur) : '—'}</b><small>média 7 dias (kg)</small></div><div><b>${a.prev != null ? r1(a.prev) : '—'}</b><small>semana anterior</small></div><div><b>${dif != null ? (dif > 0 ? '+' : '') + r1(dif) : '—'}</b><small>diferença</small></div></div>
<div class="mut">Pese de manhã, depois do banheiro, 3 ou mais vezes na semana. A média tira o efeito da retenção de líquido. ${a.n ? a.n + ' pesagem(ns) nos últimos 7 dias.' : ''}</div>
<button class="btn ghost sm" data-a="addweight">${ic('scale')}Registrar peso</button>
<h3 class="px">Medidas (cm)</h3>${l ? `<div class="mut">${mk.filter(([k]) => num(l[k])).map(([k, n]) => `${n}: ${r1(num(l[k]))}${f !== l && num(f[k]) ? ` (${num(l[k]) - num(f[k]) > 0 ? '+' : ''}${r1(num(l[k]) - num(f[k]))})` : ''}`).join(' · ')} · ${sd2(l.date)}</div>` : '<div class="mut">Meça a cada 2 a 4 semanas, sempre no mesmo horário.</div>'}
<button class="btn ghost sm" data-a="trmeasure">${ic('plus')}Registrar medidas</button>`;
  return acc('trbody', `${ic('scale')}<span>Peso da semana e medidas</span>`, a.cur != null ? r1(a.cur) + ' kg' : '', body, false);
}
function trGoals() {
  const k = dkey(), g = num(S.settings.dietProt), p = (S.meals && S.meals[k] || []).reduce((a, m) => a + num(m.prot), 0);
  const body = `<div class="row sp"><span>Proteína</span><b>${Math.round(p)}${g ? ' / ' + g : ''} g</b></div>${g ? `<div class="bar"><i style="width:${Math.min(100, Math.round(p / g * 100))}%"></i></div>` : ''}
<div class="mut">Meta de referência para preservar músculo enquanto emagrece. Não é prescrição: ajuste com nutricionista se puder. Registre as refeições em Dieta.</div>
<button class="btn ghost sm" data-a="trprot">${ic('edit')}Mudar meta de proteína</button>${waterCard(k)}`;
  return acc('trgoal', `${ic('bullseye')}<span>Proteína e água de hoje</span>`, g ? Math.round(p) + '/' + g + ' g' : '', body, false);
}
function trSettings() {
  const c = TR().cfg, w = trWeek();
  const body = `<div class="row sp"><span>Iniciar o descanso sozinho ao marcar a série</span><button class="chip ${c.autoRest ? 'on' : ''}" data-a="trcfg" data-v="autoRest" aria-pressed="${c.autoRest}">${c.autoRest ? 'Ligado' : 'Desligado'}</button></div>
<label>Cardio padrão</label><select data-c="trcfgsel" data-v="cardioType">${TR_CARDIO.map(x => `<option ${x === c.cardioType ? 'selected' : ''}>${x}</option>`).join('')}</select>
<label>Minutos de cardio (vazio = automático pela semana: ${w.cardio[0] === w.cardio[1] ? w.cardio[0] : w.cardio.join('–')} min)</label><input inputmode="numeric" data-c="trcfgsel" data-v="cardioMin" value="${esc(c.cardioMin)}" placeholder="automático">
<div class="mut">Programa começou em ${TR().start ? sd2(TR().start) : '— (começa no primeiro treino)'}. ${w.n <= 6 ? 'Semana ' + w.n + ' de 6 da adaptação.' : 'Adaptação concluída.'}</div>
<button class="btn ghost sm" data-a="trrestart">${ic('reload')}Recomeçar a adaptação nesta semana</button>`;
  return acc('trcfg', `${ic('sliders')}<span>Ajustes do treino</span>`, '', body, false);
}
function trTodayCard() { /* card pequeno na aba Hoje */
  const dow = new Date().getDay(); if (dow < 1 || dow > 5) return '';
  const t = TR(), w = trWeek(), d = trDay(dow), ok = trDone(dkey()).length;
  return `<div class="card slim"><div class="row sp"><div class="grow"><div class="mut">Treino de hoje · ${w.n <= 6 ? 'adaptação ' + w.n + '/6' : 'programa padrão'}</div><b>${ok ? 'Concluído ✓' : t.cur ? 'Em andamento · ' + esc(t.cur.name.toUpperCase()) : esc(d.name.toUpperCase()) + ' · ' + esc(d.sub)}</b></div><button class="btn sm ${ok ? 'ghost' : 'pri'}" data-a="trgocorpo">${ic(ok ? 'chart-bar' : 'play')}${ok ? 'Ver' : t.cur ? 'Voltar' : 'Abrir'}</button></div></div>`;
}

/* ---------- AÇÕES ---------- */
function trSetDone(cur, e, si, on) {
  const s = e.sets[si]; s.completed = on;
  if (on && TR().cfg.autoRest && e.sets.some(x => !x.completed)) { cur.restEnd = Date.now() + e.rest * 1000; cur.restTot = e.rest; }
  if (on && e.sets.every(x => x.completed)) { cur.restEnd = null; }
}
function trNext(cur) { const j = cur.ex.findIndex((x, i) => i > cur.i && !x.done), k = j >= 0 ? j : cur.ex.findIndex(x => !x.done); if (k >= 0) { cur.i = k; cur.inCardio = false; } else cur.inCardio = true; window.scrollTo(0, 0); }
function trClose(cur) {
  cur.duration = Math.max(1, Math.round((Date.now() - cur.start) / 60000)); cur.restEnd = null; if (cur.cardio.startAt) A.trcstop();
  cur.records = []; cur.ex.forEach(e => { const b = trBest(e.id, cur.id), top = e.sets.filter(s => s.completed && num(s.weight) > 0 && num(s.reps) > 0).sort((a, c) => e1rm(c) - e1rm(a))[0]; if (b && top && e1rm(top) > e1rm(b) + 0.01 && cur.records.length < 3) cur.records.push(e.name); });
  cur.fin = true;
}
function trInit() {
  Object.assign(A, {
    trgocorpo: () => { ui.tab = 'corpo'; ui.corpo = 'treino'; window.scrollTo(0, 0); },
    trpick: v => { ui.trDay = +v === new Date().getDay() ? null : +v; },
    trck: (v, w) => { const t = TR(); t.pre = t.pre || {}; t.pre[v] = v === 'j' ? w === '1' : +w; save(); },
    trstart: v => { const t = TR(); if (t.cur && !confirm('Já existe um treino em andamento. Começar outro?')) return false; t.cur = trNewSession(+v, t.pre && Object.keys(t.pre).length ? { ...t.pre } : null); t.pre = null; ui.trDay = null; save(); window.scrollTo(0, 0); },
    trgo: v => { const c = TR().cur; if (v === 'c') c.inCardio = true; else { c.i = +v; c.inCardio = false; } save(); },
    trsetok: v => { const c = TR().cur, e = c.ex[c.i], s = e.sets[+v]; if (!s.completed && !(num(s.reps) > 0)) { toast('Digite as repetições da série.'); return false; } trSetDone(c, e, +v, !s.completed); if (e.sets.every(x => x.completed)) { e.done = true; toast('Exercício completo! Toque em Concluir exercício.'); } save(); },
    traddset: () => { const c = TR().cur, e = c.ex[c.i], l = e.sets[e.sets.length - 1] || {}; if (e.sets.length >= 5) { toast('Mais séries não dão mais resultado agora. Consistência vale mais.'); return false; } e.sets.push({ weight: l.weight || '', reps: '', rir: l.rir ?? 2, completed: false }); save(); },
    trusekg: v => { const c = TR().cur, e = c.ex[c.i]; e.sets.forEach(s => { if (!s.completed) s.weight = +v; }); toast('Carga ajustada só neste treino.'); save(); },
    trexok: () => { const c = TR().cur, e = c.ex[c.i]; e.done = true; c.restEnd = null; trNext(c); save(); },
    trrest: v => { const c = TR().cur; if (+v === 0) c.restEnd = null; else c.restEnd = Math.max(Date.now(), c.restEnd || Date.now()) + (+v) * 1000; save(); },
    trcint: v => { TR().cur.cardio.intensity = v; save(); },
    trcgo: () => { TR().cur.cardio.startAt = Date.now(); save(); },
    trcstop: () => { const c = TR().cur.cardio; if (c.startAt) { const m = Math.round((Date.now() - c.startAt) / 60000); c.min = String(Math.max(num(c.min), m)); c.startAt = null; } save(); },
    trcok: () => { const c = TR().cur.cardio; if (c.done) { c.done = false; save(); return; } if (c.startAt) A.trcstop(); if (!(num(c.min) > 0)) c.min = String(c.target); c.done = true; toast('Cardio registrado!'); save(); },
    trend: () => { const c = TR().cur, any = c.ex.some(e => e.sets.some(s => s.completed)); if (!any && !c.cardio.done) { toast('Marque ao menos uma série ou o cardio antes de concluir.'); return false; } const miss = c.ex.filter(e => !e.done).length; if (miss && !confirm(`Faltam ${miss} exercício(s). Concluir assim mesmo? Está tudo bem: o que você fez conta.`)) return false; trClose(c); save(); window.scrollTo(0, 0); },
    trcancel: () => { if (!confirm('Cancelar este treino? O que foi marcado hoje não será salvo.')) return false; TR().cur = null; save(); },
    trfeel: v => {
      const t = TR(), c = t.cur; c.perceivedDifficulty = +v || null; c.completed = true; delete c.fin; delete c.inCardio; delete c.restEnd; delete c.restTot;
      t.hist.push(c); t.cur = null;
      const sets = []; c.ex.forEach(e => e.sets.forEach((s, i) => { if (s.completed) sets.push({ ex: e.name, set: i + 1, kg: num(s.weight), reps: String(s.reps), rir: s.rir }); }));
      S.workouts.push({ id: c.id, date: c.date, name: c.name.toUpperCase(), dur: String(c.duration), notes: c.ex.filter(e => e.sets.some(s => s.completed)).map(e => `${e.name}: ${e.sets.filter(s => s.completed).map(s => `${kgf(s.weight)}kg×${s.reps}`).join(', ')}`).join('\n') + (c.cardio.done ? `\nCardio: ${c.cardio.min} min (${c.cardio.type})` : ''), sets });
      ui.flash = `Treino salvo! +XP de corpo${c.cardio.done ? ' e de cardio' : ''}${(c.records || []).length ? ' · novo recorde' : ''}${S.settings.gamify ? ' · +2 moedas' : ''}`; save(); window.scrollTo(0, 0);
    },
    trwalk: () => { form('Caminhada / cardio', [{ k: 'min', label: 'Minutos', type: 'number', value: 20 }, { k: 'type', label: 'Tipo', type: 'select', value: TR_CARDIO[3], options: TR_CARDIO }], r => { if (num(r.min) > 0) TR().cardio.push({ id: uid(), date: dkey(), min: Math.round(num(r.min)), type: r.type }); }); return false; },
    trmeasure: () => { const l = [...TR().measures].sort((a, b) => b.date.localeCompare(a.date))[0] || {}; form('Medidas (cm)', [{ k: 'date', label: 'Dia', type: 'date', value: dkey() }, ...[['cintura', 'Cintura (na altura do umbigo)'], ['peito', 'Peito'], ['braco', 'Braço (contraído)'], ['quadril', 'Quadril'], ['coxa', 'Coxa']].map(([k, label]) => ({ k, label, type: 'number', ph: l[k] ? 'antes: ' + l[k] : '' }))], r => { if (['cintura', 'peito', 'braco', 'quadril', 'coxa'].some(k => num(r[k]) > 0)) TR().measures.push({ id: uid(), ...r }); }); return false; },
    trprot: () => { form('Meta de proteína', [{ k: 'p', label: 'Gramas por dia', type: 'number', value: S.settings.dietProt }], r => { if (num(r.p) > 0) S.settings.dietProt = String(Math.round(num(r.p))); }); return false; },
    trcfg: v => { const c = TR().cfg; c[v] = !c[v]; save(); },
    trrestart: () => { if (!confirm('Recomeçar a adaptação (semana 1 de 6) a partir desta semana? O histórico continua salvo.')) return false; TR().start = dkey(wkStart()); save(); }
  });
  Object.assign(C, {
    trset: (val, v) => { const c = TR().cur; if (!c) return; const [i, si, f] = v.split(':'), s = c.ex[+i] && c.ex[+i].sets[+si]; if (!s) return; s[f] = f === 'rir' ? +val : f === 'weight' ? (String(val).trim() === '' ? '' : num(val)) : (String(val).trim() === '' ? '' : Math.round(num(val))); save(); },
    trcardio: (val, v) => { const c = TR().cur; if (!c) return; c.cardio[v] = v === 'min' ? String(Math.round(num(val)) || '') : val; save(); },
    trcfgsel: (val, v) => { const c = TR().cfg; c[v] = v === 'cardioMin' ? (num(val) > 0 ? String(Math.round(num(val))) : '') : val; save(); render(); }
  });
  setInterval(() => {
    const c = S && S.tr && S.tr.cur; if (!c) return;
    const el = document.getElementById('trElap'); if (el) { const m = Math.floor((Date.now() - c.start) / 1000); el.textContent = `${Math.floor(m / 60)}:${pad(m % 60)}`; }
    const box = document.getElementById('trRest'), t = document.getElementById('trRestTxt');
    if (box && t) { const left = Math.ceil(((c.restEnd || 0) - Date.now()) / 1000); if (left > 0) { box.hidden = false; t.textContent = `${Math.floor(left / 60)}:${pad(left % 60)}`; } else if (c.restEnd) { c.restEnd = null; save(); box.hidden = true; if (navigator.vibrate) navigator.vibrate([200, 100, 200]); toast('Descanso acabou. Próxima série!'); } }
    const ct = document.getElementById('trCardioTxt'); if (ct && c.cardio && c.cardio.startAt) { const s = Math.floor((Date.now() - c.cardio.startAt) / 1000), left = c.cardio.target * 60 - s, a = Math.abs(left); ct.textContent = `${left < 0 ? '+' : ''}${Math.floor(a / 60)}:${pad(a % 60)}`; }
  }, 1000);
}
/** XP do treino para o personagem (área Corpo). Um treino por dia conta; série extra não dá XP. */
function trXp() {
  const t = S.tr; if (!t) return 0; const H = (t.hist || []).filter(h => h.completed);
  const cd = new Set(H.filter(h => h.cardio && h.cardio.done).map(h => h.date).concat((t.cardio || []).map(c => c.date))).size;
  const rec = H.reduce((a, h) => a + Math.min(3, (h.records || []).length), 0);
  const wk = {}; H.forEach(h => { const w = dkey(wkStart(new Date(h.date + 'T12:00'))); (wk[w] = wk[w] || new Set()).add(h.date); });
  return cd * 4 + rec * 5 + Object.values(wk).filter(s => s.size >= 5).length * 20;
}
