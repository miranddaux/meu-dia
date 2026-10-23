'use strict';
/* Dieta: buscador de alimentos com macros e alguns micros, e o card "Minhas metas".
   Valores por 100 g, aproximados (base na tabela TACO e em tabelas internacionais). Confira o rótulo do produto quando puder.
   Campos: nome | porção | gramas da porção | kcal | proteína | carboidrato | gordura | fibra | cálcio mg | ferro mg | potássio mg | sódio mg
   Campo vazio = não tenho valor confiável (aparece como "—"). */
const FOOD_RAW = `#Cereais, pães e raízes
Arroz branco cozido|4 colheres de sopa|100|128|2.5|28.1|0.2|1.6|4|0.1|29|1
Arroz integral cozido|4 colheres de sopa|100|124|2.6|25.8|1|2.7|5|0.3|75|1
Macarrão cozido|1 pegador|110|102|3.4|19.9|0.5|1.2|||38|1
Macarrão integral cozido|1 pegador|110|124|5.3|25|0.9|3.9||||
Pão francês|1 unidade|50|300|8|58.6|3.1|2.3|16|1|141|648
Pão de forma integral|1 fatia|25|253|9.4|49.9|3.7|6.9|131|||506
Pão de forma tradicional|1 fatia|25|253|8.9|49.5|3.5|2.3||||500
Tapioca (goma hidratada)|1 unidade média|50|240|0.2|59.5|0||||||
Cuscuz de milho cozido|1 fatia|100|113|2.2|25.3|0.7|2.1||||
Aveia em flocos|2 colheres de sopa|30|394|13.9|66.6|8.5|9.1|48|4.4|336|5
Granola|3 colheres de sopa|30|420|10|64|14|7.5||||
Biscoito cream cracker|3 unidades|18|432|10.1|68.7|14.4|2.5||||854
Pão de queijo|1 unidade|30|363|5.1|34.2|24.6|0.6||||
Batata-doce cozida|1 média|100|77|0.6|18.4|0.1|2.2|17|0.2|148|
Batata inglesa cozida|1 média|100|52|1.2|11.9|0|1.3|4|0.2|250|2
Mandioca cozida|1 pedaço|100|125|0.6|30.1|0.3|1.6|19|0.1|208|1
Milho verde cozido|1 espiga|100|98|3.2|17.1|1.5|4.6||||
#Carnes, peixes e ovos
Peito de frango grelhado|1 filé|100|159|32|0|2.5|0|5|0.3|390|52
Peito de frango cozido|1 filé|100|163|31.5|0|3.2|0||||
Coxa de frango sem pele assada|1 unidade|100|155|24.2|0|5.7|0||||
Patinho bovino grelhado|1 bife|100|219|35.9|0|7.3|0||||
Alcatra grelhada|1 bife|100|241|31.9|0|11.6|0||||
Filé mignon grelhado|1 bife|100|220|32.8|0|8.8|0||||
Carne moída refogada|4 colheres de sopa|100|212|26.7|0|10.9|0||||
Lombo de porco assado|1 fatia|100|210|35.7|0|6.4|0||||
Presunto magro|2 fatias|30|94|14.4|1.1|3|0||||
Ovo de galinha cozido|1 unidade|50|146|13.3|0.6|9.5|0|49|1.5|150|146
Clara de ovo cozida|1 unidade|33|59|13.4|0|0|0||||
Tilápia grelhada|1 filé|100|128|26.2|0|2.7|0||||
Salmão grelhado|1 posta|100|206|22.1|0|12.4|0||||
Atum em lata (natural, drenado)|1/2 lata|60|116|25.5|0|0.8|0||||
Sardinha em lata (óleo, drenada)|1/2 lata|60|208|24.6|0|11.5|0|382|2.9|397|307
Camarão cozido|1 porção|100|99|24|0.2|0.3|0|70|0.5|259|111
#Leite e derivados
Leite integral|1 copo (200 ml)|200|61|3.2|4.7|3.3|0|123||150|43
Leite desnatado|1 copo (200 ml)|200|34|3.4|4.9|0.1|0|134||160|
Iogurte natural integral|1 pote|170|51|4.1|1.9|3|0|143|||
Iogurte grego natural|1 pote|100|97|9|4|5|0||||
Queijo minas frescal|1 fatia|30|264|17.4|3.2|20.2|0|579|0.3||
Queijo mussarela|1 fatia|20|330|22.6|3|25.2|0|875|0.3|76|581
Queijo cottage|2 colheres de sopa|50|98|11.1|3.4|4.3|0|83||||
Ricota|1 fatia|40|140|12.6|3.8|8.1|0|253||||
Requeijão cremoso|1 colher de sopa|30|257|9.6|2.4|23.4|0||||
Manteiga|1 colher de chá|5|726|0.4|0.1|82.4|0||||
Whey protein (varia por marca)|1 dose|30|400|80|8|6|0||||
#Feijões, grãos e sementes
Feijão carioca cozido|1 concha|100|76|4.8|13.6|0.5|8.5|27|1.3||2
Feijão preto cozido|1 concha|100|77|4.5|14|0.5|8.4|29|1.5||2
Lentilha cozida|4 colheres de sopa|100|93|6.3|16.3|0.5|7.9|15|1.4||
Grão-de-bico cozido|4 colheres de sopa|100|164|8.9|27.4|2.6|7.6|49|2.9|291|7
Chia|1 colher de sopa|12|486|16.5|42.1|30.7|34.4|631|7.7|407|16
Linhaça|1 colher de sopa|10|534|18.3|28.9|42.2|27.3|255|5.7|813|30
#Frutas
Banana prata|1 unidade|70|98|1.3|26|0.1|2|8|0.4|358|0
Banana nanica|1 unidade|90|92|1.4|23.8|0.1|1.9||||
Maçã|1 unidade|130|56|0.3|15.2|0|1.3|3|0.1|75|
Laranja pera|1 unidade|180|37|1|8.9|0.1|0.8|35|0.1|163|
Mamão papaia|1/2 unidade|150|40|0.5|10.4|0.1|1|25|0.2|126|
Manga palmer|1 unidade|200|72|0.4|19.4|0.2|1.6||||
Abacate|4 colheres de sopa|100|96|1.2|6|8.4|6.3|8|0.2|206|2
Morango|10 unidades|100|30|0.9|6.8|0.3|1.7||||
Uva|1 cacho pequeno|100|53|0.7|13.6|0.2|0.9||||
Melancia|1 fatia|200|33|0.9|8.1|0|0.1||||
Abacaxi|1 fatia|100|48|0.9|12.3|0.1|1||||
Kiwi|1 unidade|75|51|1.3|11.5|0.6|2.7|24|0.3|269|
Pêra|1 unidade|150|53|0.6|14|0.1|3||||
Açaí (polpa sem açúcar)|1 porção|100|58|0.8|6.2|3.9|2.6||||
#Verduras e legumes
Alface|1 prato|50|11|1.3|1.7|0.2|1.8|38|0.4||
Tomate|1 unidade|100|15|1.1|3.1|0.2|1.2|7|0.2|222|1
Cenoura cozida|3 colheres de sopa|100|34|0.8|7.7|0.2|3.2||||
Brócolis cozido|3 ramos|100|25|2.1|4.4|0.5|3.4|42|0.5||
Couve refogada|2 colheres de sopa|50|90|1.7|8.7|6.6|4||||
Espinafre cozido|3 colheres de sopa|100|23|3|3.8|0.3|2.4|136|3.6|466|70
Pepino|1/2 unidade|100|10|0.9|2|0|1.1||||
Beterraba cozida|3 fatias|100|32|1.3|7.2|0|1.9|16|0.3||
Abobrinha cozida|3 colheres de sopa|100|15|1.1|3|0.2|1.6||||
Chuchu cozido|3 colheres de sopa|100|19|0.4|4.8|0|1.8||||
#Gorduras e castanhas
Azeite de oliva|1 colher de sopa|13|884|0|0|100|0||||
Castanha-do-pará|2 unidades|8|643|14.5|15.1|63.5|7.9|146|2.3||
Amendoim torrado|1 punhado|30|606|22.5|18.7|54|7.8||||
Pasta de amendoim|1 colher de sopa|15|588|25|20|50|6|49|1.9|649|17
Castanha de caju|1 punhado|30|609|18.5|30.1|47.7|3.7||||
Nozes|3 unidades|15|654|15.2|13.7|65.2|6.7|98|2.9|441|2
Amêndoa|10 unidades|15|579|21.2|21.6|49.9|12.5|269|3.7|733|1
#Doces e bebidas
Açúcar refinado|1 colher de chá|5|387|0|99.5|0|0||||
Mel|1 colher de sopa|20|309|0.4|84|0|0||||
Chocolate ao leite|2 quadradinhos|20|540|7.2|59.6|30.3|1.5||||
Chocolate amargo 70%|2 quadradinhos|20|598|7.8|45.9|42.6|10.9|73|11.9|715|20
Café sem açúcar|1 xícara|50|2|0.1|0.3|0|0||||
Suco de laranja natural|1 copo (200 ml)|200|45|0.7|10.4|0.2|0.2||||
Refrigerante de cola|1 lata (350 ml)|350|37|0|9.4|0|0||||
Cerveja|1 lata (350 ml)|350|43|0.4|3.6|0|0||||
Pizza de mussarela|1 fatia|100|276|11.5|33|10.5|1.5||||`;
const FOOD_CATS = []; /* nomes das categorias, na ordem */
const FOOD_DB = (() => {
  const out = []; let cat = '';
  FOOD_RAW.split('\n').forEach(l => {
    if (l[0] === '#') { cat = l.slice(1); FOOD_CATS.push(cat); return; }
    const p = l.split('|'), n = x => (x === '' || x === undefined ? null : parseFloat(x));
    out.push({ id: 'db' + out.length, cat, name: p[0], por: p[1], g: n(p[2]), kcal: n(p[3]), prot: n(p[4]), carb: n(p[5]), fat: n(p[6]), fib: n(p[7]), ca: n(p[8]), fe: n(p[9]), k: n(p[10]), na: n(p[11]) });
  });
  return out;
})();
const fnorm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const fmt = (v, d = 0) => v === null || v === undefined || isNaN(v) ? '—' : (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toString().replace('.', ',');
const FKEYS = ['kcal', 'prot', 'carb', 'fat', 'fib', 'ca', 'fe', 'k', 'na'];
const fscale = (f, g) => { const o = {}; FKEYS.forEach(k => { o[k] = f[k] === null ? null : f[k] * g / 100; }); return o; };

/* ---------- buscador ---------- */
let FS = null;
function foodSearch(meal) {
  FS = { meal, q: '', cat: '', sel: null, g: 100 };
  const m = document.createElement('div'); m.className = 'modal'; m.id = 'fsmodal'; m.setAttribute('role', 'dialog'); document.body.appendChild(m);
  paintFS();
  m.addEventListener('click', e => {
    const t = e.target.closest('button'), el = e.target;
    if (el === m || (t && t.dataset.fx !== undefined)) { m.remove(); FS = null; return; }
    if (!t) return;
    if (t.dataset.fcat !== undefined) { FS.cat = FS.cat === t.dataset.fcat ? '' : t.dataset.fcat; paintFS(); return; }
    if (t.dataset.fpick) { FS.sel = FOOD_DB.find(f => f.id === t.dataset.fpick) || S.foods.find(f => f.id === t.dataset.fpick.slice(2)) && fromMine(S.foods.find(f => f.id === t.dataset.fpick.slice(2))); FS.g = FS.sel.g || 100; paintFS(); return; }
    if (t.dataset.fback !== undefined) { FS.sel = null; paintFS(); return; }
    if (t.dataset.fg) { FS.g = Math.round(FS.sel.g * Number(t.dataset.fg)) || 100; paintFS(); return; }
    if (t.dataset.fadd !== undefined) { fsAdd(); m.remove(); FS = null; }
  });
  m.addEventListener('input', e => {
    if (e.target.id === 'fsq') { FS.q = e.target.value; paintFS(true); }
    if (e.target.id === 'fsg') { FS.g = Math.max(0, num(e.target.value)); paintFS(true); }
  });
  m.addEventListener('change', e => { if (e.target.id === 'fsmeal') FS.meal = e.target.value; });
}
const fromMine = f => ({ id: 'my' + f.id, cat: 'Meus alimentos', name: f.name, por: '1 porção', g: null, kcal: num(f.kcal), prot: num(f.prot), carb: f.carb === '' ? null : num(f.carb), fat: f.fat === '' ? null : num(f.fat), fib: null, ca: null, fe: null, k: null, na: null, mine: true });
function paintFS(keepFocus) {
  const m = $('#fsmodal'); if (!m || !FS) return;
  if (FS.sel) {
    const f = FS.sel, base = f.mine ? 1 : 100, g = f.mine ? 1 : FS.g, s = f.mine ? { kcal: f.kcal, prot: f.prot, carb: f.carb, fat: f.fat, fib: null, ca: null, fe: null, k: null, na: null } : fscale(f, FS.g);
    m.innerHTML = `<div class="sheet"><h3 class="px">${esc(f.name)}</h3><div class="mut">${f.mine ? 'Seu alimento: valores por porção.' : `Por 100 g: ${fmt(f.kcal)} kcal · ${fmt(f.prot, 1)} g prot. · ${fmt(f.carb, 1)} g carbo · ${fmt(f.fat, 1)} g gord.`}</div>
${f.mine ? '' : `<label>Quanto você comeu? (gramas)</label><div class="chips wrapc">${[0.5, 1, 1.5, 2].map(x => `<button type="button" class="chip ${FS.g === Math.round(f.g * x) ? 'on' : ''}" data-fg="${x}">${x === 1 ? '1 porção' : x + ' porção'} (${Math.round(f.g * x)} g)</button>`).join('')}</div><input id="fsg" inputmode="decimal" value="${FS.g}" aria-label="Gramas"><div class="mut">1 porção = ${esc(f.por)} ≈ ${f.g} g</div>`}
<div class="grid3 sm"><div><b>${fmt(s.kcal)}</b><small>kcal</small></div><div><b>${fmt(s.prot, 1)}</b><small>proteína g</small></div><div><b>${fmt(s.carb, 1)}</b><small>carbo g</small></div></div><div class="grid3 sm"><div><b>${fmt(s.fat, 1)}</b><small>gordura g</small></div><div><b>${fmt(s.fib, 1)}</b><small>fibra g</small></div><div><b>${fmt(s.ca)}</b><small>cálcio mg</small></div></div><div class="mut">Ferro ${fmt(s.fe, 1)} mg · Potássio ${fmt(s.k)} mg · Sódio ${fmt(s.na)} mg</div>
<label>Refeição</label><select id="fsmeal">${MEALS.map(x => `<option ${x === FS.meal ? 'selected' : ''}>${x}</option>`).join('')}</select>
<div class="row act"><button type="button" class="btn ghost" data-fback>Voltar</button><button type="button" class="btn" data-fadd>${ic('check')}Adicionar</button></div></div>`;
    return;
  }
  const q = fnorm(FS.q.trim()), mine = S.foods.map(fromMine);
  let list = [...FOOD_DB, ...mine].filter(f => (!FS.cat || f.cat === FS.cat) && (!q || fnorm(f.name).includes(q)));
  const tot = list.length; list = list.slice(0, 40);
  const sc = document.querySelector('#fsmodal .sheet'), keep = sc ? sc.scrollTop : 0;
  m.innerHTML = `<div class="sheet"><h3 class="px">Buscar alimento</h3><input id="fsq" placeholder="Ex.: frango, banana, arroz" value="${esc(FS.q)}" aria-label="Buscar alimento" autocomplete="off"><div class="chips">${[...FOOD_CATS, 'Meus alimentos'].map(c => `<button type="button" class="chip ${FS.cat === c ? 'on' : ''}" data-fcat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
<div id="fsl">${list.map(f => `<div class="item"><div class="t">${esc(f.name)}<div class="mut">${f.mine ? 'por porção' : '100 g'}: ${fmt(f.kcal)} kcal · ${fmt(f.prot, 1)} g prot. · ${fmt(f.carb, 1)} g carbo · ${fmt(f.fat, 1)} g gord.</div></div><button type="button" class="btn sm" data-fpick="${f.id}">Escolher</button></div>`).join('') || '<div class="mut">Nada encontrado. Salve o alimento em Meus alimentos (botão Salvar, na Dieta) e ele aparece aqui.</div>'}${tot > 40 ? `<div class="mut">Mostrando 40 de ${tot}. Digite mais letras para filtrar.</div>` : ''}</div>
<div class="row act"><button type="button" class="btn ghost" data-fx>Fechar</button></div></div>`;
  const nsc = document.querySelector('#fsmodal .sheet'); if (nsc) nsc.scrollTop = keep;
  if (keepFocus) { const i = $('#fsq'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
}
function fsAdd() {
  const f = FS.sel, k = ui.md, mine = f.mine, g = FS.g, s = mine ? { kcal: f.kcal, prot: f.prot, carb: f.carb, fat: f.fat } : fscale(f, g), r1d = v => v === null || v === undefined ? '' : Math.round(v * 10) / 10;
  S.meals[k] = S.meals[k] || [];
  S.meals[k].push({ id: uid(), meal: FS.meal, text: mine ? f.name : `${f.name} · ${g} g`, kcal: r1d(s.kcal), prot: r1d(s.prot), carb: r1d(s.carb), fat: r1d(s.fat), fib: mine ? '' : r1d(s.fib), ca: mine ? '' : r1d(s.ca), fe: mine ? '' : r1d(s.fe), k: mine ? '' : r1d(s.k), na: mine ? '' : r1d(s.na) });
  save(); ui.flash = `${f.name} adicionado em ${FS.meal}.`; render();
}

/* ---------- card de metas + micros ---------- */
function dietExtra(ms) {
  const c = S.settings.calc, r = calcOut(), ws = [...S.weights].sort((a, b) => a.date.localeCompare(b.date)), cur = ws.length ? num(ws[ws.length - 1].kg) : num(c.weight);
  const gk = num(S.settings.dietKcal), gp = num(S.settings.dietProt), g = num(S.settings.waterGoal);
  let out = `<button class="btn pri full" data-a="fsearch" data-v="${guessMeal()}">${ic('search')}Buscar alimento</button>`;
  const ref = [['Fibra', 'fib', 30, 'g', 1], ['Cálcio', 'ca', 1000, 'mg', 0], ['Ferro', 'fe', 8, 'mg', 1], ['Potássio', 'k', 3400, 'mg', 0], ['Sódio (limite)', 'na', 2000, 'mg', 0]];
  const anyMicro = ms.some(x => x.fib !== undefined && x.fib !== '' || x.ca !== undefined && x.ca !== '');
  out += acc('dmicro', 'Fibra e micronutrientes do dia', anyMicro ? '' : 'sem dados', `${ref.map(([n, k, m, u, d]) => { const v = sum(ms, k), p = Math.min(100, v / m * 100); return `<div><div class="row sp"><span>${n}</span><span class="mut">${fmt(v, d)} / ${m} ${u}</span></div><div class="bar thin ${k === 'na' && v > m ? 'over' : ''}"><i style="width:${p}%"></i></div></div>`; }).join('')}<div class="mut">Soma só os alimentos que têm esse dado (buscador). Referência geral de adulto, não é prescrição. Alguns alimentos não têm todos os micros.</div>`, false);
  out += acc('dmetas', 'Minhas metas', `${r1(cur)} → ${num(c.target) ? r1(num(c.target)) : '—'} kg`, `<div class="grid3 sm"><div><b>${r1(cur)}</b><small>peso agora (kg)</small></div><div><b>${num(c.target) ? r1(num(c.target)) : '—'}</b><small>meta (kg)</small></div><div><b>${c.deficit || '—'}</b><small>déficit kcal/dia</small></div></div><div class="grid3 sm"><div><b>${gk || '—'}</b><small>meta kcal/dia</small></div><div><b>${gp || '—'}</b><small>proteína g/dia</small></div><div><b>${g ? L(g) : '—'}</b><small>água (L)</small></div></div>${r ? `<div class="mut">Ritmo estimado ≈ ${r1(r.perWeek)} kg/semana${r.weeks ? ' · ≈ ' + r.weeks + ' semanas até a meta' : ''}.</div>` : `<div class="banner">${ic('info-box')}<span>Falta só a idade para calcular suas calorias e proteína.</span></div>`}<button class="btn sm ghost" data-a="metasedit">${ic('edit')}Ajustar metas</button><div class="mut">Estimativa de ponto de partida. Combine com médico ou nutricionista.</div>`, !r);
  return out;
}
function dietInit() {
  Object.assign(A, {
    fsearch: v => { foodSearch(v); return false; },
    metasedit: () => {
      const c = S.settings.calc;
      form('Minhas metas', [{ k: 'age', label: 'Idade', type: 'number', value: c.age }, { k: 'height', label: 'Altura (cm)', type: 'number', value: c.height }, { k: 'weight', label: 'Peso atual (kg)', type: 'number', value: c.weight }, { k: 'target', label: 'Meta de peso (kg)', type: 'number', value: c.target }, { k: 'deficit', label: 'Déficit por dia (kcal)', type: 'number', value: c.deficit }, { k: 'water', label: 'Meta de água (litros)', type: 'number', value: num(S.settings.waterGoal) / 1000 }], r => {
        ['age', 'height', 'weight', 'target', 'deficit'].forEach(k => { c[k] = r[k]; });
        if (num(r.water) > 0) S.settings.waterGoal = String(Math.round(num(r.water) * 1000));
        const o = calcOut(); if (o) { S.settings.dietKcal = String(Math.round(o.target)); S.settings.dietProt = String(o.protGoal); }
      });
      return false;
    }
  });
}
