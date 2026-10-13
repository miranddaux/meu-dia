// Agendada: todo dia 25 às 12h (UTC) cria a aba do mês seguinte na planilha, copiando o mês atual (sem os "PAGO").
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { token, ensureTab } = require('../lib/planilha-lib.js');
export default async () => {
  const { GOOGLE_SA_JSON, SHEET_ID } = process.env;
  if (!GOOGLE_SA_JSON || !SHEET_ID) return new Response('sem variáveis', { status: 500 });
  const now = new Date(), nx = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const tk = await token(JSON.parse(GOOGLE_SA_JSON));
  const r = await ensureTab(SHEET_ID, tk, nx.getFullYear(), nx.getMonth() + 1);
  console.log('mes-novo', JSON.stringify(r));
  return new Response(JSON.stringify(r));
};
export const config = { schedule: '0 12 25 * *' };
