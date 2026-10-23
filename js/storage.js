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
      if (item.id) {
        const i = lista.findIndex((x) => x.id === item.id);
        lista[i] = { ...lista[i], ...item, atualizadoEm: new Date().toISOString() };
      } else {
        item.id = Utils.gerarId();
        item.criadoEm = new Date().toISOString();
        lista.push(item);
      }
      Storage.salvar(colecao, lista);
      return item;
    },

    excluir(id) {
      Storage.salvar(colecao, this.listar().filter((item) => item.id !== id));
    },
  };
}
