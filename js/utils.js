// ===== Funções utilitárias (máscaras, validações, formatação) =====
const Utils = {
  somenteDigitos(valor) {
    return (valor || '').replace(/\D/g, '');
  },

  mascaraCPF(valor) {
    return Utils.somenteDigitos(valor).slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  },

  mascaraTelefone(valor) {
    const d = Utils.somenteDigitos(valor).slice(0, 11);
    if (d.length <= 10) {
      return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
    }
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
  },

  mascaraCEP(valor) {
    return Utils.somenteDigitos(valor).slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
  },

  // Validação oficial dos dígitos verificadores do CPF
  cpfValido(cpf) {
    const d = Utils.somenteDigitos(cpf);
    if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
    const calc = (base) => {
      let soma = 0;
      for (let i = 0; i < base; i++) soma += Number(d[i]) * (base + 1 - i);
      const resto = (soma * 10) % 11;
      return resto === 10 ? 0 : resto;
    };
    return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
  },

  emailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  formatarData(iso) {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('pt-BR');
  },

  // Evita injeção de HTML ao renderizar dados do usuário
  escapar(texto) {
    const div = document.createElement('div');
    div.textContent = texto ?? '';
    return div.innerHTML;
  },

  gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  toast(mensagem, tipo = '') {
    const el = document.getElementById('toast');
    el.textContent = mensagem;
    el.className = `toast visivel ${tipo}`;
    clearTimeout(Utils._toastTimer);
    Utils._toastTimer = setTimeout(() => el.classList.remove('visivel'), 2800);
  },
};
