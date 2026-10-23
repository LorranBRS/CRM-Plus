// ===== Aplicação: navegação entre telas e eventos globais =====
const App = {
  TELAS: {
    painel: { tela: TelaPainel, titulo: 'Painel' },
    leads: { tela: TelaLeads, titulo: 'Leads' },
    alunos: { tela: TelaAlunos, titulo: 'Alunos' },
    cursos: { tela: TelaCursos, titulo: 'Cursos' },
    turmas: { tela: TelaTurmas, titulo: 'Turmas' },
    matriculas: { tela: TelaMatriculas, titulo: 'Matrículas' },
    financeiro: { tela: TelaFinanceiro, titulo: 'Financeiro' },
    relatorios: { tela: TelaRelatorios, titulo: 'Relatórios' },
  },

  iniciar() {
    Object.values(this.TELAS).forEach(({ tela }) => tela.iniciar());
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

    window.addEventListener('hashchange', () => this.navegar());
    this.navegar();
  },

  telaAtual() {
    const nome = location.hash.slice(1);
    return this.TELAS[nome] ? nome : 'painel';
  },

  // Rota pelo hash da URL: #painel, #leads, #alunos, ...
  navegar() {
    const atual = this.telaAtual();
    document.querySelectorAll('.tela').forEach((s) => { s.hidden = s.dataset.tela !== atual; });
    document.querySelectorAll('.menu-item[data-tela]').forEach((a) =>
      a.classList.toggle('active', a.dataset.tela === atual));
    document.title = `${this.TELAS[atual].titulo} – CRM Plus`;
    $('sidebar').classList.remove('aberta');
    $('btnExemplos').hidden = !Storage.estaVazio();
    window.scrollTo(0, 0);

    this.TELAS[atual].tela.renderizar();
  },

  renderizarAtual() {
    $('btnExemplos').hidden = !Storage.estaVazio();
    this.TELAS[this.telaAtual()].tela.renderizar();
  },

  estadoVazio(id, qtdFiltrada, qtdTotal, msgVazio, msgFiltro) {
    const el = $(id);
    el.style.display = qtdFiltrada ? 'none' : 'block';
    el.querySelector('p').textContent = qtdTotal ? msgFiltro : msgVazio;
  },
};

App.iniciar();
