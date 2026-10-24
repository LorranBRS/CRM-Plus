// ===== Financeiro → aba Despesas (contas a pagar) e aba Resultado (lucro) =====
const TelaDespesas = {
  iniciar() {
    const form = $('formDespesa');
    form.elements.categoria.innerHTML = Utils.opcoes(Despesas.CATEGORIAS, { vazio: 'Selecione...' });
    $('filtroCategoriaDespesas').innerHTML = Utils.opcoes(Despesas.CATEGORIAS, { vazio: 'Todas as categorias' });
    $('filtroMesDespesas').value = Utils.mesAtual();

    $('btnNovaDespesa').addEventListener('click', () => this.abrir());
    $('btnPagamentoProfessores').addEventListener('click', () => this.abrirProfessores());
    ['buscaDespesas', 'filtroMesDespesas', 'filtroCategoriaDespesas', 'filtroSituacaoDespesas'].forEach((id) =>
      $(id).addEventListener(id === 'buscaDespesas' ? 'input' : 'change', () => this.renderizar()));

    $('btnExportarDespesas').addEventListener('click', () => {
      const lista = this.listaFiltrada();
      if (!lista.length) return Utils.toast('Nada para exportar com esses filtros.', 'erro');
      Utils.baixarCSV(lista, Despesas.colunasCSV, 'despesas');
    });

    $('listaDespesas').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-acao]');
      if (!btn) return;
      const d = Despesas.buscarPorId(btn.dataset.id);
      const acao = btn.dataset.acao;
      const registrar = (titulo, msg) => {
        Atividades.registrar('financeiro', titulo, Despesas.resumo(d), { refId: d.id });
        App.renderizarAtual();
        Utils.toast(msg);
      };
      if (acao === 'pagar') this.abrirPagamento(d);
      if (acao === 'editar') this.abrir(d);
      if (acao === 'estornar' && confirm('Desfazer o pagamento desta despesa?')) { Despesas.estornar(d.id); registrar('Pagamento de despesa estornado', 'Pagamento desfeito.'); }
      if (acao === 'cancelar' && confirm(`Cancelar "${d.descricao}"?`)) { Despesas.salvar({ id: d.id, status: 'Cancelado' }); registrar('Despesa cancelada', 'Despesa cancelada.'); }
      if (acao === 'reativar') { Despesas.salvar({ id: d.id, status: 'Pendente' }); registrar('Despesa reativada', 'Despesa reativada.'); }
      if (acao === 'excluir' && confirm(`Excluir definitivamente "${d.descricao}"?`)) { Despesas.excluir(d.id); registrar('Despesa excluída', 'Despesa excluída.'); }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = Utils.lerForm(form);
      const repetir = Number(d.repetir || 1);
      delete d.repetir;
      d.id = d.id || undefined;
      d.valor = d.valor === '' ? '' : Number(d.valor);
      const erros = Despesas.validar(d, repetir);
      if (erros.length) return Utils.mostrarErros(form, erros);

      if (d.id) {
        Despesas.salvar(d);
        Atividades.registrar('financeiro', 'Despesa editada', Despesas.resumo(d), { refId: d.id });
        Utils.toast('Despesa atualizada!');
      } else {
        const criadas = Despesas.criar(d, repetir);
        Atividades.registrar('financeiro', 'Despesa lançada',
          `${Despesas.resumo(d)}${repetir > 1 ? ` – repetida por ${repetir} meses` : ''}`, { refId: criadas[0].id });
        Utils.toast(repetir > 1 ? `${repetir} despesas lançadas!` : 'Despesa lançada!');
      }
      Utils.fecharModal('modalDespesa');
      App.renderizarAtual();
    });

    $('formPagarDespesa').addEventListener('submit', (e) => {
      e.preventDefault();
      const form2 = $('formPagarDespesa');
      const p = Utils.lerForm(form2);
      const erros = [];
      if (!p.dataPagamento) erros.push({ campo: 'dataPagamento', msg: 'Informe a data do pagamento.' });
      if (!(Number(p.valorPago) > 0)) erros.push({ campo: 'valorPago', msg: 'Informe o valor pago.' });
      if (erros.length) return Utils.mostrarErros(form2, erros);
      const d = Despesas.pagar(p.id, p);
      Atividades.registrar('financeiro', 'Despesa paga', `${d.descricao}: ${Utils.formatarMoeda(d.valorPago)} via ${d.formaPagamento}`, { refId: d.id });
      Utils.fecharModal('modalPagarDespesa');
      App.renderizarAtual();
      Utils.toast('Pagamento da despesa registrado!');
    });

    // Pagamento de professores
    $('mesProfessores').addEventListener('change', () => {
      $('vencProfessores').value = Utils.somarMeses(`${$('mesProfessores').value}-01`, 1, 5);
      this.renderizarProfessores();
    });
    $('listaPagamentoProfessores').addEventListener('change', () => this.atualizarTotalProfessores());
    $('btnGerarPagamentos').addEventListener('click', () => this.gerarPagamentos());
  },

  abrir(d = null) {
    Utils.preencherForm($('formDespesa'), d || { vencimento: Utils.hoje(), repetir: '1' });
    $('linhaRepetir').hidden = Boolean(d);
    Utils.abrirModal('modalDespesa', d ? 'Editar despesa' : 'Nova despesa');
  },

  abrirPagamento(d) {
    $('resumoPagarDespesa').innerHTML = `<strong>${Utils.escapar(d.descricao)}</strong><br>
      ${Utils.escapar(d.categoria)} · vence ${Utils.formatarData(d.vencimento)} · ${Utils.formatarMoeda(d.valor)}`;
    Utils.preencherForm($('formPagarDespesa'), { id: d.id, dataPagamento: Utils.hoje(), valorPago: d.valor, formaPagamento: 'PIX' });
    Utils.abrirModal('modalPagarDespesa');
  },

  listaFiltrada() {
    return Despesas.filtrar($('buscaDespesas').value, $('filtroMesDespesas').value,
      $('filtroCategoriaDespesas').value, $('filtroSituacaoDespesas').value);
  },

  acoes(d, sit) {
    const b = (acao, icone, titulo) => `<button class="btn-icon" data-acao="${acao}" data-id="${d.id}" title="${titulo}">${icone}</button>`;
    if (sit === 'Pago') return b('estornar', '↩️', 'Desfazer pagamento');
    if (sit === 'Cancelado') return b('reativar', '♻️', 'Reativar') + b('excluir', '🗑️', 'Excluir');
    return b('pagar', '💲', 'Registrar pagamento') + b('editar', '✏️', 'Editar') + b('cancelar', '🚫', 'Cancelar');
  },

  renderizar() {
    const e = Utils.escapar;
    const lista = this.listaFiltrada();
    $('listaDespesas').innerHTML = lista.map((d) => {
      const sit = Despesas.situacao(d);
      return `<tr>
        <td><strong>${e(d.descricao)}</strong>${d.fornecedor ? `<small>${e(d.fornecedor)}</small>` : ''}${d.observacoes ? `<small>${e(d.observacoes)}</small>` : ''}</td>
        <td><span class="chip">${e(d.categoria)}</span></td>
        <td>${Utils.formatarData(d.vencimento)}</td>
        <td>${Utils.formatarMoeda(d.valor)}</td>
        <td>${d.status === 'Pago' ? `${Utils.formatarData(d.dataPagamento)}<small>${e(d.formaPagamento)}${d.pagoPor ? ` · ${e(Usuarios.nome(d.pagoPor))}` : ''}</small>` : '-'}</td>
        <td>${Utils.badge(sit)}</td>
        <td class="acoes">${this.acoes(d, sit)}</td></tr>`;
    }).join('');

    const ativas = lista.filter((d) => d.status !== 'Cancelado');
    $('totalDespesas').innerHTML = lista.length ? `<tr><td colspan="3"><strong>${lista.length} despesa(s)</strong></td>
      <td><strong>${Utils.formatarMoeda(ativas.reduce((s, d) => s + Number(d.valor), 0))}</strong></td>
      <td colspan="3">Pago: <strong>${Utils.formatarMoeda(ativas.filter((d) => d.status === 'Pago').reduce((s, d) => s + Number(d.valorPago || 0), 0))}</strong>
        · Em aberto: <strong>${Utils.formatarMoeda(ativas.filter((d) => d.status !== 'Pago').reduce((s, d) => s + Number(d.valor), 0))}</strong></td></tr>` : '';

    App.estadoVazio('vazioDespesas', lista.length, Despesas.listar().length,
      'Nenhuma despesa lançada ainda. Use "+ Nova despesa" ou "Pagamento de professores".',
      'Nenhuma despesa encontrada com esses filtros.');

    const s = Despesas.estatisticas($('filtroMesDespesas').value || Utils.mesAtual());
    $('statDespPrevisto').textContent = Utils.formatarMoeda(s.previsto);
    $('statDespPago').textContent = Utils.formatarMoeda(s.pago);
    $('statDespAPagar').textContent = Utils.formatarMoeda(s.aPagar);
    $('statDespAtraso').textContent = Utils.formatarMoeda(s.atraso);
  },

  // ---------- Pagamento de professores ----------
  abrirProfessores() {
    const mesPassado = Utils.somarMeses(`${Utils.mesAtual()}-01`, -1).slice(0, 7);
    $('mesProfessores').value = mesPassado;
    $('vencProfessores').value = Utils.somarMeses(`${mesPassado}-01`, 1, 5);
    this.renderizarProfessores();
    Utils.abrirModal('modalProfessoresPagamento');
  },

  renderizarProfessores() {
    const e = Utils.escapar;
    const mes = $('mesProfessores').value;
    this.calculos = mes ? Despesas.calcularProfessores(mes) : [];
    $('listaPagamentoProfessores').innerHTML = this.calculos.length ? `
      <div class="table-wrap table-plana"><table>
        <thead><tr><th></th><th>Professor(a)</th><th>Turmas e aulas</th><th>Horas</th><th>Valor/h</th><th>Total</th><th>Situação</th></tr></thead>
        <tbody>${this.calculos.map((c, i) => `<tr>
          <td><input type="checkbox" class="check-prof" data-indice="${i}" ${c.gerada ? 'disabled' : 'checked'}></td>
          <td><strong>${e(c.professor.nome)}</strong></td>
          <td>${c.detalhes.map((x) => `${e(x.turma.codigo)}: ${x.aulas} aula(s)`).join('<br>')}</td>
          <td>${Utils.formatarHoras(c.horas)}</td>
          <td>${Utils.formatarMoeda(c.professor.valorHora)}</td>
          <td><strong>${Utils.formatarMoeda(c.valor)}</strong></td>
          <td>${c.gerada ? `${Utils.badge('Lançada')}<small>${e(Despesas.situacao(c.gerada))}</small>` : '<span class="texto-suave">Não lançada</span>'}</td>
        </tr>`).join('')}</tbody></table></div>`
      : '<p class="graf-vazio">Nenhuma aula com professor (com valor da hora-aula cadastrado) neste mês.</p>';
    this.atualizarTotalProfessores();
  },

  selecionadosProfessores() {
    return [...document.querySelectorAll('.check-prof:checked')].map((c) => this.calculos[c.dataset.indice]);
  },

  atualizarTotalProfessores() {
    const sel = this.selecionadosProfessores();
    $('totalPagamentoProfessores').textContent = sel.length
      ? `${sel.length} professor(es) · ${Utils.formatarMoeda(sel.reduce((s, c) => s + c.valor, 0))}` : 'Nenhum selecionado';
    $('btnGerarPagamentos').disabled = !sel.length;
  },

  gerarPagamentos() {
    const mes = $('mesProfessores').value;
    const venc = $('vencProfessores').value;
    if (!venc) return Utils.toast('Informe o vencimento.', 'erro');
    const sel = this.selecionadosProfessores();
    sel.forEach((c) => {
      const d = Despesas.gerarProfessor(c, mes, venc);
      Atividades.registrar('financeiro', 'Despesa lançada', `${Despesas.resumo(d)} – ${Utils.formatarHoras(c.horas)}`, { refId: d.id });
    });
    Utils.toast(`${sel.length} pagamento(s) de professor lançado(s)!`);
    this.renderizarProfessores();
    App.renderizarAtual();
  },
};

