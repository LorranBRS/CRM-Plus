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

  // Mantém o histórico de interações ao salvar
  salvarComNota(lead, nota) {
    const anterior = lead.id ? this.buscarPorId(lead.id) : null;
    const historico = [...(anterior?.historico || [])];
    if (!anterior) historico.push({ data: new Date().toISOString(), texto: 'Lead cadastrado.' });
    if (anterior && anterior.etapa !== lead.etapa) {
      historico.push({ data: new Date().toISOString(), texto: `Etapa: ${anterior.etapa} → ${lead.etapa}` });
    }
    if (nota) historico.push({ data: new Date().toISOString(), texto: nota });
    return this.salvar({ ...lead, historico });
  },

  mover(id, etapa) {
    const lead = this.buscarPorId(id);
    if (!lead || lead.etapa === etapa) return;
    this.salvarComNota({ ...lead, etapa });
  },

  nomeCurso(lead) {
    return Cursos.buscarPorId(lead.cursoId)?.nome || '';
  },

  filtrar(termo, origem, cursoId) {
    const t = (termo || '').toLowerCase().trim();
    const tDigitos = Utils.somenteDigitos(t);
    return this.listar()
      .filter((l) => !origem || l.origem === origem)
      .filter((l) => !cursoId || l.cursoId === cursoId)
      .filter((l) => !t || [l.nome, l.email, l.responsavel].some((v) => (v || '').toLowerCase().includes(t)) ||
        (tDigitos.length >= 3 && Utils.somenteDigitos(l.telefone).includes(tDigitos)))
      .sort((a, b) => (a.proximoContato || '9999').localeCompare(b.proximoContato || '9999'));
  },

  // Leads em aberto com contato marcado até "dias" à frente (inclui atrasados)
  proximosContatos(dias = 7) {
    const limite = Utils.somarDias(Utils.hoje(), dias);
    return this.listar()
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
