// ===== Dados de exemplo (para demonstração do sistema) =====
// As datas são calculadas a partir de hoje, para a demonstração sempre parecer "atual".
const Exemplos = {
  // Gera um CPF válido a partir de 9 dígitos
  cpf(base) {
    const d = String(base).split('').map(Number);
    for (const tam of [9, 10]) {
      let soma = 0;
      for (let i = 0; i < tam; i++) soma += d[i] * (tam + 1 - i);
      const resto = (soma * 10) % 11;
      d.push(resto === 10 ? 0 : resto);
    }
    return Utils.mascaraCPF(d.join(''));
  },

  // Data/hora ISO de um dia "AAAA-MM-DD" num horário comercial (nunca no futuro)
  quando(dia, seq = 0) {
    const minutos = 9 * 60 + ((seq * 37) % (9 * 60));
    const [a, m, d] = dia.split('-').map(Number);
    const data = new Date(a, m - 1, d, Math.floor(minutos / 60), minutos % 60);
    return (data > new Date() ? new Date(Date.now() - (seq % 50 + 5) * 60000) : data).toISOString();
  },

  // Logo de exemplo (capelo de formatura) em SVG
  logo() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="28" fill="#4f46e5"/>
      <path d="M60 22 103 42 60 62 17 42Z" fill="#fff"/><path d="M35 52v17c0 10 50 10 50 0V52L60 64Z" fill="#c7d2fe"/>
      <path d="M97 45v22" stroke="#fde68a" stroke-width="4" stroke-linecap="round"/><circle cx="97" cy="70" r="5" fill="#fde68a"/>
      <text x="60" y="104" font-family="Arial,sans-serif" font-size="19" font-weight="700" fill="#fff" text-anchor="middle">FUTURO</text></svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  },

  // Número pseudoaleatório fixo (a demonstração fica sempre igual)
  sorteio(semente) {
    const x = Math.sin(semente * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  },

  // Cria (ou reaproveita pelo nome) os funcionários de exemplo
  equipe() {
    const existentes = Usuarios.listar();
    const criar = (nome, funcao) => existentes.find((u) => u.nome === nome) || Usuarios.salvar({
      nome, perfil: 'Funcionário', funcao, email: `${nome.split(' ')[0].toLowerCase()}@escola.com`,
      modulos: Usuarios.FUNCOES[funcao], status: 'Ativo', pinHash: '',
    });
    return {
      diretor: Sessao.ehDiretor() ? Sessao.usuario() : Usuarios.doPerfil('Diretor')[0],
      ana: criar('Ana Souza', 'Secretaria'),
      diego: criar('Diego Ramos', 'Comercial'),
      bianca: criar('Bianca Torres', 'Comercial'),
      patricia: criar('Patrícia Melo', 'Financeiro'),
      marcos: criar('Marcos Lima', 'Coordenação pedagógica'),
    };
  },

  carregar(confirmar = true) {
    if (!Storage.estaVazio()) {
      return Utils.toast('Os exemplos só podem ser carregados com o sistema vazio.', 'erro');
    }
    if (confirmar && !confirm('Carregar equipe, professores, cursos, turmas, alunos, matrículas, financeiro e leads de exemplo?')) return;

    const hoje = Utils.hoje();
    const mes = (n, dia) => Utils.somarMeses(hoje, n, dia);
    const dia = (n) => Utils.somarDias(hoje, n);
    const eq = this.equipe();
    const log = (usuario, modulo, acao, descricao, data, refId) =>
      Atividades.registrar(modulo, acao, descricao, { usuarioId: usuario.id, data, refId });

    if (!Instituicao.ler().nome) {
      Instituicao.salvar({
        nome: 'Escola Futuro Cursos Livres', cnpj: '12.345.678/0001-90', telefone: '(11) 3333-4444',
        email: 'contato@escolafuturo.com.br', endereco: 'Rua das Flores, 100 – Centro – São Paulo/SP',
        chavePix: 'financeiro@escolafuturo.com.br', mediaMinima: 7, frequenciaMinima: 75,
        responsavelCertificado: eq.diretor.nome, logo: this.logo(),
      });
    }

    // Feriados nacionais (antes das chamadas, para não contar aula em feriado)
    [...new Set([mes(-8).slice(0, 4), hoje.slice(0, 4), mes(12).slice(0, 4)])].forEach((ano) =>
      Eventos.importarFeriados(Number(ano), { usuarioId: eq.diretor.id }));

    // ---------- Professores ----------
    const inicioCadastros = mes(-8, 2);
    const professor = (dados, i) => {
      const p = Professores.salvar({ cpf: '', status: 'Ativo', observacoes: '', criadoPor: eq.diretor.id, ...dados });
      log(eq.diretor, 'professores', 'Professor cadastrado', p.nome, this.quando(inicioCadastros, i), p.id);
      return p;
    };
    const carla = professor({ nome: 'Carla Mendes', email: 'carla@escola.com', telefone: '(11) 98111-2233', formacao: 'Letras – Inglês (USP)', especialidades: 'Inglês, conversação, TOEFL', valorHora: 35 }, 1);
    const juliana = professor({ nome: 'Juliana Prado', email: 'juliana@escola.com', telefone: '(11) 98222-3344', formacao: 'Letras – Inglês/Português', especialidades: 'Gramática, escrita, pronúncia', valorHora: 32 }, 2);
    const rafael = professor({ nome: 'Rafael Souza', email: 'rafael@escola.com', telefone: '(11) 98333-4455', formacao: 'Ciência da Computação (Unicamp)', especialidades: 'HTML, CSS, JavaScript, React', valorHora: 42 }, 3);
    const fabio = professor({ nome: 'Fábio Nogueira', email: 'fabio@escola.com', telefone: '(11) 98444-5566', formacao: 'Sistemas de Informação', especialidades: 'Banco de dados, Node.js, Git', valorHora: 40 }, 4);
    const anaLima = professor({ nome: 'Ana Lima', email: 'analima@escola.com', telefone: '(11) 98555-6677', formacao: 'Licenciatura em Computação', especialidades: 'Informática básica, Office', valorHora: 30 }, 5);
    const paulo = professor({ nome: 'Paulo Reis', email: 'paulo@escola.com', telefone: '(11) 98666-7788', formacao: 'Administração – MBA em Gestão', especialidades: 'Gestão, finanças, marketing', valorHora: 38 }, 6);

    // ---------- Cursos com grade curricular ----------
    const modulo = (nome, cargaHoraria, professorId, ementa) => ({ id: Utils.gerarId(), nome, cargaHoraria, professorId: professorId.id, ementa });
    const curso = (dados, i) => {
      const c = Cursos.salvar({ status: 'Ativo', descricao: '', criadoPor: eq.diretor.id, ...dados });
      log(eq.diretor, 'cursos', 'Curso cadastrado', `${c.nome} – grade com ${c.grade.length} módulo(s)`, this.quando(inicioCadastros, 10 + i), c.id);
      return c;
    };
    const ingles = curso({
      nome: 'Inglês Intermediário', codigo: 'ING-INT', area: 'Idiomas', modalidade: 'Presencial', cargaHoraria: 120,
      duracaoMeses: 10, mensalidade: 289.9, taxaMatricula: 99, coordenadorId: carla.id,
      descricao: 'Desenvolver comunicação oral e escrita em situações do dia a dia e do trabalho.',
      grade: [
        modulo('Revisão de fundamentos', 20, juliana, 'Tempos verbais, vocabulário essencial'),
        modulo('Conversação I', 30, carla, 'Situações do cotidiano, apresentações'),
        modulo('Leitura e escrita', 25, juliana, 'Textos, e-mails e redação'),
        modulo('Conversação II', 30, carla, 'Debates, entrevistas, ambiente profissional'),
        modulo('Preparatório para certificação', 15, carla, 'Simulados no formato TOEFL/IELTS'),
      ],
    }, 1);
    const web = curso({
      nome: 'Programação Web', codigo: 'PROG-WEB', area: 'Tecnologia', modalidade: 'Híbrido', cargaHoraria: 180,
      duracaoMeses: 9, mensalidade: 349, taxaMatricula: 120, coordenadorId: rafael.id,
      descricao: 'Formar desenvolvedores capazes de criar sites e aplicações web completas.',
      grade: [
        modulo('Lógica de programação', 30, fabio, 'Algoritmos, variáveis, condições e laços'),
        modulo('HTML e CSS', 35, rafael, 'Estrutura, layout responsivo, flexbox e grid'),
        modulo('JavaScript', 45, rafael, 'DOM, eventos, funções, fetch e APIs'),
        modulo('Banco de dados', 30, fabio, 'Modelagem, SQL e integração'),
        modulo('Projeto final', 40, rafael, 'Desenvolvimento e publicação de um projeto real'),
      ],
    }, 2);
    const info = curso({
      nome: 'Informática Básica', codigo: 'INFO-BAS', area: 'Tecnologia', modalidade: 'Presencial', cargaHoraria: 60,
      duracaoMeses: 4, mensalidade: 159.9, taxaMatricula: 0, coordenadorId: anaLima.id,
      grade: [
        modulo('Windows e arquivos', 12, anaLima, 'Uso do computador, pastas e arquivos'),
        modulo('Internet e e-mail', 12, anaLima, 'Navegação segura, e-mail e serviços online'),
        modulo('Word', 12, anaLima, 'Documentos, formatação e impressão'),
        modulo('Excel', 16, anaLima, 'Planilhas, fórmulas e gráficos'),
        modulo('PowerPoint', 8, anaLima, 'Apresentações'),
      ],
    }, 3);
    const adm = curso({
      nome: 'Administração para Pequenos Negócios', codigo: 'ADM-PN', area: 'Gestão e Negócios', modalidade: 'Online',
      cargaHoraria: 80, duracaoMeses: 6, mensalidade: 199, taxaMatricula: 50, coordenadorId: paulo.id,
      grade: [
        modulo('Planejamento estratégico', 20, paulo, 'Missão, metas e plano de negócios'),
        modulo('Finanças e fluxo de caixa', 25, paulo, 'Custos, preço de venda e controle financeiro'),
        modulo('Marketing digital', 20, paulo, 'Redes sociais e captação de clientes'),
        modulo('Gestão de pessoas', 15, paulo, 'Contratação, liderança e rotinas'),
      ],
    }, 4);

    // ---------- Turmas ----------
    const turma = (dados, i) => {
      const t = Turmas.salvar({ observacoes: '', criadoPor: eq.ana.id, ...dados });
      log(eq.ana, 'turmas', 'Turma cadastrada', `${t.codigo} – ${Turmas.nomeCurso(t)}${t.professorId ? ` (prof. ${Professores.nome(t.professorId)})` : ''}`,
        this.quando(Utils.somarDias(t.dataInicio, -40), i), t.id);
      return t;
    };
    const tIng = turma({ cursoId: ingles.id, codigo: 'ING-A-NOITE', professorId: carla.id, sala: 'Sala 2', dias: ['Seg', 'Qua'], turno: 'Noite', horaInicio: '19:00', horaFim: '20:40', dataInicio: mes(-6, 3), dataFim: mes(4, 15), vagas: 12, status: 'Em andamento' }, 1);
    const tIngB = turma({ cursoId: ingles.id, codigo: 'ING-B-MANHA', professorId: juliana.id, sala: 'Sala 2', dias: ['Ter', 'Qui'], turno: 'Manhã', horaInicio: '08:00', horaFim: '09:40', dataInicio: mes(1, 5), dataFim: mes(11, 15), vagas: 15, status: 'Planejada' }, 2);
    const tWeb = turma({ cursoId: web.id, codigo: 'WEB-NOITE', professorId: rafael.id, sala: 'Laboratório 1', dias: ['Ter', 'Qui'], turno: 'Noite', horaInicio: '19:00', horaFim: '22:00', dataInicio: mes(-3, 4), dataFim: mes(6, 28), vagas: 10, status: 'Em andamento' }, 3);
    const tInfo = turma({ cursoId: info.id, codigo: 'INFO-SABADO', professorId: anaLima.id, sala: 'Laboratório 2', dias: ['Sáb'], turno: 'Manhã', horaInicio: '08:00', horaFim: '12:00', dataInicio: mes(-2, 6), dataFim: mes(2, 20), vagas: 8, status: 'Em andamento' }, 4);
    const tAdm = turma({ cursoId: adm.id, codigo: 'ADM-ONLINE', professorId: paulo.id, sala: 'Online', dias: ['Qua'], turno: 'Noite', horaInicio: '20:00', horaFim: '21:30', dataInicio: mes(1, 10), dataFim: mes(7, 10), vagas: 30, status: 'Planejada' }, 5);
    turma({ cursoId: web.id, codigo: 'WEB-SABADO', sala: 'Laboratório 1', dias: ['Sáb'], turno: 'Tarde', horaInicio: '13:30', horaFim: '17:30', dataInicio: mes(2, 7), dataFim: mes(11, 20), vagas: 12, status: 'Planejada' }, 6);

    // ---------- Alunos ----------
    const nomes = [
      ['Maria Oliveira', 'São Paulo', 'SP'], ['João Pereira', 'Rio de Janeiro', 'RJ'], ['Fernanda Costa', 'Belo Horizonte', 'MG'],
      ['Lucas Martins', 'Curitiba', 'PR'], ['Beatriz Santos', 'São Paulo', 'SP'], ['Gabriel Almeida', 'Campinas', 'SP'],
      ['Juliana Rocha', 'Santos', 'SP'], ['Pedro Carvalho', 'Niterói', 'RJ'], ['Camila Ribeiro', 'Porto Alegre', 'RS'],
      ['Rafael Gomes', 'Salvador', 'BA'], ['Larissa Ferreira', 'Recife', 'PE'], ['Thiago Barbosa', 'Fortaleza', 'CE'],
      ['Amanda Duarte', 'Goiânia', 'GO'], ['Bruno Teixeira', 'Florianópolis', 'SC'],
    ];
    const alunos = nomes.map(([nome, cidade, uf], i) => Alunos.salvar({
      nome, cidade, uf,
      cpf: this.cpf(String(123456700 + i * 7919).slice(0, 9)),
      email: `${nome.split(' ')[0].toLowerCase()}@exemplo.com`,
      telefone: Utils.mascaraTelefone(`119${String(87650000 + i * 1111).slice(0, 8)}`),
      nascimento: `${1990 + (i % 12)}-0${1 + (i % 9)}-1${i % 9}`,
      cep: '', endereco: '', numero: '', bairro: '', observacoes: '',
      curso: '', status: 'Interessado', criadoPor: i % 3 ? eq.ana.id : eq.diego.id,
    }));

    // ---------- Matrículas (+ financeiro gerado automaticamente) ----------
    let seq = 0;
    const matricular = (aluno, t, c, n, extras = {}) => {
      const atendente = (seq++ % 3 === 0) ? eq.diego : eq.ana;
      const m = Matriculas.salvar(Matriculas.preparar({
        alunoId: aluno.id, turmaId: t.id, dataMatricula: Utils.somarDias(t.dataInicio, -n),
        status: 'Ativa', valorMensalidade: c.mensalidade, desconto: 0,
        taxaMatricula: c.taxaMatricula, parcelas: c.duracaoMeses, diaVencimento: 10, observacoes: '',
        criadoPor: atendente.id, ...extras,
      }));
      Matriculas.gerarFinanceiro(m);
      Alunos.salvar({ id: aluno.id, status: 'Ativo', curso: c.nome });
      log(atendente, 'matriculas', 'Matrícula realizada', `${aluno.nome} em ${t.codigo} – ${Utils.formatarMoeda(m.valorFinal)}/mês`,
        this.quando(m.dataMatricula, seq), m.id);
      return m;
    };
    [0, 1, 2, 3, 4, 5, 6, 7, 8].forEach((i) => matricular(alunos[i], tIng, ingles, 5 + i, i === 2 ? { desconto: 10 } : {}));
    [9, 10, 11, 12].forEach((i) => matricular(alunos[i], tWeb, web, 3 + i));
    [0, 5, 13].forEach((i) => matricular(alunos[i], tInfo, info, 2 + i, i === 13 ? { desconto: 15 } : {}));
    matricular(alunos[4], tIngB, ingles, 20);
    matricular(alunos[7], tAdm, adm, 25);
    const cancelada = matricular(alunos[3], tWeb, web, 1);

    // Turma já concluída (para demonstrar notas finais e certificados)
    const tInfoA = turma({ cursoId: info.id, codigo: 'INFO-TARDE-A', professorId: anaLima.id, sala: 'Laboratório 2', dias: ['Ter', 'Qui'], turno: 'Tarde', horaInicio: '14:00', horaFim: '16:00', dataInicio: mes(-7, 3), dataFim: mes(-3, 26), vagas: 10, status: 'Concluída' }, 7);
    const concluidas = [2, 8, 11].map((i) => matricular(alunos[i], tInfoA, info, 4 + i));

    // ---------- Faturas e pagamentos ----------
    // Tudo que já venceu foi pago (pela Patrícia ou pela Ana), exceto alguns atrasos
    const formas = ['PIX', 'Boleto', 'Cartão de crédito', 'PIX', 'Dinheiro'];
    const devedores = [alunos[1].id, alunos[10].id, alunos[6].id];
    Financeiro.listar()
      .filter((l) => l.vencimento < hoje)
      .forEach((l, i) => {
        if (devedores.includes(l.alunoId) && l.vencimento >= mes(-1, 1)) return;
        const caixa = i % 5 === 0 ? eq.ana : eq.patricia;
        const pagoEm = Utils.somarDias(l.vencimento, (i % 4 === 0 ? 3 : 0) - (i % 3));
        const dataPagamento = pagoEm > hoje ? hoje : pagoEm;
        Financeiro.pagar(l.id, { dataPagamento, valorPago: l.valor, formaPagamento: formas[i % formas.length], recebidoPor: caixa.id });
        log(caixa, 'financeiro', 'Pagamento recebido',
          `${Financeiro.nomeAluno(l)} – ${l.descricao}: ${Utils.formatarMoeda(l.valor)} via ${formas[i % formas.length]}`,
          this.quando(dataPagamento, i), l.id);
      });

    // Faturas emitidas pelo financeiro para o mês atual e para os atrasados
    Financeiro.listar()
      .filter((l) => l.status === 'Pendente' && l.vencimento <= mes(0, 28) && l.vencimento >= mes(-1, 1))
      .forEach((l, i) => {
        const data = this.quando(Utils.somarDias(l.vencimento, -7), i);
        const f = Financeiro.emitirFatura(l.id, { usuarioId: eq.patricia.id, data });
        log(eq.patricia, 'financeiro', 'Fatura emitida', `Nº ${String(f.numeroFatura).padStart(6, '0')} – ${Financeiro.resumo(f)}`, data, l.id);
      });

    // Uma matrícula cancelada (parcelas futuras canceladas)
    Matriculas.salvar({ id: cancelada.id, status: 'Cancelada' });
    Financeiro.cancelarPendentes(cancelada.id);
    log(eq.ana, 'matriculas', 'Status da matrícula alterado', `${alunos[3].nome} em WEB-NOITE: Ativa → Cancelada`, this.quando(dia(-4), 3), cancelada.id);

    // ---------- Leads (com histórico de contatos da equipe comercial) ----------
    const lead = ({ criadoNoDia: inicio = -10, ...dados }, eventos = []) => {
      const resp = dados.responsavelId === eq.bianca.id ? eq.bianca : eq.diego;
      const etapaFinal = dados.etapa;
      let l = Leads.salvarComNota({ email: '', observacoes: '', ...dados, etapa: 'Novo' }, '',
        { usuarioId: resp.id, data: this.quando(dia(inicio), 2) });
      // Percorre as etapas até a atual, registrando cada avanço
      const alvo = Leads.ETAPAS.indexOf(etapaFinal);
      const caminho = etapaFinal === 'Perdido' ? ['Contato feito', 'Perdido'] : Leads.ETAPAS.slice(1, alvo + 1);
      caminho.forEach((etapa, i) => {
        l = Leads.salvarComNota({ ...Leads.buscarPorId(l.id), etapa }, eventos[i] || '',
          { usuarioId: resp.id, data: this.quando(dia(Math.min(-1, inicio + 2 + i * 2)), 4 + i) });
      });
      return l;
    };
    const diegoId = eq.diego.id;
    const biancaId = eq.bianca.id;
    lead({ nome: 'Ricardo Nunes', telefone: '(11) 97123-4567', origem: 'Instagram', cursoId: web.id, etapa: 'Novo', proximoContato: hoje, responsavelId: diegoId, criadoNoDia: -1 });
    lead({ nome: 'Sofia Lima', telefone: '(11) 96234-5678', email: 'sofia@exemplo.com', origem: 'Google', cursoId: ingles.id, etapa: 'Novo', proximoContato: dia(1), responsavelId: biancaId, criadoNoDia: -2 });
    lead({ nome: 'Marcos Vieira', telefone: '(21) 95345-6789', origem: 'Indicação', cursoId: adm.id, etapa: 'Contato feito', proximoContato: dia(-2), responsavelId: diegoId }, ['Ligação feita, pediu a grade do curso por e-mail.']);
    lead({ nome: 'Helena Prado', telefone: '(11) 94456-7890', origem: 'WhatsApp', cursoId: ingles.id, etapa: 'Contato feito', proximoContato: dia(3), responsavelId: biancaId }, ['Conversa pelo WhatsApp; quer turma de manhã.']);
    lead({ nome: 'Otávio Freitas', telefone: '(31) 93567-8901', origem: 'Site', cursoId: web.id, etapa: 'Visita agendada', proximoContato: dia(2), responsavelId: diegoId }, ['Respondeu o formulário do site.', 'Visita marcada para conhecer o laboratório.']);
    lead({ nome: 'Isabela Moura', telefone: '(11) 92678-9012', origem: 'Facebook', cursoId: info.id, etapa: 'Negociação', proximoContato: dia(-1), responsavelId: biancaId }, ['Primeiro contato por telefone.', 'Visitou a escola com a mãe.', 'Pediu desconto à vista – enviada proposta.']);
    lead({ nome: 'Caio Antunes', telefone: '(11) 91789-0123', origem: 'Instagram', cursoId: ingles.id, etapa: 'Negociação', proximoContato: dia(5), responsavelId: diegoId }, ['Interessado na turma da noite.', 'Fez teste de nivelamento.', 'Aguardando aprovação da empresa.']);
    lead({ nome: 'Valéria Campos', telefone: '(41) 99890-1234', origem: 'Presencial', cursoId: adm.id, etapa: 'Perdido', proximoContato: '', responsavelId: biancaId }, ['Achou o horário incompatível.', 'Fechou com outra escola.']);
    lead({ nome: 'Diana Lopes', telefone: '(11) 98901-2345', origem: 'Instagram', cursoId: web.id, etapa: 'Perdido', proximoContato: '', responsavelId: diegoId }, ['Sem retorno após 3 tentativas.', 'Desistiu por enquanto.']);
    [[4, 'Instagram', ingles, biancaId], [7, 'Indicação', adm, diegoId], [12, 'Google', web, diegoId], [13, 'Site', info, biancaId]].forEach(([i, origem, c, resp]) =>
      lead({ nome: alunos[i].nome, telefone: alunos[i].telefone, email: alunos[i].email, origem, cursoId: c.id, etapa: 'Matriculado',
        proximoContato: '', alunoId: alunos[i].id, responsavelId: resp, criadoNoDia: -30 }, ['Primeiro contato.', 'Visita realizada.', 'Proposta aceita.', 'Matrícula efetuada.']));

    // ---------- Acadêmico: chamadas e notas ----------
    const faltosos = [alunos[6].id, alunos[11].id];
    const chamadas = (t) => {
      const curso = Cursos.buscarPorId(t.cursoId);
      const ate = t.status === 'Concluída' ? t.dataFim : Utils.somarDias(hoje, -1);
      const dias = Academico.diasDeAula(t, ate);
      if (t.status !== 'Concluída') dias.pop(); // deixa a última aula sem chamada
      dias.forEach((d, n) => {
        const presencas = {};
        Academico.alunosDaTurma(t.id).filter(({ matricula }) => matricula.dataMatricula <= d).forEach(({ aluno }, i) => {
          const r = this.sorteio(n * 31 + i * 7 + t.codigo.length);
          presencas[aluno.id] = faltosos.includes(aluno.id) ? (r < 0.4 ? 'F' : 'P') : (r < 0.06 ? 'F' : r < 0.09 ? 'J' : 'P');
        });
        const grade = curso.grade || [];
        const modulo = grade[Math.min(grade.length - 1, Math.floor((n / Math.max(dias.length, 1)) * grade.length))];
        const quem = n % 2 ? eq.ana : eq.marcos;
        Frequencias.salvarAula({ turmaId: t.id, data: d, conteudo: modulo ? `${modulo.nome} – aula ${n + 1}` : `Aula ${n + 1}`, presencas },
          { usuarioId: quem.id });
        if (d >= dia(-20)) {
          const faltas = Object.values(presencas).filter((v) => v === 'F').length;
          log(quem, 'academico', 'Chamada registrada', `${t.codigo} – ${Utils.formatarData(d)}: ${Object.keys(presencas).length - faltas} presente(s), ${faltas} falta(s)`,
            this.quando(d, n + 20), t.id);
        }
      });
    };
    const notas = (t, modulosFeitos, reprovados = []) => {
      const valores = {};
      Academico.alunosDaTurma(t.id).forEach(({ aluno }, i) => {
        valores[aluno.id] = {};
        Notas.avaliacoes(t).slice(0, modulosFeitos).forEach((a, j) => {
          const r = this.sorteio(i * 17 + j * 5 + t.codigo.length);
          valores[aluno.id][a.id] = Math.round((reprovados.includes(aluno.id) ? 4 + r * 2.5 : 7 + r * 3) * 10) / 10;
        });
      });
      Notas.salvarTurma(t.id, valores);
      log(eq.marcos, 'academico', 'Notas lançadas', `${t.codigo} – ${Turmas.nomeCurso(t)}`, this.quando(dia(-6), t.codigo.length), t.id);
    };
    [tIng, tWeb, tInfo, tInfoA].forEach(chamadas);
    notas(tIng, 3);
    notas(tWeb, 2);
    notas(tInfo, 3);
    notas(tInfoA, 5, [alunos[11].id]);

    // Turma concluída: matrículas concluídas e um certificado já emitido
    concluidas.forEach((m) => Matriculas.salvar({ id: m.id, status: 'Concluída' }));
    const certData = this.quando(Utils.somarDias(tInfoA.dataFim, 6), 2);
    Matriculas.salvar({ id: concluidas[0].id, certificadoNumero: Instituicao.proximoNumeroCertificado(),
      certificadoEmitidoEm: certData, certificadoEmitidoPor: eq.ana.id });
    log(eq.ana, 'academico', 'Certificado emitido', `Nº 000001 – ${alunos[2].nome} – ${info.nome}`, certData, concluidas[0].id);

    // ---------- Despesas (últimos 6 meses + próximos 2) ----------
    const pagadora = eq.patricia;
    const despesa = (dados) => Despesas.criar({ fornecedor: '', observacoes: '', ...dados }, 1, { usuarioId: pagadora.id })[0];
    for (let n = -6; n <= 1; n++) {
      const variacao = (k) => Math.round((this.sorteio(n * 13 + k) - 0.5) * 60);
      despesa({ descricao: 'Aluguel da sede', categoria: 'Aluguel', fornecedor: 'Imobiliária Central', valor: 900, vencimento: mes(n, 5) });
      despesa({ descricao: 'Energia elétrica', categoria: 'Água, luz e internet', fornecedor: 'Enel', valor: 180 + variacao(1), vencimento: mes(n, 12) });
      despesa({ descricao: 'Água e esgoto', categoria: 'Água, luz e internet', fornecedor: 'Sabesp', valor: 70 + Math.round(variacao(2) / 4), vencimento: mes(n, 12) });
      despesa({ descricao: 'Internet fibra', categoria: 'Água, luz e internet', fornecedor: 'Vivo', valor: 120, vencimento: mes(n, 15) });
      despesa({ descricao: 'Anúncios Instagram/Google', categoria: 'Marketing', fornecedor: 'Meta / Google', valor: 300 + variacao(3) * 2, vencimento: mes(n, 18) });
      despesa({ descricao: 'Simples Nacional', categoria: 'Impostos e taxas', valor: 210 + variacao(4), vencimento: mes(n, 20) });
      if (n % 2 === 0) despesa({ descricao: 'Material didático e impressões', categoria: 'Material didático', fornecedor: 'Gráfica Rápida', valor: 160 + variacao(5), vencimento: mes(n, 22) });
    }
    despesa({ descricao: 'Manutenção dos computadores', categoria: 'Manutenção', fornecedor: 'TecInfo', valor: 350, vencimento: mes(-2, 8) });
    // Pagamento dos professores dos meses anteriores (o mês passado fica para testar o botão)
    for (let n = -6; n <= -2; n++) {
      const competencia = mes(n, 1).slice(0, 7);
      Despesas.calcularProfessores(competencia).forEach((c) => Despesas.gerarProfessor(c, competencia, mes(n + 1, 5), { usuarioId: pagadora.id }));
    }
    // Paga o que já venceu (uma conta fica em atraso)
    const contaAtrasada = Despesas.listar().find((d) => d.descricao === 'Material didático e impressões' && d.vencimento < hoje && d.vencimento >= mes(-1, 1))
      || Despesas.listar().filter((d) => d.vencimento < hoje).pop();
    Despesas.listar().filter((d) => d.vencimento < hoje && d.id !== contaAtrasada?.id).forEach((d, i) => {
      const pagoEm = Utils.somarDias(d.vencimento, -(i % 3));
      Despesas.pagar(d.id, { dataPagamento: pagoEm, valorPago: d.valor, formaPagamento: ['PIX', 'Boleto', 'Débito automático'][i % 3], pagoPor: pagadora.id });
      if (pagoEm >= dia(-15)) log(pagadora, 'financeiro', 'Despesa paga', `${d.descricao}: ${Utils.formatarMoeda(d.valor)}`, this.quando(pagoEm, i), d.id);
    });

    // ---------- Metas (últimos 5 meses + atual) ----------
    for (let n = -5; n <= 0; n++) {
      Metas.salvarMes(mes(n, 1).slice(0, 7), { matriculas: 4, leads: 8, receita: 4500, lucro: 900 }, {
        [eq.ana.id]: { matriculas: 2 }, [eq.diego.id]: { matriculas: 2, leads: 5 }, [eq.bianca.id]: { matriculas: 1, leads: 4 },
      }, { usuarioId: eq.diretor.id });
    }
    log(eq.diretor, 'metas', 'Metas definidas', `Metas de ${Utils.nomeMes(Utils.mesAtual())}: Matrículas 4, Novos leads 8, Receita recebida R$ 4.500,00, Lucro R$ 900,00`,
      this.quando(mes(0, 1), 1));

    // ---------- Eventos da agenda ----------
    const evento = (dados) => Eventos.salvar({ dataFim: '', diaInteiro: false, horaInicio: '', horaFim: '', local: '', descricao: '',
      semAula: false, turmaId: '', criadoPor: eq.diretor.id, ...dados });
    evento({ titulo: 'Reunião pedagógica', tipo: 'Reunião', data: dia(1), horaInicio: '18:00', horaFim: '19:30', local: 'Sala dos professores', descricao: 'Pauta: resultados do bimestre e planejamento.' });
    evento({ titulo: 'Prova de nivelamento – Inglês', tipo: 'Prova', data: dia(5), horaInicio: '19:00', horaFim: '20:40', local: 'Sala 2', turmaId: tIng.id });
    evento({ titulo: 'Reunião de vendas (comercial)', tipo: 'Reunião', data: dia(2), horaInicio: '09:00', horaFim: '10:00', descricao: 'Metas do mês e funil de leads.' });
    evento({ titulo: 'Aula inaugural – Administração', tipo: 'Evento', data: tAdm.dataInicio, horaInicio: '20:00', horaFim: '21:30', local: 'Online', turmaId: tAdm.id });
    evento({ titulo: 'Entrega de certificados', tipo: 'Evento', data: dia(12), horaInicio: '19:00', horaFim: '21:00', local: 'Auditório' });
    evento({ titulo: 'Fechamento do mês (financeiro)', tipo: 'Tarefa', data: Utils.somarDias(Utils.somarMeses(`${Utils.mesAtual()}-01`, 1), -1), diaInteiro: true });
    evento({ titulo: 'Recesso de fim de ano', tipo: 'Recesso', data: `${hoje.slice(0, 4)}-12-22`, dataFim: `${Number(hoje.slice(0, 4)) + 1}-01-04`, diaInteiro: true, semAula: true });

    // Dois aniversariantes neste mês
    Alunos.salvar({ id: alunos[4].id, nascimento: `1999-${hoje.slice(5, 7)}-${String(Math.min(28, Number(hoje.slice(8)) + 2)).padStart(2, '0')}` });
    Alunos.salvar({ id: alunos[9].id, nascimento: `2001-${hoje.slice(5, 7)}-${String(Math.max(1, Number(hoje.slice(8)) - 5)).padStart(2, '0')}` });

    // ---------- Conversas de WhatsApp ----------
    const msg = (tipo, id, direcao, texto, quando, usuario = eq.ana) => Mensagens.registrar({
      contatoTipo: tipo, contatoId: id, direcao, texto, data: quando, usuarioId: usuario.id });
    const ricardo = Leads.listar().find((l) => l.nome === 'Ricardo Nunes');
    const caio = Leads.listar().find((l) => l.nome === 'Caio Antunes');
    const joaoAtraso = Financeiro.atrasados().find((l) => l.alunoId === alunos[1].id);
    msg('aluno', alunos[0].id, 'enviada', `Olá, Maria! 🎉 Seja muito bem-vinda ao curso ${ingles.nome} da Escola Futuro. Suas aulas na turma ING-A-NOITE serão Seg, Qua, das 19:00 às 20:40, com Carla Mendes. Qualquer dúvida, é só chamar por aqui!`, this.quando(tIng.dataInicio, 1));
    msg('aluno', alunos[0].id, 'recebida', 'Obrigada!! Estou muito animada 😊', this.quando(tIng.dataInicio, 3));
    if (joaoAtraso) {
      msg('aluno', alunos[1].id, 'enviada', `Olá, João, tudo bem? Identificamos que a ${joaoAtraso.descricao.toLowerCase()} (${Utils.formatarMoeda(joaoAtraso.valor)}), com vencimento em ${Utils.formatarData(joaoAtraso.vencimento)}, ainda está em aberto. Para pagar via PIX: financeiro@escolafuturo.com.br.`, this.quando(dia(-3), 4), eq.patricia);
      msg('aluno', alunos[1].id, 'recebida', 'Oi! Desculpa, esqueci. Vou pagar amanhã sem falta.', this.quando(dia(-3), 9), eq.patricia);
      msg('aluno', alunos[1].id, 'enviada', 'Combinado, João! Obrigado pelo retorno. 👍', this.quando(dia(-3), 10), eq.patricia);
    }
    msg('aluno', alunos[6].id, 'enviada', `Olá, Juliana! Sentimos sua falta nas aulas de ${ingles.nome}. Sua frequência está abaixo do mínimo de 75%. Está tudo bem? Podemos ajudar em algo?`, this.quando(dia(-2), 5), eq.marcos);
    msg('aluno', alunos[6].id, 'recebida', 'Oi, Marcos. Estive doente nas últimas semanas, vou levar o atestado na secretaria.', this.quando(dia(-2), 12), eq.marcos);
    msg('aluno', alunos[2].id, 'enviada', `Parabéns, Fernanda! 🎓 Você concluiu o curso ${info.nome} e o seu certificado já está disponível na secretaria da Escola Futuro.`, certData);
    if (ricardo) msg('lead', ricardo.id, 'enviada', `Olá, Ricardo! Aqui é Diego, da Escola Futuro. Vi seu interesse no curso ${web.nome} e quero te ajudar com todas as informações. Posso te enviar os detalhes?`, this.quando(hoje, 1), eq.diego);
    if (caio) {
      msg('lead', caio.id, 'enviada', `Oi, Caio! Tudo bem? Conseguiu avaliar a proposta do curso ${ingles.nome}? Estou à disposição para tirar qualquer dúvida. 😊`, this.quando(dia(-1), 2), eq.diego);
      msg('lead', caio.id, 'recebida', 'Opa, Diego! Ainda aguardando o RH da empresa aprovar. Te aviso até sexta.', this.quando(dia(-1), 8), eq.diego);
    }
    msg('professor', rafael.id, 'enviada', 'Rafael, lembrete: reunião pedagógica na sexta às 18h, na sala dos professores.', this.quando(dia(-1), 6));
    msg('professor', rafael.id, 'recebida', 'Confirmado, estarei lá!', this.quando(dia(-1), 7));

    // Um aluno só interessado (sem matrícula)
    Alunos.salvar({ nome: 'Fernando Dias', cpf: this.cpf(741852963), email: 'fernando@exemplo.com', telefone: '(11) 98000-1122', cidade: 'Osasco', uf: 'SP', curso: adm.nome, status: 'Interessado', nascimento: '', cep: '', endereco: '', numero: '', bairro: '', observacoes: '', criadoPor: eq.ana.id });

    if (confirmar) {
      location.hash = '#painel';
      App.renderizarAtual();
    }
    Utils.toast('Dados de exemplo carregados!');
  },
};
