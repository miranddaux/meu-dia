'use strict';
/* Árvore de livros (plano de 17/11/2026) em pixel art.
   Um livro por vez, alternando os galhos. O livro atual fica em S.arvoreAt (padrão 1). Nada vai para o Notion. */
const ARV_GALHOS = {
  t: { nome: 'Tronco', cor: '#ff6b57' },
  p: { nome: 'Produto/UX', cor: '#7fb89a' },
  u: { nome: 'UI', cor: '#ff8fa3' },
  i: { nome: 'IA', cor: '#4cc9ff' },
  c: { nome: 'Tecnologia', cor: '#ffc83d' }
};
const ARV_LIVROS = [
  [1, 't', 'Articulando Decisões de Design'], [2, 'p', 'The Mom Test'], [3, 'u', 'Refactoring UI'], [4, 'i', 'Co-Intelligence'],
  [5, 'p', 'Continuous Discovery Habits'], [6, 'u', 'Laws of UX'], [7, 'p', 'Lean Analytics'], [8, 'i', 'Prediction Machines'],
  [9, 'u', 'Atomic Design'], [10, 'p', 'Inspired'], [11, 'u', 'Design Systems (Kholmatova)'], [12, 'p', 'Escaping the Build Trap'],
  [13, 'i', 'AI Engineering'], [14, 'c', 'The Pragmatic Programmer'], [15, 'u', 'O Design do Dia a Dia'], [16, 'p', 'Revisão: Não Me Faça Pensar']
];
const arvAt = () => Math.min(ARV_LIVROS.length + 1, Math.max(1, num(S.arvoreAt) || 1));
/* desenho: grade de 120 x 112 "pixels" */
function arvSvg() {
  const at = arvAt(); let r = '';
  const px = (x, y, w, h, c) => { r += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`; };
  /* céu, estrelas, chão e grama */
  px(0, 0, 120, 112, '#1d2a2e');
  [[6, 4], [58, 6], [114, 5], [62, 20], [3, 40], [117, 38]].forEach(([x, y]) => px(x, y, 1, 1, '#cfe6d6'));
  px(0, 101, 120, 11, '#4a6b3f'); px(0, 101, 120, 2, '#7fb89a');
  for (let x = 2; x < 120; x += 7) px(x, 99, 1, 2, '#7fb89a');
  /* tronco com sombra e raízes */
  px(55, 58, 10, 43, '#8a5a3c'); px(55, 58, 3, 43, '#6b4429'); px(51, 97, 4, 4, '#6b4429'); px(65, 97, 4, 4, '#8a5a3c');
  /* galhos em escada */
  const step = pts => pts.forEach(([x, y]) => px(x, y, 4, 3, '#8a5a3c'));
  step([[52, 72], [48, 70], [44, 68], [40, 66], [37, 64]]);
  step([[64, 72], [68, 70], [72, 68], [76, 66], [79, 64]]);
  step([[55, 56], [52, 52], [49, 48], [46, 44], [43, 40]]);
  step([[61, 56], [64, 52], [67, 48], [70, 44], [73, 40]]);
  /* copas em blocos */
  const copa = (cx, cy, c) => { px(cx - 18, cy - 10, 36, 20, c); px(cx - 14, cy - 13, 28, 26, c); px(cx - 21, cy - 6, 42, 12, c); px(cx - 14, cy - 13, 28, 2, 'rgba(255,255,255,.22)'); px(cx - 14, cy + 11, 28, 2, 'rgba(0,0,0,.18)'); };
  const centros = { u: [30, 26], i: [90, 26], p: [24, 62], c: [96, 62] };
  Object.entries(centros).forEach(([g, [x, y]]) => copa(x, y, ARV_GALHOS[g].cor));
  /* frutos = livros */
  const fruto = (x, y, l) => {
    const n = l[0], st = n < at ? 'lido' : n === at ? 'lendo' : 'fila';
    const fill = st === 'lido' ? '#ffc83d' : st === 'lendo' ? '#ffffff' : '#1f2a2e';
    r += `<g class="arv-f ${st}"><title>${n}. ${esc(l[2])} (${st === 'lido' ? 'lido' : st === 'lendo' ? 'lendo agora' : 'na fila'})</title>`;
    px(x, y, 10, 9, '#1f2a2e'); px(x + 1, y + 1, 8, 7, fill);
    r += `<text x="${x + 5}" y="${y + 6.6}" text-anchor="middle" font-size="5.5" fill="${st === 'fila' ? '#cfe6d6' : '#1f2a2e'}">${n}</text></g>`;
  };
  const slots = { p: [], u: [], i: [], c: [] }; ARV_LIVROS.forEach(l => { if (slots[l[1]]) slots[l[1]].push(l); });
  Object.entries(slots).forEach(([g, ls]) => {
    const [cx, cy] = centros[g], cols = 3, rows = Math.ceil(ls.length / cols);
    ls.forEach((l, k) => { const row = Math.floor(k / cols), col = k % cols, inRow = Math.min(cols, ls.length - row * cols); fruto(cx - (inRow * 12 - 2) / 2 + col * 12, cy - (rows * 10 - 1) / 2 + row * 10, l); });
  });
  fruto(55, 80, ARV_LIVROS[0]);
  /* nomes dos galhos */
  const nome = (x, y, t) => { r += `<text x="${x}" y="${y}" text-anchor="middle" font-size="4.5" fill="#f4efe6">${t}</text>`; };
  nome(30, 9, 'UI'); nome(90, 9, 'IA'); nome(24, 81, 'PRODUTO/UX'); nome(96, 81, 'TECNOLOGIA'); nome(60, 109, 'TRONCO');
  return `<svg class="arv-svg" viewBox="0 0 120 112" shape-rendering="crispEdges" role="img" aria-label="Árvore de livros em pixel art. Livro atual: ${esc((ARV_LIVROS[at - 1] || [0, 0, 'todos lidos'])[2])}">${r}</svg>`;
}
function arvoreCard() {
  const at = arvAt(), cur = ARV_LIVROS[at - 1], nxt = ARV_LIVROS[at];
  const lista = ARV_LIVROS.map(([n, g, t]) => `<div class="arv-li ${n < at ? 'ok' : n === at ? 'on' : ''}"><span class="arv-dot" style="background:${ARV_GALHOS[g].cor}"></span><span class="grow">${n}. ${esc(t)}</span><span class="mut">${n < at ? 'lido' : n === at ? 'lendo' : ARV_GALHOS[g].nome}</span></div>`).join('');
  return `<div class="card arv">${sec('book-open', 'Árvore de livros', cur ? `${at}/${ARV_LIVROS.length}` : 'completa')}
<div class="mut">Um livro por vez, alternando os galhos: Produto/UX, UI, IA e Tecnologia. Dourado = lido · branco = lendo agora · escuro = na fila.</div>
${arvSvg()}
<div class="mut">${cur ? `Agora: <b>${esc(cur[2])}</b>${nxt ? ` · depois: ${esc(nxt[2])}` : ''}` : 'Árvore completa. Hora de plantar a próxima.'}</div>
<div class="row">${cur ? `<button class="btn sm" data-a="arvnext">${ic('check')}Terminei este livro</button>` : ''}${at > 1 ? `<button class="btn sm ghost" data-a="arvback">Voltar 1</button>` : ''}</div>
<details><summary>Ver a ordem completa</summary>${lista}<div class="mut">Consulta (fora da fila): Eloquent JavaScript e Psicologia das Cores. A fila também está na Biblioteca de Livros do Notion.</div></details></div>`;
}
function arvoreInit() {
  Object.assign(A, {
    arvnext: () => { S.arvoreAt = arvAt() + 1; save(); toast(S.arvoreAt > ARV_LIVROS.length ? 'Árvore completa!' : 'Próximo: ' + ARV_LIVROS[S.arvoreAt - 1][2]); },
    arvback: () => { S.arvoreAt = Math.max(1, arvAt() - 1); save(); }
  });
}

/* ---------- Árvore da vida (plano de 17/11): um jogo de XP com 6 galhos e a base nas raízes ----------
   Cada galho tem 3 etapas. Status em S.vidaAt[galho] = quantas etapas já foram concluídas. */
const VIDA = [
  { id: 'car', nome: 'CARREIRA', cor: '#ffc83d', pos: [70, 22], et: ['Portfólio V1 no ar', 'Vaga melhor (meta mar/2027)', 'Product Engineer'] },
  { id: 'pro', nome: 'PRODUTO/UX', cor: '#7fb89a', pos: [24, 30], et: ['Livros de produto (árvore de livros)', 'Discovery real com usuários', 'Case com métricas (jul/2027)'] },
  { id: 'ia', nome: 'IA', cor: '#4cc9ff', pos: [116, 30], et: ['Claude Academy (quintas)', 'Certificação Claude (mar/2027)', 'Projeto de IA no ar (PIM 2027.1)'] },
  { id: 'cod', nome: 'CÓDIGO', cor: '#b39dff', pos: [70, 56], et: ['HTML/CSS (Udemy) e Python rank D', 'JavaScript e Git (rank B)', 'React (rank A)'] },
  { id: 'ui', nome: 'UI', cor: '#ff8fa3', pos: [22, 66], et: ['UI Boost: certificado', 'Design system em código', 'Craft de referência no portfólio'] },
  { id: 'en', nome: 'INGLÊS', cor: '#ff6b57', pos: [118, 66], et: ['Inglês 2x por semana', 'Entrevista curta (jun/2027)', 'Entrevista completa (dez/2027)'] }
];
const vidaN = id => Math.min(3, Math.max(0, num((S.vidaAt || {})[id])));
function vidaSvg() {
  let r = ''; const px = (x, y, w, h, c) => { r += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`; };
  const tx = (x, y, t, sz, c) => { r += `<text x="${x}" y="${y}" text-anchor="middle" font-size="${sz}" fill="${c || '#f4efe6'}">${t}</text>`; };
  px(0, 0, 140, 134, '#141b1d');
  [[5, 5], [40, 3], [100, 4], [134, 8], [8, 48], [132, 46], [52, 40], [88, 38]].forEach(([x, y]) => px(x, y, 1, 1, '#cfe6d6'));
  /* terra e raízes (a base protegida) */
  px(0, 106, 140, 28, '#2b1d17'); px(0, 106, 140, 2, '#7fb89a'); for (let x = 3; x < 140; x += 7) px(x, 104, 1, 2, '#7fb89a');
  [[60, 108, 3, 8], [57, 114, 3, 4], [54, 117, 3, 3], [77, 108, 3, 8], [80, 114, 3, 4], [83, 117, 3, 3], [68, 108, 4, 10]].forEach(a => px(...a, '#6b4429'));
  tx(70, 126, 'BASE: SONO · TREINO · FÉ · NAYARA', 4.2, '#ffc83d');
  /* tronco */
  px(64, 62, 12, 44, '#8a5a3c'); px(64, 62, 4, 44, '#6b4429');
  const step = pts => pts.forEach(([x, y]) => px(x, y, 4, 3, '#8a5a3c'));
  step([[61, 82], [57, 80], [53, 78], [49, 76], [45, 74], [41, 72], [38, 70]]);
  step([[75, 82], [79, 80], [83, 78], [87, 76], [91, 74], [95, 72], [98, 70]]);
  step([[62, 66], [58, 62], [54, 58], [50, 54], [46, 50], [42, 46], [40, 42]]);
  step([[74, 66], [78, 62], [82, 58], [86, 54], [90, 50], [94, 46], [96, 42]]);
  px(68, 34, 4, 28, '#8a5a3c');
  /* nível no tronco */
  const st = typeof rpgStats === 'function' ? rpgStats() : null;
  px(57, 86, 26, 13, '#1f2a2e'); px(58, 87, 24, 11, '#ffc83d'); tx(70, 95, st ? 'LV ' + st.level : 'LV ?', 5, '#1f2a2e');
  /* copas com 3 etapas cada */
  VIDA.forEach(g => {
    const [cx, cy] = g.pos, n = vidaN(g.id);
    px(cx - 18, cy - 9, 36, 18, g.cor); px(cx - 14, cy - 12, 28, 24, g.cor); px(cx - 21, cy - 5, 42, 10, g.cor);
    px(cx - 14, cy - 12, 28, 2, 'rgba(255,255,255,.25)'); px(cx - 14, cy + 10, 28, 2, 'rgba(0,0,0,.25)');
    g.et.forEach((e, k) => {
      const x = cx - 17 + k * 12, y = cy - 4, s = k < n ? 'ok' : k === n ? 'now' : 'next';
      r += `<g class="arv-f ${s === 'now' ? 'lendo' : ''}"><title>${esc(g.nome)} ${k + 1}: ${esc(e)} (${s === 'ok' ? 'feito' : s === 'now' ? 'agora' : 'próximo'})</title>`;
      px(x, y, 10, 9, '#1f2a2e'); px(x + 1, y + 1, 8, 7, s === 'ok' ? '#ffc83d' : s === 'now' ? '#ffffff' : '#1f2a2e');
      r += `<text x="${x + 5}" y="${y + 6.6}" text-anchor="middle" font-size="5.5" fill="${s === 'next' ? '#cfe6d6' : '#1f2a2e'}">${s === 'ok' ? '✓' : k + 1}</text></g>`;
    });
    tx(cx, cy - 14.5, g.nome, 4.5);
  });
  return `<svg class="arv-svg" viewBox="0 0 140 134" shape-rendering="crispEdges" role="img" aria-label="Árvore da vida em pixel art: seis galhos (carreira, produto e UX, IA, código, UI e inglês) e a base nas raízes">${r}</svg>`;
}
function vidaCard() {
  const st = typeof rpgStats === 'function' ? rpgStats() : null, pct = st ? Math.min(100, Math.round(st.cur / st.next * 100)) : 0;
  const feitos = VIDA.reduce((a, g) => a + vidaN(g.id), 0);
  const lista = VIDA.map((g, i) => { const n = vidaN(g.id), atual = g.et[n]; return `<div class="arv-li ${n >= 3 ? 'ok' : ''}"><span class="arv-dot" style="background:${g.cor}"></span><span class="grow"><b>${esc(g.nome)}</b> · ${atual ? esc(atual) : 'galho completo'}<span class="mut"> (${n}/3)</span></span>${n < 3 ? `<button class="btn sm ghost" data-a="vidaok" data-v="${g.id}" aria-label="Concluir etapa de ${esc(g.nome)}">${ic('check')}</button>` : ''}</div>`; }).join('');
  return `<div class="card arv vida">${sec('trending-up', 'Árvore da vida', `${feitos}/18`)}
<div class="px vida-lv">${st ? `LV ${st.level} · ${esc(st.cls.toUpperCase())} · ${st.road.toLocaleString('pt-BR')} XP` : 'LIGUE O NOTION PARA LER O XP'}</div>
${st ? `<div class="bar"><i style="width:${pct}%"></i></div><div class="mut">Faltam ${st.toNext.toLocaleString('pt-BR')} XP para o Lv ${st.level + 1}.</div>` : ''}
${vidaSvg()}
<div class="mut">Branco piscando = etapa de agora · dourado = feita · escuro = próxima. As raízes são a base que nunca se corta.</div>
${lista}${S.vidaAt && Object.keys(S.vidaAt).length ? '<div class="row"><button class="btn sm ghost" data-a="vidaback">Desfazer última</button></div>' : ''}</div>`;
}
Object.assign(globalThis, { vidaInit() {
  Object.assign(A, {
    vidaok: v => { S.vidaAt = S.vidaAt || {}; S.vidaLast = v; S.vidaAt[v] = vidaN(v) + 1; save(); toast('Etapa concluída: ' + (VIDA.find(g => g.id === v) || {}).nome); },
    vidaback: () => { const v = S.vidaLast; if (v && S.vidaAt && vidaN(v) > 0) { S.vidaAt[v] = vidaN(v) - 1; S.vidaLast = null; save(); } }
  });
} });
