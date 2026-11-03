'use strict';
/* =====================================================================
   Minha visão: fotos de onde você quer chegar (corpo e vida).
   As fotos ficam SÓ no aparelho (IndexedDB, o mesmo lugar das fotos de evolução).
   Nada de imagem vai para o código nem para o GitHub.
   Grupos: 'corpo' (aparece no Treino e no fim do treino) e 'vida' (aparece na Jornada).
   ===================================================================== */
const VS_G = {
  corpo: { t: 'Onde eu quero chegar', vazio: 'Coloque aqui as fotos do corpo que você quer construir. Elas aparecem antes de cada treino.' },
  vida: { t: 'A vida que estou construindo', vazio: 'Coloque aqui as fotos da vida que você quer ter. Lembram por que você cuida de tudo isso.' }
};
const VS = () => { S.visao = S.visao || { itens: [] }; S.visao.itens = S.visao.itens || []; return S.visao; };
const vsItens = g => VS().itens.filter(x => x.grupo === g).sort((a, b) => (a.ord || 0) - (b.ord || 0));

/* faixa de fotos (rolagem lateral, toque abre em tela cheia) */
function visaoStrip(g, sub) {
  const it = vsItens(g), ed = ui.vsEdit === g, G = VS_G[g];
  const add = `<label class="btn sm ghost" for="vsf-${g}">${ic('plus')}Foto</label><input id="vsf-${g}" type="file" accept="image/*" multiple data-c="visaofile" data-v="${g}" hidden>`;
  if (!it.length) return `<div class="card vs-card">${sec(g === 'corpo' ? 'human-run' : 'heart', G.t)}<div class="mut">${G.vazio}</div><div class="row wrap">${add}<label class="btn sm ghost" for="vsj-${g}">${ic('upload')}Importar arquivo</label><input id="vsj-${g}" type="file" accept=".json,application/json" data-c="visaojson" hidden></div></div>`;
  return `<div class="card vs-card">${sec(g === 'corpo' ? 'human-run' : 'heart', G.t, `<button class="btn sm ghost" data-a="vsedit" data-v="${g}" aria-pressed="${ed}">${ed ? 'Pronto' : 'Editar'}</button>`)}
${sub ? `<div class="mut">${esc(sub)}</div>` : ''}
<div class="vs-strip" role="list">${it.map((x, i) => `<div class="vs-it" role="listitem"><button class="vs-th" data-a="vsopen" data-v="${g}" data-w="${i}" aria-label="Abrir foto ${i + 1}${x.titulo ? ': ' + esc(x.titulo) : ''}"><img data-ph="${x.id}" alt=""></button>${ed ? `<div class="vs-ed"><button class="btn ico sm ghost" data-a="vsmove" data-v="${x.id}" data-w="-1" aria-label="Mover para a esquerda">${ic('chevron-left')}</button><button class="btn ico sm danger" data-a="vsdel" data-v="${x.id}" aria-label="Apagar esta foto">${ic('trash')}</button></div>` : ''}</div>`).join('')}<div class="vs-it"><label class="vs-th vs-add" for="vsf-${g}" aria-label="Adicionar foto">${ic('plus')}<span>Foto</span></label></div></div><input id="vsf-${g}" type="file" accept="image/*" multiple data-c="visaofile" data-v="${g}" hidden>
${g === 'corpo' ? '<div class="mut">Toque numa foto para ampliar. Na foto aberta, "Usar no fim do treino" escolhe a que aparece quando você termina.</div>' : ''}</div>`;
}
/* uma foto grande, que troca a cada dia (fim do treino) */
function visaoHero(g, txt) {
  const it = vsItens(g); if (!it.length) return '';
  const x = it.find(y => y.id === VS().heroId) || it[Math.floor(Date.now() / 864e5) % it.length];
  return `<button class="vs-hero" data-a="vsopen" data-v="${g}" data-w="${it.indexOf(x)}" aria-label="Ver foto da sua visão"><img data-ph="${x.id}" alt=""><span>${esc(txt)}</span></button>`;
}
/* tela cheia: deslize ou use as setas */
function visaoView(g, i) {
  const it = vsItens(g); if (!it.length) return;
  let k = Math.max(0, Math.min(it.length - 1, +i || 0)), z = 1;
  const m = document.createElement('div'); m.className = 'modal vs-lb'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-label', VS_G[g].t);
  const draw = async () => {
    const x = it[k], hero = VS().heroId === x.id; z = 1; m.innerHTML = `<div class="vs-lbin"><div class="row sp"><span class="px">${esc(VS_G[g].t)}</span><button class="btn ico ghost" data-x aria-label="Fechar">${ic('close')}</button></div><div class="vs-zoom"><img alt="${esc(x.titulo || '')}"></div><div class="row sp"><div class="row"><button class="btn ico ghost" data-z="-1" aria-label="Diminuir zoom">${ic('minus')}</button><button class="btn ico ghost" data-z="1" aria-label="Aumentar zoom">${ic('plus')}</button></div>${g === 'corpo' ? `<button class="btn sm ${hero ? '' : 'ghost'}" data-hero="${x.id}" aria-pressed="${hero}">${ic(hero ? 'check' : 'trophy')}${hero ? 'Aparece no fim do treino' : 'Usar no fim do treino'}</button>` : ''}</div><div class="row sp"><button class="btn ico ghost" data-p="-1" aria-label="Anterior" ${k ? '' : 'disabled'}>${ic('chevron-left')}</button><span class="mut">${k + 1} de ${it.length}${x.titulo ? ' · ' + esc(x.titulo) : ''}</span><button class="btn ico ghost" data-p="1" aria-label="Próxima" ${k < it.length - 1 ? '' : 'disabled'}>${ic('chevron-right')}</button></div></div>`;
    try { if (!urlCache[x.id]) { const bl = await idbGet(x.id); if (bl) urlCache[x.id] = URL.createObjectURL(bl); } m.querySelector('img').src = urlCache[x.id] || ''; } catch (e) { }
  };
  const zoom = n => { z = Math.max(1, Math.min(4, n)); const im = m.querySelector('.vs-zoom img'); if (im) im.style.width = (z * 100) + '%'; m.classList.toggle('zoomed', z > 1); };
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-x]')) { m.remove(); return; } const p = e.target.closest('[data-p]'); if (p && !p.disabled) { k += +p.dataset.p; draw(); return; } const zb = e.target.closest('[data-z]'); if (zb) { zoom(z + (+zb.dataset.z)); return; } const h = e.target.closest('[data-hero]'); if (h) { const v = VS(); v.heroId = v.heroId === h.dataset.hero ? null : h.dataset.hero; save(); render(); toast(v.heroId ? 'Essa foto aparece quando você termina o treino.' : 'Volta a trocar a foto a cada dia.'); draw(); } });
  m.addEventListener('dblclick', e => { if (e.target.closest('.vs-zoom')) zoom(z > 1 ? 1 : 2.5); });
  let sx = null; m.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  m.addEventListener('touchend', e => { if (sx == null || z > 1) { sx = null; return; } const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 50) { const n = k + (dx < 0 ? 1 : -1); if (n >= 0 && n < it.length) { k = n; draw(); } } });
  document.body.appendChild(m); draw();
}
async function visaoAdd(g, blob, titulo, key) {
  const v = VS(), ex = key && v.itens.find(x => x.key === key);
  if (ex) { let has = null; try { has = await idbGet(ex.id); } catch (e) { } if (has) return false; await idbPut(ex.id, blob); return true; } /* veio de um backup sem a imagem: repõe */
  const id = 'vs_' + uid(); await idbPut(id, blob);
  v.itens.push({ id, grupo: g, titulo: titulo || '', key: key || '', ord: Math.max(0, ...v.itens.filter(x => x.grupo === g).map(x => x.ord || 0)) + 1 }); return true;
}
/** Arquivo {"visao":[{"grupo":"corpo|vida","titulo":"","img":"data:image/jpeg;base64,..."}]} */
async function visaoImport(arr) {
  if (!Array.isArray(arr)) return; let n = 0;
  for (const x of arr) { if (!x || !/^data:image\//.test(x.img || '') || !VS_G[x.grupo]) continue; try { const bl = await (await fetch(x.img)).blob(); const key = x.key || (x.grupo + ':' + (x.titulo || '') + ':' + String(x.img).length); if (await visaoAdd(x.grupo, bl, x.titulo, key)) n++; if (x.fimDoTreino) { const f = VS().itens.find(y => y.key === key); if (f) VS().heroId = f.id; } } catch (e) { } }
  save(); render(); toast(n ? `${n} foto(s) adicionada(s) à sua visão.` : 'Essas fotos já estavam na sua visão.');
}
function visaoInit() {
  Object.assign(A, {
    vsopen: (g, i) => { visaoView(g, i); return false; },
    vsedit: g => { ui.vsEdit = ui.vsEdit === g ? null : g; },
    vsdel: v => { if (!confirm('Apagar esta foto da sua visão?')) return false; VS().itens = VS().itens.filter(x => x.id !== v); idbDel(v).catch(() => { }); save(); },
    vsmove: (v, w) => { const x = VS().itens.find(y => y.id === v); if (!x) return false; const l = vsItens(x.grupo), i = l.indexOf(x), j = i + (+w); if (j < 0 || j >= l.length) return false; const t = l[j].ord; l[j].ord = x.ord; x.ord = t; save(); }
  });
  Object.assign(C, {
    visaofile: async (val, g, el) => { const fs = [...(el.files || [])]; let n = 0; for (const f of fs) { try { if (await visaoAdd(g, await shrink(f, 1400), '')) n++; } catch (e) { } } el.value = ''; save(); render(); if (n) toast(`${n} foto(s) adicionada(s).`); },
    visaojson: async (val, g, el) => { const f = el.files && el.files[0]; el.value = ''; if (!f) return; try { const j = JSON.parse(await f.text()); if (j.visao) await visaoImport(j.visao); else alert('Esse arquivo não tem fotos da visão.'); } catch (e) { alert('Não consegui ler esse arquivo.'); } }
  });
}
