// ===== Aplicação: navegação entre telas e eventos globais =====
const App = {
  TELAS: {
    alunos: { tela: TelaAlunos, titulo: 'Alunos' },
    cursos: { tela: TelaCursos, titulo: 'Cursos' },
    turmas: { tela: TelaTurmas, titulo: 'Turmas' },
  },

  iniciar() {
    Object.values(this.TELAS).forEach(({ tela }) => tela.iniciar());

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

  // Rota pelo hash da URL: #alunos, #cursos, #turmas
  navegar() {
    const nome = location.hash.slice(1);
    const atual = this.TELAS[nome] ? nome : 'alunos';

    document.querySelectorAll('.tela').forEach((s) => { s.hidden = s.dataset.tela !== atual; });
    document.querySelectorAll('.menu-item[data-tela]').forEach((a) =>
      a.classList.toggle('active', a.dataset.tela === atual));
    document.title = `${this.TELAS[atual].titulo} – CRM Plus`;
    $('sidebar').classList.remove('aberta');

    this.TELAS[atual].tela.renderizar();
  },

  estadoVazio(id, qtdFiltrada, qtdTotal, msgVazio, msgFiltro) {
    const el = $(id);
    el.style.display = qtdFiltrada ? 'none' : 'block';
    el.querySelector('p').textContent = qtdTotal ? msgFiltro : msgVazio;
  },
};

App.iniciar();
