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
      if (btn.dataset.acao === 'grade') this.verGrade(curso);
      if (btn.dataset.acao === 'turmas') TelaTurmas.mostrarDoCurso(curso.id);
      if (btn.dataset.acao === 'excluir') {
        const qtd = Cursos.totalTurmas(curso.id);
        if (qtd) {
          return Utils.toast(`Não é possível excluir: o curso possui ${qtd} turma(s). Inative-o.`, 'erro');
        }
        if (confirm(`Excluir o curso "${curso.nome}"?`)) {
          Cursos.excluir(curso.id);
          Atividades.registrar('cursos', 'Curso excluído', curso.nome, { refId: curso.id });
          this.renderizar();
          Utils.toast('Curso excluído.');
        }
      }
    });

    $('btnAddModulo').addEventListener('click', () => this.adicionarModulo().querySelector('input').focus());
    $('gradeEditor').addEventListener('input', () => this.atualizarTotalGrade());
    form.elements.cargaHoraria.addEventListener('input', () => this.atualizarTotalGrade());
    $('gradeEditor').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-grade]');
      if (!btn) return;
      const linha = btn.closest('.grade-linha');
      if (btn.dataset.grade === 'remover') linha.remove();
      if (btn.dataset.grade === 'subir' && linha.previousElementSibling) linha.after(linha.previousElementSibling);
      if (btn.dataset.grade === 'descer' && linha.nextElementSibling) linha.before(linha.nextElementSibling);
      this.atualizarTotalGrade();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const curso = Cursos.preparar({ ...Utils.lerForm(form), grade: this.lerGrade() });
      curso.id = curso.id || undefined;

      const erros = Cursos.validar(curso);
      if (erros.length) return Utils.mostrarErros(form, erros);

      const editando = Boolean(curso.id);
      const salvo = Cursos.salvar(curso);
      Atividades.registrar('cursos', editando ? 'Curso editado' : 'Curso cadastrado',
        `${curso.nome}${curso.grade.length ? ` – grade com ${curso.grade.length} módulo(s)` : ''}`, { refId: salvo.id });
      Utils.fecharModal('modalCurso');
      this.renderizar();
      Utils.toast(editando ? 'Curso atualizado!' : 'Curso cadastrado!');
    });
  },

  abrir(curso = null) {
    const form = $('formCurso');
    form.elements.coordenadorId.innerHTML = Utils.opcoes(Professores.ativos(curso?.coordenadorId),
      { valor: (p) => p.id, texto: (p) => p.nome, vazio: 'Não definido' });
    Utils.preencherForm(form, curso || {});
    this.montarGrade(curso?.grade || []);
    Utils.abrirModal('modalCurso', curso ? 'Editar curso' : 'Novo curso');
  },

  // ---------- Editor da grade curricular ----------
  montarGrade(grade) {
    $('gradeEditor').innerHTML = '';
    grade.forEach((g) => this.adicionarModulo(g));
    this.atualizarTotalGrade();
  },

  adicionarModulo(g = {}) {
    const e = Utils.escapar;
    const linha = document.createElement('div');
    linha.className = 'grade-linha';
    linha.dataset.id = g.id || Utils.gerarId();
    const professores = Professores.ativos(g.professorId);
    linha.innerHTML = `
      <span class="grade-ordem"></span>
      <input type="text" data-campo="nome" placeholder="Módulo / disciplina" value="${e(g.nome || '')}">
      <input type="number" data-campo="cargaHoraria" placeholder="Horas" min="1" step="1" value="${e(g.cargaHoraria ?? '')}">
      <select data-campo="professorId">${Utils.opcoes(professores, { valor: (p) => p.id, texto: (p) => p.nome, vazio: 'Professor a definir' })}</select>
      <div class="grade-botoes">
        <button type="button" class="btn-icon" data-grade="subir" title="Subir">↑</button>
        <button type="button" class="btn-icon" data-grade="descer" title="Descer">↓</button>
        <button type="button" class="btn-icon" data-grade="remover" title="Remover">✕</button>
      </div>
      <input type="text" class="grade-ementa" data-campo="ementa" placeholder="Conteúdo / ementa (opcional)" value="${e(g.ementa || '')}">`;
    linha.querySelector('[data-campo=professorId]').value = g.professorId || '';
    $('gradeEditor').appendChild(linha);
    this.atualizarTotalGrade();
    return linha;
  },

  lerGrade() {
    return [...$('gradeEditor').querySelectorAll('.grade-linha')].map((linha) => {
      const campo = (c) => linha.querySelector(`[data-campo=${c}]`).value.trim();
      return { id: linha.dataset.id, nome: campo('nome'), cargaHoraria: campo('cargaHoraria'),
        professorId: campo('professorId'), ementa: campo('ementa') };
    }).filter((g) => g.nome || g.cargaHoraria || g.ementa);
  },

  atualizarTotalGrade() {
    const linhas = [...$('gradeEditor').querySelectorAll('.grade-linha')];
    linhas.forEach((l, i) => { l.querySelector('.grade-ordem').textContent = i + 1; });
    const total = linhas.reduce((s, l) => s + Number(l.querySelector('[data-campo=cargaHoraria]').value || 0), 0);
    const cargaCurso = Number($('formCurso').elements.cargaHoraria.value || 0);
    const el = $('gradeTotal');
    el.textContent = linhas.length
      ? `Total da grade: ${total}h${cargaCurso ? ` de ${cargaCurso}h do curso` : ''}`
      : 'Nenhum módulo adicionado.';
    el.className = cargaCurso && linhas.length && total !== cargaCurso ? 'texto-alerta' : 'texto-suave';
  },

  verGrade(curso) {
    App.visualizar(`Grade – ${curso.nome}`, Documentos.grade(curso), () => Utils.imprimir(`Grade – ${curso.nome}`, Documentos.grade(curso)));
  },

  renderizar() {
    const lista = Cursos.filtrar($('buscaCursos').value,
      $('filtroModalidadeCursos').value, $('filtroStatusCursos').value);

    $('listaCursos').innerHTML = lista.map((c) => {
      const qtdTurmas = Cursos.totalTurmas(c.id);
      return `
      <tr>
        <td><strong>${Utils.escapar(c.nome)}</strong>
            <small>${Utils.escapar([c.codigo, c.area].filter(Boolean).join(' · '))}</small>
            ${c.coordenadorId ? `<small>Coord.: ${Utils.escapar(Cursos.nomeCoordenador(c))}</small>` : ''}</td>
        <td>${Utils.escapar(c.modalidade)}</td>
        <td>${c.cargaHoraria} h</td>
        <td>${(c.grade || []).length
          ? `<button class="link" data-acao="grade" data-id="${c.id}" title="Ver grade">${c.grade.length} módulo(s)</button>`
          : '<span class="texto-suave">—</span>'}</td>
        <td>${c.duracaoMeses ? `${c.duracaoMeses} ${c.duracaoMeses > 1 ? 'meses' : 'mês'}` : '-'}</td>
        <td>${Utils.formatarMoeda(c.mensalidade)}
            ${c.taxaMatricula ? `<small>Matrícula: ${Utils.formatarMoeda(c.taxaMatricula)}</small>` : ''}</td>
        <td><button class="link" data-acao="turmas" data-id="${c.id}" title="Ver turmas">${qtdTurmas}</button></td>
        <td>${Utils.badge(c.status)}</td>
        <td class="acoes">
          <button class="btn-icon" data-acao="grade" data-id="${c.id}" title="Ver / imprimir grade">🗂️</button>
          ${Sessao.pode('turmas') ? `<button class="btn-icon" data-acao="turmas" data-id="${c.id}" title="Ver turmas">🏫</button>` : ''}
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
