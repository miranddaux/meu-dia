# Botões do Meu Dia: estados e textos

## Tipos
| Tipo | Classe | Quando usar | Exemplo de texto |
|---|---|---|---|
| Principal (destaque) | `.btn` (amarelo) | A ação principal daquele card ou janela. Só 1 por bloco. | Paguei, Guardei, Feito, Salvar |
| CTA da tela | `.btn.pri` (coral) | O botão mais importante da tela inteira. 1 por tela. | Lançar |
| Secundário | `.btn.ghost` | Ação extra, sem urgência. | Atualizar, Cancelar, + guardar outro valor |
| Terciário | `.btn.link` | Desfazer ou ação discreta. Parece texto sublinhado. | Desfazer, Deixar para depois |
| Perigo | `.btn.danger` | Apagar. Sempre pede confirmação. | Excluir |

## Estados
| Estado | Aparência | Texto |
|---|---|---|
| Padrão | Cor cheia, borda e sombra | Verbo no passado em 1ª pessoa para confirmar: Paguei, Guardei |
| Pressionado | Desce 2px, sombra some | igual |
| Foco (teclado) | Contorno colorido | igual |
| Feito | Verde, sem sombra, com ✓, não clica | Pago ✓, Concluído ✓, Guardado neste mês ✓ (+ link Desfazer ao lado) |
| Desabilitado | Cinza, borda tracejada, não clica | O mesmo texto. Uma frase perto explica o motivo |
| Carregando | Cinza, não clica | Enviando…, Atualizando… |

## Regras de texto
- Frases curtas, em português simples.
- Ação a fazer: Paguei, Guardei, Feito. Já feito: Pago, Guardado, Concluído.
- Cancelar à esquerda, ação principal à direita.
- Nunca "OK" ou "Enviar". Diga o que acontece: Salvar, Lançar, Guardei.
- Os botões de janela ficam acima do selo do Netlify.
