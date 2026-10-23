// ===== Modelo: Financeiro (contas a receber) =====
const Financeiro = {
  ...criarRepositorio('financeiro'),

  // Situação calculada: um lançamento pendente vencido vira "Atrasado"
  situacao(l) {
    if (l.status === 'Pago' || l.status === 'Cancelado') return l.status;
    return l.vencimento < Utils.hoje() ? 'Atrasado' : 'Pendente';
  },

  validar(l) {
    const erros = [];
    if (!Alunos.buscarPorId(l.alunoId)) erros.push({ campo: 'alunoId', msg: 'Selecione o aluno.' });
    if (!l.descricao) erros.push({ campo: 'descricao', msg: 'Informe a descrição.' });
    if (!(l.valor > 0)) erros.push({ campo: 'valor', msg: 'Informe um valor maior que zero.' });
    if (!l.vencimento) erros.push({ campo: 'vencimento', msg: 'Informe o vencimento.' });
    return erros;
  },

  pagar(id, { dataPagamento, valorPago, formaPagamento, recebidoPor }) {
    return this.salvar({
      id, status: 'Pago', dataPagamento, valorPago: Number(valorPago), formaPagamento,
      recebidoPor: recebidoPor || Sessao.idAtual(),
    });
  },

  estornar(id) {
    return this.salvar({ id, status: 'Pendente', dataPagamento: '', valorPago: '', formaPagamento: '', recebidoPor: '' });
  },

  // Gera o número da fatura na primeira emissão
  emitirFatura(id, { usuarioId, data } = {}) {
    const l = this.buscarPorId(id);
    if (l.numeroFatura) return l;
    return this.salvar({
      id, numeroFatura: Instituicao.proximoNumeroFatura(),
      faturaEmitidaEm: data || new Date().toISOString(), faturaEmitidaPor: usuarioId || Sessao.idAtual(),
    });
  },

  // Texto curto para o registro de atividades
  resumo(l) {
    return `${this.nomeAluno(l)} – ${l.descricao} (${Utils.formatarMoeda(l.valor)})`;
  },

  // Cancela as parcelas ainda não pagas de uma matrícula; retorna quantas
  cancelarPendentes(matriculaId) {
    const pendentes = this.listar().filter((l) => l.matriculaId === matriculaId && l.status === 'Pendente');
    pendentes.forEach((l) => this.salvar({ id: l.id, status: 'Cancelado' }));
    return pendentes.length;
  },

  pendentesDaMatricula(matriculaId) {
    return this.listar().filter((l) => l.matriculaId === matriculaId && l.status === 'Pendente').length;
  },

  nomeAluno(l) {
    return Alunos.buscarPorId(l.alunoId)?.nome || '(aluno removido)';
  },

  filtrar(termo, mes, situacao) {
    const t = (termo || '').toLowerCase().trim();
    return this.listar()
      .filter((l) => !mes || (l.vencimento || '').startsWith(mes))
      .filter((l) => !situacao || this.situacao(l) === situacao)
      .filter((l) => !t || [this.nomeAluno(l), l.descricao].some((v) => (v || '').toLowerCase().includes(t)))
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  },

  atrasados() {
    return this.listar().filter((l) => this.situacao(l) === 'Atrasado');
  },

  // Totais de um mês ("AAAA-MM")
  totaisDoMes(mes) {
    const lista = this.listar();
    return {
      previsto: lista.filter((l) => l.status !== 'Cancelado' && l.vencimento.startsWith(mes))
        .reduce((s, l) => s + Number(l.valor), 0),
      recebido: lista.filter((l) => l.status === 'Pago' && (l.dataPagamento || '').startsWith(mes))
        .reduce((s, l) => s + Number(l.valorPago || 0), 0),
    };
  },

  estatisticas(mes = Utils.mesAtual()) {
    const atrasados = this.atrasados();
    return {
      ...this.totaisDoMes(mes),
      atraso: atrasados.reduce((s, l) => s + Number(l.valor), 0),
      inadimplentes: new Set(atrasados.map((l) => l.alunoId)).size,
    };
  },

  colunasCSV: [
    ['Aluno', (l) => Financeiro.nomeAluno(l)],
    ['Descrição', (l) => l.descricao],
    ['Vencimento', (l) => Utils.formatarData(l.vencimento)],
    ['Valor', (l) => Number(l.valor).toFixed(2).replace('.', ',')],
    ['Situação', (l) => Financeiro.situacao(l)],
    ['Data pagamento', (l) => (l.dataPagamento ? Utils.formatarData(l.dataPagamento) : '')],
    ['Valor pago', (l) => (l.valorPago ? Number(l.valorPago).toFixed(2).replace('.', ',') : '')],
    ['Forma', (l) => l.formaPagamento || ''],
    ['Recebido por', (l) => Usuarios.nome(l.recebidoPor)],
    ['Nº fatura', (l) => l.numeroFatura || ''],
  ],
};
