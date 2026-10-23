// ===== Modelo: Leads (funil de captação) =====
const Leads = {
  ...criarRepositorio('leads'),

  ETAPAS: ['Novo', 'Contato feito', 'Visita agendada', 'Negociação', 'Matriculado', 'Perdido'],
  ORIGENS: ['Instagram', 'Facebook', 'Google', 'Site', 'WhatsApp', 'Indicação', 'Presencial', 'Outro'],

  emAberto(lead) {
    return lead.etapa !== 'Matriculado' && lead.etapa !== 'Perdido';
  },

  validar(lead) {
    const erros = [];
    if (!lead.nome || lead.nome.length < 2) erros.push({ campo: 'nome', msg: 'Informe o nome.' });
    if (Utils.somenteDigitos(lead.telefone).length < 10) erros.push({ campo: 'telefone', msg: 'Telefone inválido.' });
    if (lead.email && !Utils.emailValido(lead.email)) erros.push({ campo: 'email', msg: 'E-mail inválido.' });
    return erros;
  },

  // Salva mantendo o histórico de interações e registrando quem fez cada coisa.
  // opcoes: { usuarioId, data } (usados pelos dados de exemplo)
  salvarComNota(lead, nota, opcoes = {}) {
    const anterior = lead.id ? this.buscarPorId(lead.id) : null;
    const usuarioId = opcoes.usuarioId || Sessao.idAtual();
    const data = opcoes.data || new Date().toISOString();
    const historico = [...(anterior?.historico || [])];
    const eventos = [];

    if (!anterior) eventos.push(['Lead cadastrado', 'Lead cadastrado.']);
    if (anterior && anterior.etapa !== lead.etapa) eventos.push(['Etapa alterada', `Etapa: ${anterior.etapa} → ${lead.etapa}`]);
    if (nota) eventos.push(['Anotação registrada', nota]);

    eventos.forEach(([, texto]) => historico.push({ data, texto, usuarioId }));
    const salvo = this.salvar({ ...lead, historico, ...(anterior ? {} : { criadoPor: usuarioId, criadoEm: data }) });
    eventos.forEach(([acao, texto]) =>
      Atividades.registrar('leads', acao, `${lead.nome}: ${texto}`, { refId: salvo.id, usuarioId, data }));
    return salvo;
  },

  nomeResponsavel(lead) {
    return Usuarios.nome(lead.responsavelId) || lead.responsavel || '';
  },

  mover(id, etapa) {
    const lead = this.buscarPorId(id);
    if (!lead || lead.etapa === etapa) return;
    this.salvarComNota({ ...lead, etapa });
  },

  nomeCurso(lead) {
    return Cursos.buscarPorId(lead.cursoId)?.nome || '';
  },

  filtrar(termo, origem, cursoId, responsavelId) {
    const t = (termo || '').toLowerCase().trim();
    const tDigitos = Utils.somenteDigitos(t);
    return this.listar()
      .filter((l) => !origem || l.origem === origem)
      .filter((l) => !cursoId || l.cursoId === cursoId)
      .filter((l) => !responsavelId || l.responsavelId === responsavelId)
      .filter((l) => !t || [l.nome, l.email, this.nomeResponsavel(l)].some((v) => (v || '').toLowerCase().includes(t)) ||
        (tDigitos.length >= 3 && Utils.somenteDigitos(l.telefone).includes(tDigitos)))
      .sort((a, b) => (a.proximoContato || '9999').localeCompare(b.proximoContato || '9999'));
  },

  // Leads em aberto com contato marcado até "dias" à frente (inclui atrasados)
  proximosContatos(dias = 7, responsavelId = null) {
    const limite = Utils.somarDias(Utils.hoje(), dias);
    return this.listar()
      .filter((l) => !responsavelId || l.responsavelId === responsavelId || !l.responsavelId)
      .filter((l) => this.emAberto(l) && l.proximoContato && l.proximoContato <= limite)
      .sort((a, b) => a.proximoContato.localeCompare(b.proximoContato));
  },

  contarPor(campo, valores) {
    const lista = this.listar();
    return valores.map((v) => ({ rotulo: v, valor: lista.filter((l) => l[campo] === v).length }));
  },

  estatisticas() {
    const lista = this.listar();
    const convertidos = lista.filter((l) => l.etapa === 'Matriculado').length;
    return {
      total: lista.length,
      abertos: lista.filter((l) => this.emAberto(l)).length,
      convertidos,
      taxa: lista.length ? Math.round((convertidos / lista.length) * 100) : 0,
    };
  },
};
