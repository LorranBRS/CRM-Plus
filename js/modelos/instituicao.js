// ===== Modelo: dados da instituição (usados em faturas, recibos e grades) =====
const Instituicao = {
  CHAVE: 'crmplus_config',

  ler() {
    try {
      return JSON.parse(localStorage.getItem(this.CHAVE)) || {};
    } catch {
      return {};
    }
  },

  salvar(dados) {
    localStorage.setItem(this.CHAVE, JSON.stringify({ ...this.ler(), ...dados }));
  },

  nome() {
    return this.ler().nome || 'Instituição de Ensino';
  },

  proximoNumeroContrato() {
    const numero = (this.ler().ultimoContrato || 0) + 1;
    this.salvar({ ultimoContrato: numero });
    return numero;
  },

  proximoNumeroDiploma() {
    const numero = (this.ler().ultimoDiploma || 0) + 1;
    this.salvar({ ultimoDiploma: numero });
    return numero;
  },

  proximoNumeroCertificado() {
    const numero = (this.ler().ultimoCertificado || 0) + 1;
    this.salvar({ ultimoCertificado: numero });
    return numero;
  },

  proximoNumeroFatura() {
    const numero = (this.ler().ultimaFatura || 0) + 1;
    this.salvar({ ultimaFatura: numero });
    return numero;
  },
};
