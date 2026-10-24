// ===== Tela de entrada: escolha entre Diretor e Funcionário =====
const TelaEntrada = {
  iniciar() {
    const el = $('entradaConteudo');

    el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-acao]');
      if (!btn) return;
      const acao = btn.dataset.acao;
      if (acao === 'perfil') this.passoLista(btn.dataset.perfil);
      if (acao === 'voltar') this.passoPerfil();
      if (acao === 'demo') this.entrarDemonstracao();
      if (acao === 'usuario') {
        const u = Usuarios.porId(btn.dataset.id);
        if (u.pinHash) this.passoPin(u);
        else this.entrar(u);
      }
    });

    el.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      if (form.id === 'formPin') {
        const ok = await this.entrar(Usuarios.porId(form.dataset.id), form.elements.pin.value);
        if (!ok) {
          form.elements.pin.value = '';
          form.elements.pin.classList.add('invalido');
          form.elements.pin.focus();
          $('erroEntrada').textContent = 'PIN incorreto. Tente novamente.';
        }
      }
      if (form.id === 'formPrimeiroDiretor') this.criarPrimeiroDiretor(form);
    });
  },

  mostrar() {
    $('sistema').hidden = true;
    $('entrada').hidden = false;
    this.passoPerfil();
  },

  passoPerfil() {
    const semUsuarios = !Usuarios.listar().length;
    $('entradaConteudo').innerHTML = `
      <h2>Como você quer entrar?</h2>
      <p class="entrada-sub">Escolha o seu perfil de acesso</p>
      <div class="entrada-perfis">
        <button class="perfil-card" data-acao="perfil" data-perfil="Diretor">
          <span class="perfil-icone">👔</span>
          <strong>Diretor</strong>
          <small>Visão completa: equipe, atividades, financeiro, relatórios e configurações</small>
        </button>
        <button class="perfil-card" data-acao="perfil" data-perfil="Funcionário">
          <span class="perfil-icone">🧑‍💼</span>
          <strong>Funcionário</strong>
          <small>Acesso aos módulos liberados pela direção</small>
        </button>
        <button class="perfil-card" data-acao="perfil" data-perfil="Professor">
          <span class="perfil-icone">👨‍🏫</span>
          <strong>Professor</strong>
          <small>Minhas turmas, chamada, notas e agenda de aulas</small>
        </button>
      </div>
      ${semUsuarios ? `
        <div class="entrada-demo">
          <p>Só quer conhecer o sistema?</p>
          <button class="btn btn-light" data-acao="demo">🚀 Entrar na demonstração com dados de exemplo</button>
        </div>` : ''}`;
  },

  passoLista(perfil) {
    if (perfil === 'Diretor' && !Usuarios.doPerfil('Diretor').length) return this.passoPrimeiroDiretor();
    const lista = perfil === 'Professor'
      ? Professores.ativos().map((p) => Usuarios.porId(`prof:${p.id}`))
      : Usuarios.doPerfil(perfil);
    const e = Utils.escapar;
    const titulos = { Diretor: 'Entrar como diretor', 'Funcionário': 'Quem é você?', Professor: 'Qual professor(a) é você?' };
    const vazio = perfil === 'Professor' ? 'Nenhum professor cadastrado ainda.<br>A direção cadastra os professores no menu <strong>Professores</strong>.'
      : 'Nenhum funcionário cadastrado ainda.<br>Entre como <strong>diretor</strong> e cadastre a equipe no menu <strong>Equipe</strong>.';

    $('entradaConteudo').innerHTML = `
      <h2>${titulos[perfil]}</h2>
      <p class="entrada-sub">Selecione o seu nome</p>
      ${lista.length ? `<div class="entrada-usuarios">${lista.map((u) => `
        <button class="usuario-item" data-acao="usuario" data-id="${u.id}">
          ${App.avatar(u)}
          <span><strong>${e(u.nome)}</strong><small>${e(Usuarios.descricao(u))}</small></span>
          <span class="usuario-pin">${u.pinHash ? '🔒' : ''}</span>
        </button>`).join('')}</div>`
      : `<p class="entrada-aviso">${vazio}</p>`}
      <button class="btn btn-light btn-voltar" data-acao="voltar">← Voltar</button>`;
  },

  passoPin(u) {
    const e = Utils.escapar;
    $('entradaConteudo').innerHTML = `
      <div class="entrada-pin-usuario">
        <span class="avatar avatar-grande">${e(Usuarios.iniciais(u.nome))}</span>
        <h2>${e(u.nome)}</h2>
        <p class="entrada-sub">${e(Usuarios.descricao(u))}</p>
      </div>
      <form id="formPin" data-id="${u.id}" class="entrada-form" novalidate>
        <label>Digite seu PIN
          <input type="password" name="pin" inputmode="numeric" autocomplete="current-password" maxlength="8" autofocus>
        </label>
        <p class="texto-perigo" id="erroEntrada"></p>
        <button type="submit" class="btn btn-primary">Entrar</button>
      </form>
      <button class="btn btn-light btn-voltar" data-acao="voltar">← Voltar</button>`;
    $('formPin').elements.pin.focus();
  },

  passoPrimeiroDiretor() {
    $('entradaConteudo').innerHTML = `
      <h2>Primeiro acesso</h2>
      <p class="entrada-sub">Cadastre o diretor responsável pelo sistema</p>
      <form id="formPrimeiroDiretor" class="entrada-form" novalidate>
        <label>Seu nome
          <input type="text" name="nome" maxlength="80" autofocus>
        </label>
        <label>PIN de acesso (opcional, 4 a 8 números)
          <input type="password" name="pin" inputmode="numeric" autocomplete="new-password" maxlength="8">
        </label>
        <label>Confirme o PIN
          <input type="password" name="pin2" inputmode="numeric" autocomplete="new-password" maxlength="8">
        </label>
        <p class="texto-perigo" id="erroEntrada"></p>
        <button type="submit" class="btn btn-primary">Criar e entrar</button>
      </form>
      <button class="btn btn-light btn-voltar" data-acao="voltar">← Voltar</button>`;
    $('formPrimeiroDiretor').elements.nome.focus();
  },

  async criarPrimeiroDiretor(form) {
    const nome = form.elements.nome.value.trim();
    const pin = form.elements.pin.value.trim();
    const erro = (msg, campo) => {
      $('erroEntrada').textContent = msg;
      form.elements[campo].classList.add('invalido');
      form.elements[campo].focus();
    };
    form.querySelectorAll('.invalido').forEach((el) => el.classList.remove('invalido'));
    if (nome.length < 2) return erro('Informe o seu nome.', 'nome');
    if (pin && !/^\d{4,8}$/.test(pin)) return erro('O PIN deve ter de 4 a 8 números.', 'pin');
    if (pin !== form.elements.pin2.value.trim()) return erro('Os PINs não conferem.', 'pin2');

    const u = Usuarios.salvar({
      nome, perfil: 'Diretor', funcao: '', email: '', modulos: [], status: 'Ativo',
      pinHash: pin ? await Sessao.hash(pin) : '',
    });
    Atividades.registrar('equipe', 'Usuário cadastrado', `${nome} (Diretor) – primeiro acesso`, { usuarioId: u.id, refId: u.id });
    this.entrar(u, pin);
  },

  async entrar(u, pin = '') {
    const ok = await Sessao.entrar(u, pin);
    if (ok) App.aposEntrar();
    return ok;
  },

  async entrarDemonstracao() {
    const u = Usuarios.salvar({
      nome: 'Diretor(a) Demonstração', perfil: 'Diretor', funcao: '', email: '', modulos: [], status: 'Ativo', pinHash: '',
    });
    await Sessao.entrar(u);
    Exemplos.carregar(false);
    history.replaceState(null, '', '#painel');
    App.aposEntrar();
  },
};
