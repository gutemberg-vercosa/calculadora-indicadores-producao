const CAMPOS = ['planejado', 'paradas', 'ciclo', 'total', 'boas'];
const EXEMPLO = { planejado: 480, paradas: 47, ciclo: 30, total: 800, boas: 780 };

const DIAGNOSTICOS = {
  disp: 'A disponibilidade é o fator mais baixo. O equipamento fica parado boa parte do tempo planejado: vale olhar quebras, setup e falta de material.',
  perf: 'A performance é o fator mais baixo. O equipamento roda abaixo da velocidade ideal: vale olhar microparadas, ritmo reduzido e o tempo de ciclo padrão.',
  qual: 'A qualidade é o fator mais baixo. Parte da produção vira refugo ou retrabalho: vale olhar as causas de defeito e as perdas de partida.',
};

const $ = (id) => document.getElementById(id);
const pct = (v) => `${(v * 100).toFixed(1).replace('.', ',')}%`;
const num = (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

function lerValores() {
  const v = {};
  for (const c of CAMPOS) {
    const raw = $(c).value.trim();
    if (raw === '') return null;
    v[c] = Number(raw);
  }
  return v;
}

function validar(v) {
  if (CAMPOS.some((c) => !Number.isFinite(v[c]) || v[c] < 0)) return 'Os valores não podem ser negativos.';
  if (v.planejado === 0) return 'O tempo planejado precisa ser maior que zero.';
  if (v.paradas >= v.planejado) return 'O tempo de paradas precisa ser menor que o tempo planejado.';
  if (v.total === 0) return 'O total produzido precisa ser maior que zero.';
  if (v.boas > v.total) return 'As peças boas não podem passar do total produzido.';
  if (v.ciclo === 0) return 'O tempo de ciclo ideal precisa ser maior que zero.';
  return null;
}

function calcular(v) {
  const operando = v.planejado - v.paradas;
  const disp = operando / v.planejado;
  const perf = (v.ciclo * v.total) / (operando * 60);
  const qual = v.boas / v.total;
  return { operando, disp, perf, qual, oee: disp * perf * qual };
}

function faixa(oee) {
  if (oee >= 0.85) return ['alto', 'Classe mundial'];
  if (oee >= 0.65) return ['medio', 'Típico'];
  return ['baixo', 'Baixo'];
}

function preencherFator(id, valor, conta) {
  const el = $(id);
  el.querySelector('strong').textContent = pct(valor);
  el.querySelector('code').textContent = conta;
}

function render() {
  const v = lerValores();
  const erro = $('erro');
  const res = $('resultado');
  atualizarUrl(v);

  if (!v) { erro.hidden = true; res.hidden = true; return; }
  const msg = validar(v);
  if (msg) { erro.textContent = msg; erro.hidden = false; res.hidden = true; return; }
  erro.hidden = true;

  const r = calcular(v);
  const [classe, texto] = faixa(r.oee);

  $('oee-valor').textContent = pct(r.oee);
  const f = $('oee-faixa');
  f.textContent = texto;
  f.className = `faixa ${classe}`;

  preencherFator('f-disp', r.disp, `(${num(v.planejado)} − ${num(v.paradas)}) ÷ ${num(v.planejado)} min`);
  preencherFator('f-perf', r.perf, `(${num(v.ciclo)} s × ${num(v.total)}) ÷ (${num(r.operando)} min × 60)`);
  preencherFator('f-qual', r.qual, `${num(v.boas)} ÷ ${num(v.total)} peças`);

  $('conta').textContent = `${pct(r.disp)} × ${pct(r.perf)} × ${pct(r.qual)} = ${pct(r.oee)}`;

  const fatores = { disp: r.disp, perf: r.perf, qual: r.qual };
  const menor = Object.keys(fatores).reduce((a, b) => (fatores[b] < fatores[a] ? b : a));
  let diag = DIAGNOSTICOS[menor];
  if (r.perf > 1) {
    diag = 'A performance passou de 100%. Isso costuma indicar que o tempo de ciclo ideal está acima do real, ou que o tempo de paradas foi superestimado. Revise esses dados antes de usar o resultado.';
  }
  $('diag').textContent = diag;
  document.querySelectorAll('.fator').forEach((el) => el.classList.toggle('pior', el.id === `f-${menor}` && r.perf <= 1));

  res.hidden = false;
}

function atualizarUrl(v) {
  const params = new URLSearchParams();
  if (v) for (const c of CAMPOS) params.set(c, v[c]);
  const query = params.toString();
  history.replaceState(null, '', query ? `?${query}` : location.pathname);
}

function carregarDaUrl() {
  const params = new URLSearchParams(location.search);
  for (const c of CAMPOS) if (params.has(c)) $(c).value = params.get(c);
}

function preencher(valores) {
  for (const c of CAMPOS) $(c).value = valores[c] ?? '';
  render();
}

$('form').addEventListener('input', render);
$('exemplo').addEventListener('click', () => preencher(EXEMPLO));
$('limpar').addEventListener('click', () => preencher({}));
$('copiar').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    const aviso = $('copiado');
    aviso.hidden = false;
    setTimeout(() => { aviso.hidden = true; }, 2000);
  } catch {
    prompt('Copie o link:', location.href);
  }
});

carregarDaUrl();
render();
