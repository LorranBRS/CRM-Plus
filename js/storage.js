// ===== Camada de dados =====
// Nesta primeira etapa os dados ficam no localStorage do navegador.
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
