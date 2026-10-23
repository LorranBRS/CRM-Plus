// ===== Tela: Relatórios (exportações e backup) =====
const TelaRelatorios = {
  // Planilhas disponíveis para exportação
  EXPORTACOES: {
    alunos: {
      modulo: 'alunos',
      titulo: '👩‍🎓 Alunos',
      lista: () => Alunos.listar(),
      colunas: [
        ['Nome', (a) => a.nome], ['CPF', (a) => a.cpf], ['Nascimento', (a) => Utils.formatarData(a.nascimento)],
        ['E-mail', (a) => a.email], ['Telefone', (a) => a.telefone], ['Cidade', (a) => a.cidade],
        ['UF', (a) => a.uf], ['Curso de interesse', (a) => a.curso], ['Status', (a) => a.status],
        ['Cadastro', (a) => Utils.formatarData(a.criadoEm)],
      ],
    },
    cursos: {
      modulo: 'cursos',
      titulo: '📚 Cursos',
      lista: () => Cursos.listar(),
      colunas: [
        ['Nome', (c) => c.nome], ['Código', (c) => c.codigo], ['Área', (c) => c.area],
        ['Modalidade', (c) => c.modalidade], ['Carga horária', (c) => c.cargaHoraria],
        ['Duração (meses)', (c) => c.duracaoMeses], ['Mensalidade', (c) => c.mensalidade],
        ['Taxa matrícula', (c) => c.taxaMatricula], ['Status', (c) => c.status],
      ],
    },
    professores: {
      modulo: 'professores',
      titulo: '👨‍🏫 Professores',
      lista: () => Professores.listar(),
      colunas: [
        ['Nome', (p) => p.nome], ['CPF', (p) => p.cpf], ['E-mail', (p) => p.email], ['Telefone', (p) => p.telefone],
        ['Formação', (p) => p.formacao], ['Especialidades', (p) => p.especialidades],
        ['Valor hora', (p) => p.valorHora], ['Turmas abertas', (p) => Professores.turmas(p.id).filter((t) => Turmas.estaAberta(t)).map((t) => t.codigo).join(', ')],
        ['Horas/semana', (p) => Professores.horasSemana(p.id).toFixed(1).replace('.', ',')], ['Status', (p) => p.status],
      ],
    },
    grade: {
      modulo: 'cursos',
      titulo: '🗂️ Grades curriculares',
      lista: () => Cursos.listar().flatMap((c) => (c.grade || []).map((g, i) => ({ ...g, ordem: i + 1, curso: c }))),
      colunas: [
        ['Curso', (g) => g.curso.nome], ['Ordem', (g) => g.ordem], ['Módulo', (g) => g.nome],
        ['Carga horária', (g) => g.cargaHoraria], ['Professor', (g) => Professores.nome(g.professorId)], ['Ementa', (g) => g.ementa],
      ],
    },
    turmas: {
      modulo: 'turmas',
      titulo: '🏫 Turmas',
      lista: () => Turmas.listar(),
      colunas: [
        ['Código', (t) => t.codigo], ['Curso', (t) => Turmas.nomeCurso(t)], ['Professor', (t) => Turmas.nomeProfessor(t)],
        ['Sala', (t) => t.sala], ['Dias', (t) => (t.dias || []).join(', ')], ['Turno', (t) => t.turno],
        ['Horário', (t) => [t.horaInicio, t.horaFim].filter(Boolean).join(' às ')],
        ['Início', (t) => Utils.formatarData(t.dataInicio)], ['Término', (t) => Utils.formatarData(t.dataFim)],
        ['Vagas', (t) => t.vagas], ['Matriculados', (t) => Matriculas.ocupadas(t.id)], ['Status', (t) => t.status],
      ],
    },
    matriculas: {
      modulo: 'matriculas',
      titulo: '📝 Matrículas',
      lista: () => Matriculas.listar(),
      colunas: [
        ['Aluno', (m) => Matriculas.nomeAluno(m)], ['CPF', (m) => Alunos.buscarPorId(m.alunoId)?.cpf],
        ['Turma', (m) => Matriculas.turma(m)?.codigo], ['Curso', (m) => { const t = Matriculas.turma(m); return t ? Turmas.nomeCurso(t) : ''; }],
        ['Data', (m) => Utils.formatarData(m.dataMatricula)], ['Mensalidade', (m) => m.valorMensalidade],
        ['Desconto %', (m) => m.desconto], ['Valor final', (m) => m.valorFinal], ['Parcelas', (m) => m.parcelas],
        ['Status', (m) => m.status], ['Atendente', (m) => Usuarios.nome(m.criadoPor)],
      ],
    },
    financeiro: {
      modulo: 'financeiro',
      titulo: '💰 Financeiro',
      lista: () => Financeiro.listar().sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
      colunas: Financeiro.colunasCSV,
    },
    inadimplentes: {
      modulo: 'financeiro',
      titulo: '⚠️ Inadimplência',
      lista: () => Financeiro.atrasados().sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
      colunas: [
        ...Financeiro.colunasCSV.slice(0, 4),
        ['Telefone', (l) => Alunos.buscarPorId(l.alunoId)?.telefone],
        ['Dias em atraso', (l) => Math.floor((new Date(Utils.hoje()) - new Date(l.vencimento)) / 86400000)],
      ],
    },
    leads: {
      modulo: 'leads',
      titulo: '🎯 Leads',
      lista: () => Leads.listar(),
      colunas: [
        ['Nome', (l) => l.nome], ['Telefone', (l) => l.telefone], ['E-mail', (l) => l.email],
        ['Origem', (l) => l.origem], ['Curso', (l) => Leads.nomeCurso(l)], ['Etapa', (l) => l.etapa],
        ['Responsável', (l) => Leads.nomeResponsavel(l)], ['Próximo contato', (l) => Utils.formatarData(l.proximoContato)],
      ],
    },
  },

  iniciar() {
    $('botoesExportar').addEventListener('click', (e) => {
      const chave = e.target.closest('[data-exportar]')?.dataset.exportar;
      if (!chave) return;
      const exp = this.EXPORTACOES[chave];
      const lista = exp.lista();
      if (!lista.length) return Utils.toast('Não há dados para exportar.', 'erro');
      Utils.baixarCSV(lista, exp.colunas, chave);
      Atividades.registrar('relatorios', 'Relatório exportado', exp.titulo.replace(/^\S+\s/, ''));
    });

    $('btnBackup').addEventListener('click', () => {
      Utils.baixarArquivo(JSON.stringify(Storage.exportarTudo(), null, 2),
        `crmplus_backup_${Utils.hoje()}.json`, 'application/json');
      Atividades.registrar('relatorios', 'Backup gerado', 'Backup completo dos dados baixado');
    });

    $('inputRestaurar').addEventListener('change', async (e) => {
      const arquivo = e.target.files[0];
      e.target.value = '';
      if (!arquivo) return;
      try {
        const backup = JSON.parse(await arquivo.text());
        if (!confirm('Restaurar este backup? Os dados atuais serão substituídos.')) return;
        Storage.importarTudo(backup);
        Atividades.registrar('relatorios', 'Backup restaurado', `Backup de ${Utils.formatarDataHora(backup.geradoEm)}`);
        Utils.toast('Backup restaurado!');
        if (!Sessao.usuario()) return App.iniciarSessao();
        App.aposEntrar();
      } catch (erro) {
        Utils.toast(erro.message.includes('inválido') ? erro.message : 'Arquivo de backup inválido.', 'erro');
      }
    });

    $('btnLimparTudo').addEventListener('click', () => {
      if (!confirm('Apagar TODOS os dados deste navegador? Esta ação não pode ser desfeita.')) return;
      if (prompt('Para confirmar, digite APAGAR') !== 'APAGAR') return Utils.toast('Operação cancelada.');
      Storage.limparTudo();
      Atividades.registrar('relatorios', 'Dados apagados', 'Todos os cadastros foram apagados');
      Utils.toast('Todos os dados foram apagados.');
      App.renderizarAtual();
    });
  },

  renderizar() {
    // Só mostra exportações dos módulos que o usuário pode acessar
    $('botoesExportar').innerHTML = Object.entries(this.EXPORTACOES).filter(([, e]) => Sessao.pode(e.modulo))
      .map(([chave, e]) => `<button class="btn btn-light" data-exportar="${chave}">${e.titulo}</button>`).join('');

    const turmas = Turmas.listar().filter((t) => t.status !== 'Cancelada')
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
    $('resumoTurmas').innerHTML = turmas.map((t) => {
      const ativas = Matriculas.listar().filter((m) => m.turmaId === t.id && m.status === 'Ativa');
      return `<tr>
        <td><strong>${Utils.escapar(t.codigo)}</strong><small>${Utils.escapar(Turmas.nomeCurso(t))}</small></td>
        <td>${ativas.length}/${t.vagas}</td>
        <td>${Utils.formatarMoeda(ativas.reduce((s, m) => s + m.valorFinal, 0))}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="3" class="graf-vazio">Nenhuma turma cadastrada.</td></tr>';
  },
};
