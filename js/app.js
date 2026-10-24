// ===== Aplicação: entrada, permissões, navegação e eventos globais =====
const App = {
  TELAS: {
    painel: TelaPainel,
    agenda: TelaCalendario,
    leads: TelaLeads,
    conversas: TelaConversas,
    alunos: TelaAlunos,
    cursos: TelaCursos,
    professores: TelaProfessores,
    turmas: TelaTurmas,
    academico: TelaAcademico,
    matriculas: TelaMatriculas,
    financeiro: TelaFinanceiro,
    relatorios: TelaRelatorios,
    metas: TelaMetas,
    equipe: TelaEquipe,
    atividades: TelaAtividades,
  },

  iniciar() {
    TelaEntrada.iniciar();
    Mensageiro.iniciar();
    FichaAluno.iniciar();
    Object.values(this.TELAS).forEach((tela) => tela.iniciar());
    Graficos.iniciarDicas();
    this.atualizarMarca();

    // Modo claro/escuro
    document.querySelectorAll('[data-alternar-tema]').forEach((btn) =>
      btn.addEventListener('click', () => { Tema.alternar(); this.atualizarBotoesTema(); }));
    this.atualizarBotoesTema();

    // Fechar modais: botões [data-fechar], clique fora e tecla Esc
    document.querySelectorAll('.modal').forEach((modal) => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.closest('[data-fechar]')) modal.classList.remove('aberto');
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      document.querySelectorAll('.modal.aberto').forEach((m) => m.classList.remove('aberto'));
      Tema.aplicarCor(); // desfaz a prévia de cor não salva
    });

    // Menu lateral no celular
    document.querySelectorAll('.btn-menu').forEach((btn) =>
      btn.addEventListener('click', () => $('sidebar').classList.toggle('aberta')));

    $('btnExemplos').addEventListener('click', () => Exemplos.carregar());
    $('btnTrocarUsuario').addEventListener('click', () => {
      Sessao.sair();
      TelaEntrada.mostrar();
    });
    $('btnPdfDocumento').addEventListener('click', () => {
      const d = this.docAtual;
      Utils.gerarPDF(d.arquivo || d.titulo, d.corpo, { classe: d.classe, orientacao: d.orientacao }).catch(() => {});
    });
    $('btnImprimirDocumento').addEventListener('click', () => {
      const d = this.docAtual;
      Utils.imprimir(d.titulo, d.corpo, d.classe);
    });
    $('btnImprimirVisualizar').addEventListener('click', () => {
      if (this.imprimirVisualizar) this.imprimirVisualizar();
    });

    window.addEventListener('hashchange', () => { if (Sessao.usuario()) this.navegar(); });
    window.addEventListener('resize', () => { if ($('modalDocumento').classList.contains('aberto')) this.ajustarPrevia(); });
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
    this.atualizarMarca();
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
    document.querySelectorAll('[data-nao-professor]').forEach((el) => { el.hidden = Sessao.ehProfessor(); });
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

  atualizarBotoesTema() {
    const escuro = Tema.atual() === 'escuro';
    document.querySelectorAll('[data-alternar-tema]').forEach((btn) => {
      btn.textContent = btn.classList.contains('btn-tema-entrada') ? (escuro ? '☀️' : '🌙') : (escuro ? '☀️ Modo claro' : '🌙 Modo escuro');
    });
  },

  // Logo, nome e cor da escola no menu e na tela de entrada
  atualizarMarca() {
    const i = Instituicao.ler();
    Tema.aplicarCor();
    document.querySelectorAll('[data-marca-logo]').forEach((el) => {
      el.classList.toggle('com-logo', Boolean(i.logo));
      el.innerHTML = i.logo ? `<img src="${i.logo}" alt="">` : Utils.escapar(Usuarios.iniciais(i.nome || 'C P'));
    });
    document.querySelectorAll('[data-marca-nome]').forEach((el) => { el.textContent = i.nome || 'CRM Plus'; });
    document.querySelectorAll('[data-marca-sub]').forEach((el) => { el.textContent = i.nome ? 'CRM Plus · Gestão Educacional' : 'Gestão Educacional'; });
  },

  // Avatar com foto (se houver) ou iniciais
  avatar(pessoa, classe = '', id = '') {
    const e = Utils.escapar;
    return `<span class="avatar ${classe} ${pessoa?.foto ? 'com-foto' : ''}" ${id ? `id="${id}"` : ''} title="${e(pessoa?.nome || '')}">${
      pessoa?.foto ? `<img src="${pessoa.foto}" alt="">` : e(Usuarios.iniciais(pessoa?.nome))}</span>`;
  },

  // Prévia de documento (contrato, diploma, certificado) com "Baixar PDF" e "Imprimir"
  // opcoes: { classe, orientacao: 'portrait'|'landscape', arquivo, dica }
  documento(titulo, corpo, opcoes = {}) {
    this.docAtual = { titulo, corpo, ...opcoes };
    const largura = opcoes.orientacao === 'landscape' ? 1123 : 794;
    const cor = Instituicao.ler().corPrimaria || Tema.COR_PADRAO;
    $('documentoPrevia').innerHTML = '<div class="documento-escala" id="documentoEscala"><iframe id="documentoFrame" title="Prévia do documento"></iframe></div>';
    const frame = $('documentoFrame');
    frame.style.width = `${largura}px`;
    frame.srcdoc = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
      <link rel="stylesheet" href="${new URL('css/impressao.css', location.href)}"></head>
      <body class="previa ${opcoes.classe || ''}" style="--cor:${cor}">${corpo}</body></html>`;
    this.larguraPrevia = largura;
    frame.onload = () => this.ajustarPrevia();
    $('documentoDica').textContent = opcoes.dica || '';
    Utils.abrirModal('modalDocumento', titulo);
    requestAnimationFrame(() => this.ajustarPrevia());
  },

  ajustarPrevia() {
    const frame = $('documentoFrame');
    const largura = this.larguraPrevia;
    const disponivel = $('documentoPrevia').clientWidth - 24;
    if (!frame?.contentDocument?.body || disponivel <= 0) return;
    const altura = frame.contentDocument.documentElement.scrollHeight;
    const escala = Math.min(1, disponivel / largura);
    frame.style.height = `${altura}px`;
    frame.style.transform = `scale(${escala})`;
    $('documentoEscala').style.width = `${largura * escala}px`;
    $('documentoEscala').style.height = `${altura * escala}px`;
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
