# Meu Dia v43 — Jornada, XP, Notion e continuidade

Este arquivo é o handoff entre ChatGPT, Claude Code e o design no Figma.

## Princípios que devem ser preservados

- O Meu Dia é um app pessoal/PWA. Dados pessoais e financeiros reais não devem ser hardcoded no repositório público.
- O estado privado fica no aparelho e no backup/sincronização já existentes.
- Não criar um segundo sistema de XP, lembretes ou finanças. Evoluir as estruturas atuais.
- Sem punição, perda de XP ou streak punitiva. Progresso é acumulativo.
- Domingo continua livre: igreja como meta principal; o restante não vira dívida.
- O Design System atual deve ser respeitado: estética pixel, ChakraP + PixelPS, borda 3px, cards com sombra dura, tokens CSS existentes.

## Jornada principal

A aba Mais abre por padrão em **Jornada**.

A Jornada agrega:

1. **Nível geral**
   - XP total acumulado.
   - Barra para o próximo nível.
   - Sem perda de XP.

2. **Próximas ações**
   - tarefas do Roadmap/Notion vencidas ou de hoje;
   - lembretes pessoais vencidos ou de hoje;
   - estudo do dia ainda não concluído;
   - ação semanal do Mapa da Vida;
   - meta financeira do dia de pagamento.

3. **Atributos de RPG**
   - Estudos
   - Profissional
   - Saúde
   - Financeiro
   - Emocional
   - Relacionamentos
   - Espiritual

4. **Mapa da Vida**
   - continua usando a Roda da Vida semanal existente;
   - nota 0–10 por área;
   - uma ação pequena por área;
   - concluir a ação alimenta XP.

5. **Conexões**
   - Roadmap/Notion
   - avisos no iPhone
   - backup na nuvem

## Integração com Notion

Já existe infraestrutura em:
- `netlify/functions/sync.js`: registro diário no banco Meu Dia;
- `netlify/functions/roadmap.js`: leitura do Roadmap e atualização de Status;
- `netlify/functions/backup.js`: backup do estado no Notion.

O app usa `NOTION_TOKEN`, `NOTION_DB`, `NOTION_ROADMAP_DB` e `APP_KEY` no ambiente do Netlify.

### Roadmap -> Meu Dia

O app lê:
- Tópico
- Data
- Tipo
- Categoria
- Status
- XP
- Critério de conclusão

Itens atrasados e do dia aparecem na Jornada e na Central de Avisos.

### Meu Dia -> Notion

Concluir uma tarefa do Roadmap pelo app atualiza o Status para `Concluído`.

O resumo diário continua sendo enviado ao Notion e agora inclui também:
- nível geral / XP;
- próximas ações da Jornada.

## Lembretes

`S.reminders` armazena lembretes pessoais privados:
- título
- data
- horário
- observação
- concluído

Eles aparecem:
- na aba Lembretes;
- na Central de Avisos;
- na Jornada;
- no arquivo .ics;
- na agenda Web Push quando avisos estão ligados.

## Finanças

A lista de metas de compra/desejos agora aceita a classificação:
- compra;
- investimento;
- necessidade;
- lazer/viagem.

Nunca colocar valores financeiros reais diretamente no repositório.

## Figma — fluxo que deve ser prototipado

Arquivo alvo: `Meu Dia — Design v3`.

Respeitar o DS existente e representar a jornada em frames móveis, idealmente:

1. Hoje
2. Jornada — overview
3. Jornada — nível/XP e atributos
4. Mapa da Vida
5. Estudos + Roadmap do Notion
6. Lembretes
7. Dinheiro + metas de compra
8. Progresso semanal/mensal
9. Integrações/Ajustes

A tela Jornada deve ser o hub visual entre as áreas, não uma duplicação de cada módulo.

## Estado desta versão

- v41: último estado principal do Claude antes desta continuação.
- v42: XP/RPG, lembretes privados, tipos de metas.
- v43: Jornada central, Roadmap dentro dos avisos, lembretes/Roadmap no Web Push e handoff unificado.

## Próximos passos recomendados

1. validar v43 no navegador/PWA;
2. prototipar Jornada no Figma usando o DS existente;
3. adicionar ilustração/personagem quando o asset final estiver definido;
4. ajustar pesos de XP com uso real;
5. só depois considerar novas automações.
