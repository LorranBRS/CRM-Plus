// ===== Propostas comerciais: histórico, situação e aprovação de desconto =====
const Propostas = {
  ...criarRepositorio('propostas'),

  // "Vencida" é calculada: proposta aberta/enviada depois da validade
  STATUS: ['Aguardando aprovação', 'Desconto recusado', 'Aberta', 'Enviada', 'Aceita', 'Recusada', 'Vencida'],
  MOTIVOS: ['Preço', 'Horário / turma', 'Escolheu a concorrência', 'Desistiu / adiou', 'Sem retorno', 'Outro'],
  DIAS_RETORNO: 2,

  situacao(p) {
    if (['Aberta', 'Enviada'].includes(p.status) && p.validade < Utils.hoje()) return 'Vencida';
    return p.status;
  },

  // Pode ser enviada/usada (não está bloqueada nem encerrada)
  liberada(p) {
    return ['Aberta', 'Enviada'].includes(this.situacao(p));
  },

  numero(p) {
    return `PR-${new Date(p.criadoEm).getFullYear()}-${String(p.numeroSeq).padStart(4, '0')}`;
  },

  proximoNumero() {
    const n = (Instituicao.ler().ultimaProposta || 0) + 1;
    Instituicao.salvar({ ultimaProposta: n });
    return n;
  },

  // Desconto especial acima do limite precisa do diretor (o diretor aprova as próprias)
  precisaAprovacao(descontoExtra) {
    return descontoExtra > Simulador.regras().descontoMaxFuncionario && !Sessao.ehDiretor();
  },

  /**
   * Cria a proposta a partir de uma simulação.
   * dados: { resultado, opcao, curso, cliente } ; opcoes: { usuarioId, data } (dados de exemplo)
   */
  criar({ resultado, opcao, curso, cliente }, opcoes = {}) {
    const usuarioId = opcoes.usuarioId || Sessao.idAtual();
    const data = opcoes.data || new Date().toISOString();
    const aguardando = opcoes.status ? opcoes.status === 'Aguardando aprovação' : this.precisaAprovacao(resultado.descontoExtra);
    const p = this.salvar({
      numeroSeq: this.proximoNumero(),
      clienteTipo: cliente?.tipo || '', clienteId: cliente?.id || '', clienteNome: cliente?.nome || 'Cliente não informado',
      cursoId: curso?.id || '', cursoNome: curso?.nome || 'Valor livre',
      valor: resultado.valor, descontoExtra: resultado.descontoExtra, entrada: resultado.entrada, base: resultado.base,
      opcao, forma: opcao.forma, parcelas: opcao.parcelas, total: opcao.total, descricao: Simulador.descreverOpcao(opcao),
      validade: Utils.somarDias(Utils.paraISO(new Date(data)), resultado.regras.validadeDias),
      status: aguardando ? 'Aguardando aprovação' : 'Aberta',
      atendenteId: usuarioId, criadoPor: usuarioId, criadoEm: data,
      historico: [{ data, usuarioId, texto: aguardando
        ? `Proposta criada com ${resultado.descontoExtra}% de desconto especial – enviada para aprovação da direção`
        : 'Proposta criada' }],
    });
    Atividades.registrar('simulador', aguardando ? 'Aprovação de desconto solicitada' : 'Proposta criada',
      `${this.numero(p)} – ${p.clienteNome} – ${p.cursoNome}: ${p.descricao}${p.descontoExtra ? ` (desconto especial ${p.descontoExtra}%)` : ''}`,
      { refId: p.id, usuarioId, data });
    return p;
  },

  // Muda a situação e registra no histórico e nas atividades
  mudar(id, status, texto, extras = {}, opcoes = {}) {
    const p = this.buscarPorId(id);
    const usuarioId = opcoes.usuarioId || Sessao.idAtual();
    const data = opcoes.data || new Date().toISOString();
    const atualizada = this.salvar({ id, status, ...extras, historico: [...(p.historico || []), { data, usuarioId, texto }] });
    const acoes = { Enviada: 'Proposta enviada', Aceita: 'Proposta aceita', Recusada: 'Proposta recusada',
      Aberta: 'Desconto aprovado', 'Desconto recusado': 'Desconto recusado' };
    Atividades.registrar('simulador', acoes[status] || 'Proposta atualizada', `${this.numero(p)} – ${p.clienteNome}: ${texto}`,
      { refId: id, usuarioId, data });
    return atualizada;
  },

  marcarEnviada(id, meio, opcoes = {}) {
    const p = this.buscarPorId(id);
    if (!p || !this.liberada(p)) return p;
    const primeira = p.status !== 'Enviada';
    const data = opcoes.data || new Date().toISOString();
    const atualizada = this.mudar(id, 'Enviada', `${primeira ? 'Enviada' : 'Reenviada'} ao cliente (${meio})`,
      { enviadaEm: primeira ? data : p.enviadaEm, ultimoEnvio: data }, opcoes);
    // Lead em negociação
    if (p.clienteTipo === 'lead' && primeira) {
      const lead = Leads.buscarPorId(p.clienteId);
      if (lead && Leads.emAberto(lead)) {
        Leads.salvarComNota({ ...lead, etapa: ['Novo', 'Contato feito', 'Visita agendada'].includes(lead.etapa) ? 'Negociação' : lead.etapa,
          cursoId: p.cursoId || lead.cursoId }, `Proposta ${this.numero(p)} enviada: ${p.descricao}`, opcoes);
      }
    }
    return atualizada;
  },

  aprovar(id, comentario = '', opcoes = {}) {
    return this.mudar(id, 'Aberta', `Desconto de ${this.buscarPorId(id).descontoExtra}% aprovado${comentario ? `: ${comentario}` : ''}`,
      { aprovacao: { status: 'Aprovado', por: opcoes.usuarioId || Sessao.idAtual(), em: opcoes.data || new Date().toISOString(), comentario } }, opcoes);
  },

  recusarDesconto(id, comentario = '', opcoes = {}) {
    return this.mudar(id, 'Desconto recusado', `Desconto recusado pela direção${comentario ? `: ${comentario}` : ''}`,
      { aprovacao: { status: 'Recusado', por: opcoes.usuarioId || Sessao.idAtual(), em: opcoes.data || new Date().toISOString(), comentario } }, opcoes);
  },

  aceitar(id, matriculaId, opcoes = {}) {
    return this.mudar(id, 'Aceita', 'Cliente aceitou – matrícula realizada', { matriculaId, respondidaEm: opcoes.data || new Date().toISOString() }, opcoes);
  },

  recusar(id, motivo, observacao = '', opcoes = {}) {
    return this.mudar(id, 'Recusada', `Cliente recusou – ${motivo}${observacao ? `: ${observacao}` : ''}`,
      { motivoRecusa: motivo, observacaoRecusa: observacao, respondidaEm: opcoes.data || new Date().toISOString() }, opcoes);
  },

  // Data em que o atendente deve cobrar um retorno do cliente
  dataRetorno(p) {
    return p.status === 'Enviada' && p.ultimoEnvio ? Utils.somarDias(Utils.paraISO(new Date(p.ultimoEnvio)), this.DIAS_RETORNO) : null;
  },

  aguardandoRetorno(atendenteId = null) {
    const hoje = Utils.hoje();
    return this.listar().filter((p) => this.situacao(p) === 'Enviada' && this.dataRetorno(p) <= hoje && (!atendenteId || p.atendenteId === atendenteId))
      .sort((a, b) => this.dataRetorno(a).localeCompare(this.dataRetorno(b)));
  },

  aguardandoAprovacao() {
    return this.listar().filter((p) => p.status === 'Aguardando aprovação').sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  },

  filtrar({ termo, status, atendenteId, periodo } = {}) {
    const t = (termo || '').toLowerCase().trim();
    return this.listar()
      .filter((p) => !status || this.situacao(p) === status)
      .filter((p) => !atendenteId || p.atendenteId === atendenteId)
      .filter((p) => Utils.noPeriodo(p.criadoEm, periodo))
      .filter((p) => !t || [this.numero(p), p.clienteNome, p.cursoNome, p.descricao].some((v) => (v || '').toLowerCase().includes(t)))
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  },

  // Indicadores para o relatório (aceite só conta propostas já decididas)
  relatorio(lista) {
    const decididas = lista.filter((p) => ['Aceita', 'Recusada', 'Vencida'].includes(this.situacao(p)));
    const aceitas = lista.filter((p) => p.status === 'Aceita');
    const comDesconto = lista.filter((p) => p.descontoExtra > 0 && !['Aguardando aprovação', 'Desconto recusado'].includes(p.status));
    const porAtendente = {};
    lista.forEach((p) => {
      const a = (porAtendente[p.atendenteId] ||= { total: 0, decididas: 0, aceitas: 0, valor: 0 });
      a.total += 1;
      if (['Aceita', 'Recusada', 'Vencida'].includes(this.situacao(p))) a.decididas += 1;
      if (p.status === 'Aceita') { a.aceitas += 1; a.valor += Number(p.total); }
    });
    const contar = (fn, chaves) => chaves.map((k) => ({ rotulo: k, valor: lista.filter((p) => fn(p) === k).length })).filter((x) => x.valor);
    return {
      total: lista.length,
      taxaAceite: decididas.length ? Math.round((aceitas.length / decididas.length) * 100) : null,
      valorAceito: aceitas.reduce((s, p) => s + Number(p.total), 0),
      descontoMedio: comDesconto.length ? comDesconto.reduce((s, p) => s + Number(p.descontoExtra), 0) / comDesconto.length : 0,
      porAtendente,
      motivos: contar((p) => (p.status === 'Recusada' ? p.motivoRecusa : null), this.MOTIVOS),
      formas: contar((p) => (p.status === 'Aceita' ? `${Simulador.FORMAS[p.forma].nome}${p.parcelas > 1 ? ' parcelado' : ' à vista'}` : null),
        ['PIX à vista', 'Boleto à vista', 'Boleto parcelado', 'Cartão de crédito à vista', 'Cartão de crédito parcelado']),
    };
  },
};
