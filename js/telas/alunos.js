// ===== Tela: Alunos =====
const TelaAlunos = {
  iniciar() {
    const form = $('formAluno');

    $('btnNovoAluno').addEventListener('click', () => this.abrir());
    $('buscaAlunos').addEventListener('input', () => this.renderizar());
    $('filtroStatusAlunos').addEventListener('change', () => this.renderizar());

    $('btnExportarAlunos').addEventListener('click', () => {
      if (!Alunos.listar().length) return Utils.toast('Não há alunos para exportar.', 'erro');
      Utils.baixarArquivo(Alunos.exportarCSV(),
        `alunos_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8');
    });

    $('listaAlunos').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const aluno = Alunos.buscarPorId(btn.dataset.id);
      if (btn.dataset.acao === 'editar') this.abrir(aluno);
      if (btn.dataset.acao === 'excluir') {
        const vinculos = Matriculas.listar().some((m) => m.alunoId === aluno.id) ||
          Financeiro.listar().some((l) => l.alunoId === aluno.id);
        if (vinculos) return Utils.toast('Aluno possui matrículas ou lançamentos. Altere o status para Inativo.', 'erro');
        if (!confirm(`Excluir o aluno "${aluno.nome}"?`)) return;
        Alunos.excluir(aluno.id);
        Atividades.registrar('alunos', 'Aluno excluído', aluno.nome, { refId: aluno.id });
        this.renderizar();
        Utils.toast('Aluno excluído.');
      }
    });

    // Máscaras
    form.elements.cpf.addEventListener('input', (e) => { e.target.value = Utils.mascaraCPF(e.target.value); });
    form.elements.telefone.addEventListener('input', (e) => { e.target.value = Utils.mascaraTelefone(e.target.value); });
    form.elements.cep.addEventListener('input', (e) => { e.target.value = Utils.mascaraCEP(e.target.value); });
    form.elements.cep.addEventListener('blur', () => this.buscarCEP());

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const aluno = Utils.lerForm(form);
      aluno.id = aluno.id || undefined;
      aluno.uf = aluno.uf.toUpperCase();

      const erros = Alunos.validar(aluno);
      if (erros.length) return Utils.mostrarErros(form, erros);

      const editando = Boolean(aluno.id);
      const salvo = Alunos.salvar(aluno);
      Atividades.registrar('alunos', editando ? 'Aluno editado' : 'Aluno cadastrado', aluno.nome, { refId: salvo.id });
      Utils.fecharModal('modalAluno');
      this.renderizar();
      Utils.toast(editando ? 'Aluno atualizado!' : 'Aluno cadastrado!');

      const callback = this.aposSalvar;
      this.aposSalvar = null;
      if (callback) callback(salvo);
    });
  },

  // extras.dados: pré-preenchimento (ex.: lead); extras.aposSalvar: função chamada após salvar
  abrir(aluno = null, extras = {}) {
    this.aposSalvar = extras.aposSalvar || null;
    // Sugestões de curso vêm do cadastro de cursos ativos
    $('listaNomesCursos').innerHTML = Cursos.ativos()
      .map((c) => `<option value="${Utils.escapar(c.nome)}">`).join('');
    Utils.preencherForm($('formAluno'), aluno || extras.dados || {});
    Utils.abrirModal('modalAluno', aluno ? 'Editar aluno' : 'Novo aluno');
  },

  async buscarCEP() {
    const f = $('formAluno').elements;
    const cep = Utils.somenteDigitos(f.cep.value);
    if (cep.length !== 8) return;
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const dados = await resp.json();
      if (dados.erro) return Utils.toast('CEP não encontrado.', 'erro');
      f.endereco.value = dados.logradouro || '';
      f.bairro.value = dados.bairro || '';
      f.cidade.value = dados.localidade || '';
      f.uf.value = dados.uf || '';
      f.numero.focus();
    } catch {
      Utils.toast('Não foi possível consultar o CEP.', 'erro');
    }
  },

  renderizar() {
    const lista = Alunos.filtrar($('buscaAlunos').value, $('filtroStatusAlunos').value);

    $('listaAlunos').innerHTML = lista.map((a) => `
      <tr>
        <td><strong>${Utils.escapar(a.nome)}</strong>
            <small>${Utils.escapar([a.cidade, a.uf].filter(Boolean).join(' / '))}</small></td>
        <td>${Utils.escapar(a.cpf)}</td>
        <td>${Utils.escapar(a.telefone)}<small>${Utils.escapar(a.email)}</small></td>
        <td>${Utils.escapar(a.curso) || '-'}</td>
        <td>${Utils.badge(a.status)}</td>
        <td>${Utils.formatarData(a.criadoEm)}</td>
        <td class="acoes">
          <button class="btn-icon" data-acao="editar" data-id="${a.id}" title="Editar">✏️</button>
          <button class="btn-icon" data-acao="excluir" data-id="${a.id}" title="Excluir">🗑️</button>
        </td>
      </tr>`).join('');

    App.estadoVazio('vazioAlunos', lista.length, Alunos.listar().length,
      'Nenhum aluno cadastrado ainda.', 'Nenhum aluno encontrado com esses filtros.');

    const s = Alunos.estatisticas();
    $('statAlunosTotal').textContent = s.total;
    $('statAlunosAtivos').textContent = s.ativos;
    $('statAlunosInteressados').textContent = s.interessados;
    $('statAlunosMes').textContent = s.mes;
  },
};
