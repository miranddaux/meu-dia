# Treino (v47)

Módulo de musculação + cardio progressivo, de segunda a sexta (Upper, Lower, Push, Pull, Legs).

## Arquivos
- `treino.js` (novo): dados, regras, telas e ações do treino.
- `app.js`: chama `trInit()`, mostra `trMain()` em Corpo → Treino, o card do treino em Hoje, treino de seg a sex na agenda.
- `evolucao.js`: XP do corpo conta 1 treino por dia + `trXp()` (cardio, recordes, semana 5/5).
- `dinheiro.js`: o arquivo de ajustes aceita `treino.proteinaG` e `treino.aguaMl`.
- `style.css`: estilos `.tr*`.

## Onde os dados ficam
Tudo em `S.tr` (localStorage `meudia_v1`, no aparelho, e no backup/sincronização que já existem):
- `start`: segunda-feira em que o programa começou (define a semana de adaptação).
- `hist`: sessões concluídas (WorkoutSession: date, day, duration, ex[].sets[{weight, reps, rir, completed}], cardio, check, perceivedDifficulty, records).
- `cur`: treino em andamento. `pre`: check-in antes de começar.
- `cardio`: caminhadas soltas (fim de semana). `measures`: medidas.
- `cfg`: descanso automático, cardio padrão, minutos de cardio fixos.
Peso usa `S.weights`; proteína `S.settings.dietProt`; água `S.settings.waterGoal`.
Cada treino concluído também vira um item em `S.workouts` (histórico antigo, moedas, revisão semanal).

## Regras
- Semana = semanas desde `start`. 1 e 2: menor nº de séries, RIR 3–4/3. 3: os 2 primeiros compostos ganham a 3ª série. 4+: programa padrão. Depois da 6: "Programa padrão", sem subir volume nem cardio sozinho.
- Cardio: 10 → 10–12 → 12–15 → 15 → 15–18 → 20 min (`TR_WEEKS`). Em Ajustes dá para fixar os minutos.
- Double progression: quando todas as séries planejadas chegam ao topo da faixa sem falha, o app sugere `+inc` kg (botão "Usar X kg"). Nunca muda sozinho. Sem sugestão nas semanas 1–2 e quando o check-in indica cuidado (dor ≥ 4, energia ≤ 2, sono 1 ou dor articular).
- Recorde: maior 1RM estimado (Epley) do exercício.

## Como mudar
- Exercícios: edite `TR_DAYS` em `treino.js` (`ex(id, nome, grupo, repMin, repMax, [séries mín, máx], descanso s, categoria, salto kg)`). Mantenha o mesmo `id` para não perder o histórico.
- Cardio por semana: `TR_WEEKS[n].cardio`. Ou no app: Corpo → Treino → Ajustes do treino.
