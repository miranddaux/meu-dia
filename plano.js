/* Plano mês a mês e ano a ano (nov/2026 → 2032+).
   Dados estáticos + avisos semeados em S.reminders (uma vez, sem apagar nada).
   Datas de ENEM 2027/SISU 2028 ainda NÃO verificadas: conferir no edital do Inep. */
const PLANO_MESES = [
  { m:'2026-11', nome:'Novembro 2026', nivel:1, h:'~2h', foco:'Plano novo (17/11): prioridade é ganhar dinheiro na área. Manhã: Produto/UX (livro) + UI Boost, inglês, front-end Udemy, IA e Agentes, inglês 2 + revisão. Noite seg a qua: matemática + português (~30 min, por conhecimento); quinta: só o rodízio de natureza/humanas.', ev:[
    ['2026-11-26','IA · AI for Everyone (começa o bloco de IA da quinta)','aula'],['2026-11-30','Mini-prova: Articulando Decisões de Design','prova']] },
  { m:'2026-12', nome:'Dezembro 2026', nivel:1, h:'~2h', foco:'Claude Code na quinta. Semana leve de 21 a 27/12 e férias de 28/12 a 03/01 (só inglês, se quiser).', ev:[
    ['2026-12-03','IA · Claude Code 101 (Claude Academy)','aula'],['2026-12-05','Prova rank C · HTML e CSS','prova'],['2026-12-17','IA · Claude Code in Action','aula']] },
  { m:'2027-01', nome:'Janeiro 2027', nivel:1, h:'~2h', foco:'MCP e Agent Skills na quinta. Python fecha o rank D. Defesa oral de case.', ev:[
    ['2027-01-09','Defesa oral gravada de 1 case (5 min)','prova'],['2027-01-14','IA · Introdução ao MCP','aula'],['2027-01-16','Prova rank D · Python','prova'],['2027-01-27','Meu PIM · quiz em Python (leve)','pim'],['2027-01-28','IA · Agent Skills (criar 1 skill própria)','aula']] },
  { m:'2027-02', nome:'Fevereiro 2027', nivel:2, h:'~2h', foco:'PIM 2027.1 começa: projeto de IA que resolve um problema real (agente de métricas da Disco, se o Vini aprovar; senão, ferramenta própria publicada).', ev:[
    ['2027-02-06','PIM 2027.1 · escopo do projeto de IA','pim'],['2027-02-11','IA · Subagents','aula'],['2027-02-25','IA · Agentic AI (DeepLearning.AI)','aula']] },
  { m:'2027-03', nome:'Março 2027', nivel:2, h:'~2h', foco:'Certificação de IA. Prazo final para vaga melhor (meta de mar/2027).', ev:[
    ['2027-03-04','IA · testar o Cursor num projeto pequeno','aula'],['2027-03-25','Prova Claude Certified Associate (CCAO-F)','prova']] },
  { m:'2027-04', nome:'Abril 2027', nivel:2, h:'~2h', foco:'Inglês: primeira gravação de apresentação pessoal. PIM 2027.1 em construção (sábado).', ev:[
    ['2027-04-24','Inglês · me apresentar em 60 s (gravado)','prova']] },
  { m:'2027-05', nome:'Maio 2027', nivel:2, h:'~2h', foco:'PIM 2027.1 com usuários reais testando. ENEM só por conhecimento.', ev:[] },
  { m:'2027-06', nome:'Junho 2027', nivel:2, h:'~2h', foco:'Entregar e publicar o PIM 2027.1. Decidir se faz o ENEM 2027 (sem aumentar carga).', ev:[
    ['2027-06-12','PIM 2027.1 · entrega (publicado, demo + 1 página)','pim'],['2027-06-19','Inglês · 1ª entrevista simulada curta (10 min)','prova'],['2027-06-30','Decidir: faço o ENEM 2027? (só por conhecimento)','gate']] },
  { m:'2027-07', nome:'Julho 2027', nivel:2, h:'~2h', foco:'Rank B de JavaScript e apresentação de case com métricas.', ev:[
    ['2027-07-03','Prova rank B · JavaScript, DOM e Git','prova'],['2027-07-10','Apresentar case com métricas (10 min)','prova']] },
  { m:'2027-08', nome:'Agosto 2027', nivel:2, h:'~2h', foco:'PIM 2027.2: evoluir o projeto de IA com métricas reais.', ev:[
    ['2027-08-05','IA · Hugging Face Agents Course','aula'],['2027-08-07','PIM 2027.2 · escopo (evoluir o projeto com métricas)','pim']] },
  { m:'2027-09', nome:'Setembro 2027', nivel:2, h:'~2h', foco:'Ritmo normal. Nada de reta final de ENEM pesada.', ev:[] },
  { m:'2027-10', nome:'Outubro 2027', nivel:2, h:'~2h', foco:'Ritmo normal.', ev:[] },
  { m:'2027-11', nome:'Novembro 2027', nivel:2, h:'~2h', foco:'Rank A de React. ENEM só se decidiu fazer em junho.', ev:[
    ['2027-11-27','Prova rank A · React e componentização','prova']] },
  { m:'2027-12', nome:'Dezembro 2027', nivel:2, h:'leve', foco:'Entrega do PIM 2027.2 e entrevista simulada completa em inglês.', ev:[
    ['2027-12-11','PIM 2027.2 · entrega (demo + 1 página)','pim'],['2027-12-18','Inglês · entrevista simulada completa','prova']] }
];
const PLANO_ANOS = [
  ['Regra do PIM','2 PIM por ano, um por semestre (jan–jun e ago–dez). Tema: IA e produto, sempre resolvendo um problema real, publicado para as pessoas usarem. Leve: sábados, entrega curta (demo + 1 página).'],
  ['PIM 2027','2027.1 (entrega 12/06): projeto de IA (agente de métricas da Disco, se o Vini aprovar; senão, ferramenta própria). 2027.2 (entrega 11/12): evoluir com métricas.'],
  ['Jan–Fev 2028','Se fez o ENEM: ver nota e opções (SISU/bolsa). Faculdade não é prioridade; já tenho diploma superior.'],
  ['PIM 2028','Dois PIM com código (API, SQL, tela no ar). TCC do ciclo: projeto final no ar (ANIMAE ou projeto do bloco de IA).'],
  ['PIM 2029','Dois PIM leves; o 2.º pode virar peça do portfólio. Projetos como Product Engineer no trabalho.'],
  ['PIM 2030','Dois PIM com tema da especialização (IA aplicada ou Design Engineering). Inglês de trabalho.'],
  ['PIM 2031','Dois PIM. Posição de Product Engineer ou especialização.'],
  ['2032+','Carreira internacional e/ou concurso, conforme o resultado de cada etapa.']
];
const PLANO_TETO = 'Teto: 2–3h de estudo por dia, contando tudo. Prioridade: ganhar dinheiro na área (vaga melhor, inglês, IA). Manhã (6h–7h): carreira, código, IA e inglês. Noite (20h): seg a qua matemática + português, quinta só o rodízio. ENEM como conhecimento, ~30 min; se passar, tudo bem. Trabalho, sono, treino, espiritual e casal não entram na conta.';
const PLANO_SEMANA = [['Seg','Manhã Produto/UX (livro) + UI Boost até o certificado · Noite Matemática + Português'],['Ter','Manhã Inglês 1 (escuta e fala) · Noite Matemática + Português'],['Qua','Manhã Front-end (aula da Udemy) · Noite Matemática + Português'],['Qui','Manhã IA e Agentes (Claude Academy + projeto prático) · Noite só o rodízio de Natureza/Humanas (abaixo)'],['Sex','Manhã Inglês 2 (leitura e escrita) + revisão da semana, 1h a 1h30 · Noite livre (Nayara)'],['Sáb','09h–10h Python · 10h–12h portfólio e candidaturas (PIM leve quando houver)'],['Dom','Livre. Oficina (hardware) como hobby, sem meta'],['Provas','Carreira: ranks de código, defesa de case, certificação de IA (mar/27) e inglês (abr, jun e dez/27). ENEM pesado pausado (decisão em jun/27).']];
const PLANO_NIVEIS = ['Aprendiz', 'Escudeiro', 'Cavaleiro', 'Veterano', 'Mestre'];
const PLANO_RODIZIO = [['Natureza','Biologia (ecologia e corpo humano)'],['Humanas','Geografia (mapas, clima e população)'],['Natureza','Química (matéria, misturas e reações simples)'],['Humanas','História (Brasil e mundo, linha do tempo)'],['Natureza','Física (energia, eletricidade e movimento)'],['Humanas','Filosofia e Sociologia (conceitos e cidadania)']];
function planoRodizio(date) {
  const d0 = new Date('2026-11-09T12:00'), d1 = new Date((date || dkey()) + 'T12:00'), n = Math.max(0, Math.floor((d1 - d0) / 6048e5));
  const r = PLANO_RODIZIO[n % 6]; return { area: r[0], materia: r[1], ciclo: Math.floor(n / 6) + 1 };
}
function planoProximo() {
  const t = dkey(), ev = [];
  for (const m of PLANO_MESES) for (const e of m.ev) if (e[0] >= t) ev.push(e);
  ev.sort((x, y) => x[0].localeCompare(y[0]));
  if (!ev.length) return null;
  const e = ev[0]; return { date: e[0], title: e[1], dias: Math.round((new Date(e[0] + 'T12:00') - new Date(t + 'T12:00')) / 864e5) };
}
const PLANO_LEAD = { prova:1, simulado:1, gate:1, pim:1 };
/* 17/11/2026: troca os avisos semeados pelo plano novo (só os meus, ainda não concluídos). */
function planoAjusteV3() {
  S.flags = S.flags || {};
  if (S.flags.planoIA1711) return;
  S.flags.planoIA1711 = 1;
  S.reminders = (S.reminders || []).filter(r => !(String(r.id || '').startsWith('plano-') && !r.done));
  S.flags.planoNov26 = 0;
  planoSeed();
}
function planoSeed() {
  S.flags = S.flags || {}; S.reminders = Array.isArray(S.reminders) ? S.reminders : [];
  if (S.flags.planoNov26) return;
  S.flags.planoNov26 = 1;
  const today = dkey(), add = (id, title, date, note) => {
    if (date < today) return;
    if (!S.reminders.some(r => r.id === id || (r.date === date && r.title === title))) S.reminders.push({ id, title, date, time: '08:00', note, done: false });
  };
  const shift = (date, n) => { const d = new Date(date + 'T12:00'); d.setDate(d.getDate() + n); return dkey(d); };
  for (const mes of PLANO_MESES) {
    add('plano-mes-' + mes.m, `Novo mês: ${mes.nome} · nível ${mes.nivel}/5`, mes.m + '-01', `Carga ENEM: ${mes.h}/semana. ${mes.foco}`);
    for (const [date, title, tipo] of mes.ev) {
      if (PLANO_LEAD[tipo]) add(`plano-${date}-d3`, 'Em 3 dias: ' + title, shift(date, -3), 'Preparar com antecedência. Ver o card Plano mês a mês na aba Estudos.');
      add(`plano-${date}-d0`, (tipo === 'simulado' ? 'Hoje: ' : '') + title, date, tipo === 'simulado' ? 'Simulado completo, cronometrado, sem consulta. Corrigir depois por causa do erro.' : 'Ver o card Plano mês a mês na aba Estudos.');
    }
  }
}
function planoAjusteV2() {
  S.flags = S.flags || {};
  if (S.flags.planoBase78) return;
  S.flags.planoBase78 = 1;
  /* troca só os avisos que eu mesmo semeei e que ainda não foram concluídos */
  S.reminders = (S.reminders || []).filter(r => !(String(r.id || '').startsWith('plano-') && !r.done));
  S.flags.planoNov26 = 0;
  planoSeed();
}
function planoCard() {
  const nowM = dkey().slice(0, 7), nivel = n => '●'.repeat(n) + '○'.repeat(5 - n);
  const cur = PLANO_MESES.find(x => x.m === nowM) || PLANO_MESES[0];
  const mm = cur.ev.map(e => `<div class="mut">${esc(e[0].slice(8, 10) + '/' + e[0].slice(5, 7))} · ${esc(e[1])}</div>`).join('');
  const rows = PLANO_MESES.map(x => `<div class="item"><div class="t"><b>${esc(x.nome)}</b> <span class="mut">nível ${nivel(x.nivel)} · ENEM ${esc(x.h)}/sem</span><div class="mut">${esc(x.foco)}</div>${x.ev.map(e => `<div class="mut">• ${esc(e[0].slice(8, 10) + '/' + e[0].slice(5, 7))} ${esc(e[1])}</div>`).join('')}</div></div>`).join('');
  const anos = PLANO_ANOS.map(a => `<div class="item"><div class="t"><b>${esc(a[0])}</b><div class="mut">${esc(a[1])}</div></div></div>`).join('');
  return `<div class="card">${sec('list', 'Plano mês a mês')}<div class="mut">${esc(cur.nome)} · nível ${cur.nivel}: ${PLANO_NIVEIS[cur.nivel - 1]} ${nivel(cur.nivel)} · ENEM ${esc(cur.h)}/semana</div><div class="mut">${esc(cur.foco)}</div>${mm}
<div class="mut">${esc(PLANO_TETO)}</div><details><summary>Divisão da semana (manhã e noite)</summary>${PLANO_SEMANA.map(x => `<div class="mut">• <b>${esc(x[0])}</b>: ${esc(x[1])}</div>`).join('')}</details>
<details><summary>Rodízio da quinta (Natureza e Humanas)</summary>${PLANO_RODIZIO.map((r, i) => `<div class="mut">• ${i + 1}ª semana: <b>${esc(r[0])}</b> · ${esc(r[1])}</div>`).join('')}<div class="mut">Repete a cada 6 semanas. Cada volta sobe um degrau: 1ª volta conceitos básicos, 2ª volta aprofundar, 3ª volta com questões. Esta semana: ${esc(planoRodizio().materia)} (volta ${planoRodizio().ciclo}).</div></details>
<details><summary>Ver todos os meses até dez/2027</summary>${rows}</details>
<details><summary>Ver ano a ano (2028 em diante)</summary>${anos}<div class="mut">É plano, não promessa. Datas do ENEM 2027 e do SISU 2028 ainda precisam ser conferidas no edital.</div></details></div>`;
}
