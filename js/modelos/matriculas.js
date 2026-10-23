// ===== Modelo: Matrículas (vínculo aluno x turma) =====
const Matriculas = {
  ...criarRepositorio('matriculas'),

  preparar(dados) {
    const numero = (v) => (v === '' || v === undefined ? '' : Number(v));
    const m = {
      ...dados,
      valorMensalidade: numero(dados.valorMensalidade),
      desconto: numero(dados.desconto) || 0,
      taxaMatricula: numero(dados.taxaMatricula) || 0,
      parcelas: numero(dados.parcelas),
      diaVencimento: numero(dados.diaVencimento),
    };
    m.valorFinal = this.calcularValorFinal(m.valorMensalidade, m.desconto);
    return m;
  },

  calcularValorFinal(valor, desconto) {
    return Math.round(Number(valor || 0) * (1 - Number(desconto || 0) / 100) * 100) / 100;
  },

  // Matrículas ativas ocupam vaga na turma
  ocupadas(turmaId, ignorarId = null) {
    return this.listar().filter((m) => m.turmaId === turmaId && m.status === 'Ativa' && m.id !== ignorarId).length;
  },

  validar(m) {
    const erros = [];
    const aluno = Alunos.buscarPorId(m.alunoId);
    const turma = Turmas.buscarPorId(m.turmaId);

    if (!aluno) erros.push({ campo: 'alunoId', msg: 'Selecione o aluno.' });
    if (!turma) erros.push({ campo: 'turmaId', msg: 'Selecione a turma.' });
    if (!m.dataMatricula) erros.push({ campo: 'dataMatricula', msg: 'Informe a data da matrícula.' });

    if (turma && !m.id && !Turmas.estaAberta(turma)) {
      erros.push({ campo: 'turmaId', msg: 'Esta turma não está aberta para matrículas.' });
    }

    if (aluno && turma && m.status === 'Ativa') {
      const duplicada = this.listar().some((x) =>
        x.id !== m.id && x.alunoId === m.alunoId && x.turmaId === m.turmaId && x.status === 'Ativa');
      if (duplicada) erros.push({ campo: 'alunoId', msg: 'Este aluno já tem matrícula ativa nesta turma.' });
      if (this.ocupadas(turma.id, m.id) >= turma.vagas) {
        erros.push({ campo: 'turmaId', msg: `Turma lotada (${turma.vagas} vagas).` });
      }
    }

    if (m.valorMensalidade === '' || m.valorMensalidade < 0) erros.push({ campo: 'valorMensalidade', msg: 'Informe a mensalidade.' });
    if (m.desconto < 0 || m.desconto > 100) erros.push({ campo: 'desconto', msg: 'O desconto deve ficar entre 0 e 100%.' });
    if (m.taxaMatricula < 0) erros.push({ campo: 'taxaMatricula', msg: 'Taxa inválida.' });
    if (!Number.isInteger(m.parcelas) || m.parcelas < 1 || m.parcelas > 60) erros.push({ campo: 'parcelas', msg: 'Parcelas: de 1 a 60.' });
    if (!Number.isInteger(m.diaVencimento) || m.diaVencimento < 1 || m.diaVencimento > 28) {
      erros.push({ campo: 'diaVencimento', msg: 'Dia de vencimento: de 1 a 28.' });
    }
    return erros;
  },

  nomeAluno(m) {
    return Alunos.buscarPorId(m.alunoId)?.nome || '(aluno removido)';
  },

  turma(m) {
    return Turmas.buscarPorId(m.turmaId);
  },

  // Cria taxa de matrícula + mensalidades no Financeiro
  gerarFinanceiro(m) {
    const turma = this.turma(m);
    const nomeCurso = turma ? Turmas.nomeCurso(turma) : 'Curso';
    const base = { alunoId: m.alunoId, matriculaId: m.id, status: 'Pendente' };

    if (m.taxaMatricula > 0) {
      Financeiro.salvar({ ...base, descricao: `Taxa de matrícula – ${nomeCurso}`, valor: m.taxaMatricula, vencimento: m.dataMatricula });
    }
    for (let i = 1; i <= m.parcelas; i++) {
      Financeiro.salvar({
        ...base,
        descricao: `Mensalidade ${i}/${m.parcelas} – ${nomeCurso}`,
        valor: m.valorFinal,
        vencimento: Utils.somarMeses(m.dataMatricula, i, m.diaVencimento),
      });
    }
  },

  resumoFinanceiro(matriculaId) {
    const lanc = Financeiro.listar().filter((l) => l.matriculaId === matriculaId && l.status !== 'Cancelado');
    return { total: lanc.length, pagos: lanc.filter((l) => l.status === 'Pago').length };
  },

  filtrar(termo, turmaId, status) {
    const t = (termo || '').toLowerCase().trim();
    const tDigitos = Utils.somenteDigitos(t);
    return this.listar()
      .filter((m) => !turmaId || m.turmaId === turmaId)
      .filter((m) => !status || m.status === status)
      .filter((m) => {
        if (!t) return true;
        const aluno = Alunos.buscarPorId(m.alunoId);
        const turma = this.turma(m);
        return [aluno?.nome, turma?.codigo, turma && Turmas.nomeCurso(turma)]
          .some((v) => (v || '').toLowerCase().includes(t)) ||
          (tDigitos.length >= 3 && Utils.somenteDigitos(aluno?.cpf).includes(tDigitos));
      })
      .sort((a, b) => (b.dataMatricula || '').localeCompare(a.dataMatricula || ''));
  },

  estatisticas() {
    const lista = this.listar();
    const ativas = lista.filter((m) => m.status === 'Ativa');
    const mes = Utils.mesAtual();
    return {
      total: lista.length,
      ativas: ativas.length,
      mes: lista.filter((m) => (m.dataMatricula || '').startsWith(mes)).length,
      ticket: ativas.length ? ativas.reduce((s, m) => s + m.valorFinal, 0) / ativas.length : 0,
    };
  },
};
