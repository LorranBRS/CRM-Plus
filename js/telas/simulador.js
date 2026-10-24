// ===== Tela: Simulador de propostas + calculadora + desconto rápido =====
const TelaSimulador = {
  resultado: null,
  escolhida: null, // id da opção escolhida ("cartao-12")

  iniciar() {
    ['simCurso', 'simCliente'].forEach((id) => $(id).addEventListener('change', (e) => this.aoMudar(e.target.id)));
    ['simValor', 'simDesconto', 'simEntrada'].forEach((id) => $(id).addEventListener('input', () => this.calcular()));

    // Escolher uma condição (à vista ou parcelada)
    document.querySelector('[data-tela=simulador] .sim-principal').addEventListener('click', (e) => {
      const op = e.target.closest('[data-op]');
      if (!op) return;
      this.escolhida = op.dataset.op;
      this.renderizarResultado();
    });

    $('simEscolhida').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-acao]');
      if (btn) this.acao(btn.dataset.acao);
    });

    // Regras (diretor)
    $('btnRegrasPagamento').addEventListener('click', () => this.abrirRegras());
    $('btnRegrasPadrao').addEventListener('click', () => this.preencherRegras(Simulador.PADRAO));
    $('formRegras').addEventListener('submit', (e) => {
      e.preventDefault();
      const regras = this.lerRegras();
      const erros = Simulador.validarRegras(regras);
      if (erros.length) return Utils.toast(erros[0], 'erro');
      Simulador.salvarRegras(regras);
      Atividades.registrar('simulador', 'Regras de pagamento alteradas',
        `PIX −${regras.pix.descontoVista}% · boleto até ${regras.boleto.maxParcelas}x · cartão ${regras.cartao.semJurosAte}x sem juros, até ${regras.cartao.maxParcelas}x com ${regras.cartao.jurosMes}% a.m.`);
      Utils.fecharModal('modalRegras');
      this.calcular();
      Utils.toast('Regras de pagamento salvas!');
    });

    this.iniciarCalculadora();
    this.iniciarDescontoRapido();
  },

  // ---------- Dados da proposta ----------
  renderizar() {
    const curso = $('simCurso').value;
    $('simCurso').innerHTML = Utils.opcoes(Cursos.ativos(), {
      valor: (c) => c.id, texto: (c) => `${c.nome} – ${Utils.formatarMoeda(Simulador.valorDoCurso(c))}`, vazio: 'Valor livre (sem curso)' });
    $('simCurso').value = curso;
    if ($('simCurso').selectedIndex < 0) $('simCurso').value = '';

    const cliente = $('simCliente').value;
    const leads = Sessao.pode('leads') ? Leads.listar().filter((l) => Leads.emAberto(l)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')) : [];
    const alunos = Alunos.listar().filter((a) => a.status !== 'Inativo').sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const e = Utils.escapar;
    $('simCliente').innerHTML = '<option value="">Não informado</option>' +
      (leads.length ? `<optgroup label="🎯 Leads em aberto">${leads.map((l) => `<option value="lead:${l.id}">${e(l.nome)}</option>`).join('')}</optgroup>` : '') +
      `<optgroup label="👩‍🎓 Alunos">${alunos.map((a) => `<option value="aluno:${a.id}">${e(a.nome)}</option>`).join('')}</optgroup>`;
    $('simCliente').value = cliente;
    if ($('simCliente').selectedIndex < 0) $('simCliente').value = '';
    this.calcular();
  },

  // Abre o simulador já com um lead (chamado pela tela de Leads)
  abrirParaLead(leadId) {
    location.hash = '#simulador';
    setTimeout(() => {
      $('simCliente').value = `lead:${leadId}`;
      this.aoMudar('simCliente');
    }, 50);
  },

  cliente() {
    const [tipo, id] = ($('simCliente').value || '').split(':');
    return tipo ? Contatos.buscar(tipo, id) : null;
  },

  aoMudar(campo) {
    // Lead com curso de interesse → seleciona o curso
    if (campo === 'simCliente') {
      const c = this.cliente();
      if (c?.tipo === 'lead' && c.item.cursoId && Cursos.buscarPorId(c.item.cursoId)) $('simCurso').value = c.item.cursoId;
    }
    const curso = Cursos.buscarPorId($('simCurso').value);
    if (curso && (campo === 'simCurso' || campo === 'simCliente')) $('simValor').value = Simulador.valorDoCurso(curso);
    this.calcular();
  },

  calcular() {
    const valor = Number($('simValor').value || 0);
    const descontoExtra = Number($('simDesconto').value || 0);
    const entrada = Number($('simEntrada').value || 0);
    const regras = Simulador.regras();

    const avisos = [];
    if (descontoExtra > regras.descontoMaxFuncionario && !Sessao.ehDiretor()) {
      avisos.push(`⚠ Desconto acima de ${regras.descontoMaxFuncionario}%: a proposta precisa de aprovação da direção.`);
    }
    if (descontoExtra < 0 || descontoExtra > 100) avisos.push('⚠ O desconto deve ficar entre 0 e 100%.');
    if (entrada && entrada >= valor * (1 - descontoExtra / 100)) avisos.push('⚠ A entrada não pode ser igual ou maior que o valor.');
    $('simAviso').hidden = !avisos.length;
    $('simAviso').innerHTML = avisos.join('<br>');

    this.resultado = valor > 0 && !avisos.some((a) => a.includes('entre 0') || a.includes('entrada')) ? Simulador.calcular({ valor, descontoExtra, entrada }) : null;
    this.renderizarResultado();
  },

  todasOpcoes() {
    if (!this.resultado) return [];
    return [...this.resultado.avista, ...Object.values(this.resultado.parcelado).flat()];
  },

  opcaoEscolhida() {
    return this.todasOpcoes().find((o) => o.id === this.escolhida) || null;
  },

  renderizarResultado() {
    const r = this.resultado;
    const curso = Cursos.buscarPorId($('simCurso').value);
    if (!r) {
      $('simResumoValor').textContent = 'Escolha um curso ou digite o valor para ver as condições.';
      $('simAvista').innerHTML = '';
      $('simParcelado').innerHTML = '';
      $('simLegenda').textContent = '';
      $('simEscolhida').innerHTML = '<h3>Proposta</h3><p class="graf-vazio">As condições aparecem aqui quando você escolher uma opção.</p>';
      return;
    }
    if (!this.opcaoEscolhida()) this.escolhida = r.avista[0]?.id || null;

    $('simResumoValor').innerHTML = `${curso ? `${Utils.escapar(curso.nome)}: ${Utils.formatarMoeda(curso.mensalidade)} × ${curso.duracaoMeses || 1} meses${
      curso.taxaMatricula ? ` + taxa ${Utils.formatarMoeda(curso.taxaMatricula)}` : ''} · ` : ''}Valor: <strong>${Utils.formatarMoeda(r.valor)}</strong>${
      r.descontoExtra ? ` → com ${String(r.descontoExtra).replace('.', ',')}% de desconto: <strong>${Utils.formatarMoeda(r.base)}</strong>` : ''}`;

    // À vista
    $('simAvista').innerHTML = r.avista.map((op) => `
      <button type="button" class="sim-opcao sim-vista ${op.id === this.escolhida ? 'ativa' : ''}" data-op="${op.id}">
        <span class="sim-forma">${Simulador.FORMAS[op.forma].icone} ${Simulador.FORMAS[op.forma].nome}</span>
        <strong>${Utils.formatarMoeda(op.total)}</strong>
        <small>${op.desconto ? `${String(op.desconto).replace('.', ',')}% de desconto · economia de ${Utils.formatarMoeda(op.economia)}` : 'sem desconto'}</small>
      </button>`).join('');

    // Parcelado: uma linha por quantidade de parcelas, uma coluna por forma
    const formas = Object.keys(r.parcelado);
    const max = Math.max(1, ...formas.map((f) => r.regras[f].maxParcelas));
    const semJuros = formas.map((f) => `${Simulador.FORMAS[f].nome.toLowerCase()} até ${r.regras[f].semJurosAte}x sem juros`).join(' · ');
    $('simLegenda').textContent = semJuros ? `(${semJuros})` : '';
    $('simParcelado').innerHTML = formas.length ? `<div class="table-wrap table-plana sim-tabela"><table>
      <thead><tr><th>Parcelas</th>${formas.map((f) => `<th>${Simulador.FORMAS[f].icone} ${Simulador.FORMAS[f].nome}</th>`).join('')}</tr></thead>
      <tbody>${Array.from({ length: max - 1 }, (_, k) => k + 2).map((n) => `<tr>
        <td><strong>${n}x</strong></td>
        ${formas.map((f) => {
          const op = r.parcelado[f].find((o) => o.parcelas === n);
          if (!op) return '<td class="texto-suave">—</td>';
          return `<td><button type="button" class="sim-opcao sim-celula ${op.id === this.escolhida ? 'ativa' : ''} ${op.juros ? 'com-juros' : ''}" data-op="${op.id}">
            <strong>${Utils.formatarMoeda(op.valorParcela)}</strong>
            <small>${op.juros ? `${String(op.juros).replace('.', ',')}% a.m. · total ${Utils.formatarMoeda(op.total)}` : `sem juros · total ${Utils.formatarMoeda(op.total)}`}</small>
          </button></td>`;
        }).join('')}</tr>`).join('')}</tbody></table></div>`
      : '<p class="graf-vazio">Nenhuma forma de parcelamento ativa nas regras.</p>';

    this.renderizarEscolhida();
  },

  renderizarEscolhida() {
    const op = this.opcaoEscolhida();
    const r = this.resultado;
    const cliente = this.cliente();
    const e = Utils.escapar;
    const diferenca = op.parcelas === 1 ? -op.economia : op.acrescimo;
    $('simEscolhida').innerHTML = `
      <h3>Proposta escolhida</h3>
      <p class="sim-forma">${Simulador.FORMAS[op.forma].icone} ${Simulador.FORMAS[op.forma].nome}${op.parcelas > 1 ? (op.juros ? ' · com juros' : ' · sem juros') : ' · à vista'}</p>
      <p class="sim-destaque">${op.parcelas > 1 ? `${op.entrada ? `${Utils.formatarMoeda(op.entrada)} + ` : ''}${op.parcelas}x <strong>${Utils.formatarMoeda(op.valorParcela)}</strong>`
        : `<strong>${Utils.formatarMoeda(op.total)}</strong>`}</p>
      <dl class="sim-detalhes">
        <dt>Total</dt><dd>${Utils.formatarMoeda(op.total)}</dd>
        <dt>${diferenca <= 0 ? 'Economia' : 'Juros'}</dt><dd class="${diferenca <= 0 ? 'texto-sucesso' : 'texto-alerta'}">${Utils.formatarMoeda(Math.abs(diferenca))}</dd>
        ${op.juros ? `<dt>Taxa</dt><dd>${String(op.juros).replace('.', ',')}% ao mês</dd>` : ''}
        <dt>Validade</dt><dd>${Utils.formatarData(Utils.somarDias(Utils.hoje(), r.regras.validadeDias))}</dd>
        <dt>Cliente</dt><dd>${cliente ? e(cliente.nome) : '<span class="texto-suave">não informado</span>'}</dd>
      </dl>
      <div class="sim-acoes">
        <button class="btn btn-light" data-acao="copiar">📋 Copiar proposta</button>
        <button class="btn btn-whatsapp" data-acao="whats" ${cliente ? '' : 'disabled title="Escolha o cliente"'}>💬 Enviar</button>
        <button class="btn btn-light" data-acao="pdf">📄 PDF</button>
        ${cliente?.tipo === 'lead' ? '<button class="btn btn-light" data-acao="registrar">📝 Registrar no lead</button>' : ''}
        ${Sessao.pode('matriculas') && Cursos.buscarPorId($('simCurso').value) ? `<button class="btn btn-primary" data-acao="matricular">🎓 ${cliente?.tipo === 'lead' ? 'Converter e matricular' : 'Matricular'}</button>` : ''}
      </div>`;
  },

  textoProposta() {
    const cliente = this.cliente();
    return Simulador.textoProposta({ resultado: this.resultado, escolhida: this.opcaoEscolhida(), curso: Cursos.buscarPorId($('simCurso').value), cliente: cliente?.nome });
  },

  async copiar(texto) {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      const area = document.createElement('textarea');
      area.value = texto;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
  },

  // Condição escolhida → campos da matrícula
  condicaoMatricula(op) {
    return {
      valorMensalidade: op.parcelas === 1 ? op.total : op.valorParcela,
      parcelas: op.parcelas,
      taxaMatricula: op.entrada || 0,
      desconto: 0,
      observacoes: `Proposta do simulador: ${Simulador.descreverOpcao(op)}`,
    };
  },

  acao(acao) {
    const op = this.opcaoEscolhida();
    const cliente = this.cliente();
    const curso = Cursos.buscarPorId($('simCurso').value);
    const descricao = `${cliente?.nome || 'Cliente não informado'}${curso ? ` – ${curso.nome}` : ''}: ${Simulador.descreverOpcao(op)}`;

    if (acao === 'copiar') {
      this.copiar(this.textoProposta()).then(() => Utils.toast('Proposta copiada! É só colar no WhatsApp ou e-mail.'));
    }
    if (acao === 'whats') {
      Mensageiro.abrir({ tipo: cliente.tipo, id: cliente.id, texto: this.textoProposta() });
      Atividades.registrar('simulador', 'Proposta enviada', descricao, { refId: cliente.id });
    }
    if (acao === 'pdf') {
      Atividades.registrar('simulador', 'Proposta em PDF', descricao, { refId: cliente?.id });
      App.documento('Proposta comercial', Documentos.proposta({ resultado: this.resultado, escolhida: op, curso, cliente }), {
        arquivo: `Proposta_${(cliente?.nome || curso?.nome || 'curso').replace(/\s+/g, '_')}`,
        dica: `Válida por ${this.resultado.regras.validadeDias} dias.`,
      });
    }
    if (acao === 'registrar') {
      const lead = Leads.buscarPorId(cliente.id);
      const etapa = ['Novo', 'Contato feito', 'Visita agendada'].includes(lead.etapa) ? 'Negociação' : lead.etapa;
      Leads.salvarComNota({ ...lead, etapa, cursoId: curso?.id || lead.cursoId }, `Proposta: ${Simulador.descreverOpcao(op)}`);
      Utils.toast(etapa !== lead.etapa ? 'Proposta registrada e lead movido para Negociação!' : 'Proposta registrada no histórico do lead!');
    }
    if (acao === 'matricular') {
      const condicao = this.condicaoMatricula(op);
      if (cliente?.tipo === 'lead') {
        const lead = cliente.item;
        TelaAlunos.abrir(null, {
          dados: { nome: lead.nome, email: lead.email, telefone: lead.telefone, curso: curso.nome, status: 'Interessado',
            observacoes: `Origem: ${lead.origem}` },
          aposSalvar: (aluno) => {
            Leads.salvarComNota({ ...Leads.buscarPorId(lead.id), etapa: 'Matriculado', alunoId: aluno.id }, `Fechou: ${Simulador.descreverOpcao(op)}`);
            Atividades.registrar('leads', 'Lead convertido', `${lead.nome} virou aluno (simulador)`, { refId: lead.id });
            location.hash = '#matriculas';
            TelaMatriculas.abrir(null, { alunoId: aluno.id, cursoId: curso.id, condicao });
          },
        });
      } else {
        location.hash = '#matriculas';
        TelaMatriculas.abrir(null, { alunoId: cliente?.id || '', cursoId: curso.id, condicao });
      }
    }
  },

  // ---------- Regras de pagamento ----------
  abrirRegras() {
    this.preencherRegras(Simulador.regras());
    Utils.abrirModal('modalRegras');
  },

  preencherRegras(r) {
    const form = $('formRegras');
    [...form.elements].forEach((el) => {
      if (!el.name) return;
      const [a, b] = el.name.split('.');
      const valor = b ? r[a][b] : r[a];
      if (el.type === 'checkbox') el.checked = Boolean(valor);
      else el.value = valor;
    });
  },

  lerRegras() {
    const r = JSON.parse(JSON.stringify(Simulador.PADRAO));
    [...$('formRegras').elements].forEach((el) => {
      if (!el.name) return;
      const [a, b] = el.name.split('.');
      const valor = el.type === 'checkbox' ? el.checked : Number(el.value);
      if (b) r[a][b] = valor;
      else r[a] = valor;
    });
    return r;
  },

  // ---------- Calculadora ----------
  calc: { atual: '0', anterior: null, operador: null, novo: false, conta: '' },

  iniciarCalculadora() {
    $('calcTeclas').addEventListener('click', (e) => {
      const t = e.target.closest('[data-tecla]');
      if (t) this.tecla(t.dataset.tecla);
    });
    $('calcUsar').addEventListener('click', () => {
      const v = this.numero(this.calc.atual);
      if (!Number.isFinite(v) || v <= 0) return Utils.toast('O valor da calculadora precisa ser positivo.', 'erro');
      $('simValor').value = Simulador.arredondar(v);
      $('simCurso').value = '';
      this.calcular();
      Utils.toast('Valor aplicado na proposta.');
    });
    // Teclado: funciona quando o simulador está aberto e o foco não está num campo
    document.addEventListener('keydown', (e) => {
      const alvo = e.target instanceof Element ? e.target : null;
      if (location.hash !== '#simulador' || alvo?.closest('input, select, textarea, button') || document.querySelector('.modal.aberto')) return;
      const mapa = { '/': '÷', '*': '×', '-': '−', '+': '+', Enter: '=', '=': '=', Backspace: 'apagar', Escape: 'limpar', '%': 'porcento', ',': ',', '.': ',' };
      const tecla = /^[0-9]$/.test(e.key) ? e.key : mapa[e.key];
      if (!tecla) return;
      e.preventDefault();
      this.tecla(tecla);
    });
  },

  numero(texto) {
    return Number(String(texto).replace(/\./g, '').replace(',', '.'));
  },

  formatar(n) {
    if (!Number.isFinite(n)) return 'Erro';
    return String(Number(n.toPrecision(12))).replace('.', ',');
  },

  operar(a, b, op) {
    if (op === '+') return a + b;
    if (op === '−') return a - b;
    if (op === '×') return a * b;
    if (op === '÷') return b === 0 ? NaN : a / b;
    return b;
  },

  tecla(t) {
    const c = this.calc;
    if (c.atual === 'Erro' && t !== 'limpar') this.tecla('limpar');
    if (/^[0-9]$/.test(t)) {
      c.atual = c.novo || c.atual === '0' ? t : (c.atual.length < 15 ? c.atual + t : c.atual);
      c.novo = false;
    } else if (t === ',') {
      if (c.novo) { c.atual = '0,'; c.novo = false; } else if (!c.atual.includes(',')) c.atual += ',';
    } else if (['+', '−', '×', '÷'].includes(t)) {
      if (c.operador && !c.novo) c.atual = this.formatar(this.operar(c.anterior, this.numero(c.atual), c.operador));
      c.anterior = this.numero(c.atual);
      c.operador = t;
      c.novo = true;
      c.conta = `${c.atual} ${t}`;
    } else if (t === '=') {
      if (!c.operador) return;
      const b = this.numero(c.atual);
      c.conta = `${this.formatar(c.anterior)} ${c.operador} ${this.formatar(b)} =`;
      c.atual = this.formatar(this.operar(c.anterior, b, c.operador));
      c.operador = null;
      c.novo = true;
    } else if (t === 'porcento') {
      // 200 − 10% = 180 (porcentagem sobre o primeiro número em + e −)
      const v = this.numero(c.atual);
      c.atual = this.formatar(c.operador === '+' || c.operador === '−' ? (c.anterior * v) / 100 : v / 100);
      c.novo = false;
    } else if (t === 'sinal') {
      c.atual = c.atual.startsWith('-') ? c.atual.slice(1) : (c.atual === '0' ? '0' : `-${c.atual}`);
    } else if (t === 'apagar') {
      if (c.novo) return;
      c.atual = c.atual.length > 1 && c.atual !== '-0' ? c.atual.slice(0, -1).replace(/^-$/, '0') : '0';
    } else if (t === 'limpar') {
      Object.assign(c, { atual: '0', anterior: null, operador: null, novo: false, conta: '' });
    }
    const [inteiro, decimal] = c.atual.split(',');
    const negativo = inteiro.startsWith('-');
    const agrupado = (negativo ? inteiro.slice(1) : inteiro).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    $('calcValor').textContent = c.atual === 'Erro' ? 'Erro' : `${negativo ? '-' : ''}${agrupado}${decimal !== undefined ? `,${decimal}` : ''}`;
    $('calcConta').textContent = c.conta || ' ';
  },

  // ---------- Desconto rápido ----------
  iniciarDescontoRapido() {
    const campos = ['descValor', 'descPct', 'descReais', 'descFinal'];
    campos.forEach((id) => $(id).addEventListener('input', () => this.recalcularDesconto(id)));
  },

  recalcularDesconto(origem) {
    const n = (id) => Number($(id).value || 0);
    const valor = n('descValor');
    const definir = (id, v) => { if (id !== origem) $(id).value = Number.isFinite(v) ? Simulador.arredondar(v) : ''; };
    if (!valor) {
      $('descResumo').textContent = 'Preencha o valor e o desconto (em % ou R$) ou o valor final desejado.';
      return;
    }
    if (origem === 'descPct' || origem === 'descValor') {
      const reais = valor * n('descPct') / 100;
      definir('descReais', reais);
      definir('descFinal', valor - reais);
    } else if (origem === 'descReais') {
      definir('descPct', (n('descReais') / valor) * 100);
      definir('descFinal', valor - n('descReais'));
    } else if (origem === 'descFinal') {
      definir('descReais', valor - n('descFinal'));
      definir('descPct', ((valor - n('descFinal')) / valor) * 100);
    }
    const pct = Number($('descPct').value || 0);
    const limite = Simulador.regras().descontoMaxFuncionario;
    $('descResumo').innerHTML = `De <strong>${Utils.formatarMoeda(valor)}</strong> por <strong>${Utils.formatarMoeda(Number($('descFinal').value || 0))}</strong>
      · ${String(Simulador.arredondar(pct)).replace('.', ',')}% de desconto${pct > limite && !Sessao.ehDiretor() ? ` <span class="texto-alerta">(acima do limite de ${limite}%)</span>` : ''}`;
  },
};
