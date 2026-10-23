'use strict';
/* Evolução (painel do mês), fase do treino e área "Eu". Tudo fica só neste aparelho.
   O texto que você escreve em "Eu" NÃO vai para o Notion; só humor e energia (já eram enviados) seguem no resumo do dia. */

/* ---------- Painel do mês ---------- */
const evMo = (o = 0) => addMo(dkey().slice(0, 7), o);
function evKeys(mo) {
  const [y, m] = mo.split('-').map(Number), n = new Date(y, m, 0).getDate(), t = dkey(), out = [];
  for (let i = 1; i <= n; i++) { const k = `${mo}-${pad(i)}`; if (k <= t) out.push(k); }
  return out;
}
function evPct(keys) {
  let tot = 0, sc = 0;
  keys.forEach(k => {
    const d = new Date(k + 'T12:00');
    S.habits.forEach(h => { if (!h.days.includes(d.getDay()) || (S.hardDay[k] && !isMin(h))) return; const s = stOf(k, h.id); if (s === 'na') return; tot++; if (s === 'done') sc++; else if (s === 'partial') sc += .5; });
  });
  return tot ? Math.round(100 * sc / tot) : null;
}
function evMonth(mo) {
  const ks = evKeys(mo), a = mo + '-01', z = mo + '-31', g = num(S.settings.waterGoal);
  const wd = ks.filter(k => { const w = new Date(k + 'T12:00').getDay(); return w >= 1 && w <= 5; });
  const est = wd.filter(k => S.studyLog[k] && S.studyLog[k].done).length;
  const wts = S.weights.filter(x => x.date >= a && x.date <= z).sort((p, q) => p.date.localeCompare(q.date));
  const moods = ks.map(k => S.mood[k]).filter(x => x && x.m), ens = ks.map(k => S.mood[k]).filter(x => x && x.e);
  const treinos = S.workouts.filter(w => w.date >= a && w.date <= z).length;
  const avg = l => l.length ? l.reduce((s, x) => s + x, 0) / l.length : null;
  return {
    dias: ks.length, pct: evPct(ks), estudo: est, estudoMax: wd.length, estudoPct: wd.length ? Math.round(100 * est / wd.length) : null,
    treinos, trSem: ks.length ? Math.round(treinos / (ks.length / 7) * 10) / 10 : null,
    aguaPct: ks.length && g ? Math.round(100 * ks.filter(k => (S.water[k] || 0) >= g).length / ks.length) : null,
    pomo: ks.reduce((t, k) => t + (S.pomo[k] || 0), 0), road: Object.values((S.road && S.road.done) || {}).filter(d => d >= a && d <= z).length,
    peso: wts.length >= 2 ? num(wts[wts.length - 1].kg) - num(wts[0].kg) : null,
    humor: avg(moods.map(x => x.m)), energia: avg(ens.map(x => x.e))
  };
}
function evDelta(cur, prev, unit, inv) {
  if (cur === null || prev === null || cur === undefined || prev === undefined) return '';
  const d = Math.round((cur - prev) * 10) / 10; if (!d) return `<small class="mut">igual ao mês passado</small>`;
  const good = inv ? d < 0 : d > 0;
  return `<small class="${good ? 'ok' : 'neg'}">${d > 0 ? '▲ +' : '▼ '}${String(d).replace('.', ',')}${unit || ''} vs mês passado</small>`;
}
function vMes() {
  const mo = evMo(ui.pm || 0), pv = addMo(mo, -1), c = evMonth(mo), p = evMonth(pv), [y, m] = mo.split('-').map(Number);
  const nm = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const tile = (v, label, d) => `<div><b>${v}</b><small>${label}</small>${d || ''}</div>`;
  let out = `<div class="row sp card slim">${ib('chevron-left', 'Mês anterior', 'pmo', -1)}<b class="cap1">${nm}</b>${ib('chevron-right', 'Próximo mês', 'pmo', 1)}</div>`;
  /* leitura simples */
  const wins = [], adj = [];
  if (c.pct !== null && c.pct >= 70) wins.push(`missões em ${c.pct}%`); else if (c.pct !== null && c.pct < 50) adj.push('Poucas missões feitas. Escolha 3 que importam e deixe as outras como bônus.');
  if (c.estudoPct !== null && c.estudoPct >= 70) wins.push(`${c.estudo} dias de estudo`); else if (c.estudoPct !== null && c.estudoMax >= 5 && c.estudoPct < 50) adj.push('Estudo abaixo da metade dos dias úteis. Comece só com 10 minutos.');
  if (c.trSem !== null && c.trSem >= 2) wins.push(`${c.treinos} treinos (${String(c.trSem).replace('.', ',')} por semana)`); else if (c.trSem !== null && c.dias >= 14 && c.trSem < 1.5) adj.push('Treinos abaixo de 2 por semana. Marque os 3 horários na agenda.');
  if (c.road) wins.push(`${c.road} tarefa${c.road > 1 ? 's' : ''} do Roadmap concluída${c.road > 1 ? 's' : ''}`);
  if (c.aguaPct !== null && c.aguaPct < 50 && c.dias >= 7) adj.push('Água abaixo da meta na maior parte dos dias.');
  out += `<div class="card">${sec('trending-up', 'Leitura do mês')}<div class="grp">O que foi bem</div><div>${wins.length ? wins.map(x => '· ' + esc(x)).join('<br>') : '<span class="mut">Mês ainda começando.</span>'}</div><div class="grp">Ajuste sugerido</div><div>${esc(adj[0] || 'Mantenha o ritmo. Escolha só uma coisa para melhorar no próximo mês.')}</div></div>`;
  out += `<div class="grid3">${tile(c.pct === null ? '—' : c.pct + '%', 'missões', evDelta(c.pct, p.pct, ' pts'))}${tile(c.estudoPct === null ? '—' : c.estudoPct + '%', 'dias de estudo', evDelta(c.estudoPct, p.estudoPct, ' pts'))}${tile(c.trSem === null ? '—' : String(c.trSem).replace('.', ','), 'treinos/semana', evDelta(c.trSem, p.trSem))}</div>`;
  out += `<div class="grid3">${tile(c.aguaPct === null ? '—' : c.aguaPct + '%', 'água na meta', evDelta(c.aguaPct, p.aguaPct, ' pts'))}${tile(c.pomo, 'pomodoros', '')}${tile(c.peso === null ? '—' : (c.peso > 0 ? '+' : '') + r1(c.peso) + ' kg', 'peso no mês', '')}</div>`;
  if (c.humor !== null) out += `<div class="grid3">${tile(r1(c.humor) + '/5', 'humor médio', evDelta(c.humor, p.humor))}${tile(c.energia === null ? '—' : r1(c.energia) + '/5', 'energia média', '')}${tile(c.road, 'Roadmap feito', '')}</div>`;
  /* 6 meses */
  const six = [5, 4, 3, 2, 1, 0].map(i => { const mm = evMo(-i), v = evMonth(mm).pct; return { l: DIN_MES[+mm.slice(5, 7) - 1], p: v }; });
  out += `<div class="card"><h3 class="px">Missões em 6 meses</h3><div class="hist">${six.map(h => `<div style="height:${h.p || 0}%"><small>${h.p ? h.p + '%' : ''}</small></div>`).join('')}</div><div class="row sp mut">${six.map(h => `<span>${h.l}</span>`).join('')}</div></div>`;
  /* treinos por semana (8 semanas) */
  const wk8 = [7, 6, 5, 4, 3, 2, 1, 0].map(i => { const w = wkStart(addD(new Date(), -7 * i)), a = dkey(w), z = dkey(addD(w, 6)); return { l: short(w), n: S.workouts.filter(x => x.date >= a && x.date <= z).length }; });
  const mx = Math.max(3, ...wk8.map(x => x.n));
  out += `<div class="card"><h3 class="px">Treinos por semana</h3><div class="hist">${wk8.map(h => `<div style="height:${Math.max(4, h.n / mx * 100)}%"><small>${h.n || ''}</small></div>`).join('')}</div><div class="row sp mut">${wk8.map((h, i) => `<span>${i % 2 ? '' : h.l}</span>`).join('')}</div></div>`;
  /* dinheiro */
  const d = typeof dinS === 'function' ? dinS() : null;
  if (d && d.plan) { const sv = d.saved.filter(x => x.date.startsWith(mo)).reduce((a, x) => a + num(x.valor), 0), co = dinColch(); out += `<div class="card">${sec('coin', 'Dinheiro', `<button class="btn sm ghost" data-a="gotodin">Abrir</button>`)}<div class="mut">Guardado no colchão neste mês: ${brl(sv)} · total ${brl(co.real)}. Sobra prevista de ${dMl(dkey().slice(0, 7))}: ${brl(dinMonth(dkey().slice(0, 7)).sobra)}.</div></div>`; }
  return out;
}

