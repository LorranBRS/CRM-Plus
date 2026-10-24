// ===== Modelo: Usuários (diretores e funcionários) =====
const Usuarios = {
  ...criarRepositorio('usuarios'),

  PERFIS: ['Diretor', 'Funcionário'],

  // Módulos do sistema (ordem do menu). somenteDiretor = nunca liberado para funcionário
  MODULOS: [
    { id: 'painel', nome: 'Painel', icone: '🏠' },
    { id: 'leads', nome: 'Leads / Funil', icone: '🎯' },
    { id: 'conversas', nome: 'Conversas', icone: '💬' },
    { id: 'alunos', nome: 'Alunos', icone: '👩‍🎓' },
    { id: 'cursos', nome: 'Cursos', icone: '📚' },
    { id: 'professores', nome: 'Professores', icone: '👨‍🏫' },
    { id: 'turmas', nome: 'Turmas', icone: '🏫' },
    { id: 'academico', nome: 'Acadêmico', icone: '🎓' },
    { id: 'matriculas', nome: 'Matrículas', icone: '📝' },
    { id: 'financeiro', nome: 'Financeiro', icone: '💰' },
    { id: 'relatorios', nome: 'Relatórios', icone: '📊' },
    { id: 'equipe', nome: 'Equipe', icone: '👥', somenteDiretor: true },
    { id: 'atividades', nome: 'Atividades', icone: '🕒', somenteDiretor: true },
  ],

  // Acessos sugeridos para cada função (o diretor pode ajustar)
  FUNCOES: {
    'Secretaria': ['painel', 'conversas', 'alunos', 'cursos', 'professores', 'turmas', 'academico', 'matriculas'],
    'Comercial': ['painel', 'leads', 'conversas', 'alunos', 'cursos', 'turmas', 'matriculas'],
    'Financeiro': ['painel', 'conversas', 'alunos', 'matriculas', 'financeiro', 'relatorios'],
    'Coordenação pedagógica': ['painel', 'conversas', 'alunos', 'cursos', 'professores', 'turmas', 'academico'],
    'Outro': ['painel'],
  },

  modulosLiberaveis() {
    return this.MODULOS.filter((m) => !m.somenteDiretor);
  },

  ativos() {
    return this.listar().filter((u) => u.status !== 'Inativo')
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  },

  doPerfil(perfil) {
    return this.ativos().filter((u) => u.perfil === perfil);
  },

  nome(id) {
    return id ? this.buscarPorId(id)?.nome || '' : '';
  },

  iniciais(nome) {
    const partes = (nome || '?').trim().split(/\s+/);
    return ((partes[0]?.[0] || '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
  },

  descricao(u) {
    return u.perfil === 'Diretor' ? 'Diretor(a)' : (u.funcao || 'Funcionário');
  },

  validar(u) {
    const erros = [];
    if (!u.nome || u.nome.length < 2) erros.push({ campo: 'nome', msg: 'Informe o nome.' });
    if (u.email && !Utils.emailValido(u.email)) erros.push({ campo: 'email', msg: 'E-mail inválido.' });
    if (u.pin && !/^\d{4,8}$/.test(u.pin)) erros.push({ campo: 'pin', msg: 'O PIN deve ter de 4 a 8 números.' });

    // Sempre deve existir ao menos um diretor ativo
    const anterior = u.id ? this.buscarPorId(u.id) : null;
    const deixaDeSerDiretorAtivo = anterior?.perfil === 'Diretor' && anterior.status !== 'Inativo' &&
      (u.perfil !== 'Diretor' || u.status === 'Inativo');
    if (deixaDeSerDiretorAtivo && this.doPerfil('Diretor').length <= 1) {
      erros.push({ campo: 'perfil', msg: 'É preciso manter pelo menos um diretor ativo.' });
    }
    return erros;
  },
};
