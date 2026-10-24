// ===== Registro de documentos emitidos (para verificação) e PIX =====
const Registros = {
  ...criarRepositorio('documentos'),

  TIPOS: {
    contrato: 'Contrato de prestação de serviços',
    certificado: 'Certificado de conclusão',
    diploma: 'Diploma de conclusão',
    'decl-matricula': 'Declaração de matrícula',
    'decl-frequencia': 'Declaração de frequência',
    'decl-conclusao': 'Declaração de conclusão',
  },

  // Código aleatório para declarações: DC-2026-K7Q3ZP
  novoCodigo(prefixo) {
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const aleatorio = Array.from(crypto.getRandomValues(new Uint8Array(6)), (n) => letras[n % letras.length]).join('');
    return `${prefixo}-${new Date().getFullYear()}-${aleatorio}`;
  },

  // Guarda um resumo do documento (a página de verificação não depende dos outros cadastros)
  registrar({ codigo, tipo, matricula, detalhes = '' }) {
    const existente = this.listar().find((r) => r.codigo === codigo);
    if (existente) return existente;
    const aluno = Alunos.buscarPorId(matricula.alunoId);
    const turma = Turmas.buscarPorId(matricula.turmaId);
    const curso = turma && Cursos.buscarPorId(turma.cursoId);
    return this.salvar({
      codigo, tipo, matriculaId: matricula.id, alunoId: aluno?.id,
      alunoNome: aluno?.nome || '', alunoCpf: aluno?.cpf ? `***.${aluno.cpf.slice(4, 11)}-**` : '',
      curso: curso?.nome || '', cargaHoraria: curso?.cargaHoraria || '', turma: turma?.codigo || '',
      detalhes, emitidoEm: new Date().toISOString(), emitidoPorNome: Sessao.usuario()?.nome || '',
      escola: Instituicao.ler().nome || '', situacao: 'Válido',
    });
  },

  buscar(codigo) {
    return this.listar().find((r) => r.codigo.toUpperCase() === String(codigo || '').trim().toUpperCase());
  },

  urlVerificacao(codigo) {
    return new URL(`verificar.html?codigo=${encodeURIComponent(codigo)}`, location.href).href;
  },
};

// QR Code (biblioteca qrcode-generator, carregada pelo CDN; sem internet, o QR é omitido)
const QR = {
  disponivel() {
    return typeof window.qrcode === 'function';
  },

  // Retorna um <img> com o QR Code, ou '' se a biblioteca não carregou
  imagem(texto, { tamanho = 120, classe = '' } = {}) {
    if (!this.disponivel()) return '';
    const qr = window.qrcode(0, 'M');
    qr.addData(texto, 'Byte');
    qr.make();
    const celula = Math.max(2, Math.floor(tamanho / (qr.getModuleCount() + 8)));
    return `<img class="qr ${classe}" src="${qr.createDataURL(celula, celula * 4)}" alt="QR Code" width="${tamanho}" height="${tamanho}">`;
  },
};

// PIX "copia e cola" (BR Code estático do Banco Central)
const Pix = {
  semAcento(texto) {
    return (texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 .\-@]/g, '').trim();
  },

  // Normaliza a chave: telefone → +55..., CPF/CNPJ → só números, e-mail → minúsculas
  normalizarChave(chave) {
    const c = (chave || '').trim();
    if (c.includes('@')) return c.toLowerCase();
    const digitos = Utils.somenteDigitos(c);
    if (/^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/.test(c) || (c.startsWith('+') && digitos.length >= 12)) {
      return `+${digitos.length <= 11 ? `55${digitos}` : digitos}`;
    }
    if (/^[\d.\-/]+$/.test(c) && (digitos.length === 11 || digitos.length === 14)) return digitos;
    return c; // chave aleatória
  },

  crc16(texto) {
    let crc = 0xffff;
    for (let i = 0; i < texto.length; i++) {
      crc ^= texto.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  },

  campo(id, valor) {
    return `${id}${String(valor.length).padStart(2, '0')}${valor}`;
  },

  // Monta o código "copia e cola" ou null se não houver chave cadastrada
  copiaECola({ valor, txid } = {}) {
    const i = Instituicao.ler();
    if (!i.chavePix) return null;
    const cidade = this.semAcento((i.foro || (i.endereco || '').split('–').pop() || 'BRASIL').split('/')[0]).toUpperCase().slice(0, 15) || 'BRASIL';
    const nome = this.semAcento(i.nome || 'ESCOLA').toUpperCase().slice(0, 25);
    const id = (this.semAcento(txid || '***').replace(/[^A-Za-z0-9]/g, '') || '***').slice(0, 25);
    const conta = this.campo('00', 'br.gov.bcb.pix') + this.campo('01', this.normalizarChave(i.chavePix));
    const corpo = this.campo('00', '01') + this.campo('26', conta) + this.campo('52', '0000') + this.campo('53', '986') +
      (valor ? this.campo('54', Number(valor).toFixed(2)) : '') + this.campo('58', 'BR') + this.campo('59', nome) +
      this.campo('60', cidade) + this.campo('62', this.campo('05', id)) + '6304';
    return corpo + this.crc16(corpo);
  },
};