/* ---------- Fase do treino ---------- */
function phaseCard() {
  const ph = S.settings.phase || 1, first = [...S.workouts].map(w => w.date).sort()[0], since = S.settings.phaseSince || first || dkey();
  const wks = Math.floor((Date.now() - new Date(since + 'T12:00')) / 6048e5), n = S.workouts.filter(w => w.date >= since).length;
  const okW = wks >= 4, okN = n >= 8, ready = ph < 3 && okW && okN;
  const bar = (v, mx, l) => `<div class="row sp"><span>${l}</span><span class="mut">${Math.min(v, mx)}/${mx}</span></div><div class="bar thin"><i style="width:${Math.min(100, v / mx * 100)}%"></i></div>`;
  return `<div class="card">${sec('trending-up', `Fase ${ph} de 3`)}<div>${PHASES[ph - 1]}</div>${ph < 3 ? `<div class="grp">Para avançar de fase</div>${bar(wks, 4, 'Semanas nesta fase')}${bar(n, 8, 'Treinos nesta fase')}${ready ? `<div class="banner">${ic('info-box')}<span>Você cumpriu os dois. Se os treinos estão confortáveis, pode avançar.</span></div>` : '<div class="mut">Quando completar os dois, o app avisa aqui.</div>'}<button class="btn sm ${ready ? '' : 'ghost'}" data-a="nextphase">Avançar de fase (+1 série em cada exercício)</button>` : '<div class="mut">Última fase. Agora é subir a carga aos poucos quando completar todas as repetições.</div>'}</div>`;
}

