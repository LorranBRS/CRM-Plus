// ===== Simulador de propostas: regras de pagamento e cálculo das condições =====
const Simulador = {
  FORMAS: {
    pix: { nome: 'PIX', icone: '⚡' },
    boleto: { nome: 'Boleto', icone: '📄' },
    cartao: { nome: 'Cartão de crédito', icone: '💳' },
  },

  PADRAO: {
    pix: { ativo: true, descontoVista: 10 },
    boleto: { ativo: true, descontoVista: 5, maxParcelas: 12, semJurosAte: 12, jurosMes: 1.49 },
    cartao: { ativo: true, descontoVista: 0, maxParcelas: 18, semJurosAte: 12, jurosMes: 1.99 },
    descontoMaxFuncionario: 10,
    validadeDias: 7,
  },

  // Regras definidas pelo diretor (guardadas nos dados da instituição)
  regras() {
    const salvas = Instituicao.ler().regrasPagamento || {};
    const r = JSON.parse(JSON.stringify(this.PADRAO));
    Object.keys(r).forEach((k) => { if (salvas[k] !== undefined) r[k] = typeof r[k] === 'object' ? { ...r[k], ...salvas[k] } : salvas[k]; });
    return r;
  },

  salvarRegras(regras) {
    Instituicao.salvar({ regrasPagamento: regras });
  },

  validarRegras(r) {
    const erros = [];
    ['boleto', 'cartao'].forEach((f) => {
      const x = r[f];
      if (!(x.maxParcelas >= 1 && x.maxParcelas <= 48)) erros.push(`${this.FORMAS[f].nome}: máximo de parcelas entre 1 e 48.`);
      if (!(x.semJurosAte >= 1 && x.semJurosAte <= x.maxParcelas)) erros.push(`${this.FORMAS[f].nome}: "sem juros até" deve ficar entre 1 e o máximo de parcelas.`);
      if (!(x.jurosMes >= 0 && x.jurosMes <= 15)) erros.push(`${this.FORMAS[f].nome}: juros ao mês entre 0% e 15%.`);
    });
    ['pix', 'boleto', 'cartao'].forEach((f) => {
      if (!(r[f].descontoVista >= 0 && r[f].descontoVista <= 50)) erros.push(`${this.FORMAS[f].nome}: desconto à vista entre 0% e 50%.`);
    });
    if (!(r.descontoMaxFuncionario >= 0 && r.descontoMaxFuncionario <= 100)) erros.push('Desconto máximo do atendente entre 0% e 100%.');
    if (!(r.validadeDias >= 1 && r.validadeDias <= 90)) erros.push('Validade da proposta entre 1 e 90 dias.');
    return erros;
  },

  arredondar(v) {
    return Math.round(v * 100) / 100;
  },

  // Prestação fixa com juros compostos (Tabela Price)
  parcelaPrice(valor, n, jurosMes) {
    const i = jurosMes / 100;
    if (!i) return valor / n;
    return valor * i / (1 - (1 + i) ** -n);
  },

  // Valor de referência do curso: mensalidade × duração + taxa de matrícula
  valorDoCurso(curso) {
    const meses = Number(curso.duracaoMeses || 1);
    return this.arredondar(Number(curso.mensalidade || 0) * meses + Number(curso.taxaMatricula || 0));
  },

  /**
   * Calcula todas as condições.
   * entrada: { valor, descontoExtra (%), entrada (R$) }
   * Retorna { base, avista: [...], parcelado: { boleto: [...], cartao: [...] } }
   */
  calcular({ valor, descontoExtra = 0, entrada = 0 }) {
    const r = this.regras();
    const base = this.arredondar(Number(valor || 0) * (1 - Number(descontoExtra || 0) / 100));
    const financiado = Math.max(0, base - Number(entrada || 0));

    const avista = ['pix', 'boleto', 'cartao'].filter((f) => r[f].ativo).map((f) => {
      const total = this.arredondar(base * (1 - r[f].descontoVista / 100));
      return { id: `${f}-1`, forma: f, parcelas: 1, valorParcela: total, total, desconto: r[f].descontoVista, economia: this.arredondar(base - total), juros: 0 };
    });

    const parcelado = {};
    ['boleto', 'cartao'].filter((f) => r[f].ativo).forEach((f) => {
      parcelado[f] = [];
      for (let n = 2; n <= r[f].maxParcelas; n++) {
        const comJuros = n > r[f].semJurosAte && r[f].jurosMes > 0;
        const parcela = this.arredondar(this.parcelaPrice(financiado, n, comJuros ? r[f].jurosMes : 0));
        // Sem juros o total é exatamente o valor (centavos do arredondamento vão na última parcela)
        const total = comJuros ? this.arredondar(parcela * n + Number(entrada || 0)) : this.arredondar(financiado + Number(entrada || 0));
        parcelado[f].push({ id: `${f}-${n}`, forma: f, parcelas: n, valorParcela: parcela, total, entrada: Number(entrada || 0),
          juros: comJuros ? r[f].jurosMes : 0, acrescimo: this.arredondar(total - base) });
      }
    });

    return { valor: Number(valor || 0), descontoExtra: Number(descontoExtra || 0), entrada: Number(entrada || 0), base, avista, parcelado, regras: r };
  },

  // Texto curto de uma condição: "12x de R$ 250,00 no cartão (sem juros)"
  descreverOpcao(op) {
    const forma = op.forma === 'pix' ? 'PIX' : this.FORMAS[op.forma].nome.toLowerCase();
    if (op.parcelas === 1) {
      return `À vista no ${forma}: ${Utils.formatarMoeda(op.total)}${op.desconto ? ` (${String(op.desconto).replace('.', ',')}% de desconto)` : ''}`;
    }
    return `${op.entrada ? `Entrada de ${Utils.formatarMoeda(op.entrada)} + ` : ''}${op.parcelas}x de ${Utils.formatarMoeda(op.valorParcela)} no ${forma}` +
      `${op.juros ? ` (juros de ${String(op.juros).replace('.', ',')}% a.m., total ${Utils.formatarMoeda(op.total)})` : ' (sem juros)'}`;
  },

  // Melhores condições de cada forma, para resumir a proposta
  destaques(resultado) {
    const lista = [...resultado.avista];
    Object.values(resultado.parcelado).forEach((ops) => {
      const semJuros = ops.filter((o) => !o.juros);
      if (semJuros.length) lista.push(semJuros[semJuros.length - 1]);
      const comJuros = ops.filter((o) => o.juros);
      if (comJuros.length) lista.push(comJuros[comJuros.length - 1]);
    });
    return lista;
  },

  // Texto da proposta para WhatsApp / área de transferência
  textoProposta({ resultado, escolhida, curso, cliente }) {
    const linhas = [];
    const r = resultado.regras;
    linhas.push(`Olá${cliente ? `, ${cliente.split(' ')[0]}` : ''}! Segue a proposta${curso ? ` para o curso *${curso.nome}*` : ''}:`);
    linhas.push('');
    if (curso) linhas.push(`📚 ${curso.cargaHoraria}h${curso.duracaoMeses ? ` · ${curso.duracaoMeses} meses` : ''} · ${curso.modalidade}`);
    linhas.push(`💰 Valor do curso: ${Utils.formatarMoeda(resultado.valor)}`);
    if (resultado.descontoExtra) linhas.push(`🎁 Desconto especial de ${String(resultado.descontoExtra).replace('.', ',')}%: ${Utils.formatarMoeda(resultado.base)}`);
    linhas.push('');
    linhas.push('*Formas de pagamento:*');
    this.destaques(resultado).forEach((op) => linhas.push(`${this.FORMAS[op.forma].icone} ${this.descreverOpcao(op)}`));
    if (escolhida) {
      linhas.push('');
      linhas.push(`✅ *Condição combinada:* ${this.descreverOpcao(escolhida)}`);
    }
    linhas.push('');
    linhas.push(`Proposta válida até ${Utils.formatarData(Utils.somarDias(Utils.hoje(), r.validadeDias))}.`);
    return linhas.join('\n');
  },
};
