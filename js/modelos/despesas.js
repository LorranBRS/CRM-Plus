// ===== Despesas (contas a pagar) e resultado (lucro) =====
const Despesas = {
  ...criarRepositorio('despesas'),

  CATEGORIAS: ['Aluguel', 'Professores', 'Salários', 'Água, luz e internet', 'Marketing', 'Material didático',
    'Impostos e taxas', 'Manutenção', 'Outros'],

  situacao(d) {
    if (d.status === 'Pago' || d.status === 'Cancelado') return d.status;
    return d.vencimento < Utils.hoje() ? 'Atrasado' : 'Pendente';
  },

  validar(d, repetir = 1) {
    const erros = [];
    if (!d.descricao) erros.push({ campo: 'descricao', msg: 'Informe a descrição.' });
    if (!d.categoria) erros.push({ campo: 'categoria', msg: 'Escolha a categoria.' });
    if (!(d.valor > 0)) erros.push({ campo: 'valor', msg: 'Informe um valor maior que zero.' });
    if (!d.vencimento) erros.push({ campo: 'vencimento', msg: 'Informe o vencimento.' });
    if (!Number.isInteger(repetir) || repetir < 1 || repetir > 24) erros.push({ campo: 'repetir', msg: 'Repetir: de 1 a 24 meses.' });
    return erros;
  },

  // Cria a despesa (e as repetições mensais, se houver)
  criar(dados, repetir = 1, opcoes = {}) {
    const grupo = repetir > 1 ? Utils.gerarId() : '';
    const dia = Number(dados.vencimento.slice(8, 10));
    return Array.from({ length: repetir }, (_, i) => this.salvar({
      ...dados, status: 'Pendente', grupo,
      vencimento: i ? Utils.somarMeses(dados.vencimento, i, dia) : dados.vencimento,
      ...(opcoes.usuarioId ? { criadoPor: opcoes.usuarioId } : {}),
    }));
  },

  pagar(id, { dataPagamento, valorPago, formaPagamento, pagoPor }) {
    return this.salvar({ id, status: 'Pago', dataPagamento, valorPago: Number(valorPago), formaPagamento,
      pagoPor: pagoPor || Sessao.idAtual() });
  },

  estornar(id) {
    return this.salvar({ id, status: 'Pendente', dataPagamento: '', valorPago: '', formaPagamento: '', pagoPor: '' });
  },

  resumo(d) {
    return `${d.descricao} (${d.categoria}) – ${Utils.formatarMoeda(d.valor)}`;
  },

  filtrar(termo, mes, categoria, situacao) {
    const t = (termo || '').toLowerCase().trim();
    return this.listar()
      .filter((d) => !mes || d.vencimento.startsWith(mes))
      .filter((d) => !categoria || d.categoria === categoria)
      .filter((d) => !situacao || this.situacao(d) === situacao)
      .filter((d) => !t || [d.descricao, d.fornecedor, d.categoria].some((v) => (v || '').toLowerCase().includes(t)))
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  },

  totaisDoMes(mes) {
    const lista = this.listar();
    return {
      previsto: lista.filter((d) => d.status !== 'Cancelado' && d.vencimento.startsWith(mes)).reduce((s, d) => s + Number(d.valor), 0),
      pago: lista.filter((d) => d.status === 'Pago' && (d.dataPagamento || '').startsWith(mes)).reduce((s, d) => s + Number(d.valorPago || 0), 0),
    };
  },

  estatisticas(mes = Utils.mesAtual()) {
    const lista = this.listar();
    const atrasadas = lista.filter((d) => this.situacao(d) === 'Atrasado');
    return {
      ...this.totaisDoMes(mes),
      aPagar: lista.filter((d) => this.situacao(d) === 'Pendente' && d.vencimento.startsWith(mes)).reduce((s, d) => s + Number(d.valor), 0),
      atraso: atrasadas.reduce((s, d) => s + Number(d.valor), 0),
      qtdAtraso: atrasadas.length,
    };
  },

  // Despesas do mês (competência = vencimento) por categoria
  porCategoria(mes) {
    const lista = this.listar().filter((d) => d.status !== 'Cancelado' && d.vencimento.startsWith(mes));
    return this.CATEGORIAS.map((c) => ({ rotulo: c, valor: lista.filter((d) => d.categoria === c).reduce((s, d) => s + Number(d.valor), 0) }))
      .filter((c) => c.valor > 0).sort((a, b) => b.valor - a.valor);
  },

  // ---------- Pagamento dos professores (horas-aula do mês × valor da hora) ----------
  calcularProfessores(mes) {
    const de = `${mes}-01`;
    const ate = Utils.somarDias(Utils.somarMeses(de, 1), -1);
    const semAula = Eventos.diasSemAula();
    return Professores.listar().filter((p) => Number(p.valorHora) > 0).map((p) => {
      const turmas = Turmas.listar().filter((t) => t.professorId === p.id && t.status !== 'Cancelada');
      const detalhes = turmas.map((t) => {
        const aulas = Academico.diasDeAula(t, ate, de, semAula).length;
        return { turma: t, aulas, horas: aulas * Utils.duracaoHoras(t.horaInicio, t.horaFim) };
      }).filter((x) => x.aulas);
      const horas = detalhes.reduce((s, x) => s + x.horas, 0);
      return { professor: p, detalhes, horas, valor: Math.round(horas * Number(p.valorHora) * 100) / 100,
        gerada: this.listar().find((d) => d.professorId === p.id && d.competencia === mes && d.status !== 'Cancelado') };
    }).filter((x) => x.horas > 0);
  },

  gerarProfessor(calculo, mes, vencimento, opcoes = {}) {
    const p = calculo.professor;
    return this.criar({
      descricao: `Hora-aula ${Utils.nomeMes(mes)} – ${p.nome}`, categoria: 'Professores', fornecedor: p.nome,
      valor: calculo.valor, vencimento, professorId: p.id, competencia: mes,
      observacoes: `${Utils.formatarHoras(calculo.horas)} × ${Utils.formatarMoeda(p.valorHora)}/h (${calculo.detalhes.map((x) => `${x.turma.codigo}: ${x.aulas} aulas`).join('; ')})`,
    }, 1, opcoes)[0];
  },

  colunasCSV: [
    ['Descrição', (d) => d.descricao], ['Categoria', (d) => d.categoria], ['Fornecedor', (d) => d.fornecedor || ''],
    ['Vencimento', (d) => Utils.formatarData(d.vencimento)], ['Valor', (d) => Number(d.valor).toFixed(2).replace('.', ',')],
    ['Situação', (d) => Despesas.situacao(d)], ['Pago em', (d) => (d.dataPagamento ? Utils.formatarData(d.dataPagamento) : '')],
    ['Valor pago', (d) => (d.valorPago ? Number(d.valorPago).toFixed(2).replace('.', ',') : '')],
    ['Forma', (d) => d.formaPagamento || ''], ['Pago por', (d) => Usuarios.nome(d.pagoPor)],
  ],
};

