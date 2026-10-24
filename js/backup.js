// ===== Backup: cópias automáticas no navegador (IndexedDB) + lembrete de baixar o arquivo =====
// As cópias automáticas protegem contra erros (apagar/restaurar sem querer).
// Elas ficam no mesmo navegador: por isso o lembrete pede para baixar o arquivo para o computador.
const Backup = {
  BANCO: 'crmplus_backups',
  LOJA: 'copias',
  MAXIMO: 10,
  CHAVE_ULTIMO: 'crmplus_ultimo_backup',
  DIAS_LEMBRETE: 7,

  abrir() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('Navegador sem IndexedDB'));
      const req = indexedDB.open(this.BANCO, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(this.LOJA, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async operar(modo, fn) {
    const db = await this.abrir();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.LOJA, modo);
      const resultado = fn(tx.objectStore(this.LOJA));
      tx.oncomplete = () => { db.close(); resolve(resultado?.result ?? resultado); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  },

  // Lista as cópias (sem os dados, para ser rápido), da mais nova para a mais antiga
  async listar() {
    const todas = await this.operar('readonly', (loja) => loja.getAll());
    return todas.map(({ dados, ...resto }) => resto).sort((a, b) => b.id - a.id);
  },

  async buscar(id) {
    return this.operar('readonly', (loja) => loja.get(id));
  },

  // motivo: 'Automática (diária)', 'Antes de restaurar', 'Antes de apagar', 'Manual'
  async criarCopia(motivo = 'Manual') {
    if (Storage.estaVazio()) return null;
    const dados = Storage.exportarTudo();
    const texto = JSON.stringify(dados);
    const copia = {
      id: Date.now(), data: new Date().toISOString(), motivo, tamanho: texto.length,
      resumo: Storage.COLECOES_NEGOCIO.map((c) => `${dados.dados[c].length} ${c}`).filter((t) => !t.startsWith('0 ')).slice(0, 4).join(', '),
      usuario: Sessao.usuario()?.nome || '', dados,
    };
    await this.operar('readwrite', (loja) => loja.put(copia));
    // Mantém só as mais recentes
    const lista = await this.listar();
    const sobra = lista.slice(this.MAXIMO);
    if (sobra.length) await this.operar('readwrite', (loja) => sobra.forEach((c) => loja.delete(c.id)));
    return copia;
  },

  // Uma cópia automática por dia (chamada ao entrar no sistema e ao voltar para a aba)
  async copiaDiaria() {
    try {
      const hoje = Utils.hoje();
      const lista = await this.listar();
      if (!lista.some((c) => c.motivo.startsWith('Automática') && Utils.paraISO(new Date(c.data)) === hoje)) {
        await this.criarCopia('Automática (diária)');
      }
    } catch { /* navegador sem IndexedDB: segue sem cópias automáticas */ }
  },

  // Cópia de segurança antes de ações que substituem/apagam dados
  async antesDe(acao) {
    try { await this.criarCopia(`Antes de ${acao}`); } catch { /* ignora */ }
  },

  async restaurar(id) {
    const copia = await this.buscar(id);
    if (!copia) throw new Error('Cópia não encontrada.');
    await this.antesDe('restaurar');
    Storage.importarTudo(copia.dados);
    return copia;
  },

  // Baixa o arquivo para o computador e registra a data
  baixar(dados = Storage.exportarTudo(), nome = `crmplus_backup_${Utils.hoje()}.json`) {
    Utils.baixarArquivo(JSON.stringify(dados, null, 2), nome, 'application/json');
    try { localStorage.setItem(this.CHAVE_ULTIMO, new Date().toISOString()); } catch { /* ignora */ }
  },

  ultimoDownload() {
    try { return localStorage.getItem(this.CHAVE_ULTIMO); } catch { return null; }
  },

  diasSemDownload() {
    const ultimo = this.ultimoDownload();
    if (!ultimo) return null;
    return Math.floor((new Date(Utils.hoje()) - new Date(Utils.paraISO(new Date(ultimo)))) / 86400000);
  },

  precisaLembrar() {
    if (Storage.estaVazio()) return false;
    const dias = this.diasSemDownload();
    return dias === null || dias >= this.DIAS_LEMBRETE;
  },

  // Pede ao navegador para não apagar os dados do site quando faltar espaço
  async protegerArmazenamento() {
    try {
      if (!navigator.storage?.persist) return null;
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    } catch {
      return null;
    }
  },

  async estadoArmazenamento() {
    try {
      const persistente = navigator.storage?.persisted ? await navigator.storage.persisted() : null;
      const estimativa = navigator.storage?.estimate ? await navigator.storage.estimate() : null;
      return { persistente, usado: estimativa?.usage || 0 };
    } catch {
      return { persistente: null, usado: 0 };
    }
  },
};
