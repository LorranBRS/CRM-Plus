// ===== Modelo: Turmas (regras de negócio) =====
const Turmas = {
  ...criarRepositorio('turmas'),

  ORDEM_DIAS: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],

  preparar(dados) {
    return {
      ...dados,
      codigo: (dados.codigo || '').toUpperCase(),
      vagas: dados.vagas === '' ? '' : Number(dados.vagas),
      dias: this.ORDEM_DIAS.filter((d) => (dados.dias || []).includes(d)),
    };
  },

  validar(turma) {
    const erros = [];
    if (!turma.cursoId || !Cursos.buscarPorId(turma.cursoId)) erros.push({ campo: 'cursoId', msg: 'Selecione o curso.' });
    if (!turma.codigo) erros.push({ campo: 'codigo', msg: 'Informe o código da turma.' });
    if (!turma.dataInicio) erros.push({ campo: 'dataInicio', msg: 'Informe a data de início.' });
    if (turma.dataFim && turma.dataInicio && turma.dataFim < turma.dataInicio) {
      erros.push({ campo: 'dataFim', msg: 'O término deve ser depois do início.' });
    }
    if (turma.horaInicio && turma.horaFim && turma.horaFim <= turma.horaInicio) {
      erros.push({ campo: 'horaFim', msg: 'O fim da aula deve ser depois do início.' });
    }
    if (!Number.isInteger(turma.vagas) || turma.vagas < 1) erros.push({ campo: 'vagas', msg: 'Informe o número de vagas.' });

    if (turma.codigo && this.listar().some((t) => t.id !== turma.id && t.codigo === turma.codigo)) {
      erros.push({ campo: 'codigo', msg: 'Já existe uma turma com este código.' });
    }
    return erros;
  },

  estaAberta(turma) {
    return turma.status === 'Planejada' || turma.status === 'Em andamento';
  },

  // Texto usado nos selects: "ING-2026-1A – Inglês (12/20)"
  rotulo(turma) {
    return `${turma.codigo} – ${this.nomeCurso(turma)} (${Matriculas.ocupadas(turma.id)}/${turma.vagas})`;
  },

  nomeCurso(turma) {
    return Cursos.buscarPorId(turma.cursoId)?.nome || '(curso removido)';
  },

  filtrar(termo, cursoId, status) {
    const t = (termo || '').toLowerCase().trim();
    return this.listar()
      .filter((x) => !cursoId || x.cursoId === cursoId)
      .filter((x) => !status || x.status === status)
      .filter((x) => !t || [x.codigo, x.professor, x.sala, this.nomeCurso(x)]
        .some((v) => (v || '').toLowerCase().includes(t)))
      .sort((a, b) => (b.dataInicio || '').localeCompare(a.dataInicio || ''));
  },

  estatisticas() {
    const lista = this.listar();
    const abertas = lista.filter((t) => this.estaAberta(t));
    return {
      total: lista.length,
      andamento: lista.filter((t) => t.status === 'Em andamento').length,
      planejadas: lista.filter((t) => t.status === 'Planejada').length,
      vagas: abertas.reduce((s, t) => s + Math.max(0, Number(t.vagas || 0) - Matriculas.ocupadas(t.id)), 0),
    };
  },
};
