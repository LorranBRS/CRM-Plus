// ===== Mensagens (histórico das conversas) e modelos de mensagem =====

// Abre o WhatsApp (Web no computador / aplicativo no celular) com o texto pronto
const WhatsApp = {
  numero(telefone) {
    const d = Utils.somenteDigitos(telefone);
    return d.length === 10 || d.length === 11 ? `55${d}` : d;
  },

  valido(telefone) {
    return Utils.somenteDigitos(telefone).length >= 10;
  },

  abrir(telefone, texto) {
    window.open(`https://wa.me/${this.numero(telefone)}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  },
};

// Contatos de todas as origens (alunos, leads e professores) num formato único
const Contatos = {
  TIPOS: {
    aluno: { nome: 'Aluno', icone: '👩‍🎓', modulo: 'alunos', repo: () => Alunos },
    lead: { nome: 'Lead', icone: '🎯', modulo: 'leads', repo: () => Leads },
    professor: { nome: 'Professor', icone: '👨‍🏫', modulo: 'professores', repo: () => Professores },
  },

  montar(tipo, item) {
    if (!item) return null;
    let detalhe = '';
    if (tipo === 'aluno') detalhe = item.curso || item.status;
    if (tipo === 'lead') detalhe = [item.etapa, Leads.nomeCurso(item)].filter(Boolean).join(' · ');
    if (tipo === 'professor') detalhe = item.especialidades || 'Professor';
    return { tipo, id: item.id, nome: item.nome, telefone: item.telefone, foto: item.foto || '', detalhe, item };
  },

  buscar(tipo, id) {
    return this.montar(tipo, this.TIPOS[tipo]?.repo().buscarPorId(id));
  },

  // Somente os tipos que o usuário pode ver
  listar(tipos = Object.keys(this.TIPOS)) {
    return tipos.filter((t) => Sessao.pode(this.TIPOS[t].modulo) || t === 'aluno')
      .flatMap((t) => this.TIPOS[t].repo().listar()
        // Leads que já viraram alunos aparecem só como aluno
        .filter((x) => t !== 'lead' || Leads.emAberto(x) || (x.etapa === 'Matriculado' && !x.alunoId))
        .map((x) => this.montar(t, x)));
  },
};

const Mensagens = {
  ...criarRepositorio('mensagens'),

  // direcao: 'enviada' (escola → contato) ou 'recebida' (contato → escola, registrada manualmente)
  registrar({ contatoTipo, contatoId, texto, direcao = 'enviada', data, usuarioId }) {
    const contato = Contatos.buscar(contatoTipo, contatoId);
    const msg = this.salvar({
      contatoTipo, contatoId, texto, direcao, canal: 'WhatsApp',
      data: data || new Date().toISOString(), usuarioId: usuarioId || Sessao.idAtual(),
      criadoPor: usuarioId || Sessao.idAtual(),
    });
    Atividades.registrar('conversas', direcao === 'enviada' ? 'Mensagem enviada' : 'Resposta registrada',
      `${contato?.nome || 'Contato'}: ${texto.length > 90 ? `${texto.slice(0, 90)}…` : texto}`,
      { refId: contatoId, usuarioId: usuarioId || undefined, data });
    return msg;
  },

  doContato(tipo, id) {
    return this.listar().filter((m) => m.contatoTipo === tipo && m.contatoId === id)
      .sort((a, b) => a.data.localeCompare(b.data));
  },

  // Última mensagem de cada contato: { "aluno:id": mensagem }
  ultimas() {
    const mapa = {};
    this.listar().forEach((m) => {
      const chave = `${m.contatoTipo}:${m.contatoId}`;
      if (!mapa[chave] || mapa[chave].data < m.data) mapa[chave] = m;
    });
    return mapa;
  },
};

const ModelosMensagem = {
  ...criarRepositorio('modelosMensagem'),

  CATEGORIAS: ['Acadêmico', 'Financeiro', 'Comercial', 'Geral'],

  VARIAVEIS: {
    nome: 'Nome completo', primeiro_nome: 'Primeiro nome', escola: 'Nome da escola', atendente: 'Seu nome',
    curso: 'Curso', turma: 'Turma', horario: 'Dias e horário', professor: 'Professor(a)',
    descricao: 'Descrição da cobrança', valor: 'Valor', vencimento: 'Vencimento', pix: 'Chave PIX',
    frequencia: 'Frequência', media: 'Média',
  },

  PADROES: [
    { nome: 'Boas-vindas', categoria: 'Acadêmico', texto: 'Olá, {primeiro_nome}! 🎉 Seja muito bem-vindo(a) ao curso {curso} da {escola}. Suas aulas na turma {turma} serão {horario}, com {professor}. Qualquer dúvida, é só chamar por aqui!' },
    { nome: 'Lembrete de aula', categoria: 'Acadêmico', texto: 'Oi, {primeiro_nome}! Passando para lembrar da sua aula de {curso} ({turma}) – {horario}. Te esperamos! 📚' },
    { nome: 'Aviso de faltas', categoria: 'Acadêmico', texto: 'Olá, {primeiro_nome}! Sentimos sua falta nas aulas de {curso}. Sua frequência está em {frequencia} e o mínimo exigido é 75%. Está tudo bem? Podemos ajudar em algo?' },
    { nome: 'Certificado disponível', categoria: 'Acadêmico', texto: 'Parabéns, {primeiro_nome}! 🎓 Você concluiu o curso {curso} e o seu certificado já está disponível na secretaria da {escola}.' },
    { nome: 'Mensalidade a vencer', categoria: 'Financeiro', texto: 'Olá, {primeiro_nome}! Lembrete: {descricao} no valor de {valor} vence em {vencimento}. Para pagar via PIX, use a chave {pix}. Obrigado! 😊' },
    { nome: 'Cobrança em atraso', categoria: 'Financeiro', texto: 'Olá, {primeiro_nome}, tudo bem? Identificamos que {descricao} ({valor}), com vencimento em {vencimento}, ainda está em aberto. Se já pagou, por favor desconsidere. Para pagar via PIX: {pix}. Estamos à disposição!' },
    { nome: 'Confirmação de pagamento', categoria: 'Financeiro', texto: 'Olá, {primeiro_nome}! Confirmamos o recebimento de {valor} referente a {descricao}. Obrigado! ✅' },
    { nome: 'Primeiro contato', categoria: 'Comercial', texto: 'Olá, {primeiro_nome}! Aqui é {atendente}, da {escola}. Vi seu interesse no curso {curso} e quero te ajudar com todas as informações. Posso te enviar os detalhes?' },
    { nome: 'Retorno de proposta', categoria: 'Comercial', texto: 'Oi, {primeiro_nome}! Tudo bem? Conseguiu avaliar a proposta do curso {curso}? Estou à disposição para tirar qualquer dúvida. 😊' },
  ],

  // Na primeira vez, cria os modelos padrão
  todos() {
    if (!this.listar().length && !Instituicao.ler().modelosIniciados) {
      this.PADROES.forEach((m) => this.salvar({ ...m }));
      Instituicao.salvar({ modelosIniciados: true });
    }
    return this.listar().sort((a, b) =>
      this.CATEGORIAS.indexOf(a.categoria) - this.CATEGORIAS.indexOf(b.categoria) || a.nome.localeCompare(b.nome, 'pt-BR'));
  },

  porNome(nome) {
    return this.todos().find((m) => m.nome === nome);
  },

  validar(m) {
    const erros = [];
    if (!m.nome) erros.push({ campo: 'nome', msg: 'Informe o nome do modelo.' });
    if (!m.texto) erros.push({ campo: 'texto', msg: 'Escreva o texto da mensagem.' });
    return erros;
  },

  preencher(texto, variaveis) {
    return texto.replace(/\{(\w+)\}/g, (original, chave) =>
      (variaveis[chave] !== undefined && variaveis[chave] !== '' ? variaveis[chave] : original));
  },

  // Monta as variáveis a partir do contato e do contexto (cobrança, turma...)
  variaveis(contato, { lancamento, turma } = {}) {
    const inst = Instituicao.ler();
    const v = {
      nome: contato?.nome || '',
      primeiro_nome: (contato?.nome || '').split(' ')[0],
      escola: inst.nome || 'nossa escola',
      atendente: Sessao.usuario()?.nome || '',
      pix: inst.chavePix || '',
    };

    if (contato?.tipo === 'lead') v.curso = Leads.nomeCurso(contato.item);
    if (contato?.tipo === 'aluno') {
      v.curso = contato.item.curso || '';
      // Turma: a informada ou a matrícula ativa mais recente
      const m = Matriculas.listar().filter((x) => x.alunoId === contato.id && (!turma || x.turmaId === turma.id))
        .sort((a, b) => (a.status === 'Ativa' ? -1 : 1) - (b.status === 'Ativa' ? -1 : 1) || b.dataMatricula.localeCompare(a.dataMatricula))[0];
      turma = turma || (m && Turmas.buscarPorId(m.turmaId));
    }
    if (turma) {
      v.curso = Turmas.nomeCurso(turma);
      v.turma = turma.codigo;
      v.horario = `${(turma.dias || []).join(', ')}${turma.horaInicio ? `, das ${turma.horaInicio} às ${turma.horaFim}` : ''}`;
      v.professor = Turmas.nomeProfessor(turma) || 'nossa equipe';
      if (contato?.tipo === 'aluno') {
        const f = Frequencias.resumoAluno(turma.id, contato.id);
        if (f.aulas) v.frequencia = `${f.percentual}%`;
        const media = Notas.media(turma, contato.id);
        if (media !== null) v.media = media.toFixed(1).replace('.', ',');
      }
    }
    if (lancamento) {
      v.descricao = lancamento.descricao.replace(/^./, (c) => c.toLowerCase()).replace(/^mensalidade/, 'a mensalidade').replace(/^taxa/, 'a taxa');
      v.valor = Utils.formatarMoeda(lancamento.valor);
      v.vencimento = Utils.formatarData(lancamento.vencimento);
    }
    return v;
  },
};
