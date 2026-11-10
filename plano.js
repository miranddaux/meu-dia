/* Plano mês a mês e ano a ano (nov/2026 → 2032+).
   Dados estáticos + avisos semeados em S.reminders (uma vez, sem apagar nada).
   Datas de ENEM 2027/SISU 2028 ainda NÃO verificadas: conferir no edital do Inep. */
const PLANO_MESES = [
  { m:'2026-11', nome:'Novembro 2026', nivel:1, h:'5h', foco:'BASE, sem prova e sem questão. Noite (20h): Matemática Básica do Prof. Ferretto (aulas 6 a 47) e leitura. Manhã (6h): carreira e código como já está.', ev:[] },
  { m:'2026-12', nome:'Dezembro 2026', nivel:1, h:'5h (leve de 14 a 27/12)', foco:'Base continua. Férias leves de 14 a 27/12: só flashcards e inglês. Volta ao ritmo em 04/01.', ev:[] },
  { m:'2027-01', nome:'Janeiro 2027', nivel:2, h:'5h', foco:'Terminar Matemática Básica. Começar razão, proporção e porcentagem. Português: leitura e interpretação. CC1 termina com prova.', ev:[
    ['2027-01-16','Prova rank D · CC1 (lógica/Python)','prova'],['2027-01-29','Checkpoint de base: 15 questões fáceis de Matemática (só para medir)','check']] },
  { m:'2027-02', nome:'Fevereiro 2027', nivel:2, h:'5h', foco:'Regra de três, porcentagem e juros. Redação: aprender a estrutura (introdução, desenvolvimento, proposta). CC2 (JS e Git) em paralelo.', ev:[
    ['2027-02-26','Primeira redação de treino (só estrutura, sem nota)','check']] },
  { m:'2027-03', nome:'Março 2027', nivel:2, h:'5h', foco:'Estatística, gráficos, tabelas e geometria plana. Português: figuras de linguagem e gêneros.', ev:[
    ['2027-03-27','Diagnóstico 1 · Matemática (sábado, janela 09–12)','diag']] },
  { m:'2027-04', nome:'Abril 2027', nivel:3, h:'5h', foco:'Começam as questões por assunto (provas antigas) e os diagnósticos das outras áreas. CC3: estruturas de dados.', ev:[
    ['2027-04-03','Diagnóstico 2 · Linguagens (sábado)','diag'],['2027-04-10','Diagnóstico 3 · Humanas (sábado)','diag'],['2027-04-17','Diagnóstico 4 · Natureza (sábado)','diag'],['2027-04-24','Diagnóstico 5 · Redação (sábado)','diag'],
    ['2027-04-30','G1 · a base subiu? decidir se vai para 6h','gate']] },
  { m:'2027-05', nome:'Maio 2027', nivel:3, h:'6h', foco:'Funções, geometria espacial e probabilidade. Questões por competência e 1 redação por semana. Caderno de Erros do ENEM.', ev:[['2027-05-29','Mini-prova mensal ENEM','mini']] },
  { m:'2027-06', nome:'Junho 2027', nivel:3, h:'6h', foco:'Fechar o semestre de base. Decidir FUVEST/UNESP e a carga das fases finais.', ev:[
    ['2027-06-26','Mini-prova mensal ENEM','mini'],['2027-06-30','G2 · decidir FUVEST/UNESP e se jul–out usa 7–8h (trocando com código)','gate']] },
  { m:'2027-07', nome:'Julho 2027', nivel:4, h:'7h (no lugar do código)', foco:'Fase de simulados. Prova rank B do CC2. Corrigir cada simulado por causa do erro.', ev:[
    ['2027-07-03','Prova rank B · CC2 (JS/Git)','prova'],['2027-07-17','Simulado 1 ENEM','simulado']] },
  { m:'2027-08', nome:'Agosto 2027', nivel:4, h:'7h (no lugar do código)', foco:'Simulados e revisão dos pontos fracos.', ev:[['2027-08-14','Simulado 2 ENEM','simulado']] },
  { m:'2027-09', nome:'Setembro 2027', nivel:5, h:'8h (no lugar do código)', foco:'Reta final: o ENEM ocupa o lugar do código (pausado). Trabalho, sono, treino, espiritual e casal ficam intactos.', ev:[
    ['2027-09-11','Simulado 3 ENEM','simulado'],['2027-09-25','Simulado 4 ENEM','simulado']] },
  { m:'2027-10', nome:'Outubro 2027', nivel:5, h:'8h (no lugar do código)', foco:'Simulados finais, redação e descanso. Não começar assunto novo.', ev:[
    ['2027-10-09','Simulado 5 ENEM','simulado'],['2027-10-16','Simulado 6 ENEM (último)','simulado']] },
  { m:'2027-11', nome:'Novembro 2027', nivel:3, h:'leve', foco:'ENEM 2027 (conferir datas oficiais do Inep). Depois: descansar e voltar ao código.', ev:[
    ['2027-11-01','G3 · conferir datas oficiais do ENEM e plano de prova','gate']] },
  { m:'2027-12', nome:'Dezembro 2027', nivel:3, h:'só código', foco:'CC4: SQL + Projeto Final (vira o TCC do ciclo). Resultado do ENEM em janeiro.', ev:[
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
const PLANO_TETO = 'Teto: 2–3h de estudo por dia, contando tudo. Manhã (6h–7h): carreira e código, como já é. Noite (20h–21h): ENEM. Quando o ENEM sobe, ele TROCA com código/portfólio, não soma. Trabalho, sono, treino, espiritual e casal não entram na conta.';
const PLANO_SEMANA = [['Seg','Manhã UX · Noite Matemática'],['Ter','Manhã Inglês · Noite Português e leitura (alterna com literatura)'],['Qua','Manhã HTML/CSS · Noite Matemática'],['Qui','Manhã UI/Design System · Noite Natureza ou Humanas (rodízio abaixo)'],['Sex','Manhã: flashcards 30 min + redação 30–40 min · Noite livre (Nayara)'],['Sáb','09h–12h: Python, portfólio e candidaturas, revisão dos erros do ENEM'],['Dom','Soft skills 20–30 min, só se der vontade (opcional, sem cobrança)'],['Provas','Nov/26 a mar/27 só base. Diagnósticos no sábado, de 27/03 a 24/04/27. Simulados de jul a out/27 no sábado (cerca de 5h, 6 vezes).']];
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
function planoAjusteV2() {
  S.flags = S.flags || {};
  if (S.flags.planoBase76) return;
  S.flags.planoBase76 = 1;
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
