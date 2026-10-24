// ===== Tela: Conversas (histórico de WhatsApp com cara de chat) =====
const TelaConversas = {
  tipo: '',
  atual: null, // { tipo, id }

  iniciar() {
    $('buscaConversas').addEventListener('input', () => this.renderizarLista());
    $('filtroTipoConversas').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tipo]');
      if (!btn) return;
      this.tipo = btn.dataset.tipo;
      $('filtroTipoConversas').querySelectorAll('button').forEach((b) => b.classList.toggle('ativo', b === btn));
      this.renderizarLista();
    });

    $('chatContatos').addEventListener('click', (e) => {
      const item = e.target.closest('[data-contato]');
      if (!item) return;
      const [tipo, id] = item.dataset.contato.split(':');
      this.selecionar(tipo, id);
    });

    $('chatVoltar').addEventListener('click', () => {
      this.atual = null;
      this.renderizar();
    });

    $('chatFicha').addEventListener('click', () => {
      const { tipo, id } = this.atual;
      if (tipo === 'aluno') FichaAluno.abrir(id);
      if (tipo === 'lead') TelaLeads.abrir(Leads.buscarPorId(id));
      if (tipo === 'professor') TelaProfessores.abrir(Professores.buscarPorId(id));
    });

    $('chatModelo').addEventListener('change', () => {
      const modelo = ModelosMensagem.buscarPorId($('chatModelo').value);
      if (!modelo) return;
      const contato = Contatos.buscar(this.atual.tipo, this.atual.id);
      $('chatTexto').value = ModelosMensagem.preencher(modelo.texto, ModelosMensagem.variaveis(contato));
      $('chatModelo').value = '';
      $('chatTexto').focus();
      this.ajustarAltura();
    });

    $('chatRecebida').addEventListener('change', () => this.atualizarComposer());
    $('chatTexto').addEventListener('input', () => this.ajustarAltura());
    $('chatTexto').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        $('chatForm').requestSubmit();
      }
    });
    $('chatForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.enviar();
    });
  },

  // Abre a conversa de um contato a partir de outra tela
  abrirContato(tipo, id) {
    this.atual = { tipo, id };
    if (location.hash !== '#conversas') location.hash = '#conversas';
    else this.renderizar();
  },

  selecionar(tipo, id) {
    this.atual = { tipo, id };
    $('chatTexto').value = '';
    $('chatRecebida').checked = false;
    this.renderizar();
    $('chatTexto').focus();
  },

  renderizar() {
    if (this.atual && !Contatos.buscar(this.atual.tipo, this.atual.id)) this.atual = null;
    this.renderizarLista();
    this.renderizarConversa();
  },

  quando(iso) {
    const dia = Utils.paraISO(new Date(iso));
    if (dia === Utils.hoje()) return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (dia === Utils.somarDias(Utils.hoje(), -1)) return 'Ontem';
    return Utils.formatarData(dia).slice(0, 5);
  },

  renderizarLista() {
    const e = Utils.escapar;
    const termo = $('buscaConversas').value.toLowerCase().trim();
    const ultimas = Mensagens.ultimas();
    const contatos = Contatos.listar(this.tipo ? [this.tipo] : undefined)
      .filter((c) => !termo || c.nome.toLowerCase().includes(termo) || Utils.somenteDigitos(c.telefone).includes(Utils.somenteDigitos(termo) || '§'))
      .map((c) => ({ ...c, ultima: ultimas[`${c.tipo}:${c.id}`] }))
      .sort((a, b) => (b.ultima?.data || '').localeCompare(a.ultima?.data || '') || a.nome.localeCompare(b.nome, 'pt-BR'))
      .slice(0, 200);

    const atualChave = this.atual ? `${this.atual.tipo}:${this.atual.id}` : '';
    $('chatContatos').innerHTML = contatos.map((c) => `
      <li class="chat-contato ${atualChave === `${c.tipo}:${c.id}` ? 'ativo' : ''}" data-contato="${c.tipo}:${c.id}">
        ${App.avatar(c)}
        <div class="chat-contato-info">
          <div class="chat-contato-linha">
            <strong>${e(c.nome)}</strong>
            ${c.ultima ? `<time>${this.quando(c.ultima.data)}</time>` : ''}
          </div>
          <small>${c.ultima
            ? `${c.ultima.direcao === 'enviada' ? '✓ ' : '↩ '}${e(c.ultima.texto.slice(0, 60))}`
            : `${Contatos.TIPOS[c.tipo].icone} ${e(c.detalhe || Contatos.TIPOS[c.tipo].nome)}`}</small>
        </div>
      </li>`).join('') || '<li class="graf-vazio chat-sem-contatos">Nenhum contato encontrado.</li>';
  },

  renderizarConversa() {
    const e = Utils.escapar;
    $('chat').classList.toggle('mostrando-conversa', Boolean(this.atual));
    $('chatVazio').hidden = Boolean(this.atual);
    $('chatAtivo').hidden = !this.atual;
    if (!this.atual) return;

    const contato = Contatos.buscar(this.atual.tipo, this.atual.id);
    $('chatAvatar').outerHTML = App.avatar(contato, '', 'chatAvatar');
    $('chatNome').textContent = contato.nome;
    $('chatDetalhe').textContent = `${Contatos.TIPOS[contato.tipo].icone} ${Contatos.TIPOS[contato.tipo].nome} · ${contato.telefone || 'sem telefone'}${contato.detalhe ? ` · ${contato.detalhe}` : ''}`;
    $('chatFicha').textContent = contato.tipo === 'aluno' ? 'Ver ficha' : 'Ver cadastro';
    $('chatModelo').innerHTML = Mensageiro.opcoesModelos('📋 Usar modelo...');

    const mensagens = Mensagens.doContato(contato.tipo, contato.id);
    let diaAnterior = '';
    $('chatMensagens').innerHTML = mensagens.map((m) => {
      const dia = Utils.paraISO(new Date(m.data));
      const separador = dia !== diaAnterior
        ? `<div class="chat-dia"><span>${dia === Utils.hoje() ? 'Hoje' : dia === Utils.somarDias(Utils.hoje(), -1) ? 'Ontem' : Utils.formatarData(dia)}</span></div>` : '';
      diaAnterior = dia;
      return `${separador}
        <div class="bolha bolha-${m.direcao}">
          <p>${e(m.texto).replace(/\n/g, '<br>')}</p>
          <small>${m.direcao === 'enviada' ? `${e(Usuarios.nome(m.usuarioId) || '')} · ` : ''}${new Date(m.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}${m.direcao === 'enviada' ? ' ✓' : ''}</small>
        </div>`;
    }).join('') || `<div class="chat-inicio">Nenhuma mensagem ainda com ${e(contato.nome.split(' ')[0])}.<br>Escolha um modelo ou escreva abaixo.</div>`;
    $('chatMensagens').scrollTop = $('chatMensagens').scrollHeight;
    this.atualizarComposer();
  },

  atualizarComposer() {
    const recebida = $('chatRecebida').checked;
    $('chatEnviar').textContent = recebida ? 'Registrar ↩' : 'Enviar ➤';
    $('chatEnviar').className = `btn ${recebida ? 'btn-light' : 'btn-whatsapp'}`;
    $('chatTexto').placeholder = recebida ? 'Cole aqui a resposta que o contato enviou no WhatsApp...' : 'Escreva uma mensagem... (Enter envia, Shift+Enter quebra linha)';
  },

  ajustarAltura() {
    const t = $('chatTexto');
    t.style.height = 'auto';
    t.style.height = `${Math.min(t.scrollHeight, 160)}px`;
  },

  enviar() {
    const texto = $('chatTexto').value.trim();
    if (!texto) return;
    const contato = Contatos.buscar(this.atual.tipo, this.atual.id);
    const recebida = $('chatRecebida').checked;
    if (!recebida) {
      if (!WhatsApp.valido(contato.telefone)) return Utils.toast('Este contato não tem um telefone válido.', 'erro');
      WhatsApp.abrir(contato.telefone, texto);
    }
    Mensagens.registrar({ contatoTipo: contato.tipo, contatoId: contato.id, texto, direcao: recebida ? 'recebida' : 'enviada' });
    $('chatTexto').value = '';
    $('chatRecebida').checked = false;
    this.ajustarAltura();
    this.renderizar();
  },
};
