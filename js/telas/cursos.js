// ===== Tela: Cursos =====
const TelaCursos = {
  iniciar() {
    const form = $('formCurso');

    $('btnNovoCurso').addEventListener('click', () => this.abrir());
    $('buscaCursos').addEventListener('input', () => this.renderizar());
    $('filtroModalidadeCursos').addEventListener('change', () => this.renderizar());
    $('filtroStatusCursos').addEventListener('change', () => this.renderizar());

    $('listaCursos').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const curso = Cursos.buscarPorId(btn.dataset.id);

      if (btn.dataset.acao === 'editar') this.abrir(curso);
      if (btn.dataset.acao === 'turmas') TelaTurmas.mostrarDoCurso(curso.id);
      if (btn.dataset.acao === 'excluir') {
        const qtd = Cursos.totalTurmas(curso.id);
        if (qtd) {
          return Utils.toast(`Não é possível excluir: o curso possui ${qtd} turma(s). Inative-o.`, 'erro');
        }
        if (confirm(`Excluir o curso "${curso.nome}"?`)) {
          Cursos.excluir(curso.id);
          this.renderizar();
          Utils.toast('Curso excluído.');
        }
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const curso = Cursos.preparar(Utils.lerForm(form));
      curso.id = curso.id || undefined;

      const erros = Cursos.validar(curso);
      if (erros.length) return Utils.mostrarErros(form, erros);

      const editando = Boolean(curso.id);
      Cursos.salvar(curso);
      Utils.fecharModal('modalCurso');
      this.renderizar();
      Utils.toast(editando ? 'Curso atualizado!' : 'Curso cadastrado!');
    });
  },

  abrir(curso = null) {
    Utils.preencherForm($('formCurso'), curso || {});
    Utils.abrirModal('modalCurso', curso ? 'Editar curso' : 'Novo curso');
  },

  renderizar() {
    const lista = Cursos.filtrar($('buscaCursos').value,
      $('filtroModalidadeCursos').value, $('filtroStatusCursos').value);

    $('listaCursos').innerHTML = lista.map((c) => {
      const qtdTurmas = Cursos.totalTurmas(c.id);
      return `
      <tr>
        <td><strong>${Utils.escapar(c.nome)}</strong>
            <small>${Utils.escapar([c.codigo, c.area].filter(Boolean).join(' · '))}</small></td>
        <td>${Utils.escapar(c.modalidade)}</td>
        <td>${c.cargaHoraria} h</td>
        <td>${c.duracaoMeses ? `${c.duracaoMeses} ${c.duracaoMeses > 1 ? 'meses' : 'mês'}` : '-'}</td>
        <td>${Utils.formatarMoeda(c.mensalidade)}
            ${c.taxaMatricula ? `<small>Matrícula: ${Utils.formatarMoeda(c.taxaMatricula)}</small>` : ''}</td>
        <td><button class="link" data-acao="turmas" data-id="${c.id}" title="Ver turmas">${qtdTurmas}</button></td>
        <td>${Utils.badge(c.status)}</td>
        <td class="acoes">
          <button class="btn-icon" data-acao="turmas" data-id="${c.id}" title="Ver turmas">🏫</button>
          <button class="btn-icon" data-acao="editar" data-id="${c.id}" title="Editar">✏️</button>
          <button class="btn-icon" data-acao="excluir" data-id="${c.id}" title="Excluir">🗑️</button>
        </td>
      </tr>`;
    }).join('');

    App.estadoVazio('vazioCursos', lista.length, Cursos.listar().length,
      'Nenhum curso cadastrado ainda.', 'Nenhum curso encontrado com esses filtros.');

    const s = Cursos.estatisticas();
    $('statCursosTotal').textContent = s.total;
    $('statCursosAtivos').textContent = s.ativos;
    $('statCursosTurmas').textContent = s.turmas;
    $('statCursosValor').textContent = Utils.formatarMoeda(s.valorMedio);
  },
};
