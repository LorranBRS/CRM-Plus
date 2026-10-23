// ===== Modelo: Professores =====
const Professores = {
  ...criarRepositorio('professores'),

  preparar(dados) {
    return { ...dados, valorHora: dados.valorHora === '' ? '' : Number(dados.valorHora) };
  },

  validar(p) {
    const erros = [];
    if (!p.nome || p.nome.length < 3) erros.push({ campo: 'nome', msg: 'Informe o nome completo.' });
    if (p.cpf && !Utils.cpfValido(p.cpf)) erros.push({ campo: 'cpf', msg: 'CPF inválido.' });
    if (p.cpf && this.listar().some((x) => x.id !== p.id && Utils.somenteDigitos(x.cpf) === Utils.somenteDigitos(p.cpf))) {
      erros.push({ campo: 'cpf', msg: 'Já existe um professor com este CPF.' });
    }
    if (p.email && !Utils.emailValido(p.email)) erros.push({ campo: 'email', msg: 'E-mail inválido.' });
    if (Utils.somenteDigitos(p.telefone).length < 10) erros.push({ campo: 'telefone', msg: 'Telefone inválido.' });
    if (p.valorHora !== '' && p.valorHora < 0) erros.push({ campo: 'valorHora', msg: 'Valor inválido.' });
    return erros;
  },

  nome(id) {
    return id ? this.buscarPorId(id)?.nome || '' : '';
  },

  ativos(incluirId) {
    return this.listar().filter((p) => p.status !== 'Inativo' || p.id === incluirId)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  },

  turmas(id) {
    return Turmas.listar().filter((t) => t.professorId === id);
  },

  // Disciplinas da grade curricular em que o professor dá aula
  disciplinas(id) {
    return Cursos.listar().flatMap((c) =>
      (c.grade || []).filter((g) => g.professorId === id).map((g) => ({ ...g, curso: c })));
  },

  cursosCoordenados(id) {
    return Cursos.listar().filter((c) => c.coordenadorId === id);
  },

  emUso(id) {
    return this.turmas(id).length || this.disciplinas(id).length || this.cursosCoordenados(id).length;
  },

  // Horas de aula por semana nas turmas abertas
  horasSemana(id) {
    return this.turmas(id).filter((t) => Turmas.estaAberta(t))
      .reduce((s, t) => s + (t.dias || []).length * Utils.duracaoHoras(t.horaInicio, t.horaFim), 0);
  },

  filtrar(termo, status) {
    const t = (termo || '').toLowerCase().trim();
    return this.listar()
      .filter((p) => !status || p.status === status)
      .filter((p) => !t || [p.nome, p.email, p.especialidades, p.formacao]
        .some((v) => (v || '').toLowerCase().includes(t)))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  },

  estatisticas() {
    const lista = this.listar();
    const abertas = Turmas.listar().filter((t) => Turmas.estaAberta(t));
    return {
      total: lista.length,
      ativos: lista.filter((p) => p.status !== 'Inativo').length,
      turmas: abertas.filter((t) => t.professorId).length,
      semProfessor: abertas.filter((t) => !t.professorId).length,
      horas: lista.reduce((s, p) => s + this.horasSemana(p.id), 0),
    };
  },
};
