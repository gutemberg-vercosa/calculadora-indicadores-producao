const pct = (v) => `${(v * 100).toFixed(1).replace('.', ',')}%`;
const num = (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const seg = (s) => (s >= 60 ? `${num(s)} s (${num(s / 60)} min)` : `${num(s)} s`);

const CALCULADORAS = {
  oee: {
    exemplo: { planejado: 480, paradas: 47, ciclo: 30, total: 800, boas: 780 },

    validar(v) {
      if (v.planejado === 0) return 'O tempo planejado precisa ser maior que zero.';
      if (v.paradas >= v.planejado) return 'O tempo de paradas precisa ser menor que o tempo planejado.';
      if (v.ciclo === 0) return 'O tempo de ciclo ideal precisa ser maior que zero.';
      if (v.total === 0) return 'O total produzido precisa ser maior que zero.';
      if (v.boas > v.total) return 'As peças boas não podem passar do total produzido.';
      return null;
    },

    calcular(v, ui) {
      const operando = v.planejado - v.paradas;
      const f = {
        disp: operando / v.planejado,
        perf: (v.ciclo * v.total) / (operando * 60),
        qual: v.boas / v.total,
      };
      const oee = f.disp * f.perf * f.qual;

      ui.valor(pct(oee));
      if (oee >= 0.85) ui.faixa('alto', 'Classe mundial');
      else if (oee >= 0.65) ui.faixa('medio', 'Típico');
      else ui.faixa('baixo', 'Baixo');

      ui.fator('disp', pct(f.disp), `(${num(v.planejado)} − ${num(v.paradas)}) ÷ ${num(v.planejado)} min`);
      ui.fator('perf', pct(f.perf), `(${num(v.ciclo)} s × ${num(v.total)}) ÷ (${num(operando)} min × 60)`);
      ui.fator('qual', pct(f.qual), `${num(v.boas)} ÷ ${num(v.total)} peças`);
      ui.conta(`${pct(f.disp)} × ${pct(f.perf)} × ${pct(f.qual)} = ${pct(oee)}`);

      if (f.perf > 1) {
        ui.diag('A performance passou de 100%. Isso costuma indicar que o tempo de ciclo ideal está acima do real, ou que o tempo de paradas foi superestimado. Revise esses dados antes de usar o resultado.');
        return;
      }
      const menor = Object.keys(f).reduce((a, b) => (f[b] < f[a] ? b : a));
      ui.destacar(menor);
      ui.diag({
        disp: 'A disponibilidade é o fator mais baixo, então a maior perda está no tempo em que o equipamento fica parado. Vale olhar quebras, setup e falta de material.',
        perf: 'A performance é o fator mais baixo, então a maior perda está em rodar abaixo da velocidade ideal. Vale olhar microparadas, ritmo reduzido e o tempo de ciclo padrão.',
        qual: 'A qualidade é o fator mais baixo, então a maior perda está em peças com defeito. Vale olhar as causas de refugo e retrabalho e as perdas de partida.',
      }[menor]);
    },
  },

  takt: {
    exemplo: { turno: 480, pausas: 60, turnos: 2, demanda: 1200, ciclo: 45 },

    validar(v) {
      if (v.turno === 0) return 'A duração do turno precisa ser maior que zero.';
      if (v.pausas >= v.turno) return 'As pausas precisam ser menores que a duração do turno.';
      if (v.turnos === 0) return 'Informe pelo menos um turno por dia.';
      if (v.demanda === 0) return 'A demanda diária precisa ser maior que zero.';
      if (v.ciclo === 0) return 'O tempo de ciclo atual precisa ser maior que zero.';
      return null;
    },

    calcular(v, ui) {
      const dispMin = (v.turno - v.pausas) * v.turnos;
      const takt = (dispMin * 60) / v.demanda;

      ui.valor(seg(takt));
      ui.fator('disp', `${num(dispMin)} min`, `(${num(v.turno)} − ${num(v.pausas)}) × ${num(v.turnos)} turno(s)`);
      ui.conta(`(${num(dispMin)} min × 60) ÷ ${num(v.demanda)} peças = ${num(takt)} s por peça`);

      if (v.ciclo === undefined) {
        ui.faixa(null);
        ui.ocultar('cap', 'uso');
        ui.diag(`Para atender a demanda, uma peça precisa sair a cada ${seg(takt)}. Informe o tempo de ciclo atual para comparar com o takt.`);
        return;
      }

      const capacidade = Math.floor((dispMin * 60) / v.ciclo);
      const uso = v.ciclo / takt;
      ui.fator('cap', `${num(capacidade)} peças/dia`, `(${num(dispMin)} min × 60) ÷ ${num(v.ciclo)} s`);
      ui.fator('uso', pct(uso), `${num(v.ciclo)} s ÷ ${num(takt)} s`);

      if (uso > 1) {
        const estacoes = Math.ceil(v.ciclo / takt);
        ui.faixa('baixo', 'Não atende');
        ui.destacar('uso');
        ui.diag(`O ciclo atual é mais lento que o takt, então faltam ${num(v.demanda - capacidade)} peças por dia. Para fechar a conta, é preciso reduzir o ciclo em ${num(v.ciclo - takt)} s, dividir o trabalho em ${estacoes} postos em paralelo, ou aumentar o tempo disponível (mais turnos ou menos pausas).`);
      } else if (uso > 0.85) {
        ui.faixa('medio', 'No limite');
        ui.destacar('uso');
        ui.diag(`O ciclo atende a demanda, mas usa ${pct(uso)} do takt. Sobra pouca margem para paradas e variações: qualquer perda no dia já compromete a entrega.`);
      } else {
        ui.faixa('alto', 'Com folga');
        ui.destacar(null);
        ui.diag(`O ciclo atende a demanda com folga e usa ${pct(uso)} do takt. A capacidade extra é de ${num(capacidade - v.demanda)} peças por dia.`);
      }
    },
  },

  lead: {
    exemplo: { wip: 3000, producao: 600, horas: 16, va: 45 },

    validar(v) {
      if (v.producao === 0) return 'A produção diária precisa ser maior que zero.';
      if (v.horas === 0 || v.horas > 24) return 'As horas de trabalho por dia precisam estar entre 0 e 24.';
      return null;
    },

    calcular(v, ui) {
      const dias = v.wip / v.producao;
      const horas = dias * v.horas;
      const metade = dias / 2;

      ui.valor(`${num(dias)} dias`);
      ui.fator('horas', `${num(horas)} h`, `${num(dias)} dias × ${num(v.horas)} h`);
      ui.conta(`${num(v.wip)} peças ÷ ${num(v.producao)} peças/dia = ${num(dias)} dias`);

      const reduzir = `Com a mesma produção, cortar o estoque em processo pela metade reduz o lead time para ${num(metade)} dias.`;

      if (v.va === undefined) {
        ui.faixa(null);
        ui.ocultar('pce', 'espera');
        ui.destacar(null);
        ui.diag(`Uma peça que entra hoje no processo leva, em média, ${num(dias)} dias para sair. ${reduzir} Informe o tempo de agregação de valor para ver quanto disso é espera.`);
        return;
      }

      const vaHoras = v.va / 60;
      if (vaHoras > horas) {
        ui.faixa(null);
        ui.ocultar('pce', 'espera');
        ui.destacar(null);
        ui.diag(`O tempo de agregação de valor (${num(vaHoras)} h) ficou maior que o lead time (${num(horas)} h), o que não é possível. Revise o estoque em processo, a produção diária ou o tempo informado.`);
        return;
      }

      const pce = vaHoras / horas;
      ui.fator('pce', pct(pce), `${num(v.va)} min ÷ (${num(horas)} h × 60)`);
      ui.fator('espera', `${num(horas - vaHoras)} h`, `${num(horas)} h − ${num(vaHoras)} h`);
      ui.destacar('espera');

      if (pce >= 0.25) ui.faixa('alto', 'Fluxo classe mundial');
      else if (pce >= 0.1) ui.faixa('medio', 'Fluxo eficiente');
      else ui.faixa('baixo', 'Fluxo com muita espera');

      ui.diag(`A peça é trabalhada durante ${pct(pce)} do lead time; no resto, ${pct(1 - pce)}, ela está parada em fila ou estoque. É nessa espera que está o ganho: ${reduzir.charAt(0).toLowerCase()}${reduzir.slice(1)}`);
    },
  },

  cap: {
    exemplo: { ciclo: 40, postos: 3, horas: 8, turnos: 2, dias: 22, oee: 75, demanda: 68000 },

    validar(v) {
      if (v.ciclo === 0) return 'O tempo de ciclo precisa ser maior que zero.';
      if (v.postos === 0) return 'Informe pelo menos uma máquina ou posto.';
      if (v.horas === 0 || v.horas * v.turnos > 24) return 'Horas por turno × turnos precisa ficar entre 0 e 24 horas por dia.';
      if (v.dias === 0 || v.dias > 31) return 'Os dias de trabalho no mês precisam estar entre 1 e 31.';
      if (v.oee === 0 || v.oee > 100) return 'A eficiência precisa estar entre 0% e 100%.';
      if (v.demanda === 0) return 'A demanda mensal precisa ser maior que zero.';
      return null;
    },

    calcular(v, ui) {
      const porTurno = (v.postos * v.horas * 3600) / v.ciclo;
      const teorica = Math.floor(porTurno * v.turnos * v.dias);
      const efetiva = Math.floor(teorica * (v.oee / 100));

      ui.valor(`${num(efetiva)} peças/mês`);
      ui.fator('teorica', `${num(teorica)} peças`, `${num(v.postos)} × ${num(v.horas)} h × 3.600 ÷ ${num(v.ciclo)} s × ${num(v.turnos)} × ${num(v.dias)} dias`);
      ui.fator('perda', `${num(teorica - efetiva)} peças`, `${num(teorica)} × (100% − ${num(v.oee)}%)`);
      ui.conta(`${num(teorica)} peças × ${num(v.oee)}% = ${num(efetiva)} peças/mês`);

      if (v.demanda === undefined) {
        ui.faixa(null);
        ui.ocultar('uso');
        ui.destacar(null);
        ui.diag(`A operação entrega cerca de ${num(efetiva)} peças por mês. A eficiência de ${num(v.oee)}% deixa ${num(teorica - efetiva)} peças na mesa: cada ponto de OEE vale cerca de ${num(Math.round(teorica / 100))} peças por mês. Informe a demanda para comparar.`);
        return;
      }

      const uso = v.demanda / efetiva;
      ui.fator('uso', pct(uso), `${num(v.demanda)} ÷ ${num(efetiva)} peças`);

      if (uso > 1) {
        const oeeNecessario = v.demanda / teorica;
        const turnosNecessarios = Math.ceil(v.demanda / (porTurno * v.dias * (v.oee / 100)));
        const cicloNecessario = v.ciclo / uso;
        const opcoes = [
          oeeNecessario <= 1 ? `elevar o OEE para ${pct(oeeNecessario)}` : null,
          turnosNecessarios * v.horas <= 24 ? `trabalhar com ${turnosNecessarios} turnos por dia` : null,
          `reduzir o tempo de ciclo para ${num(cicloNecessario)} s`,
        ].filter(Boolean);
        ui.faixa('baixo', 'Não atende');
        ui.destacar('uso');
        ui.diag(`A demanda passa da capacidade efetiva em ${num(v.demanda - efetiva)} peças por mês. Para fechar a conta, dá para ${opcoes.slice(0, -1).join('; ')}${opcoes.length > 1 ? '; ou ' : ''}${opcoes.at(-1)}, mantendo o restante como está.`);
      } else if (uso > 0.85) {
        ui.faixa('medio', 'No limite');
        ui.destacar('uso');
        ui.diag(`A capacidade atende a demanda, mas com ${pct(uso)} de utilização sobram só ${num(efetiva - v.demanda)} peças de margem por mês. Uma queda de eficiência ou um pico de pedidos já gera atraso.`);
      } else {
        ui.faixa('alto', 'Com folga');
        ui.destacar(null);
        ui.diag(`A capacidade atende a demanda com ${pct(uso)} de utilização e ${num(efetiva - v.demanda)} peças de folga por mês.`);
      }
    },
  },
};

function criarUi(sec) {
  const r = (nome) => sec.querySelector(`[data-r="${nome}"]`);
  const f = (id) => sec.querySelector(`[data-f="${id}"]`);
  return {
    valor: (t) => { r('valor').textContent = t; },
    conta: (t) => { r('conta').textContent = t; },
    diag: (t) => { r('diag').textContent = t; },
    faixa(classe, texto) {
      const el = r('faixa');
      el.hidden = !classe;
      if (classe) { el.textContent = texto; el.className = `faixa ${classe}`; }
    },
    fator(id, valor, conta) {
      const el = f(id);
      el.hidden = false;
      el.querySelector('strong').textContent = valor;
      el.querySelector('code').textContent = conta;
    },
    ocultar: (...ids) => ids.forEach((id) => { f(id).hidden = true; }),
    destacar: (id) => sec.querySelectorAll('.fator').forEach((el) => el.classList.toggle('pior', el.dataset.f === id)),
  };
}

const inputs = (sec) => [...sec.querySelectorAll('input')];

function lerValores(sec) {
  const v = {};
  for (const input of inputs(sec)) {
    const raw = input.value.trim();
    if (raw === '') {
      if (input.hasAttribute('data-opcional')) continue;
      return null;
    }
    v[input.name] = Number(raw);
  }
  return v;
}

function render(sec) {
  const id = sec.dataset.calc;
  const calc = CALCULADORAS[id];
  const v = lerValores(sec);
  const erro = sec.querySelector('.erro');
  const res = sec.querySelector('.resultado');
  atualizarUrl(id, v);

  if (!v) { erro.hidden = true; res.hidden = true; return; }
  let msg = Object.values(v).some((n) => !Number.isFinite(n) || n < 0) ? 'Os valores não podem ser negativos.' : null;
  msg ??= calc.validar(v);
  if (msg) { erro.textContent = msg; erro.hidden = false; res.hidden = true; return; }

  erro.hidden = true;
  calc.calcular(v, criarUi(sec));
  res.hidden = false;
}

function atualizarUrl(id, v) {
  const params = new URLSearchParams({ i: id });
  if (v) for (const [k, n] of Object.entries(v)) params.set(k, n);
  history.replaceState(null, '', `?${params}`);
}

function mostrarAba(id) {
  document.querySelectorAll('.calc').forEach((sec) => { sec.hidden = sec.dataset.calc !== id; });
  document.querySelectorAll('.abas button').forEach((b) => b.setAttribute('aria-selected', b.dataset.aba === id));
  render(document.querySelector(`.calc[data-calc="${id}"]`));
}

function preencher(sec, valores) {
  for (const input of inputs(sec)) input.value = valores[input.name] ?? '';
  render(sec);
}

document.querySelectorAll('.calc').forEach((sec) => {
  const id = sec.dataset.calc;
  sec.querySelector('form').addEventListener('input', () => render(sec));
  sec.querySelector('[data-acao="exemplo"]').addEventListener('click', () => preencher(sec, CALCULADORAS[id].exemplo));
  sec.querySelector('[data-acao="limpar"]').addEventListener('click', () => preencher(sec, {}));
  sec.querySelector('[data-acao="copiar"]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      const aviso = sec.querySelector('.copiado');
      aviso.hidden = false;
      setTimeout(() => { aviso.hidden = true; }, 2000);
    } catch {
      prompt('Copie o link:', location.href);
    }
  });
});

document.querySelectorAll('.abas button').forEach((b) => b.addEventListener('click', () => mostrarAba(b.dataset.aba)));

const params = new URLSearchParams(location.search);
const inicial = CALCULADORAS[params.get('i')] ? params.get('i') : 'oee';
for (const input of inputs(document.querySelector(`.calc[data-calc="${inicial}"]`))) {
  if (params.has(input.name)) input.value = params.get(input.name);
}
mostrarAba(inicial);
