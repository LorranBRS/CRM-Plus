// ===== Tela: Financeiro =====
const TelaFinanceiro = {
  iniciar() {
    $('filtroMesFinanceiro').value = Utils.mesAtual();

    $('btnNovoLancamento').addEventListener('click', () => this.abrir());
    $('buscaFinanceiro').addEventListener('input', () => this.renderizar());
    $('filtroMesFinanceiro').addEventListener('change', () => this.renderizar());
    $('filtroSituacaoFinanceiro').addEventListener('change', () => this.renderizar());

    $('btnExportarFinanceiro').addEventListener('click', () => {
      const lista = this.listaFiltrada();
      if (!lista.length) return Utils.toast('Nada para exportar com esses filtros.', 'erro');
      Utils.baixarCSV(lista, Financeiro.colunasCSV, 'financeiro');
    });

    $('listaFinanceiro').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const l = Financeiro.buscarPorId(btn.dataset.id);
      const acao = btn.dataset.acao;

      if (acao === 'pagar') this.abrirPagamento(l);
      if (acao === 'editar') this.abrir(l);
      if (acao === 'estornar' && confirm('Desfazer o pagamento deste lançamento?')) {
        Financeiro.estornar(l.id);
        this.renderizar();
        Utils.toast('Pagamento estornado.');
      }
      if (acao === 'cancelar' && confirm(`Cancelar "${l.descricao}"?`)) {
        Financeiro.salvar({ id: l.id, status: 'Cancelado' });
        this.renderizar();
        Utils.toast('Lançamento cancelado.');
      }
      if (acao === 'reativar') {
        Financeiro.salvar({ id: l.id, status: 'Pendente' });
        this.renderizar();
        Utils.toast('Lançamento reativado.');
      }
      if (acao === 'excluir' && confirm(`Excluir definitivamente "${l.descricao}"?`)) {
        Financeiro.excluir(l.id);
        this.renderizar();
        Utils.toast('Lançamento excluído.');
      }
    });

    $('formLancamento').addEventListener('submit', (e) => {
      e.preventDefault();
      const form = $('formLancamento');
      const l = Utils.lerForm(form);
      l.id = l.id || undefined;
      l.valor = l.valor === '' ? '' : Number(l.valor);
      if (!l.id) l.status = 'Pendente';

      const erros = Financeiro.validar(l);
      if (erros.length) return Utils.mostrarErros(form, erros);

      const editando = Boolean(l.id);
      Financeiro.salvar(l);
      Utils.fecharModal('modalLancamento');
      this.renderizar();
      Utils.toast(editando ? 'Lançamento atualizado!' : 'Lançamento criado!');
    });

    $('formPagamento').addEventListener('submit', (e) => {
      e.preventDefault();
      const form = $('formPagamento');
      const p = Utils.lerForm(form);
      const erros = [];
      if (!p.dataPagamento) erros.push({ campo: 'dataPagamento', msg: 'Informe a data do pagamento.' });
      if (!(Number(p.valorPago) > 0)) erros.push({ campo: 'valorPago', msg: 'Informe o valor pago.' });
      if (erros.length) return Utils.mostrarErros(form, erros);

      Financeiro.pagar(p.id, p);
      Utils.fecharModal('modalPagamento');
      App.renderizarAtual();
      Utils.toast('Pagamento registrado!');
    });
  },

  abrir(l = null) {
    const form = $('formLancamento');
    form.elements.alunoId.innerHTML = Utils.opcoes(
      [...Alunos.listar()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      { valor: (a) => a.id, texto: (a) => a.nome, vazio: 'Selecione o aluno...' });
    if (form.elements.alunoId.options.length <= 1) return Utils.toast('Cadastre um aluno primeiro.', 'erro');
    Utils.preencherForm(form, l || { vencimento: Utils.hoje() });
    Utils.abrirModal('modalLancamento', l ? 'Editar lançamento' : 'Novo lançamento');
  },

  abrirPagamento(l) {
    $('resumoPagamento').innerHTML = `<strong>${Utils.escapar(Financeiro.nomeAluno(l))}</strong><br>
      ${Utils.escapar(l.descricao)} · vence ${Utils.formatarData(l.vencimento)} · ${Utils.formatarMoeda(l.valor)}`;
    Utils.preencherForm($('formPagamento'), { id: l.id, dataPagamento: Utils.hoje(), valorPago: l.valor, formaPagamento: 'PIX' });
    Utils.abrirModal('modalPagamento');
  },

  listaFiltrada() {
    return Financeiro.filtrar($('buscaFinanceiro').value, $('filtroMesFinanceiro').value,
      $('filtroSituacaoFinanceiro').value);
  },

  acoes(l, situacao) {
    const b = (acao, icone, titulo) =>
      `<button class="btn-icon" data-acao="${acao}" data-id="${l.id}" title="${titulo}">${icone}</button>`;
    if (situacao === 'Pago') return b('estornar', '↩️', 'Desfazer pagamento');
    if (situacao === 'Cancelado') return b('reativar', '♻️', 'Reativar') + b('excluir', '🗑️', 'Excluir');
    return b('pagar', '💲', 'Registrar pagamento') + b('editar', '✏️', 'Editar') + b('cancelar', '🚫', 'Cancelar');
  },

  renderizar() {
    const lista = this.listaFiltrada();

    $('listaFinanceiro').innerHTML = lista.map((l) => {
      const situacao = Financeiro.situacao(l);
      return `
      <tr>
        <td><strong>${Utils.escapar(Financeiro.nomeAluno(l))}</strong></td>
        <td>${Utils.escapar(l.descricao)}</td>
        <td>${Utils.formatarData(l.vencimento)}</td>
        <td>${Utils.formatarMoeda(l.valor)}</td>
        <td>${l.status === 'Pago'
          ? `${Utils.formatarData(l.dataPagamento)}<small>${Utils.formatarMoeda(l.valorPago)} · ${Utils.escapar(l.formaPagamento)}</small>`
          : '-'}</td>
        <td>${Utils.badge(situacao)}</td>
        <td class="acoes">${this.acoes(l, situacao)}</td>
      </tr>`;
    }).join('');

    // Totais da lista filtrada
    const ativos = lista.filter((l) => l.status !== 'Cancelado');
    const total = ativos.reduce((s, l) => s + Number(l.valor), 0);
    const pago = ativos.filter((l) => l.status === 'Pago').reduce((s, l) => s + Number(l.valorPago || 0), 0);
    $('totalFinanceiro').innerHTML = lista.length ? `
      <tr><td colspan="3"><strong>${lista.length} lançamento(s)</strong></td>
        <td><strong>${Utils.formatarMoeda(total)}</strong></td>
        <td colspan="3">Recebido: <strong>${Utils.formatarMoeda(pago)}</strong> · Em aberto: <strong>${Utils.formatarMoeda(
          ativos.filter((l) => l.status !== 'Pago').reduce((s, l) => s + Number(l.valor), 0))}</strong></td></tr>` : '';

    App.estadoVazio('vazioFinanceiro', lista.length, Financeiro.listar().length,
      'Nenhum lançamento ainda. Eles são gerados automaticamente ao fazer uma matrícula.',
      'Nenhum lançamento encontrado com esses filtros.');

    const s = Financeiro.estatisticas();
    $('statFinPrevisto').textContent = Utils.formatarMoeda(s.previsto);
    $('statFinRecebido').textContent = Utils.formatarMoeda(s.recebido);
    $('statFinAtraso').textContent = Utils.formatarMoeda(s.atraso);
    $('statFinInadimplentes').textContent = s.inadimplentes;
  },
};
