// ===== Tela: Equipe (somente diretor) =====
const TelaEquipe = {
  ACOES_LEADS: ['Lead cadastrado', 'Etapa alterada', 'Anotação registrada', 'Lead convertido'],

  iniciar() {
    const form = $('formUsuario');
    form.elements.funcao.innerHTML = Utils.opcoes(Object.keys(Usuarios.FUNCOES));
    $('modulosUsuario').innerHTML = Usuarios.modulosLiberaveis().map((m) =>
      `<label><input type="checkbox" name="modulos" value="${m.id}">${m.icone} ${m.nome}</label>`).join('');

    $('btnNovoUsuario').addEventListener('click', () => this.abrir());
    $('btnInstituicao').addEventListener('click', () => this.abrirInstituicao());
    $('filtroPeriodoEquipe').addEventListener('change', () => this.renderizar());

    // Ao trocar a função, marca os acessos sugeridos
    form.elements.funcao.addEventListener('change', () => this.marcarModulos(Usuarios.FUNCOES[form.elements.funcao.value]));
    form.elements.perfil.addEventListener('change', () => this.ajustarPerfil());

    const irParaAtividades = (id) => {
      $('filtroUsuarioAtividades').value = id;
      $('filtroPeriodoAtividades').value = $('filtroPeriodoEquipe').value;
      location.hash = '#atividades';
    };
    $('listaDesempenho').addEventListener('click', (e) => {
      const linha = e.target.closest('[data-usuario]');
      if (linha) irParaAtividades(linha.dataset.usuario);
    });
    $('listaUsuarios').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.acao === 'editar') this.abrir(Usuarios.buscarPorId(btn.dataset.id));
      if (btn.dataset.acao === 'atividades') irParaAtividades(btn.dataset.id);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.salvar();
    });

    // ---------- Identidade visual ----------
    $('coresSugeridas').innerHTML = this.CORES.map((c) =>
      `<button type="button" class="cor-sugerida" style="background:${c}" data-cor="${c}" title="${c}"></button>`).join('');
    $('coresSugeridas').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cor]');
      if (!btn) return;
      $('inputCor').value = btn.dataset.cor;
      this.previaCor();
    });
    $('inputCor').addEventListener('input', () => this.previaCor());
    $('inputLogo').addEventListener('change', async (e) => {
      const arquivo = e.target.files[0];
      e.target.value = '';
      if (!arquivo) return;
      try {
        this.logoTemp = await Utils.lerImagem(arquivo, 320, 'image/png');
        this.previaLogo();
      } catch (erro) {
        Utils.toast(erro.message, 'erro');
      }
    });
    $('btnRemoverLogo').addEventListener('click', () => { this.logoTemp = ''; this.previaLogo(); });
    // Cancelar volta para a cor salva
    $('modalInstituicao').addEventListener('click', (e) => {
      if (e.target === $('modalInstituicao') || e.target.closest('[data-fechar]')) Tema.aplicarCor();
    });

    $('formInstituicao').addEventListener('submit', (e) => {
      e.preventDefault();
      const dados = Utils.lerForm($('formInstituicao'));
      const media = Number(dados.mediaMinima || 7);
      const freq = Number(dados.frequenciaMinima || 75);
      if (media < 0 || media > 10) return Utils.toast('A média mínima deve ficar entre 0 e 10.', 'erro');
      if (freq < 0 || freq > 100) return Utils.toast('A frequência mínima deve ficar entre 0 e 100%.', 'erro');
      Instituicao.salvar({ ...dados, logo: this.logoTemp });
      Atividades.registrar('equipe', 'Instituição atualizada', 'Dados e identidade visual da instituição atualizados');
      App.atualizarMarca();
      Utils.fecharModal('modalInstituicao');
      Utils.toast('Dados da instituição salvos!');
    });
  },

  marcarModulos(modulos = []) {
    $('formUsuario').querySelectorAll('[name=modulos]').forEach((c) => { c.checked = modulos.includes(c.value); });
  },

  ajustarPerfil() {
    const diretor = $('formUsuario').elements.perfil.value === 'Diretor';
    $('campoModulos').hidden = diretor;
    $('formUsuario').elements.funcao.closest('label').hidden = diretor;
  },

  abrir(u = null) {
    const form = $('formUsuario');
    Utils.preencherForm(form, u || { perfil: 'Funcionário', funcao: 'Secretaria', status: 'Ativo', modulos: Usuarios.FUNCOES.Secretaria });
    form.elements.pin.value = '';
    $('removerPin').checked = false;
    $('linhaRemoverPin').hidden = !u?.pinHash;
    $('ajudaPin').textContent = u?.pinHash ? 'Deixe em branco para manter o PIN atual.' : 'Sem PIN, qualquer pessoa neste computador pode entrar com este usuário.';
    this.ajustarPerfil();
    Utils.abrirModal('modalUsuario', u ? 'Editar usuário' : 'Novo usuário');
  },

  async salvar() {
    const form = $('formUsuario');
    const dados = Utils.lerForm(form);
    dados.id = dados.id || undefined;

    const erros = Usuarios.validar(dados);
    if (dados.id && dados.id === Sessao.idAtual() && dados.status === 'Inativo') {
      erros.push({ campo: 'status', msg: 'Você não pode desativar o seu próprio usuário.' });
    }
    if (erros.length) return Utils.mostrarErros(form, erros);

    if (dados.perfil === 'Diretor') { dados.modulos = []; dados.funcao = ''; }
    if ($('removerPin').checked) dados.pinHash = '';
    else if (dados.pin) dados.pinHash = await Sessao.hash(dados.pin);
    delete dados.pin;

    const editando = Boolean(dados.id);
    const salvo = Usuarios.salvar(dados);
    Atividades.registrar('equipe', editando ? 'Usuário editado' : 'Usuário cadastrado',
      `${dados.nome} (${Usuarios.descricao(dados)})`, { refId: salvo.id });
    Utils.fecharModal('modalUsuario');
    Utils.toast(editando ? 'Usuário atualizado!' : 'Usuário cadastrado!');

    // Se o diretor tirou o próprio acesso de diretor, recarrega o menu
    if (dados.id === Sessao.idAtual()) App.aposEntrar();
    else this.renderizar();
  },

  // Cores sugeridas para a escola (todas com bom contraste com texto branco)
  CORES: ['#4f46e5', '#2563eb', '#0f766e', '#15803d', '#b45309', '#be123c', '#7e22ce', '#334155'],

  abrirInstituicao() {
    const dados = Instituicao.ler();
    Utils.preencherForm($('formInstituicao'), { ...dados, corPrimaria: dados.corPrimaria || Tema.COR_PADRAO });
    this.logoTemp = dados.logo || '';
    this.previaLogo();
    this.previaCor();
    Utils.abrirModal('modalInstituicao');
  },

  previaLogo() {
    const el = $('previewLogo');
    el.innerHTML = this.logoTemp ? `<img src="${this.logoTemp}" alt="Logo">` : Utils.escapar(Usuarios.iniciais(Instituicao.ler().nome || 'C P'));
    $('btnRemoverLogo').hidden = !this.logoTemp;
  },

  // Mostra a cor escolhida no sistema antes de salvar
  previaCor() {
    document.documentElement.style.setProperty('--primaria', $('inputCor').value);
    $('coresSugeridas').querySelectorAll('[data-cor]').forEach((b) =>
      b.classList.toggle('ativo', b.dataset.cor.toLowerCase() === $('inputCor').value.toLowerCase()));
  },

  renderizar() {
    const e = Utils.escapar;
    const periodo = Utils.periodo($('filtroPeriodoEquipe').value);
    const usuarios = Usuarios.ativos();
    const matriculas = Matriculas.listar();
    const pagos = Financeiro.listar().filter((l) => l.status === 'Pago' && Utils.noPeriodo(l.dataPagamento, periodo));

    const linhas = usuarios.map((u) => {
      const recebidos = pagos.filter((l) => l.recebidoPor === u.id);
      const ultima = Atividades.ultima(u.id);
      return {
        u,
        carteira: Leads.listar().filter((l) => l.responsavelId === u.id && Leads.emAberto(l)).length,
        contatos: Atividades.contar(u.id, this.ACOES_LEADS, periodo),
        matriculas: matriculas.filter((m) => m.criadoPor === u.id && Utils.noPeriodo(m.dataMatricula, periodo)).length,
        faturas: Atividades.contar(u.id, ['Fatura emitida'], periodo),
        pagamentos: recebidos.length,
        recebido: recebidos.reduce((s, l) => s + Number(l.valorPago || 0), 0),
        ultima,
      };
    });

    $('listaDesempenho').innerHTML = linhas.map((l) => `
      <tr class="clicavel" data-usuario="${l.u.id}" title="Ver atividades de ${e(l.u.nome)}">
        <td><div class="celula-usuario"><span class="avatar">${e(Usuarios.iniciais(l.u.nome))}</span>
          <div><strong>${e(l.u.nome)}</strong><small>${e(Usuarios.descricao(l.u))}</small></div></div></td>
        <td>${l.carteira}</td>
        <td>${l.contatos}</td>
        <td>${l.matriculas}</td>
        <td>${l.faturas}</td>
        <td>${l.pagamentos}${l.recebido ? `<small>${Utils.formatarMoeda(l.recebido)}</small>` : ''}</td>
        <td>${l.ultima ? `${e(l.ultima.acao)}<small>${Utils.formatarDataHora(l.ultima.data)}</small>` : '-'}</td>
      </tr>`).join('');

    $('listaUsuarios').innerHTML = Usuarios.listar().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map((u) => `
      <tr>
        <td><div class="celula-usuario"><span class="avatar">${e(Usuarios.iniciais(u.nome))}</span>
          <div><strong>${e(u.nome)}</strong><small>${e(u.email)}</small></div></div></td>
        <td>${e(Usuarios.descricao(u))}${u.id === Sessao.idAtual() ? '<small>(você)</small>' : ''}</td>
        <td>${u.perfil === 'Diretor' ? '<span class="texto-suave">Todos os módulos</span>'
          : Usuarios.MODULOS.filter((m) => (u.modulos || []).includes(m.id))
            .map((m) => `<span class="chip" title="${m.nome}">${m.icone} ${m.nome}</span>`).join('') || '-'}</td>
        <td>${u.pinHash ? '🔒 Sim' : '<span class="texto-suave">Não</span>'}</td>
        <td>${Utils.badge(u.status || 'Ativo')}</td>
        <td class="acoes">
          <button class="btn-icon" data-acao="atividades" data-id="${u.id}" title="Ver atividades">🕒</button>
          <button class="btn-icon" data-acao="editar" data-id="${u.id}" title="Editar">✏️</button>
        </td>
      </tr>`).join('');

    $('statEquipeAtivos').textContent = usuarios.length;
    $('statEquipeContatos').textContent = linhas.reduce((s, l) => s + l.contatos, 0);
    $('statEquipeMatriculas').textContent = matriculas.filter((m) => Utils.noPeriodo(m.dataMatricula, periodo)).length;
    $('statEquipeRecebido').textContent = Utils.formatarMoeda(pagos.reduce((s, l) => s + Number(l.valorPago || 0), 0));
  },
};
