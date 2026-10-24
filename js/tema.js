// ===== Tema (claro/escuro) e marca da escola (cor e logo) =====
// Carregado no <head> para aplicar o tema antes da página aparecer (evita "piscar").
const Tema = {
  CHAVE: 'crmplus_tema',
  COR_PADRAO: '#4f46e5',

  preferido() {
    try { return localStorage.getItem(this.CHAVE); } catch { return null; }
  },

  sistema() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
  },

  atual() {
    return document.documentElement.dataset.tema;
  },

  aplicar(tema) {
    document.documentElement.dataset.tema = tema;
  },

  alternar() {
    const novo = this.atual() === 'escuro' ? 'claro' : 'escuro';
    try { localStorage.setItem(this.CHAVE, novo); } catch { /* ignora */ }
    this.aplicar(novo);
    return novo;
  },

  config() {
    try { return JSON.parse(localStorage.getItem('crmplus_config')) || {}; } catch { return {}; }
  },

  // Aplica a cor principal da escola em todo o sistema
  aplicarCor() {
    const cor = this.config().corPrimaria;
    if (cor && /^#[0-9a-f]{6}$/i.test(cor)) document.documentElement.style.setProperty('--primaria', cor);
    else document.documentElement.style.removeProperty('--primaria');
  },

  iniciar() {
    this.aplicar(this.preferido() || this.sistema());
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (!this.preferido()) this.aplicar(this.sistema());
    });
    this.aplicarCor();
  },
};

Tema.iniciar();
