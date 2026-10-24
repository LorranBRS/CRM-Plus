// ===== Tela: Professores =====
const TelaProfessores = {
  iniciar() {
    const form = $('formProfessor');

    $('btnNovoProfessor').addEventListener('click', () => this.abrir());
    $('buscaProfessores').addEventListener('input', () => this.renderizar());
    $('filtroStatusProfessores').addEventListener('change', () => this.renderizar());
    form.elements.cpf.addEventListener('input', (e) => { e.target.value = Utils.mascaraCPF(e.target.value); });
    form.elements.telefone.addEventListener('input', (e) => { e.target.value = Utils.mascaraTelefone(e.target.value); });

    $('listaProfessores').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const p = Professores.buscarPorId(btn.dataset.id);
      if (btn.dataset.acao === 'agenda') this.verAgenda(p);
      if (btn.dataset.acao === 'whats') Mensageiro.abrir({ tipo: 'professor', id: p.id });
      if (btn.dataset.acao === 'editar') this.abrir(p);
      if (btn.dataset.acao === 'excluir') {
        if (Professores.emUso(p.id)) {
          return Utils.toast('Professor vinculado a turmas, disciplinas ou coordenação. Altere o status para Inativo.', 'erro');
        }
        if (!confirm(`Excluir o professor "${p.nome}"?`)) return;
        Professores.excluir(p.id);
        Atividades.registrar('professores', 'Professor excluído', p.nome, { refId: p.id });
        this.renderizar();
        Utils.toast('Professor excluído.');
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const p = Professores.preparar(Utils.lerForm(form));
      p.id = p.id || undefined;
      const erros = Professores.validar(p);
      if (erros.length) return Utils.mostrarErros(form, erros);

      const editando = Boolean(p.id);
      const salvo = Professores.salvar(p);
      Atividades.registrar('professores', editando ? 'Professor editado' : 'Professor cadastrado', p.nome, { refId: salvo.id });
      Utils.fecharModal('modalProfessor');
      this.renderizar();
      Utils.toast(editando ? 'Professor atualizado!' : 'Professor cadastrado!');
    });
  },

  abrir(p = null) {
    Utils.preencherForm($('formProfessor'), p || { status: 'Ativo' });
    Utils.abrirModal('modalProfessor', p ? 'Editar professor' : 'Novo professor');
  },

  // Agenda semanal + disciplinas + coordenações do professor
  verAgenda(p) {
    const e = Utils.escapar;
    const turmas = Professores.turmas(p.id).filter((t) => Turmas.estaAberta(t));
    const disciplinas = Professores.disciplinas(p.id);
    const coordena = Professores.cursosCoordenados(p.id);
    const horas = Professores.horasSemana(p.id);

    const corpo = `
      <div class="resumo-professor">
        <span><strong>${turmas.length}</strong> turma(s) aberta(s)</span>
        <span><strong>${Utils.formatarHoras(horas)}</strong> de aula por semana</span>
        ${p.valorHora ? `<span>≈ <strong>${Utils.formatarMoeda(horas * p.valorHora * 4.33)}</strong> / mês</span>` : ''}
      </div>
      <h3 class="titulo-secao">Grade semanal</h3>
      <div id="agendaProfessor"></div>
      <h3 class="titulo-secao">Disciplinas na grade dos cursos</h3>
      ${disciplinas.length ? `<ul class="lista-simples">${disciplinas.map((d) => `
        <li><div><strong>${e(d.nome)}</strong><small>${e(d.curso.nome)}</small></div><span>${d.cargaHoraria}h</span></li>`).join('')}</ul>`
        : '<p class="graf-vazio">Nenhuma disciplina atribuída.</p>'}
      ${coordena.length ? `<h3 class="titulo-secao">Coordenação</h3>
        <p>${coordena.map((c) => e(c.nome)).join(', ')}</p>` : ''}`;

    App.visualizar(`Agenda – ${p.nome}`, corpo);
    Agenda.render($('agendaProfessor'), turmas, { mostrar: 'curso' });
  },

  renderizar() {
    const lista = Professores.filtrar($('buscaProfessores').value, $('filtroStatusProfessores').value);

    $('listaProfessores').innerHTML = lista.map((p) => {
      const turmas = Professores.turmas(p.id).filter((t) => Turmas.estaAberta(t));
      const disciplinas = Professores.disciplinas(p.id);
      return `
      <tr>
        <td><strong>${Utils.escapar(p.nome)}</strong><small>${Utils.escapar(p.formacao)}</small></td>
        <td>${Utils.escapar(p.telefone)}<small>${Utils.escapar(p.email)}</small></td>
        <td>${Utils.escapar(p.especialidades) || '-'}</td>
        <td>${turmas.length ? turmas.map((t) => Utils.escapar(t.codigo)).join('<br>') : '-'}</td>
        <td>${disciplinas.length}</td>
        <td>${Utils.formatarHoras(Professores.horasSemana(p.id))}</td>
        <td>${Utils.badge(p.status || 'Ativo')}</td>
        <td class="acoes">
          <button class="btn-icon" data-acao="whats" data-id="${p.id}" title="Enviar WhatsApp">💬</button>
          <button class="btn-icon" data-acao="agenda" data-id="${p.id}" title="Agenda semanal">📅</button>
          <button class="btn-icon" data-acao="editar" data-id="${p.id}" title="Editar">✏️</button>
          <button class="btn-icon" data-acao="excluir" data-id="${p.id}" title="Excluir">🗑️</button>
        </td>
      </tr>`;
    }).join('');

    App.estadoVazio('vazioProfessores', lista.length, Professores.listar().length,
      'Nenhum professor cadastrado ainda.', 'Nenhum professor encontrado com esses filtros.');

    const s = Professores.estatisticas();
    $('statProfAtivos').textContent = s.ativos;
    $('statProfTurmas').textContent = s.turmas;
    $('statProfSem').textContent = s.semProfessor;
    $('statProfHoras').textContent = Utils.formatarHoras(s.horas);
  },
};
