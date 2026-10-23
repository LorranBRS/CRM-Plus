// ===== Tela: Turmas =====
const TelaTurmas = {
  iniciar() {
    const form = $('formTurma');

    $('btnNovaTurma').addEventListener('click', () => this.abrir());
    $('buscaTurmas').addEventListener('input', () => this.renderizar());
    $('filtroCursoTurmas').addEventListener('change', () => this.renderizar());
    $('filtroStatusTurmas').addEventListener('change', () => this.renderizar());
    document.querySelector('[data-tela=turmas] .alternar').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-visao]');
      if (!btn) return;
      this.visao = btn.dataset.visao;
      this.renderizar();
    });

    $('listaTurmas').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const turma = Turmas.buscarPorId(btn.dataset.id);
      if (btn.dataset.acao === 'editar') this.abrir(turma);
      if (btn.dataset.acao === 'excluir') {
        if (Matriculas.listar().some((m) => m.turmaId === turma.id)) {
          return Utils.toast('A turma possui matrículas. Altere o status para Cancelada ou Concluída.', 'erro');
        }
        if (!confirm(`Excluir a turma "${turma.codigo}"?`)) return;
        Turmas.excluir(turma.id);
        Atividades.registrar('turmas', 'Turma excluída', turma.codigo, { refId: turma.id });
        this.renderizar();
        Utils.toast('Turma excluída.');
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const turma = Turmas.preparar(Utils.lerForm(form));
      turma.id = turma.id || undefined;

      const erros = Turmas.validar(turma);
      if (erros.length) return Utils.mostrarErros(form, erros);

      const editando = Boolean(turma.id);
      const salvo = Turmas.salvar(turma);
      Atividades.registrar('turmas', editando ? 'Turma editada' : 'Turma cadastrada',
        `${turma.codigo} – ${Turmas.nomeCurso(turma)}${turma.professorId ? ` (prof. ${Professores.nome(turma.professorId)})` : ''}`,
        { refId: salvo.id });
      Utils.fecharModal('modalTurma');
      this.renderizar();
      Utils.toast(editando ? 'Turma atualizada!' : 'Turma cadastrada!');
    });
  },

  abrir(turma = null) {
    // Lista os cursos ativos (e o curso atual da turma, mesmo se inativo)
    const cursos = Cursos.listar()
      .filter((c) => c.status === 'Ativo' || c.id === turma?.cursoId)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    if (!cursos.length) {
      Utils.toast('Cadastre um curso ativo antes de criar turmas.', 'erro');
      location.hash = '#cursos';
      return;
    }

    $('formTurma').elements.professorId.innerHTML = Utils.opcoes(Professores.ativos(turma?.professorId),
      { valor: (p) => p.id, texto: (p) => p.nome, vazio: 'A definir' });

    $('formTurma').elements.cursoId.innerHTML = '<option value="">Selecione o curso...</option>' +
      cursos.map((c) => `<option value="${c.id}">${Utils.escapar(c.nome)}</option>`).join('');

    // Nova turma já vem com o curso do filtro selecionado
    const dados = turma || { cursoId: $('filtroCursoTurmas').value };
    Utils.preencherForm($('formTurma'), dados);
    Utils.abrirModal('modalTurma', turma ? 'Editar turma' : 'Nova turma');
  },

  // Chamado pela tela de cursos (botão "ver turmas")
  mostrarDoCurso(cursoId) {
    this.atualizarFiltroCursos();
    $('filtroCursoTurmas').value = cursoId;
    location.hash = '#turmas';
  },

  atualizarFiltroCursos() {
    const sel = $('filtroCursoTurmas');
    const atual = sel.value;
    sel.innerHTML = '<option value="">Todos os cursos</option>' +
      [...Cursos.listar()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        .map((c) => `<option value="${c.id}">${Utils.escapar(c.nome)}</option>`).join('');
    sel.value = atual;
    if (sel.selectedIndex < 0) sel.value = ''; // curso do filtro foi excluído
  },

  ocupacao(t) {
    const ocup = Matriculas.ocupadas(t.id);
    const pct = Math.min(100, Math.round((ocup / t.vagas) * 100));
    return `${ocup}/${t.vagas}<span class="mini-barra ${pct >= 100 ? 'cheia' : ''}"><span style="width:${pct}%"></span></span>`;
  },

  horario(t) {
    const dias = (t.dias || []).join(', ') || '-';
    const horas = t.horaInicio && t.horaFim ? `${t.horaInicio} às ${t.horaFim}` : '';
    return `${Utils.escapar(dias)}<small>${Utils.escapar([t.turno, horas].filter(Boolean).join(' · '))}</small>`;
  },

  renderizar() {
    this.atualizarFiltroCursos();
    const lista = Turmas.filtrar($('buscaTurmas').value,
      $('filtroCursoTurmas').value, $('filtroStatusTurmas').value);

    // Alterna entre lista e grade semanal
    const agenda = this.visao === 'agenda';
    document.querySelectorAll('[data-tela=turmas] [data-visao]').forEach((b) =>
      b.classList.toggle('ativo', b.dataset.visao === (agenda ? 'agenda' : 'lista')));
    $('agendaTurmas').hidden = !agenda;
    $('tabelaTurmas').hidden = agenda;
    if (agenda) {
      Agenda.render($('agendaTurmas'), lista.filter((t) => Turmas.estaAberta(t)));
    }

    $('listaTurmas').innerHTML = lista.map((t) => `
      <tr>
        <td><strong>${Utils.escapar(t.codigo)}</strong>
            <small>${Utils.escapar(Turmas.nomeCurso(t))}</small></td>
        <td>${Utils.escapar(Turmas.nomeProfessor(t)) || '<span class="texto-alerta">A definir</span>'}<small>${Utils.escapar(t.sala)}</small></td>
        <td>${this.horario(t)}</td>
        <td>${Utils.formatarData(t.dataInicio)}<small>até ${Utils.formatarData(t.dataFim)}</small></td>
        <td>${this.ocupacao(t)}</td>
        <td>${Utils.badge(t.status)}</td>
        <td class="acoes">
          <button class="btn-icon" data-acao="editar" data-id="${t.id}" title="Editar">✏️</button>
          <button class="btn-icon" data-acao="excluir" data-id="${t.id}" title="Excluir">🗑️</button>
        </td>
      </tr>`).join('');

    App.estadoVazio('vazioTurmas', lista.length, Turmas.listar().length,
      'Nenhuma turma cadastrada ainda.', 'Nenhuma turma encontrada com esses filtros.');

    const s = Turmas.estatisticas();
    $('statTurmasTotal').textContent = s.total;
    $('statTurmasAndamento').textContent = s.andamento;
    $('statTurmasPlanejadas').textContent = s.planejadas;
    $('statTurmasVagas').textContent = s.vagas;
  },
};
