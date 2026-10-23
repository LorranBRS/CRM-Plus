// ===== Modelo: Cursos (regras de negócio) =====
const Cursos = {
  ...criarRepositorio('cursos'),

  // Converte os campos numéricos vindos do formulário
  preparar(dados) {
    const numero = (v) => (v === '' || v === undefined ? '' : Number(v));
    return {
      ...dados,
      codigo: (dados.codigo || '').toUpperCase(),
      cargaHoraria: numero(dados.cargaHoraria),
      duracaoMeses: numero(dados.duracaoMeses),
      mensalidade: numero(dados.mensalidade),
      taxaMatricula: numero(dados.taxaMatricula),
      grade: (dados.grade || []).map((g) => ({ ...g, cargaHoraria: numero(g.cargaHoraria) })),
    };
  },

  cargaDaGrade(curso) {
    return (curso.grade || []).reduce((s, g) => s + Number(g.cargaHoraria || 0), 0);
  },

  nomeCoordenador(curso) {
    return Professores.nome(curso.coordenadorId);
  },

  validar(curso) {
    const erros = [];
    if (!curso.nome || curso.nome.length < 3) erros.push({ campo: 'nome', msg: 'Informe o nome do curso.' });
    if (!(curso.cargaHoraria > 0)) erros.push({ campo: 'cargaHoraria', msg: 'Informe a carga horária.' });
    if (curso.duracaoMeses !== '' && !(curso.duracaoMeses > 0)) erros.push({ campo: 'duracaoMeses', msg: 'Duração inválida.' });
    if (curso.mensalidade !== '' && curso.mensalidade < 0) erros.push({ campo: 'mensalidade', msg: 'Mensalidade inválida.' });
    if (curso.taxaMatricula !== '' && curso.taxaMatricula < 0) erros.push({ campo: 'taxaMatricula', msg: 'Taxa inválida.' });

    if (curso.codigo && this.listar().some((c) => c.id !== curso.id && c.codigo === curso.codigo)) {
      erros.push({ campo: 'codigo', msg: 'Já existe um curso com este código.' });
    }
    (curso.grade || []).forEach((g, i) => {
      if (!g.nome) erros.push({ campo: 'grade', msg: `Grade: informe o nome do módulo ${i + 1}.` });
      else if (!(g.cargaHoraria > 0)) erros.push({ campo: 'grade', msg: `Grade: informe a carga horária de "${g.nome}".` });
    });
    return erros;
  },

  // Quantas turmas usam este curso (impede exclusão)
  totalTurmas(cursoId) {
    return Turmas.listar().filter((t) => t.cursoId === cursoId).length;
  },

  filtrar(termo, modalidade, status) {
    const t = (termo || '').toLowerCase().trim();
    return this.listar()
      .filter((c) => !modalidade || c.modalidade === modalidade)
      .filter((c) => !status || c.status === status)
      .filter((c) => !t || [c.nome, c.codigo, c.area].some((v) => (v || '').toLowerCase().includes(t)))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  },

  ativos() {
    return this.listar()
      .filter((c) => c.status === 'Ativo')
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  },

  estatisticas() {
    const lista = this.listar();
    const comValor = lista.filter((c) => c.mensalidade !== '' && c.mensalidade !== undefined);
    const soma = comValor.reduce((s, c) => s + Number(c.mensalidade), 0);
    return {
      total: lista.length,
      ativos: lista.filter((c) => c.status === 'Ativo').length,
      turmas: Turmas.listar().length,
      valorMedio: comValor.length ? soma / comValor.length : 0,
    };
  },
};