// Resultado do mês: receitas – despesas
const Resultado = {
  doMes(mes) {
    const r = Financeiro.totaisDoMes(mes);
    const d = Despesas.totaisDoMes(mes);
    const lucro = r.recebido - d.pago;
    return {
      receitaPrevista: r.previsto, receitaRecebida: r.recebido,
      despesaPrevista: d.previsto, despesaPaga: d.pago,
      lucro, lucroPrevisto: r.previsto - d.previsto,
      margem: r.recebido ? Math.round((lucro / r.recebido) * 100) : null,
    };
  },

  // Receitas recebidas no mês, agrupadas por tipo
  receitasPorTipo(mes) {
    const pagos = Financeiro.listar().filter((l) => l.status === 'Pago' && (l.dataPagamento || '').startsWith(mes));
    const tipo = (l) => (/^mensalidade/i.test(l.descricao) ? 'Mensalidades' : /^taxa/i.test(l.descricao) ? 'Taxas de matrícula' : 'Outras receitas');
    return ['Mensalidades', 'Taxas de matrícula', 'Outras receitas'].map((t) => ({
      rotulo: t, valor: pagos.filter((l) => tipo(l) === t).reduce((s, l) => s + Number(l.valorPago || 0), 0),
    }));
  },

  // Despesas pagas no mês, por categoria
  despesasPagasPorCategoria(mes) {
    const pagas = Despesas.listar().filter((d) => d.status === 'Pago' && (d.dataPagamento || '').startsWith(mes));
    return Despesas.CATEGORIAS.map((c) => ({ rotulo: c, valor: pagas.filter((d) => d.categoria === c).reduce((s, d) => s + Number(d.valorPago || 0), 0) }))
      .filter((c) => c.valor > 0).sort((a, b) => b.valor - a.valor);
  },
};
