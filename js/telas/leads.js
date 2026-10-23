// ===== Tela: Leads / Funil (Kanban) =====
const TelaLeads = {
  iniciar() {
    const form = $('formLead');
    form.elements.origem.innerHTML = Utils.opcoes(Leads.ORIGENS);
    form.elements.etapa.innerHTML = Utils.opcoes(Leads.ETAPAS);
    $('filtroOrigemLeads').innerHTML = Utils.opcoes(Leads.ORIGENS, { vazio: 'Todas as origens' });

    $('btnNovoLead').addEventListener('click', () => this.abrir());
    $('buscaLeads').addEventListener('input', () => this.renderizar());
    $('filtroOrigemLeads').addEventListener('change', () => this.renderizar());
    $('filtroCursoLeads').addEventListener('change', () => this.renderizar());
    form.elements.telefone.addEventListener('input', (e) => { e.target.value = Utils.mascaraTelefone(e.target.value); });

    // Clique no card abre o lead; setas movem de etapa (funciona no celular)
    $('kanban').addEventListener('click', (e) => {
      const card = e.target.closest('.lead-card');
      if (!card) return;
      const btn = e.target.closest('button[data-mover]');
      if (btn) {
        const i = Leads.ETAPAS.indexOf(Leads.buscarPorId(card.dataset.id).etapa) + Number(btn.dataset.mover);
        if (Leads.ETAPAS[i]) Leads.mover(card.dataset.id, Leads.ETAPAS[i]);
        return this.renderizar();
      }
      this.abrir(Leads.buscarPorId(card.dataset.id));
    });

    // Arrastar e soltar (computador)
    $('kanban').addEventListener('dragstart', (e) => {
      const card = e.target.closest('.lead-card');
      if (!card) return;
      e.dataTransfer.setData('text/plain', card.dataset.id);
      card.classList.add('arrastando');
    });
    $('kanban').addEventListener('dragend', (e) => e.target.closest('.lead-card')?.classList.remove('arrastando'));
    $('kanban').addEventListener('dragover', (e) => {
      const coluna = e.target.closest('.kanban-coluna');
      if (!coluna) return;
      e.preventDefault();
      document.querySelectorAll('.kanban-coluna.alvo').forEach((c) => c !== coluna && c.classList.remove('alvo'));
      coluna.classList.add('alvo');
    });
    $('kanban').addEventListener('drop', (e) => {
      const coluna = e.target.closest('.kanban-coluna');
      if (!coluna) return;
      e.preventDefault();
      Leads.mover(e.dataTransfer.getData('text/plain'), coluna.dataset.etapa);
      this.renderizar();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const lead = this.lerFormulario();
      if (!lead) return;
      const editando = Boolean(lead.id);
      Leads.salvarComNota(lead, $('novaNotaLead').value.trim());
      Utils.fecharModal('modalLead');
      this.renderizar();
      Utils.toast(editando ? 'Lead atualizado!' : 'Lead cadastrado!');
    });

    $('btnConverterLead').addEventListener('click', () => this.converter());
  },

  lerFormulario() {
    const form = $('formLead');
    const lead = Utils.lerForm(form);
    lead.id = lead.id || undefined;
    const erros = Leads.validar(lead);
    if (erros.length) { Utils.mostrarErros(form, erros); return null; }
    return lead;
  },

  abrir(lead = null) {
    const form = $('formLead');
    form.elements.cursoId.innerHTML = Utils.opcoes(
      Cursos.listar().filter((c) => c.status === 'Ativo' || c.id === lead?.cursoId),
      { valor: (c) => c.id, texto: (c) => c.nome, vazio: 'Não definido' });

    Utils.preencherForm(form, lead || { etapa: 'Novo', proximoContato: Utils.hoje() });
    $('novaNotaLead').value = '';
    $('historicoLead').innerHTML = (lead?.historico || []).slice().reverse().map((h) => `
      <li><small>${new Date(h.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</small>
        ${Utils.escapar(h.texto)}</li>`).join('') || '<li class="graf-vazio">Sem interações ainda.</li>';

    $('btnConverterLead').hidden = !lead || Boolean(lead.alunoId);
    Utils.abrirModal('modalLead', lead ? 'Editar lead' : 'Novo lead');
  },

  // Lead -> Aluno -> Matrícula
  converter() {
    const lead = this.lerFormulario();
    if (!lead) return;
    Leads.salvarComNota(lead, $('novaNotaLead').value.trim());
    Utils.fecharModal('modalLead');

    TelaAlunos.abrir(null, {
      dados: {
        nome: lead.nome, email: lead.email, telefone: lead.telefone,
        curso: Leads.nomeCurso(lead), status: 'Interessado',
        observacoes: `Origem: ${lead.origem}${lead.observacoes ? ` – ${lead.observacoes}` : ''}`,
      },
      aposSalvar: (aluno) => {
        const atual = Leads.buscarPorId(lead.id);
        Leads.salvarComNota({ ...atual, etapa: 'Matriculado', alunoId: aluno.id }, 'Convertido em aluno.');
        location.hash = '#matriculas';
        TelaMatriculas.abrir(null, { alunoId: aluno.id, cursoId: lead.cursoId });
        Utils.toast('Aluno criado! Agora conclua a matrícula.');
      },
    });
  },

  renderizar() {
    const sel = $('filtroCursoLeads');
    const atual = sel.value;
    sel.innerHTML = Utils.opcoes(Cursos.listar(), { valor: (c) => c.id, texto: (c) => c.nome, vazio: 'Todos os cursos' });
    sel.value = atual;
    if (sel.selectedIndex < 0) sel.value = '';

    const lista = Leads.filtrar($('buscaLeads').value, $('filtroOrigemLeads').value, sel.value);
    const hoje = Utils.hoje();

    $('kanban').innerHTML = Leads.ETAPAS.map((etapa, i) => {
      const leads = lista.filter((l) => l.etapa === etapa);
      return `
      <div class="kanban-coluna" data-etapa="${etapa}">
        <header><span>${etapa}</span><span class="contador">${leads.length}</span></header>
        <div class="kanban-cards">
          ${leads.map((l) => `
            <article class="lead-card" draggable="true" data-id="${l.id}">
              <strong>${Utils.escapar(l.nome)}</strong>
              <small>${Utils.escapar(Leads.nomeCurso(l) || 'Curso não definido')}</small>
              <small>📱 ${Utils.escapar(l.telefone)}</small>
              <div class="lead-rodape">
                <span class="tag-origem">${Utils.escapar(l.origem)}</span>
                ${l.proximoContato && Leads.emAberto(l) ? `<span class="${l.proximoContato < hoje ? 'texto-perigo' : 'texto-suave'}"
                  title="Próximo contato">📅 ${Utils.formatarData(l.proximoContato).slice(0, 5)}</span>` : ''}
              </div>
              <div class="lead-mover">
                <button class="btn-icon" data-mover="-1" title="Etapa anterior" ${i === 0 ? 'disabled' : ''}>◀</button>
                <button class="btn-icon" data-mover="1" title="Próxima etapa" ${i === Leads.ETAPAS.length - 1 ? 'disabled' : ''}>▶</button>
              </div>
            </article>`).join('') || '<p class="kanban-vazio">Arraste leads para cá</p>'}
        </div>
      </div>`;
    }).join('');

    const s = Leads.estatisticas();
    $('statLeadsTotal').textContent = s.total;
    $('statLeadsAbertos').textContent = s.abertos;
    $('statLeadsConvertidos').textContent = s.convertidos;
    $('statLeadsTaxa').textContent = `${s.taxa}%`;
  },
};