/* ---------- Eu ---------- */
const EU_TAGS = ['Cansado', 'Ansioso', 'Grato', 'Motivado', 'Sozinho', 'Irritado', 'Em paz', 'Sobrecarregado'];
const euS = () => (S.eu = S.eu || []);
const euMoodIc = m => m <= 2 ? 'mood-sad' : m === 3 ? 'mood-neutral' : 'mood-happy';
function vEu() {
  const k = dkey(), md = S.mood[k] || {}, tags = ui.euTags || [];
  const last14 = [...Array(14)].map((_, i) => (S.mood[dkey(addD(new Date(), -(13 - i)))] || {}).m);
  const lo7 = [...Array(7)].map((_, i) => (S.mood[dkey(addD(new Date(), -i))] || {}).m).filter(x => x && x <= 2).length;
  const avg = l => { const a = l.filter(Boolean); return a.length ? a.reduce((s, x) => s + x, 0) / a.length : null; };
  const a7 = avg(last14.slice(7)), p7 = avg(last14.slice(0, 7));
  let out = `<div class="card">${sec('mood-happy', 'Como você está agora?')}<div class="mut">Humor</div><div class="chips wrapc">${[1, 2, 3, 4, 5].map(i => `<button class="chip ${md.m === i ? 'on' : ''}" data-a="mood" data-v="m" data-w="${i}" aria-label="Humor ${i} de 5">${ic(euMoodIc(i))}${i}</button>`).join('')}</div><div class="mut">Energia</div><div class="chips wrapc">${[1, 2, 3, 4, 5].map(i => `<button class="chip ${md.e === i ? 'on' : ''}" data-a="mood" data-v="e" data-w="${i}" aria-label="Energia ${i} de 5">${ic('zap')}${i}</button>`).join('')}</div></div>`;
  out += `<div class="card">${sec('note', 'Quero desabafar')}<div class="mut">Escreva do jeito que vier. Fica só no seu iPhone.</div><div class="chips wrapc">${EU_TAGS.map(t => `<button class="chip ${tags.includes(t) ? 'on' : ''}" data-a="eutag" data-v="${t}">${t}</button>`).join('')}</div><textarea data-c="eud" placeholder="O que está passando pela cabeça?">${esc(ui.euDraft || '')}</textarea><button class="btn full" data-a="eusave">${ic('check')}Salvar</button></div>`;
  if (lo7 >= 3) out += `<div class="banner warn">${ic('info-box')}<span>Faz alguns dias que está pesado. Vale conversar com alguém de confiança ou com um profissional. Se estiver muito difícil, o CVV atende 24 horas pelo 188.</span></div>`;
  out += `<div class="card">${sec('chart-bar', 'Últimos 14 dias')}<div class="mini">${last14.map(h => `<i style="height:${h ? Math.max(12, h * 20) : 4}%;${h ? '' : 'opacity:.3'}"></i>`).join('')}</div><div class="mut">${a7 === null ? 'Marque o humor por alguns dias para ver o padrão.' : `Humor médio da última semana: ${r1(a7)}/5${p7 !== null ? (a7 > p7 ? ' (subiu)' : a7 < p7 ? ' (caiu)' : ' (igual) ') + 'em relação à anterior' : ''}.`}</div></div>`;
  const es = [...euS()].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  out += acc('euhist', 'Minhas anotações', es.length + '', `${es.slice(0, 15).map(x => `<div class="item" data-a="euedit" data-v="${x.id}" role="button" tabindex="0"><div class="t"><b>${sd2(x.date)} ${esc(x.time || '')}</b>${x.tags && x.tags.length ? ` <span class="mut">${esc(x.tags.join(', '))}</span>` : ''}<div class="mut" style="text-align:left">${esc((x.t || '').slice(0, 140))}${(x.t || '').length > 140 ? '…' : ''}</div></div>${x.m ? ic(euMoodIc(x.m)) : ''}</div>`).join('') || '<div class="mut">Nada escrito ainda.</div>'}`, false);
  out += `<div class="card">${sec('users', 'Conversar com o Claude')}<div class="mut">Copia um resumo de como você tem estado e a sua última anotação. Cole no chat com o Claude e comece a conversa de onde quiser.</div><button class="btn ghost full" data-a="eucopy">${ic('copy')}Copiar para conversar</button></div>`;
  return out;
}
function euInit() {
  Object.assign(C, { eud: v => { ui.euDraft = v; } });
  Object.assign(A, {
    pmo: v => { ui.pm = (ui.pm || 0) + +v; if (ui.pm > 0) ui.pm = 0; },
    pv: v => { ui.pv = v; },
    eutag: v => { const t = ui.euTags || []; ui.euTags = t.includes(v) ? t.filter(x => x !== v) : [...t, v]; },
    eusave: () => {
      const t = (ui.euDraft || '').trim(), tg = ui.euTags || []; if (!t && !tg.length) { toast('Escreva algo ou escolha como se sente.'); return false; }
      const k = dkey(), n = new Date(), md = S.mood[k] || {};
      euS().push({ id: uid(), date: k, time: `${pad(n.getHours())}:${pad(n.getMinutes())}`, t, tags: tg, m: md.m || null, e: md.e || null });
      ui.euDraft = ''; ui.euTags = []; save(); toast('Anotação salva.');
    },
    euedit: v => { const x = euS().find(y => y.id === v); if (!x) return false; form('Anotação', [{ k: 't', label: 'Texto', type: 'textarea', value: x.t }], r => { x.t = r.t; }, () => { S.eu = euS().filter(y => y.id !== v); }); return false; },
    eucopy: () => {
      const ks = [...Array(7)].map((_, i) => dkey(addD(new Date(), -i))), ms = ks.map(k => (S.mood[k] || {}).m).filter(Boolean), en = ks.map(k => (S.mood[k] || {}).e).filter(Boolean), avg = l => l.length ? r1(l.reduce((s, x) => s + x, 0) / l.length) + '/5' : '—';
      const le = [...euS()].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))[0];
      const t = `Quero conversar sobre como estou me sentindo.\nÚltimos 7 dias: humor médio ${avg(ms)}, energia média ${avg(en)}.\n${le ? `Minha última anotação (${sd2(le.date)}${le.tags && le.tags.length ? ', ' + le.tags.join(', ') : ''}): ${le.t || '—'}` : 'Ainda não escrevi anotações.'}`;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Copiado. Cole no chat com o Claude.'), () => prompt('Copie o texto:', t)); return false;
    }
  });
}