const TelaResultado = {
  iniciar() {
    $('mesResultado').value = Utils.mesAtual();
    $('mesResultado').addEventListener('change', () => this.renderizar());
  },

  renderizar() {
    const e = Utils.escapar;
    const mes = $('mesResultado').value || Utils.mesAtual();
    const r = Resultado.doMes(mes);
    $('resReceita').textContent = Utils.formatarMoeda(r.receitaRecebida);
    $('resDespesa').textContent = Utils.formatarMoeda(r.despesaPaga);
    $('resLucro').textContent = Utils.formatarMoeda(r.lucro);
    $('resLucro').className = r.lucro < 0 ? 'texto-perigo' : 'texto-sucesso';
    $('resMargem').textContent = r.margem !== null ? `${r.margem}%` : '-';

    // Últimos 6 meses até o mês escolhido
    const meses = [];
    for (let i = 5; i >= 0; i--) meses.push(Utils.somarMeses(`${mes}-01`, -i).slice(0, 7));
    const dados = meses.map((m) => ({ mes: m, ...Resultado.doMes(m) }));
    Graficos.colunas($('grafResultado'),
      dados.map((d) => ({ rotulo: Utils.nomeMes(d.mes), valores: [d.receitaRecebida, d.despesaPaga] })),
      [{ nome: 'Receitas recebidas', classe: 'serie-1' }, { nome: 'Despesas pagas', classe: 'serie-2' }],
      { formatar: Utils.formatarMoeda });
    // Tabela com o lucro de cada mês (o gráfico usa uma só escala; o lucro vai em números)
    $('tabelaResultado').innerHTML = `<table>
      <thead><tr><th>Mês</th>${dados.map((d) => `<th>${Utils.nomeMes(d.mes)}</th>`).join('')}</tr></thead>
      <tbody>
        <tr><td>Receitas</td>${dados.map((d) => `<td>${Utils.formatarMoeda(d.receitaRecebida)}</td>`).join('')}</tr>
        <tr><td>Despesas</td>${dados.map((d) => `<td>${Utils.formatarMoeda(d.despesaPaga)}</td>`).join('')}</tr>
        <tr class="linha-total"><td>Lucro</td>${dados.map((d) =>
          `<td class="${d.lucro < 0 ? 'texto-perigo' : 'texto-sucesso'}">${d.lucro < 0 ? '▼' : '▲'} ${Utils.formatarMoeda(d.lucro)}</td>`).join('')}</tr>
      </tbody></table>`;

    // Demonstrativo (regime de caixa)
    const receitas = Resultado.receitasPorTipo(mes);
    const despesas = Resultado.despesasPagasPorCategoria(mes);
    const linha = (rotulo, valor, classe = '') => `<tr class="${classe}"><td>${e(rotulo)}</td><td>${Utils.formatarMoeda(valor)}</td></tr>`;
    $('dreResultado').innerHTML = `<table class="dre">
      <tbody>
        <tr class="dre-grupo"><td colspan="2">Receitas recebidas</td></tr>
        ${receitas.map((x) => linha(x.rotulo, x.valor)).join('')}
        ${linha('Total de receitas', r.receitaRecebida, 'dre-subtotal')}
        <tr class="dre-grupo"><td colspan="2">Despesas pagas</td></tr>
        ${despesas.map((x) => linha(x.rotulo, -x.valor)).join('') || '<tr><td colspan="2" class="texto-suave">Nenhuma despesa paga</td></tr>'}
        ${linha('Total de despesas', -r.despesaPaga, 'dre-subtotal')}
        ${linha(r.lucro >= 0 ? 'Lucro do mês' : 'Prejuízo do mês', r.lucro, `dre-total ${r.lucro < 0 ? 'texto-perigo' : 'texto-sucesso'}`)}
      </tbody></table>
      <p class="ajuda dre-nota">Previsto para o mês (por vencimento): receitas ${Utils.formatarMoeda(r.receitaPrevista)} –
        despesas ${Utils.formatarMoeda(r.despesaPrevista)} = <strong>${Utils.formatarMoeda(r.lucroPrevisto)}</strong></p>`;

    Graficos.barrasH($('grafCategorias'), Despesas.porCategoria(mes).map((c) => ({ ...c, texto: Utils.formatarMoeda(c.valor) })));
  },
};
