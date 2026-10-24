// ===== Modelo: Atividades (registro de tudo o que a equipe faz) =====
const Atividades = {
  COLECAO: 'atividades',
  LIMITE: 5000, // guarda as mais recentes para não lotar o navegador

  listar() {
    return Storage.ler(this.COLECAO);
  },

  // opcoes: { refId, usuarioId, data } (usuarioId/data são usados pelos dados de exemplo)
  registrar(modulo, acao, descricao, opcoes = {}) {
    const usuarioId = opcoes.usuarioId || Sessao.idAtual();
    const usuario = usuarioId ? Usuarios.porId(usuarioId) : null;
    const lista = this.listar();
    lista.push({
      id: Utils.gerarId(),
      data: opcoes.data || new Date().toISOString(),
      usuarioId,
      usuarioNome: usuario?.nome || 'Sistema',
      modulo,
      acao,
      descricao,
      refId: opcoes.refId || null,
    });
    lista.sort((a, b) => a.data.localeCompare(b.data));
    Storage.salvar(this.COLECAO, lista.slice(-this.LIMITE));
  },

  // periodo: { de, ate } em "AAAA-MM-DD" (ambos opcionais)
  filtrar({ termo, usuarioId, modulo, periodo } = {}) {
    const t = (termo || '').toLowerCase().trim();
    return this.listar()
      .filter((a) => !usuarioId || a.usuarioId === usuarioId)
      .filter((a) => !modulo || a.modulo === modulo)
      .filter((a) => Utils.noPeriodo(a.data, periodo))
      .filter((a) => !t || [a.usuarioNome, a.acao, a.descricao].some((v) => (v || '').toLowerCase().includes(t)))
      .sort((a, b) => b.data.localeCompare(a.data));
  },

  contar(usuarioId, acoes, periodo) {
    return this.listar().filter((a) => a.usuarioId === usuarioId && acoes.includes(a.acao) &&
      Utils.noPeriodo(a.data, periodo)).length;
  },

  ultima(usuarioId) {
    const lista = this.listar().filter((a) => a.usuarioId === usuarioId && a.acao !== 'Entrada');
    return lista[lista.length - 1] || null;
  },
};
