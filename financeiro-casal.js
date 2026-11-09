'use strict';
/* Planejamento financeiro do casal. Nenhum valor pessoal no codigo publico:
   os valores reais ficam apenas em S.casal70 no dispositivo. */
function casalPlanejamentoData() {
  if (!S.casal70) S.casal70 = {};
  return S.casal70;
}
function casalPainel() {
  const p=casalPlanejamentoData(), n=k=>Math.max(0,num(p[k])), casa=n('caixa')+n('mercado')+n('energia')+n('internet')+n('streaming')+n('agua')+n('gas')+n('iptu')+n('limpeza')+n('manutCasa');
  const nay=Math.min(casa,n('nayMercado')+n('energia')+n('internet')+n('streaming')+n('nayExtra'));
  const own=casa-nay, target=casa*.3, missing=Math.max(0,target-nay);
  const pessoal=n('combustivel')+n('manutCarro')+n('saude')+n('academia')+n('celular')+n('mei')+n('assinaturas')+n('emprestimos')+n('norival')+n('lazer')+n('outros');
  const reserva=n('saldoColchao'), conjunta=n('saldoConjunto'), fatura=n('parcelasCartao')+n('extraCartao');
  const renda=n('renda'), folga=n('folga'), disponivel=renda-own-pessoal-fatura-folga;
  const aporte=Math.max(0,disponivel), save70=aporte*.7, meta30=aporte*.3;
  const status=disponivel<0?'Faltam '+brl(-disponivel)+' para fechar o mes': 'Disponivel para metas: '+brl(disponivel);
  const row=(name,value)=>'<div class="row sp"><span>'+name+'</span><b>'+brl(value)+'</b></div>';
  return '<div class="card">'+sec('house','Plano do casal · 70/30','<button class="btn sm ghost" data-a="casalsetup">'+ic('sliders')+'Editar</button>')+
   '<div class="mut">Simulacao local, sem movimentar bancos nem alterar o historico. Configure os valores reais em Editar. As metas sao separadas: colchao pessoal e meta conjunta em outro banco/papel.</div>'+
   row('Custo total da casa',casa)+row('Nayara (energia, internet, streaming, mercado e extra)',nay)+row('Voce assume da casa',own)+
   '<div class="mut">Participacao atual: '+(casa?Math.round(nay/casa*100):0)+'% Nayara / '+(casa?Math.round(own/casa*100):0)+'% voce. Para chegar a 30% falta '+brl(missing)+' na parte dela (combinar antes).</div>'+
   '<hr class="sep">'+row('Sua renda disponivel',renda)+row('Custos pessoais e obrigacoes',pessoal)+row('Cartao: parcelas + teto de compras',fatura)+row('Margem de seguranca',folga)+
   '<div class="banner '+(disponivel<0?'warn':'')+'"><span>'+status+'</span></div>'+
   '<div class="grp">Metas que nao se misturam</div>'+row('Colchao pessoal',reserva)+row('Falta para R$ 1.000',Math.max(0,1000-reserva))+
   row('Meta conjunta (outro banco/papel)',conjunta)+row('Falta para R$ 10.000',Math.max(0,10000-conjunta))+
   (disponivel>0?'<div class="mut">Sugestao 70/30 ate os primeiros R$1.000: '+brl(save70)+' no colchao e '+brl(meta30)+' na meta conjunta. A parcela de 70% continua fortalecendo sua reserva pessoal depois dos primeiros R$1.000.</div>':'<div class="mut">Sem saldo livre, nao programar aporte automatico. Ajuste custos ou renda antes.</div>')+
   '<div class="mut">Os valores sao cadastrados manualmente. A planilha financeira continua sendo a fonte para despesas mensais; esta tela e um simulador complementar e salva apenas no aparelho.</div></div>';
}
function casalPlanejamentoSetup() {
 const p=casalPlanejamentoData(), defs=[
 ['renda','Sua renda disponivel apos tributos PJ'],['caixa','Parcela da Caixa'],['mercado','Mercado total casal'],['energia','Energia (Nayara)'],
 ['internet','Internet (Nayara)'],['streaming','Crunchyroll + Netflix (Nayara)'],['nayMercado','Ajuda Nayara no mercado'],
 ['nayExtra','Outra contribuicao Nayara'],['agua','Agua'],['gas','Gas'],['iptu','IPTU por mes'],
 ['limpeza','Limpeza da casa'],['manutCasa','Manutencao da casa'],['combustivel','Gasolina'],
 ['manutCarro','Manutencao do carro'],['saude','Saude/psiquiatra'],['academia','Academia'],['celular','Telefone'],
 ['mei','MEI e custos PJ'],['assinaturas','Assinaturas pagas por voce (sem as da Nayara)'],
 ['emprestimos','Emprestimos e obrigacoes'],['norival','Parcela Norival'],['lazer','Lazer'],
 ['outros','Outros custos pessoais'],['parcelasCartao','Parcelas realmente na fatura do cartao'],
 ['extraCartao','Limite para novas compras de cartao (nao e gasto confirmado)'],['folga','Margem minima mensal'],
 ['saldoColchao','Saldo REAL do colchao pessoal'],['saldoConjunto','Saldo REAL meta conjunta (outro banco)']
 ];
 form('Planejamento do casal (local)',defs.map(([k,label])=>({k,label,type:'number',value:p[k]==null?'':p[k]})),v=>{
  defs.forEach(([k])=>{const x=Number(String(v[k]||'0').replace(',','.'));p[k]=Number.isFinite(x)?Math.max(0,x):0;});
  save();
 });
}
