// ===== Sessão: quem está usando o sistema agora =====
// Guardada no sessionStorage: ao abrir o site em uma nova aba/janela, pede para escolher o perfil de novo.
// Atenção: sem servidor, isto organiza o acesso mas não é uma proteção de segurança real.
const Sessao = {
  CHAVE: 'crmplus_sessao',

  usuario() {
    let id = null;
    try { id = sessionStorage.getItem(this.CHAVE); } catch { /* navegador sem sessionStorage */ }
    const u = id ? Usuarios.porId(id) : null;
    return u && u.status !== 'Inativo' ? u : null;
  },

  idAtual() {
    return this.usuario()?.id || null;
  },

  ehDiretor() {
    return this.usuario()?.perfil === 'Diretor';
  },

  ehProfessor() {
    return this.usuario()?.perfil === 'Professor';
  },

  // Id do professor logado (ou null)
  professorId() {
    return this.usuario()?.professorId || null;
  },

  pode(modulo) {
    const u = this.usuario();
    if (!u) return false;
    if (u.perfil === 'Diretor') return true;
    if (u.perfil === 'Professor') return Usuarios.MODULOS_PROFESSOR.includes(modulo);
    const info = Usuarios.MODULOS.find((m) => m.id === modulo);
    return Boolean(info && !info.somenteDiretor && (u.modulos || []).includes(modulo));
  },

  async entrar(usuario, pin = '') {
    if (usuario.pinHash && usuario.pinHash !== await this.hash(pin)) return false;
    try { sessionStorage.setItem(this.CHAVE, usuario.id); } catch { /* ignora */ }
    Atividades.registrar('sistema', 'Entrada', `${usuario.nome} entrou no sistema`, { usuarioId: usuario.id });
    return true;
  },

  sair() {
    try { sessionStorage.removeItem(this.CHAVE); } catch { /* ignora */ }
  },

  async hash(pin) {
    const dados = new TextEncoder().encode(`crmplus:${pin}`);
    const buffer = await crypto.subtle.digest('SHA-256', dados);
    return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
  },
};
