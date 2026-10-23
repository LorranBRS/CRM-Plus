// ===== Aplicação: entrada, permissões, navegação e eventos globais =====
const App = {
  TELAS: {
    painel: TelaPainel,
    leads: TelaLeads,
    alunos: TelaAlunos,
    cursos: TelaCursos,
    professores: TelaProfessores,
    turmas: TelaTurmas,
    matriculas: TelaMatriculas,
    financeiro: TelaFinanceiro,
    relatorios: TelaRelatorios,
    equipe: TelaEquipe,
    atividades: TelaAtividades,
  },

  iniciar() {
    TelaEntrada.iniciar();
    Object.values(this.TELAS).forEach((tela) => tela.iniciar());
    Graficos.iniciarDicas();

    // Fechar modais: botões [data-fechar], clique fora e tecla Esc
    document.querySelectorAll('.modal').forEach((modal) => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.closest('[data-fechar]')) modal.classList.remove('aberto');
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') document.querySelectorAll('.modal.aberto').forEach((m) => m.classList.remove('aberto'));
    });

    // Menu lateral no celular
    document.querySelectorAll('.btn-menu').forEach((btn) =>
      btn.addEventListener('click', () => $('sidebar').classList.toggle('aberta')));

    $('btnExemplos').addEventListener('click', () => Exemplos.carregar());
    $('btnTrocarUsuario').addEventListener('click', () => {
      Sessao.sair();
      TelaEntrada.mostrar();
    });
    $('btnImprimirVisualizar').addEventListener('click', () => {
      if (this.imprimirVisualizar) this.imprimirVisualizar();
    });

    window.addEventListener('hashchange', () => { if (Sessao.usuario()) this.navegar(); });
    this.iniciarSessao();
  },

  iniciarSessao() {
    if (Sessao.usuario()) this.aposEntrar();
    else TelaEntrada.mostrar();
  },

  // Monta o sistema para o usuário que acabou de entrar
  aposEntrar() {
    const u = Sessao.usuario();
    if (!u) return TelaEntrada.mostrar();

    $('entrada').hidden = true;
    $('sistema').hidden = false;
    $('usuarioAvatar').textContent = Usuarios.iniciais(u.nome);
    $('usuarioNome').textContent = u.nome;
    $('usuarioPerfil').textContent = Usuarios.descricao(u);
    document.body.classList.toggle('perfil-diretor', u.perfil === 'Diretor');

    $('menu').innerHTML = Usuarios.MODULOS.filter((m) => Sessao.pode(m.id)).map((m) =>
      `<a href="#${m.id}" class="menu-item" data-tela="${m.id}">${m.icone} ${m.nome}</a>`).join('');

    this.aplicarPermissoes();
    this.navegar();
  },

  // Esconde blocos de módulos não liberados e áreas exclusivas do diretor
  aplicarPermissoes() {
    document.querySelectorAll('[data-modulo]').forEach((el) => { el.hidden = !Sessao.pode(el.dataset.modulo); });
    document.querySelectorAll('[data-somente-diretor]').forEach((el) => { el.hidden = !Sessao.ehDiretor(); });
  },

  telaAtual() {
    const nome = location.hash.slice(1);
    if (this.TELAS[nome] && Sessao.pode(nome)) return nome;
    return Usuarios.MODULOS.find((m) => Sessao.pode(m.id))?.id || 'painel';
  },

  // Rota pelo hash da URL: #painel, #leads, #alunos, ...
  navegar() {
    const atual = this.telaAtual();
    if (location.hash.slice(1) !== atual) history.replaceState(null, '', `#${atual}`);

    document.querySelectorAll('.tela').forEach((s) => { s.hidden = s.dataset.tela !== atual; });
    document.querySelectorAll('.menu-item[data-tela]').forEach((a) =>
      a.classList.toggle('active', a.dataset.tela === atual));
    document.title = `${Usuarios.MODULOS.find((m) => m.id === atual).nome} – CRM Plus`;
    $('sidebar').classList.remove('aberta');
    $('btnExemplos').hidden = !Sessao.ehDiretor() || !Storage.estaVazio();
    window.scrollTo(0, 0);

    this.TELAS[atual].renderizar();
  },

  renderizarAtual() {
    $('btnExemplos').hidden = !Sessao.ehDiretor() || !Storage.estaVazio();
    this.TELAS[this.telaAtual()].renderizar();
  },

  // Janela de visualização (agenda do professor, grade do curso...)
  visualizar(titulo, corpo, imprimir) {
    $('visualizarCorpo').innerHTML = corpo;
    this.imprimirVisualizar = imprimir || (() => Utils.imprimir(titulo,
      `${Documentos.cabecalho(titulo)}${$('visualizarCorpo').innerHTML}`));
    Utils.abrirModal('modalVisualizar', titulo);
  },

  estadoVazio(id, qtdFiltrada, qtdTotal, msgVazio, msgFiltro) {
    const el = $(id);
    el.style.display = qtdFiltrada ? 'none' : 'block';
    el.querySelector('p').textContent = qtdTotal ? msgFiltro : msgVazio;
  },
};

App.iniciar();
