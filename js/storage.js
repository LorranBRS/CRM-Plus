// ===== Camada de dados =====
// Nesta fase os dados ficam no localStorage do navegador.
// Quando houver backend/API, basta trocar a implementação destes métodos.
const Storage = {
  ler(colecao) {
    try {
      return JSON.parse(localStorage.getItem(`crmplus_${colecao}`)) || [];
    } catch {
      return [];
    }
  },

  salvar(colecao, dados) {
    localStorage.setItem(`crmplus_${colecao}`, JSON.stringify(dados));
  },

  // Dados do negócio (apagáveis) + equipe/registro (preservados ao limpar)
  COLECOES_NEGOCIO: ['alunos', 'cursos', 'professores', 'turmas', 'matriculas', 'financeiro', 'leads',
    'frequencias', 'notas', 'mensagens', 'eventos', 'despesas', 'metas', 'documentos', 'propostas'],
  COLECOES_SISTEMA: ['usuarios', 'atividades', 'modelosMensagem'],

  get COLECOES() {
    return [...this.COLECOES_NEGOCIO, ...this.COLECOES_SISTEMA];
  },

  // Backup completo em um único objeto
  exportarTudo() {
    const dados = {};
    this.COLECOES.forEach((c) => { dados[c] = this.ler(c); });
    dados.config = JSON.parse(localStorage.getItem('crmplus_config') || '{}');
    return { sistema: 'CRM Plus', versao: 2, geradoEm: new Date().toISOString(), dados };
  },

  importarTudo(backup) {
    if (!backup || backup.sistema !== 'CRM Plus' || typeof backup.dados !== 'object') {
      throw new Error('Arquivo de backup inválido.');
    }
    this.COLECOES.forEach((c) => {
      // Backups antigos não têm usuários: mantém a equipe atual
      if (this.COLECOES_SISTEMA.includes(c) && !Array.isArray(backup.dados[c])) return;
      this.salvar(c, Array.isArray(backup.dados[c]) ? backup.dados[c] : []);
    });
    if (backup.dados.config) localStorage.setItem('crmplus_config', JSON.stringify(backup.dados.config));
  },

  // Apaga os dados do negócio; mantém usuários, registro de atividades e dados da instituição
  limparTudo() {
    this.COLECOES_NEGOCIO.forEach((c) => localStorage.removeItem(`crmplus_${c}`));
  },

  estaVazio() {
    return this.COLECOES_NEGOCIO.every((c) => !this.ler(c).length);
  },
};

// CRUD genérico reaproveitado por todos os módulos (alunos, cursos, turmas...)
function criarRepositorio(colecao) {
  return {
    listar() {
      return Storage.ler(colecao);
    },

    buscarPorId(id) {
      return this.listar().find((item) => item.id === id);
    },

    salvar(item) {
      const lista = this.listar();
      const usuarioId = typeof Sessao !== 'undefined' ? Sessao.idAtual() : null;
      if (item.id) {
        const i = lista.findIndex((x) => x.id === item.id);
        lista[i] = { ...lista[i], ...item, atualizadoEm: new Date().toISOString(), atualizadoPor: usuarioId };
        Storage.salvar(colecao, lista);
        return lista[i]; // registro completo (não só os campos alterados)
      }
      item.id = Utils.gerarId();
      item.criadoEm = item.criadoEm || new Date().toISOString();
      item.criadoPor = item.criadoPor || usuarioId; // quem cadastrou
      lista.push(item);
      Storage.salvar(colecao, lista);
      return item;
    },

    excluir(id) {
      Storage.salvar(colecao, this.listar().filter((item) => item.id !== id));
    },
  };
}
