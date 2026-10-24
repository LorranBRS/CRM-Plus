// ===== Metas mensais (da escola e de cada funcionário) =====
const Metas = {
  ...criarRepositorio('metas'),

  INDICADORES: [
    { id: 'matriculas', nome: 'Matrículas', icone: '📝', tipo: 'qtd', modulo: 'matriculas', individual: true },
    { id: 'leads', nome: 'Novos leads', icone: '🎯', tipo: 'qtd', modulo: 'leads', individual: true },
    { id: 'receita', nome: 'Receita recebida', icone: '💰', tipo: 'moeda', modulo: 'financeiro' },
    { id: 'lucro', nome: 'Lucro', icone: '📈', tipo: 'moeda', somenteDiretor: true },
  ],

  indicadoresVisiveis() {
    return this.INDICADORES.filter((i) => (i.somenteDiretor ? Sessao.ehDiretor() : !i.modulo || Sessao.pode(i.modulo)));
  },

  // Um documento por mês: { mes, valores: { indicador: meta }, individuais: { usuarioId: { indicador: meta } } }
  doMes(mes) {
    return this.listar().find((m) => m.mes === mes) || { mes, valores: {}, individuais: {} };
  },

  salvarMes(mes, valores, individuais, opcoes = {}) {
    const doc = this.doMes(mes);
    return this.salvar({ ...(doc.id ? { id: doc.id } : {}), mes, valores, individuais,
      ...(opcoes.usuarioId ? { criadoPor: opcoes.usuarioId } : {}) });
  },

  formatar(indicador, valor) {
    const tipo = this.INDICADORES.find((i) => i.id === indicador)?.tipo;
    return tipo === 'moeda' ? Utils.formatarMoeda(valor) : String(Math.round(valor * 10) / 10).replace('.', ',');
  },

  // Quanto foi realizado no mês (opcionalmente só de um funcionário)
  realizado(mes, indicador, usuarioId = null) {
    if (indicador === 'matriculas') {
      return Matriculas.listar().filter((m) => (m.dataMatricula || '').startsWith(mes) && (!usuarioId || m.criadoPor === usuarioId)).length;
    }
    if (indicador === 'leads') {
      return Leads.listar().filter((l) => (l.criadoEm || '').length && Utils.paraISO(new Date(l.criadoEm)).startsWith(mes) &&
        (!usuarioId || l.responsavelId === usuarioId)).length;
    }
    if (indicador === 'receita') {
      return Financeiro.listar().filter((l) => l.status === 'Pago' && (l.dataPagamento || '').startsWith(mes) &&
        (!usuarioId || l.recebidoPor === usuarioId)).reduce((s, l) => s + Number(l.valorPago || 0), 0);
    }
    if (indicador === 'lucro') return Resultado.doMes(mes).lucro;
    return 0;
  },

  // Meta, realizado, % e projeção pelo ritmo atual (só no mês corrente)
  progresso(mes, indicador, usuarioId = null) {
    const doc = this.doMes(mes);
    const meta = Number((usuarioId ? doc.individuais?.[usuarioId]?.[indicador] : doc.valores?.[indicador]) || 0);
    const realizado = this.realizado(mes, indicador, usuarioId);
    const pct = meta ? Math.round((realizado / meta) * 100) : null;
    let projecao = null;
    if (mes === Utils.mesAtual()) {
      const hoje = Number(Utils.hoje().slice(8, 10));
      const diasNoMes = Number(Utils.somarDias(Utils.somarMeses(`${mes}-01`, 1), -1).slice(8, 10));
      projecao = (realizado / hoje) * diasNoMes;
    }
    return { meta, realizado, pct, projecao, encerrado: mes < Utils.mesAtual() };
  },

  // Texto e classe para o status (sempre com texto/ícone, nunca só a cor)
  status(p) {
    if (!p.meta) return { texto: 'Sem meta', classe: 'inativo', icone: '–' };
    if (p.pct >= 100) return { texto: 'Meta batida', classe: 'aprovado', icone: '✓' };
    if (p.encerrado) return { texto: 'Não atingida', classe: 'reprovado', icone: '✗' };
    if (p.projecao !== null && p.projecao >= p.meta) return { texto: 'No ritmo', classe: 'aprovado', icone: '↗' };
    if (p.pct >= 70 || (p.projecao !== null && p.projecao >= p.meta * 0.8)) return { texto: 'Atenção', classe: 'em-curso', icone: '!' };
    return { texto: 'Abaixo do ritmo', classe: 'reprovado', icone: '↘' };
  },
};
