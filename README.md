# Calculadora de OEE

Calcula o OEE (Eficiência Global do Equipamento) de um período de produção, mostra a conta de cada fator e aponta onde está a maior perda.

**Acesse:** https://gutemberg-vercosa.github.io/calculadora-indicadores-producao/

## O que ela faz

- Calcula Disponibilidade, Performance, Qualidade e o OEE final.
- Mostra a conta com os valores preenchidos, para ficar claro de onde vem cada número.
- Aponta o fator mais baixo e o que costuma causar esse tipo de perda.
- Classifica o resultado em faixas de referência (baixo, típico, classe mundial).
- Guarda os valores no link, então dá para compartilhar um cálculo.

## Como o OEE é calculado

| Fator | Fórmula |
|---|---|
| Disponibilidade | (tempo planejado − paradas) ÷ tempo planejado |
| Performance | (tempo de ciclo ideal × total produzido) ÷ tempo operando |
| Qualidade | peças boas ÷ total produzido |
| **OEE** | Disponibilidade × Performance × Qualidade |

## Tecnologias

HTML, CSS e JavaScript puro, sem dependências. Publicado com GitHub Pages.

## Rodando localmente

Basta abrir o `index.html` no navegador.

## Próximos passos

- Takt time
- Lead time
- Capacidade produtiva
