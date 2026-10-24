// ===== Acadêmico: frequência (chamada) e notas =====
const DIAS_DA_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const Academico = {
  mediaMinima() {
    return Number(Instituicao.ler().mediaMinima || 7);
  },

  frequenciaMinima() {
    return Number(Instituicao.ler().frequenciaMinima || 75);
  },

  // Alunos da turma (matrículas ativas e concluídas), em ordem alfabética
  alunosDaTurma(turmaId, status = ['Ativa', 'Concluída']) {
    return Matriculas.listar()
      .filter((m) => m.turmaId === turmaId && status.includes(m.status))
      .map((m) => ({ matricula: m, aluno: Alunos.buscarPorId(m.alunoId) }))
      .filter((x) => x.aluno)
      .sort((a, b) => a.aluno.nome.localeCompare(b.aluno.nome, 'pt-BR'));
  },

  diaDaSemana(dataISO) {
    const [a, m, d] = dataISO.split('-').map(Number);
    return DIAS_DA_SEMANA[new Date(a, m - 1, d).getDay()];
  },

  // Dias de aula da turma entre "de" e "ate" (padrão: do início até hoje), sem feriados/recessos
  diasDeAula(turma, ate = Utils.hoje(), de = null, semAula = Eventos.diasSemAula()) {
    const fim = turma.dataFim && turma.dataFim < ate ? turma.dataFim : ate;
    const inicio = de && de > turma.dataInicio ? de : turma.dataInicio;
    const dias = [];
    for (let d = inicio; d && d <= fim; d = Utils.somarDias(d, 1)) {
      if ((turma.dias || []).includes(this.diaDaSemana(d)) && !semAula.has(d)) dias.push(d);
    }
    return dias;
  },
};

const Frequencias = {
  ...criarRepositorio('frequencias'),

  // P = presente, F = falta, J = falta justificada (não reduz a frequência)
  daTurma(turmaId) {
    return this.listar().filter((f) => f.turmaId === turmaId).sort((a, b) => b.data.localeCompare(a.data));
  },

  buscarAula(turmaId, data) {
    return this.listar().find((f) => f.turmaId === turmaId && f.data === data);
  },

  salvarAula({ turmaId, data, conteudo, presencas }, opcoes = {}) {
    const existente = this.buscarAula(turmaId, data);
    return this.salvar({ ...(existente ? { id: existente.id } : {}), turmaId, data, conteudo, presencas,
      ...(opcoes.usuarioId ? { criadoPor: opcoes.usuarioId } : {}) });
  },

  resumoAluno(turmaId, alunoId) {
    const aulas = this.daTurma(turmaId).filter((f) => f.presencas[alunoId]);
    const conta = (s) => aulas.filter((f) => f.presencas[alunoId] === s).length;
    const faltas = conta('F');
    return {
      aulas: aulas.length,
      presencas: conta('P'),
      faltas,
      justificadas: conta('J'),
      percentual: aulas.length ? Math.round(((aulas.length - faltas) / aulas.length) * 100) : 100,
    };
  },

  resumoTurma(turmaId) {
    const aulas = this.daTurma(turmaId);
    const alunos = Academico.alunosDaTurma(turmaId);
    const percentuais = alunos.map(({ aluno }) => this.resumoAluno(turmaId, aluno.id)).filter((r) => r.aulas);
    return {
      aulas: aulas.length,
      media: percentuais.length ? Math.round(percentuais.reduce((s, r) => s + r.percentual, 0) / percentuais.length) : null,
    };
  },
};

const Notas = {
  ...criarRepositorio('notas'),

  // Um documento por turma: { turmaId, valores: { alunoId: { moduloId: nota } } }
  daTurma(turmaId) {
    return this.listar().find((n) => n.turmaId === turmaId) || { turmaId, valores: {} };
  },

  // Avaliações = módulos da grade do curso (ou uma "Nota final" se o curso não tiver grade)
  avaliacoes(turma) {
    const grade = Cursos.buscarPorId(turma.cursoId)?.grade || [];
    return grade.length ? grade.map((g) => ({ id: g.id, nome: g.nome, cargaHoraria: g.cargaHoraria }))
      : [{ id: 'final', nome: 'Nota final' }];
  },

  salvarTurma(turmaId, valores) {
    const doc = this.daTurma(turmaId);
    return this.salvar({ ...(doc.id ? { id: doc.id } : {}), turmaId, valores });
  },

  notasDoAluno(turmaId, alunoId) {
    return this.daTurma(turmaId).valores[alunoId] || {};
  },

  media(turma, alunoId) {
    const notas = this.notasDoAluno(turma.id, alunoId);
    const lancadas = this.avaliacoes(turma).map((a) => notas[a.id]).filter((n) => n !== undefined && n !== '');
    return lancadas.length ? lancadas.reduce((s, n) => s + Number(n), 0) / lancadas.length : null;
  },

  completo(turma, alunoId) {
    const notas = this.notasDoAluno(turma.id, alunoId);
    return this.avaliacoes(turma).every((a) => notas[a.id] !== undefined && notas[a.id] !== '');
  },

  // Aprovado / Reprovado (com todas as notas) ou Em curso
  situacao(turma, alunoId) {
    if (!this.completo(turma, alunoId)) return 'Em curso';
    const freq = Frequencias.resumoAluno(turma.id, alunoId);
    const aprovado = this.media(turma, alunoId) >= Academico.mediaMinima() &&
      (!freq.aulas || freq.percentual >= Academico.frequenciaMinima());
    return aprovado ? 'Aprovado' : 'Reprovado';
  },

  mediaTurma(turma) {
    const medias = Academico.alunosDaTurma(turma.id).map(({ aluno }) => this.media(turma, aluno.id)).filter((m) => m !== null);
    return medias.length ? medias.reduce((s, m) => s + m, 0) / medias.length : null;
  },
};
