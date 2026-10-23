// Ponte com a planilha financeira (Google Sheets). GET lê o mês; POST marca "PAGO", soma ou lança uma linha nova.
// Variáveis no Netlify: GOOGLE_SA_JSON (chave da conta de serviço, JSON inteiro), SHEET_ID (id da planilha), APP_KEY (a mesma do app).
// A planilha precisa estar compartilhada (Editor) com o e-mail da conta de serviço. Nada é apagado.
const { MES, noPago, norm, token, parse, ensureTab, tabName, base } = require('../lib/planilha-lib.js');
exports.handler = async event => {
  const { GOOGLE_SA_JSON, SHEET_ID, APP_KEY } = process.env;
  if (!GOOGLE_SA_JSON || !SHEET_ID || !APP_KEY) return { statusCode: 500, body: 'Faltam variáveis no Netlify (GOOGLE_SA_JSON, SHEET_ID)' };
  if ((event.headers['x-app-key'] || '') !== APP_KEY) return { statusCode: 401, body: 'Chave inválida' };
  let sa; try { sa = JSON.parse(GOOGLE_SA_JSON); } catch (e) { return { statusCode: 500, body: 'GOOGLE_SA_JSON não é um JSON válido' }; }
  const body = event.httpMethod === 'POST' ? (() => { try { return JSON.parse(event.body); } catch (e) { return null; } })() : (event.queryStringParameters || {});
  if (body && body.action === 'texto') { const pt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(new Date()); body.month = pt.find(x => x.type === 'year').value + '-' + pt.find(x => x.type === 'month').value; }
  if (body && body.action === 'ano') { // resumo do ano: um item por aba de mês que já existe (só leitura, não cria nada)
    const y = Math.round(Number(body.year)) || new Date().getFullYear(); if (y < 2000 || y > 2100) return { statusCode: 400, body: 'Ano inválido' };
    try {
      const tk = await token(sa), H = { Authorization: 'Bearer ' + tk };
      const mr = await fetch(base(SHEET_ID) + '?fields=sheets.properties.title', { headers: H }); const mj = await mr.json(); if (!mr.ok) throw new Error((mj.error && mj.error.message) || 'Erro do Google');
      const titles = (mj.sheets || []).map(x => x.properties.title), ms = [];
      for (let m = 1; m <= 12; m++) { const t = tabName(y, m); if (titles.includes(t)) ms.push({ m, t }); }
      if (!ms.length) return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, year: y, meses: [] }) };
      const qs = ms.map(x => 'ranges=' + encodeURIComponent(`'${x.t}'!A1:G70`)).join('&');
      const r = await fetch(base(SHEET_ID) + '/values:batchGet?' + qs + '&valueRenderOption=UNFORMATTED_VALUE', { headers: H }); const j = await r.json(); if (!r.ok) throw new Error((j.error && j.error.message) || 'Erro do Google');
      const meses = ms.map((x, i) => {
        const d = parse((j.valueRanges[i] && j.valueRanges[i].values) || []), r2 = v => Math.round(v * 100) / 100;
        const ent = d.entradas.reduce((a, e) => a + e.valor, 0), L = d.despesas.filter(e => !e.livre || e.valor > 0), des = L.reduce((a, e) => a + e.valor, 0), pg = L.filter(e => e.pago).reduce((a, e) => a + e.valor, 0);
        return { mes: `${y}-${String(x.m).padStart(2, '0')}`, tab: x.t, entradas: r2(ent), despesas: r2(des), pago: r2(pg), sobra: typeof d.sobra === 'number' ? r2(d.sobra) : r2(ent - des) };
      });
      return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, year: y, meses }) };
    } catch (e) { return { statusCode: 502, body: String(e.message || e) }; }
  }
  if (!body || !/^\d{4}-\d{2}$/.test(body.month || '')) return { statusCode: 400, body: 'Mês inválido' };
  const [y, m] = body.month.split('-').map(Number); if (m < 1 || m > 12) return { statusCode: 400, body: 'Mês inválido' };
  const tab = tabName(y, m), vbase = base(SHEET_ID) + '/values/';
  try {
    const tk = await token(sa), H = { Authorization: 'Bearer ' + tk, 'content-type': 'application/json' };
    const read = async () => { const r = await fetch(vbase + encodeURIComponent(`'${tab}'!A1:G70`) + '?valueRenderOption=UNFORMATTED_VALUE', { headers: H }); const j = await r.json(); if (!r.ok) throw new Error((j.error && j.error.message) || 'Erro ao ler a planilha'); return j.values || []; };
    const put = async (cell, v) => { const r = await fetch(vbase + encodeURIComponent(`'${tab}'!${cell}`) + '?valueInputOption=USER_ENTERED', { method: 'PUT', headers: H, body: JSON.stringify({ values: [[v]] }) }); if (!r.ok) throw new Error('Erro ao escrever: ' + (await r.text()).slice(0, 200)); };
    const made = await ensureTab(SHEET_ID, tk, y, m, true);
    const rows = await read(), data = parse(rows);
    if (event.httpMethod !== 'POST') return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, tab, created: made.created, from: made.from, ...data }) };
    let ac = body.action, v = Math.round(Number(body.valor) * 100) / 100;

    if (ac === 'plano') { // manda o plano do app para a aba do mês: atualiza valores das linhas que já existem e usa "LINHA VARIÁVEL" para as novas. Nunca apaga nada.
      const key = t => norm(String(t || '').replace(/\(?\s*parcela\s*\d+\s*\/\s*\d+[^)]*\)?/i, '').replace(/\([^)]*\)/g, '').replace(/parcela\s*\d+\s*\/\s*\d+/i, '')).replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
      const L = (Array.isArray(body.linhas) ? body.linhas : []).slice(0, 60).map(x => ({ nome: String(x.nome || '').slice(0, 80), valor: Math.round(Number(x.valor) * 100) / 100, hint: String(x.hint || '').slice(0, 60), sub: String(x.sub || '').slice(0, 80), id: String(x.id || '').slice(0, 90) })).filter(x => x.nome && isFinite(x.valor) && x.valor > 0);
      const used = new Set(), upd = [], nov = [], semLugar = [], pend = [], data2 = [], casados = [], ult = (body.ultimo && typeof body.ultimo === 'object') ? body.ultimo : {}, resp = body.respeitar === true;
      for (const l of L) {
        const k = key(l.nome);
        let it = k.length >= 3 ? data.despesas.find(x => !x.livre && !used.has(x.row) && (key(x.desc) === k || (key(x.desc).length >= 4 && (key(x.desc).includes(k) || k.includes(key(x.desc)))))) : null;
        if (!it && l.hint) it = data.despesas.find(x => !x.livre && !used.has(x.row) && new RegExp(l.hint.replace(/[^\p{L}|^ ]/gu, ''), 'i').test(norm(x.desc)));
        if (it) { used.add(it.row); casados.push({ id: l.id, nome: it.desc, row: it.row, sheet: it.valor, pago: it.pago }); const editado = resp && l.id && ult[l.id] != null && Math.abs(it.valor - Number(ult[l.id])) > 0.004; if (editado) continue; if (Math.abs(it.valor - l.valor) > 0.004 || (l.sub && key(it.desc) === k && norm(it.desc) !== norm(l.sub))) upd.push({ row: it.row, nome: it.desc, de: it.valor, para: l.valor, pago: it.pago, novoNome: l.sub && !it.pago ? l.sub : null }); }
        else pend.push(l);
      }
      const rest = data.despesas.filter(x => !x.livre && !used.has(x.row) && x.valor > 0);
      const limpar = body.zerar === true ? rest.filter(x => !x.pago) : [];
      const soPlanilha = rest.filter(x => !limpar.includes(x)).map(x => ({ nome: x.desc, valor: x.valor }));
      const free = data.despesas.filter(x => x.livre && !x.valor).concat(limpar); let fi = 0;
      for (const l of pend) { if (fi < free.length) { const sl = free[fi++]; nov.push({ row: sl.row, nome: l.sub || l.nome, para: l.valor }); } else semLugar.push(l.nome); }
      const reuse = new Set(nov.map(n => n.row)), saem = limpar.filter(x => !reuse.has(x.row)).map(x => ({ row: x.row, nome: x.desc, valor: x.valor })), troca = limpar.filter(x => reuse.has(x.row)).map(x => ({ nome: x.desc, valor: x.valor }));
      const sal = data.entradas.find(x => /^SAL/i.test(norm(x.desc))); let renda = null;
      const rEd = resp && ult.renda != null && sal && Math.abs(sal.valor - Number(ult.renda)) > 0.004; const sheetRenda = sal ? sal.valor : null;
      if (!rEd && Number.isFinite(Number(body.renda)) && Number(body.renda) > 0 && sal && Math.abs(sal.valor - Number(body.renda)) > 0.004) renda = { row: sal.row, nome: sal.desc, de: sal.valor, para: Math.round(Number(body.renda) * 100) / 100 };
      if (body.apply === true) {
        upd.forEach(u => { data2.push({ range: `'${tab}'!G${u.row}`, values: [[u.para]] }); if (u.novoNome) data2.push({ range: `'${tab}'!F${u.row}`, values: [[u.novoNome + (u.pago ? ' PAGO' : '')]] }); });
        saem.forEach(x => { data2.push({ range: `'${tab}'!F${x.row}`, values: [['LINHA VARIÁVEL']] }); data2.push({ range: `'${tab}'!G${x.row}`, values: [[0]] }); });
        nov.forEach(n => { data2.push({ range: `'${tab}'!F${n.row}`, values: [[n.nome]] }); data2.push({ range: `'${tab}'!G${n.row}`, values: [[n.para]] }); });
        if (renda) data2.push({ range: `'${tab}'!C${renda.row}`, values: [[renda.para]] });
        if (data2.length) { const r = await fetch(base(SHEET_ID) + '/values:batchUpdate', { method: 'POST', headers: H, body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data: data2 }) }); if (!r.ok) throw new Error('Erro ao escrever: ' + (await r.text()).slice(0, 200)); }
      }
      return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, tab, applied: body.apply === true, renda, sheetRenda, casados, atualizar: upd, novas: nov, semLugar, soPlanilha, saem, troca }) };
    }
    if (ac === 'marcar') { // marca ou desmarca "PAGO" numa linha que já existe (nunca cria linha)
      const kk = t => norm(String(t || '').replace(/\([^)]*\)/g, '').replace(/parcela\s*\d+\s*\/\s*\d+/i, '')).replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim(), k = kk(body.desc);
      const it = k.length >= 3 ? data.despesas.find(x => !x.livre && (kk(x.desc) === k || (kk(x.desc).length >= 4 && (kk(x.desc).includes(k) || k.includes(kk(x.desc)))))) : null;
      if (!it) return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, achou: false }) };
      if (it.pago !== (body.paid === true)) await put('F' + it.row, it.desc + (body.paid === true ? ' PAGO' : ''));
      return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, achou: true }) };
    }
    const CATX = { Mercado: 'ALIMENT|MERCADO', Transporte: 'GASOLINA|TRANSP|COMBUST', Lazer: 'LAZER', Assinaturas: 'ASSINAT', 'Academia/Suplementos': 'ACADEMIA', Saúde: 'FARM|SAUDE', Pet: 'PET|ANIMA', Estudos: 'CURSO|ESTUD', Moradia: 'ALUGUEL|MORADIA|CONDOM' };
    const CATIN = { Salário: '^SAL', Freelance: 'FREELA', 'Outras entradas': 'OUTRAS|EXTRA' };
    const KW = [[/mercad|padaria|feira|ifood|lanche|restaur|pizza|comida|almo[cç]o|jantar/i, 'Mercado'], [/gasolina|combust|uber|99|[oô]nibus/i, 'Transporte'], [/lazer|cinema|bar |show|jogo|netflix|streaming/i, 'Lazer'], [/farm|rem[eé]dio/i, 'Saúde'], [/academia|suplement|whey/i, 'Academia/Suplementos'], [/pet|ra[cç][aã]o|veterin|cachorro/i, 'Pet']];
    const rx = t => { try { return new RegExp(String(t || '(?!)'), 'i'); } catch (e) { return /(?!)/; } };
    const pick = (list, desc, hint, catRx) => { const d = norm(desc); let it = d.length >= 3 ? list.find(x => !x.livre && (norm(x.desc).includes(d) || (norm(x.desc).length >= 3 && d.includes(norm(x.desc))))) : null; if (!it && hint && /^[\p{L}|^ ]{2,40}$/u.test(hint)) it = list.find(x => !x.livre && rx(norm(hint)).test(norm(x.desc))); if (!it && catRx) it = list.find(x => !x.livre && rx(catRx).test(norm(x.desc))); return it; };
    const slot = () => { const sl = data.despesas.find(x => x.livre && !x.valor); if (!sl) throw new Error('Sem linha livre neste mês (LINHA VARIÁVEL).'); return sl; };
    if (ac === 'texto') {
      const t = String(body.texto || '').trim(), mt = t.match(/(\d+(?:[.,]\d{1,2})?)\s*$/) || t.match(/(\d+(?:[.,]\d{1,2})?)/);
      if (!mt) throw new Error('Não achei o valor. Escreva assim: Mercado 45'); const val = Number(mt[1].replace(',', '.')), dsc = t.replace(mt[0], '').trim() || 'Gasto';
      const kw = KW.find(([r]) => r.test(dsc)); Object.assign(body, { action: 'auto', type: 'out', desc: dsc, valor: val, cat: kw ? kw[1] : '' }); ac = 'auto'; v = Math.round(val * 100) / 100;
    }
    if (body.action === 'auto') {
      if (!isFinite(v) || v <= 0) throw new Error('Valor inválido');
      let msg; const und = body.undo === true, dl = und ? -v : v, notFound = 'A linha mudou ou não existe mais. Ajuste direto na planilha.';
      if (body.type === 'in') { const it = pick(data.entradas, body.desc, '', CATIN[body.cat]); if (!it) throw new Error(und ? notFound : 'Não achei a linha de entrada na planilha.'); await put('C' + it.row, Math.max(0, Math.round((it.valor + dl) * 100) / 100)); msg = `Entrada ${v} em ${it.desc}`; }
      else if (body.bill) { const it = pick(data.despesas, body.desc, body.hint, CATX[body.cat]); if (und) { if (!it) throw new Error(notFound); if (it.pago) await put('F' + it.row, it.desc); msg = `${it.desc} desmarcada`; } else if (it) { if (!it.pago) await put('F' + it.row, it.desc + ' PAGO'); msg = `${it.desc} marcada como paga`; } else { const sl = slot(); await put('F' + sl.row, String(body.desc).slice(0, 80)); await put('G' + sl.row, v); msg = `${body.desc} lançada em linha nova`; } }
      else { const it = pick(data.despesas, body.desc, body.hint, CATX[body.cat]); if (und && !it) throw new Error(notFound); if (it) { await put('G' + it.row, Math.max(0, Math.round((it.valor + dl) * 100) / 100)); msg = `${dl} somado em ${it.desc}`; } else { const sl = slot(); await put('F' + sl.row, String(body.desc || body.cat || 'Gasto').slice(0, 80)); await put('G' + sl.row, v); msg = `${body.desc || body.cat}: ${v} em linha nova`; } }
      return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, msg }) };
    }
    const find = () => { const it = data.despesas.find(x => x.row === body.row); if (!it || norm(it.desc) !== norm(body.desc)) throw new Error('A linha mudou na planilha. Atualize e tente de novo.'); return it; };
    if (ac === 'pago') { const it = find(); await put('F' + it.row, it.desc + (body.paid ? ' PAGO' : '')); }
    else if (ac === 'soma') { const it = find(); if (!isFinite(v) || v <= 0) throw new Error('Valor inválido'); await put('G' + it.row, Math.round((it.valor + v) * 100) / 100); }
    else if (ac === 'entrada') { const it = data.entradas.find(x => x.row === body.row); if (!it || norm(it.desc) !== norm(body.desc)) throw new Error('A linha mudou na planilha. Atualize e tente de novo.'); if (!isFinite(v) || v <= 0) throw new Error('Valor inválido'); await put('C' + it.row, Math.round((it.valor + v) * 100) / 100); }
    else if (ac === 'nova') {
      if (!isFinite(v) || v <= 0) throw new Error('Valor inválido');
      const slot = data.despesas.find(x => x.livre && !x.valor); if (!slot) throw new Error('Sem linha livre neste mês (LINHA VARIÁVEL).');
      await put('F' + slot.row, String(body.desc || 'Gasto').slice(0, 80)); await put('G' + slot.row, v);
    } else return { statusCode: 400, body: 'Ação inválida' };
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true }) };
  } catch (e) { return { statusCode: 502, body: String(e.message || e) }; }
};
