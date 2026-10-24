// ===== Tela: Atividades (linha do tempo da equipe – somente diretor) =====
const TelaAtividades = {
  POR_PAGINA: 100,
  limite: 100,

  ICONES: {
    leads: '🎯', alunos: '👩‍🎓', cursos: '📚', professores: '👨‍🏫', turmas: '🏫',
    matriculas: '📝', financeiro: '💰', academico: '🎓', conversas: '💬', relatorios: '📊', equipe: '👥', sistema: '🔑',
  },

  iniciar() {
    $('filtroModuloAtividades').innerHTML = Utils.opcoes(
      [...Usuarios.MODULOS.filter((m) => !['painel', 'atividades'].includes(m.id)), { id: 'sistema', nome: 'Entradas no sistema' }],
      { valor: (m) => m.id, texto: (m) => m.nome, vazio: 'Todos os módulos' });

    ['buscaAtividades', 'filtroUsuarioAtividades', 'filtroModuloAtividades', 'filtroPeriodoAtividades'].forEach((id) =>
      $(id).addEventListener(id === 'buscaAtividades' ? 'input' : 'change', () => { this.limite = this.POR_PAGINA; this.renderizar(); }));

    $('btnMaisAtividades').addEventListener('click', () => { this.limite += this.POR_PAGINA; this.renderizar(); });

    $('btnExportarAtividades').addEventListener('click', () => {
      const lista = this.listaFiltrada();
      if (!lista.length) return Utils.toast('Nada para exportar.', 'erro');
      Utils.baixarCSV(lista, [
        ['Data', (a) => Utils.formatarDataHora(a.data)], ['Usuário', (a) => a.usuarioNome],
        ['Módulo', (a) => a.modulo], ['Ação', (a) => a.acao], ['Descrição', (a) => a.descricao],
      ], 'atividades');
    });
  },

  listaFiltrada() {
    return Atividades.filtrar({
      termo: $('buscaAtividades').value,
      usuarioId: $('filtroUsuarioAtividades').value,
      modulo: $('filtroModuloAtividades').value,
      periodo: Utils.periodo($('filtroPeriodoAtividades').value),
    });
  },

  // Também usado pelo Painel (versão compacta)
  itens(lista) {
    const e = Utils.escapar;
    return lista.map((a) => `
      <li>
        <span class="avatar" title="${e(a.usuarioNome)}">${e(Usuarios.iniciais(a.usuarioNome))}</span>
        <div>
          <p><strong>${e(a.usuarioNome)}</strong> · <span class="acao-atividade">${this.ICONES[a.modulo] || '•'} ${e(a.acao)}</span></p>
          <p class="descricao-atividade">${e(a.descricao)}</p>
        </div>
        <time>${new Date(a.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>
      </li>`).join('');
  },

  renderizar() {
    const sel = $('filtroUsuarioAtividades');
    const atual = sel.value;
    sel.innerHTML = Utils.opcoes([...Usuarios.listar()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      { valor: (u) => u.id, texto: (u) => u.nome, vazio: 'Toda a equipe' });
    sel.value = atual;
    if (sel.selectedIndex < 0) sel.value = '';

    const lista = this.listaFiltrada();
    const visiveis = lista.slice(0, this.limite);

    // Agrupa por dia
    const grupos = {};
    visiveis.forEach((a) => { (grupos[Utils.paraISO(new Date(a.data))] ||= []).push(a); });
    const hoje = Utils.hoje();
    const ontem = Utils.somarDias(hoje, -1);

    $('listaAtividades').innerHTML = Object.entries(grupos).map(([dia, itens]) => `
      <h4 class="timeline-dia">${dia === hoje ? 'Hoje' : dia === ontem ? 'Ontem'
        : new Date(`${dia}T12:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</h4>
      <ul class="timeline">${this.itens(itens)}</ul>`).join('') ||
      '<p class="graf-vazio">Nenhuma atividade encontrada com esses filtros.</p>';

    $('totalAtividades').textContent = `${lista.length} atividade(s) encontrada(s)`;
    $('btnMaisAtividades').hidden = lista.length <= this.limite;
  },
};
