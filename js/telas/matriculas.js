// ===== Tela: Matrículas =====
const TelaMatriculas = {
  iniciar() {
    const form = $('formMatricula');

    $('btnNovaMatricula').addEventListener('click', () => this.abrir());
    $('buscaMatriculas').addEventListener('input', () => this.renderizar());
    $('filtroTurmaMatriculas').addEventListener('change', () => this.renderizar());
    $('filtroStatusMatriculas').addEventListener('change', () => this.renderizar());

    // Ao escolher a turma (matrícula nova), puxa os valores do curso
    form.elements.turmaId.addEventListener('change', () => {
      if (form.elements.id.value) return;
      const turma = Turmas.buscarPorId(form.elements.turmaId.value);
      const curso = turma && Cursos.buscarPorId(turma.cursoId);
      if (!curso) return;
      form.elements.valorMensalidade.value = curso.mensalidade ?? '';
      form.elements.taxaMatricula.value = curso.taxaMatricula ?? '';
      form.elements.parcelas.value = curso.duracaoMeses || 1;
      this.atualizarValorFinal();
    });
    form.elements.valorMensalidade.addEventListener('input', () => this.atualizarValorFinal());
    form.elements.desconto.addEventListener('input', () => this.atualizarValorFinal());

    $('listaMatriculas').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const m = Matriculas.buscarPorId(btn.dataset.id);
      if (btn.dataset.acao === 'editar') this.abrir(m);
      if (btn.dataset.acao === 'ficha') FichaAluno.abrir(m.alunoId);
      if (btn.dataset.acao === 'contrato') Documentos.abrirContrato(m.id);
      if (btn.dataset.acao === 'financeiro') {
        $('buscaFinanceiro').value = Matriculas.nomeAluno(m);
        $('filtroMesFinanceiro').value = '';
        $('filtroSituacaoFinanceiro').value = '';
        location.hash = '#financeiro';
      }
      if (btn.dataset.acao === 'excluir') this.excluir(m);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const m = Matriculas.preparar(Utils.lerForm(form));
      m.id = m.id || undefined;

      const erros = Matriculas.validar(m);
      if (erros.length) return Utils.mostrarErros(form, erros);

      const anterior = m.id ? Matriculas.buscarPorId(m.id) : null;
      const salva = Matriculas.salvar(m);

      const nomeAluno = Matriculas.nomeAluno(salva);
      const codigoTurma = Matriculas.turma(salva)?.codigo || '';
      if (!anterior) {
        Atividades.registrar('matriculas', 'Matrícula realizada',
          `${nomeAluno} em ${codigoTurma} – ${Utils.formatarMoeda(salva.valorFinal)}/mês`, { refId: salva.id });
        if ($('gerarFinanceiro').checked) Matriculas.gerarFinanceiro(salva);
        // Aluno matriculado passa a ser "Ativo"
        const aluno = Alunos.buscarPorId(salva.alunoId);
        const turma = Turmas.buscarPorId(salva.turmaId);
        Alunos.salvar({ id: aluno.id, status: 'Ativo', curso: aluno.curso || Turmas.nomeCurso(turma) });
      } else {
        Atividades.registrar('matriculas', anterior.status !== salva.status ? 'Status da matrícula alterado' : 'Matrícula editada',
          `${nomeAluno} em ${codigoTurma}${anterior.status !== salva.status ? `: ${anterior.status} → ${salva.status}` : ''}`,
          { refId: salva.id });
        if (anterior.status === 'Ativa' && ['Cancelada', 'Trancada'].includes(salva.status)) this.perguntarCancelarParcelas(salva.id);
      }

      Utils.fecharModal('modalMatricula');
      this.renderizar();
      Utils.toast(anterior ? 'Matrícula atualizada!' : 'Matrícula realizada!');
      if (!anterior && $('gerarContrato').checked) Documentos.abrirContrato(salva.id);
    });
  },

  perguntarCancelarParcelas(matriculaId) {
    const qtd = Financeiro.pendentesDaMatricula(matriculaId);
    if (qtd && confirm(`Cancelar também as ${qtd} parcela(s) pendente(s) desta matrícula no Financeiro?`)) {
      Financeiro.cancelarPendentes(matriculaId);
    }
  },

  excluir(m) {
    if (!confirm(`Excluir a matrícula de "${Matriculas.nomeAluno(m)}"?`)) return;
    const qtd = Financeiro.cancelarPendentes(m.id);
    Matriculas.excluir(m.id);
    Atividades.registrar('matriculas', 'Matrícula excluída', `${Matriculas.nomeAluno(m)} – ${Matriculas.turma(m)?.codigo || ''}`, { refId: m.id });
    this.renderizar();
    Utils.toast(qtd ? `Matrícula excluída e ${qtd} parcela(s) pendente(s) cancelada(s).` : 'Matrícula excluída.');
  },

  atualizarValorFinal() {
    const f = $('formMatricula').elements;
    $('valorFinalMatricula').textContent =
      Utils.formatarMoeda(Matriculas.calcularValorFinal(f.valorMensalidade.value, f.desconto.value));
  },

  // extras: { alunoId, cursoId } para pré-selecionar (ex.: vindo da conversão de lead)
  abrir(m = null, extras = {}) {
    const form = $('formMatricula');
    const alunos = Alunos.listar().filter((a) => a.status !== 'Inativo' || a.id === m?.alunoId)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const turmas = Turmas.listar().filter((t) => Turmas.estaAberta(t) || t.id === m?.turmaId)
      .sort((a, b) => a.codigo.localeCompare(b.codigo));

    if (!alunos.length) return Utils.toast('Cadastre um aluno antes de matricular.', 'erro');
    if (!turmas.length) return Utils.toast('Não há turmas abertas (Planejada ou Em andamento).', 'erro');

    form.elements.alunoId.innerHTML = Utils.opcoes(alunos,
      { valor: (a) => a.id, texto: (a) => `${a.nome} – ${a.cpf}`, vazio: 'Selecione o aluno...' });
    form.elements.turmaId.innerHTML = Utils.opcoes(turmas,
      { valor: (t) => t.id, texto: (t) => Turmas.rotulo(t), vazio: 'Selecione a turma...' });

    Utils.preencherForm(form, m || {
      alunoId: extras.alunoId || '',
      dataMatricula: Utils.hoje(),
      status: 'Ativa',
      desconto: 0,
      diaVencimento: 10,
    });

    // Sugere a primeira turma aberta do curso de interesse
    if (!m && extras.cursoId) {
      const turma = turmas.find((t) => t.cursoId === extras.cursoId);
      if (turma) {
        form.elements.turmaId.value = turma.id;
        form.elements.turmaId.dispatchEvent(new Event('change'));
      }
    }

    // Condição vinda do simulador de propostas
    if (!m && extras.condicao) {
      Object.entries(extras.condicao).forEach(([campo, valor]) => { if (form.elements[campo]) form.elements[campo].value = valor; });
    }

    $('linhaGerarFinanceiro').hidden = Boolean(m);
    $('linhaGerarContrato').hidden = Boolean(m);
    $('gerarContrato').checked = true;
    $('gerarFinanceiro').checked = true;
    this.atualizarValorFinal();
    Utils.abrirModal('modalMatricula', m ? 'Editar matrícula' : 'Nova matrícula');
  },

  renderizar() {
    const sel = $('filtroTurmaMatriculas');
    const atual = sel.value;
    sel.innerHTML = Utils.opcoes([...Turmas.listar()].sort((a, b) => a.codigo.localeCompare(b.codigo)),
      { valor: (t) => t.id, texto: (t) => t.codigo, vazio: 'Todas as turmas' });
    sel.value = atual;
    if (sel.selectedIndex < 0) sel.value = '';

    const lista = Matriculas.filtrar($('buscaMatriculas').value, sel.value, $('filtroStatusMatriculas').value);

    $('listaMatriculas').innerHTML = lista.map((m) => {
      const aluno = Alunos.buscarPorId(m.alunoId);
      const turma = Matriculas.turma(m);
      const fin = Matriculas.resumoFinanceiro(m.id);
      return `
      <tr>
        <td><button class="link link-nome" data-acao="ficha" data-id="${m.id}">${Utils.escapar(Matriculas.nomeAluno(m))}</button><small>${Utils.escapar(aluno?.cpf)}</small></td>
        <td>${Utils.escapar(turma?.codigo || '(turma removida)')}<small>${Utils.escapar(turma ? Turmas.nomeCurso(turma) : '')}</small></td>
        <td>${Utils.formatarData(m.dataMatricula)}</td>
        <td>${Utils.escapar(Usuarios.nome(m.criadoPor)) || '-'}</td>
        <td>${Utils.formatarMoeda(m.valorFinal)}${m.desconto ? `<small>${m.desconto}% de desconto</small>` : ''}</td>
        <td>${fin.total ? `${fin.pagos}/${fin.total}` : '-'}</td>
        <td>${Utils.badge(m.status)}</td>
        <td class="acoes">
          ${Sessao.pode('financeiro') ? `<button class="btn-icon" data-acao="financeiro" data-id="${m.id}" title="Ver financeiro">💰</button>` : ''}
          <button class="btn-icon" data-acao="contrato" data-id="${m.id}" title="${m.contratoNumero ? `Contrato Nº ${m.contratoNumero}` : 'Gerar contrato'}">📄</button>
          <button class="btn-icon" data-acao="editar" data-id="${m.id}" title="Editar">✏️</button>
          <button class="btn-icon" data-acao="excluir" data-id="${m.id}" title="Excluir">🗑️</button>
        </td>
      </tr>`;
    }).join('');

    App.estadoVazio('vazioMatriculas', lista.length, Matriculas.listar().length,
      'Nenhuma matrícula realizada ainda.', 'Nenhuma matrícula encontrada com esses filtros.');

    const s = Matriculas.estatisticas();
    $('statMatTotal').textContent = s.total;
    $('statMatAtivas').textContent = s.ativas;
    $('statMatMes').textContent = s.mes;
    $('statMatTicket').textContent = Utils.formatarMoeda(s.ticket);
  },
};
