// ===== Envio de WhatsApp com modelos prontos + cadastro de modelos =====
const Mensageiro = {
  contexto: null,

  iniciar() {
    $('msgModelo').addEventListener('change', () => this.aplicarModelo());
    $('msgTexto').addEventListener('input', () => this.avisarCamposVazios());
    $('formMensagem').addEventListener('submit', (e) => {
      e.preventDefault();
      this.enviar();
    });

    // ---------- Modelos ----------
    $('formModelo').elements.categoria.innerHTML = Utils.opcoes(ModelosMensagem.CATEGORIAS);
    $('listaVariaveis').innerHTML = Object.entries(ModelosMensagem.VARIAVEIS).map(([chave, desc]) =>
      `<button type="button" class="chip chip-botao" data-variavel="${chave}" title="${desc}">{${chave}}</button>`).join('');

    $('btnModelos').addEventListener('click', () => this.abrirModelos());
    $('btnNovoModelo').addEventListener('click', () => this.editarModelo(null));
    $('listaModelos').addEventListener('click', (e) => {
      const item = e.target.closest('[data-modelo]');
      if (item) this.editarModelo(ModelosMensagem.buscarPorId(item.dataset.modelo));
    });
    $('listaVariaveis').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-variavel]');
      if (!btn || !Sessao.ehDiretor()) return;
      const campo = $('formModelo').elements.texto;
      const inicio = campo.selectionStart ?? campo.value.length;
      const texto = `{${btn.dataset.variavel}}`;
      campo.value = campo.value.slice(0, inicio) + texto + campo.value.slice(campo.selectionEnd ?? inicio);
      campo.focus();
      campo.selectionStart = campo.selectionEnd = inicio + texto.length;
    });
    $('formModelo').addEventListener('submit', (e) => {
      e.preventDefault();
      const form = $('formModelo');
      const m = Utils.lerForm(form);
      m.id = m.id || undefined;
      const erros = ModelosMensagem.validar(m);
      if (erros.length) return Utils.mostrarErros(form, erros);
      const editando = Boolean(m.id);
      const salvo = ModelosMensagem.salvar(m);
      Atividades.registrar('conversas', editando ? 'Modelo de mensagem editado' : 'Modelo de mensagem criado', m.nome, { refId: salvo.id });
      this.renderizarModelos(salvo.id);
      Utils.toast('Modelo salvo!');
    });
    $('btnExcluirModelo').addEventListener('click', () => {
      const id = $('formModelo').elements.id.value;
      const m = id && ModelosMensagem.buscarPorId(id);
      if (!m || !confirm(`Excluir o modelo "${m.nome}"?`)) return;
      ModelosMensagem.excluir(id);
      Atividades.registrar('conversas', 'Modelo de mensagem excluído', m.nome);
      this.renderizarModelos();
      Utils.toast('Modelo excluído.');
    });
  },

  // <select> com os modelos agrupados por categoria
  opcoesModelos(vazio = 'Mensagem livre') {
    const modelos = ModelosMensagem.todos();
    return `<option value="">${vazio}</option>` + ModelosMensagem.CATEGORIAS.map((cat) => {
      const doGrupo = modelos.filter((m) => m.categoria === cat);
      return doGrupo.length ? `<optgroup label="${cat}">${doGrupo.map((m) =>
        `<option value="${m.id}">${Utils.escapar(m.nome)}</option>`).join('')}</optgroup>` : '';
    }).join('');
  },

  // opcoes: { tipo, id, lancamento, turma, modelo: 'Nome do modelo sugerido' }
  abrir(opcoes) {
    const contato = Contatos.buscar(opcoes.tipo, opcoes.id);
    if (!contato) return;
    if (!WhatsApp.valido(contato.telefone)) return Utils.toast('Este contato não tem um telefone válido.', 'erro');
    this.contexto = { ...opcoes, contato };
    const e = Utils.escapar;

    $('msgPara').innerHTML = `
      ${App.avatar(contato)}
      <div><strong>${e(contato.nome)}</strong>
        <small>${Contatos.TIPOS[contato.tipo].icone} ${Contatos.TIPOS[contato.tipo].nome} · ${e(contato.telefone)}</small></div>`;
    $('msgModelo').innerHTML = this.opcoesModelos();
    $('msgModelo').value = (opcoes.modelo && ModelosMensagem.porNome(opcoes.modelo)?.id) || '';
    this.aplicarModelo();
    Utils.abrirModal('modalMensagem');
    $('msgTexto').focus();
  },

  aplicarModelo() {
    const modelo = ModelosMensagem.buscarPorId($('msgModelo').value);
    const { contato, lancamento, turma } = this.contexto;
    $('msgTexto').value = modelo
      ? ModelosMensagem.preencher(modelo.texto, ModelosMensagem.variaveis(contato, { lancamento, turma })) : '';
    this.avisarCamposVazios();
  },

  avisarCamposVazios() {
    const faltando = [...new Set($('msgTexto').value.match(/\{\w+\}/g) || [])];
    const aviso = document.querySelector('#modalMensagem .msg-ajuda');
    aviso.classList.toggle('texto-alerta', faltando.length > 0);
    aviso.textContent = faltando.length
      ? `⚠ Sem informação para ${faltando.join(', ')}. Complete o texto antes de enviar.`
      : 'O WhatsApp abrirá numa nova aba com a mensagem pronta. É só conferir e apertar enviar. A mensagem fica registrada no histórico do contato.';
  },

  enviar() {
    const texto = $('msgTexto').value.trim();
    if (!texto) return Utils.toast('Escreva a mensagem.', 'erro');
    const { contato } = this.contexto;
    WhatsApp.abrir(contato.telefone, texto);
    Mensagens.registrar({ contatoTipo: contato.tipo, contatoId: contato.id, texto });
    Utils.fecharModal('modalMensagem');
    Utils.toast('Mensagem registrada no histórico.');
    App.renderizarAtual();
    FichaAluno.atualizarSeAberta();
  },

  // ---------- Modelos ----------
  abrirModelos() {
    this.renderizarModelos();
    Utils.abrirModal('modalModelos');
  },

  renderizarModelos(selecionadoId) {
    const modelos = ModelosMensagem.todos();
    const e = Utils.escapar;
    $('listaModelos').innerHTML = ModelosMensagem.CATEGORIAS.map((cat) => {
      const doGrupo = modelos.filter((m) => m.categoria === cat);
      return doGrupo.length ? `<li class="modelos-categoria">${cat}</li>${doGrupo.map((m) =>
        `<li class="modelos-item" data-modelo="${m.id}">${e(m.nome)}</li>`).join('')}` : '';
    }).join('');
    const selecionado = ModelosMensagem.buscarPorId(selecionadoId) || modelos[0] || null;
    this.editarModelo(selecionado);
  },

  editarModelo(m) {
    const form = $('formModelo');
    Utils.preencherForm(form, m || { categoria: 'Geral' });
    document.querySelectorAll('#listaModelos .modelos-item').forEach((li) =>
      li.classList.toggle('ativo', li.dataset.modelo === m?.id));
    const diretor = Sessao.ehDiretor();
    [...form.elements].forEach((el) => { if (el.name) el.disabled = !diretor; });
    $('btnExcluirModelo').hidden = !m;
    $('avisoModelos').hidden = diretor;
    if (diretor && !m) form.elements.nome.focus();
  },
};
