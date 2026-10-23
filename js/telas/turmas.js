// ===== Tela: Turmas =====
const TelaTurmas = {
  iniciar() {
    const form = $('formTurma');

    $('btnNovaTurma').addEventListener('click', () => this.abrir());
    $('buscaTurmas').addEventListener('input', () => this.renderizar());
    $('filtroCursoTurmas').addEventListener('change', () => this.renderizar());
    $('filtroStatusTurmas').addEventListener('change', () => this.renderizar());

    $('listaTurmas').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const turma = Turmas.buscarPorId(btn.dataset.id);
      if (btn.dataset.acao === 'editar') this.abrir(turma);
      if (btn.dataset.acao === 'excluir' && confirm(`Excluir a turma "${turma.codigo}"?`)) {
        Turmas.excluir(turma.id);
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
      Turmas.salvar(turma);
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

  horario(t) {
    const dias = (t.dias || []).join(', ') || '-';
    const horas = t.horaInicio && t.horaFim ? `${t.horaInicio} às ${t.horaFim}` : '';
    return `${Utils.escapar(dias)}<small>${Utils.escapar([t.turno, horas].filter(Boolean).join(' · '))}</small>`;
  },

  renderizar() {
    this.atualizarFiltroCursos();
    const lista = Turmas.filtrar($('buscaTurmas').value,
      $('filtroCursoTurmas').value, $('filtroStatusTurmas').value);

    $('listaTurmas').innerHTML = lista.map((t) => `
      <tr>
        <td><strong>${Utils.escapar(t.codigo)}</strong>
            <small>${Utils.escapar(Turmas.nomeCurso(t))}</small></td>
        <td>${Utils.escapar(t.professor) || '-'}<small>${Utils.escapar(t.sala)}</small></td>
        <td>${this.horario(t)}</td>
        <td>${Utils.formatarData(t.dataInicio)}<small>até ${Utils.formatarData(t.dataFim)}</small></td>
        <td>${t.vagas}</td>
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
