/* Plano mês a mês e ano a ano (nov/2026 → 2032+).
   Dados estáticos + avisos semeados em S.reminders (uma vez, sem apagar nada).
   Datas de ENEM 2027/SISU 2028 ainda NÃO verificadas: conferir no edital do Inep. */
const PLANO_MESES = [
  { m:'2026-11', nome:'Novembro 2026', nivel:1, h:'1h', foco:'Diagnóstico do ENEM 2024 (1 bloco por sexta). CC1: lógica e Python.', ev:[
    ['2026-11-20','Diagnóstico 1 · Matemática (sexta)','diag'],['2026-11-27','Diagnóstico 2 · Linguagens (sexta)','diag']] },
  { m:'2026-12', nome:'Dezembro 2026', nivel:1, h:'1h', foco:'Fechar diagnóstico e montar o mapa de erros por causa. Início do Projeto Final do CC é só em dez/2027.', ev:[
    ['2026-12-04','Diagnóstico 3 · Humanas (sexta)','diag'],['2026-12-11','Diagnóstico 4 · Natureza (sexta)','diag'],['2026-12-18','Diagnóstico 5 · Redação (sexta)','diag']] },
  { m:'2027-01', nome:'Janeiro 2027', nivel:2, h:'2,5h', foco:'ENEM base: Matemática e Português. CC1 termina com prova. Meu PIM: quiz em Python.', ev:[
    ['2027-01-16','Prova rank D · CC1 (lógica/Python)','prova'],['2027-01-30','Mini-prova mensal ENEM','mini']] },
  { m:'2027-02', nome:'Fevereiro 2027', nivel:2, h:'2,5h', foco:'ENEM base + CC2 (JavaScript e Git).', ev:[['2027-02-27','Mini-prova mensal ENEM','mini']] },
  { m:'2027-03', nome:'Março 2027', nivel:2, h:'2,5h', foco:'ENEM base + CC2. Diagnóstico 2 mostra se a base subiu.', ev:[
    ['2027-03-26','Diagnóstico 2 (sexta): comparar com o de nov/dez','diag'],['2027-03-27','Mini-prova mensal ENEM','mini']] },
  { m:'2027-04', nome:'Abril 2027', nivel:3, h:'3–4h', foco:'Sobe a carga SE o G1 estiver ok. PIM: Caderno de Erros do ENEM. CC3: estruturas de dados.', ev:[
    ['2027-04-01','G1 · decidir se a carga sobe (base subiu? rotina aguentou?)','gate'],['2027-04-24','Mini-prova mensal ENEM','mini']] },
  { m:'2027-05', nome:'Maio 2027', nivel:3, h:'3–4h', foco:'Questões por competência + redação quinzenal. CC3.', ev:[['2027-05-29','Mini-prova mensal ENEM','mini']] },
  { m:'2027-06', nome:'Junho 2027', nivel:3, h:'3–4h', foco:'Fechar semestre. Decidir FUVEST/UNESP e carga das fases finais.', ev:[
    ['2027-06-26','Mini-prova mensal ENEM','mini'],['2027-06-30','G2 · decidir FUVEST/UNESP e carga de jul–out','gate']] },
  { m:'2027-07', nome:'Julho 2027', nivel:4, h:'4–5h', foco:'Fase de simulados começa. Prova rank B do CC2. Corrigir cada simulado por causa do erro.', ev:[
    ['2027-07-03','Prova rank B · CC2 (JS/Git)','prova'],['2027-07-17','Simulado 1 ENEM','simulado']] },
  { m:'2027-08', nome:'Agosto 2027', nivel:4, h:'4–5h', foco:'Simulados + revisão dos pontos fracos.', ev:[['2027-08-14','Simulado 2 ENEM','simulado']] },
  { m:'2027-09', nome:'Setembro 2027', nivel:5, h:'6–8h (só com sinais verdes)', foco:'Reta final. Trilha de código pausada. Sono e treino protegidos.', ev:[
    ['2027-09-11','Simulado 3 ENEM','simulado'],['2027-09-25','Simulado 4 ENEM','simulado']] },
  { m:'2027-10', nome:'Outubro 2027', nivel:5, h:'6–8h (só com sinais verdes)', foco:'Simulados finais, redação e descanso. Não começar assunto novo.', ev:[
    ['2027-10-09','Simulado 5 ENEM','simulado'],['2027-10-16','Simulado 6 ENEM (último)','simulado']] },
  { m:'2027-11', nome:'Novembro 2027', nivel:3, h:'leve', foco:'ENEM 2027 (conferir datas oficiais do Inep). Depois: descansar e voltar ao código.', ev:[
    ['2027-11-01','G3 · conferir datas oficiais do ENEM e plano de prova','gate']] },
  { m:'2027-12', nome:'Dezembro 2027', nivel:3, h:'código 4–5h', foco:'CC4: SQL + Projeto Final (vira o TCC do ciclo). Resultado do ENEM em janeiro.', ev:[
    ['2027-12-06','Início do Projeto Final · CC4','tcc']] }
];
const PLANO_ANOS = [
  ['Jan–Fev 2028','Entrega do Projeto Final (TCC do ciclo). SISU/bolsa com a melhor nota das últimas 3 edições do ENEM. Datas a confirmar.'],
  ['2028','Entrar na faculdade pública/bolsa, se a nota permitir. CC5: sistemas operacionais, redes, nuvem, álgebra linear, estatística. Meta de trabalho: Product Designer pleno com código.'],
  ['2029','Primeiros projetos como Product Engineer no trabalho. PIM/iniciação ligada a produto. Portfólio em código.'],
  ['2030','Especialização (Design Systems, front-end avançado ou produto técnico). Nível de inglês de entrevista.'],
  ['2031','TCC da faculdade (se estiver cursando). Posição de Product Engineer.'],
  ['2032+','Concurso e/ou carreira internacional, conforme o resultado de cada etapa.']
];
const PLANO_LEAD = { prova:1, simulado:1, gate:1, tcc:1 };
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
function planoCard() {
  const nowM = dkey().slice(0, 7), nivel = n => '●'.repeat(n) + '○'.repeat(5 - n);
  const cur = PLANO_MESES.find(x => x.m === nowM) || PLANO_MESES[0];
  const mm = cur.ev.map(e => `<div class="mut">${esc(e[0].slice(8, 10) + '/' + e[0].slice(5, 7))} · ${esc(e[1])}</div>`).join('');
  const rows = PLANO_MESES.map(x => `<div class="item"><div class="t"><b>${esc(x.nome)}</b> <span class="mut">nível ${nivel(x.nivel)} · ENEM ${esc(x.h)}/sem</span><div class="mut">${esc(x.foco)}</div>${x.ev.map(e => `<div class="mut">• ${esc(e[0].slice(8, 10) + '/' + e[0].slice(5, 7))} ${esc(e[1])}</div>`).join('')}</div></div>`).join('');
  const anos = PLANO_ANOS.map(a => `<div class="item"><div class="t"><b>${esc(a[0])}</b><div class="mut">${esc(a[1])}</div></div></div>`).join('');
  return `<div class="card">${sec('list', 'Plano mês a mês')}<div class="mut">${esc(cur.nome)} · dificuldade ${nivel(cur.nivel)} · ENEM ${esc(cur.h)}/semana</div><div class="mut">${esc(cur.foco)}</div>${mm}
<details><summary>Ver todos os meses até dez/2027</summary>${rows}</details>
<details><summary>Ver ano a ano (2028 em diante)</summary>${anos}<div class="mut">É plano, não promessa. Datas do ENEM 2027 e do SISU 2028 ainda precisam ser conferidas no edital.</div></details></div>`;
}
