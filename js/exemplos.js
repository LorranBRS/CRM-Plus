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

  carregar() {
    if (!Storage.estaVazio()) {
      return Utils.toast('Os exemplos só podem ser carregados com o sistema vazio.', 'erro');
    }
    if (!confirm('Carregar cursos, turmas, alunos, matrículas, financeiro e leads de exemplo?')) return;

    const hoje = Utils.hoje();
    const mes = (n, dia) => Utils.somarMeses(hoje, n, dia);
    const dia = (n) => Utils.somarDias(hoje, n);

    // ---------- Cursos ----------
    const curso = (dados) => Cursos.salvar({ status: 'Ativo', descricao: '', ...dados });
    const ingles = curso({ nome: 'Inglês Intermediário', codigo: 'ING-INT', area: 'Idiomas', modalidade: 'Presencial', cargaHoraria: 120, duracaoMeses: 10, mensalidade: 289.9, taxaMatricula: 99 });
    const web = curso({ nome: 'Programação Web', codigo: 'PROG-WEB', area: 'Tecnologia', modalidade: 'Híbrido', cargaHoraria: 180, duracaoMeses: 9, mensalidade: 349, taxaMatricula: 120 });
    const info = curso({ nome: 'Informática Básica', codigo: 'INFO-BAS', area: 'Tecnologia', modalidade: 'Presencial', cargaHoraria: 60, duracaoMeses: 4, mensalidade: 159.9, taxaMatricula: 0 });
    const adm = curso({ nome: 'Administração para Pequenos Negócios', codigo: 'ADM-PN', area: 'Gestão e Negócios', modalidade: 'Online', cargaHoraria: 80, duracaoMeses: 6, mensalidade: 199, taxaMatricula: 50 });

    // ---------- Turmas ----------
    const turma = (dados) => Turmas.salvar({ sala: '', observacoes: '', ...dados });
    const tIng = turma({ cursoId: ingles.id, codigo: 'ING-A-NOITE', professor: 'Carla Mendes', sala: 'Sala 2', dias: ['Seg', 'Qua'], turno: 'Noite', horaInicio: '19:00', horaFim: '20:40', dataInicio: mes(-6, 3), dataFim: mes(4, 15), vagas: 12, status: 'Em andamento' });
    const tIngB = turma({ cursoId: ingles.id, codigo: 'ING-B-MANHA', professor: 'Carla Mendes', sala: 'Sala 2', dias: ['Ter', 'Qui'], turno: 'Manhã', horaInicio: '08:00', horaFim: '09:40', dataInicio: mes(1, 5), dataFim: mes(11, 15), vagas: 15, status: 'Planejada' });
    const tWeb = turma({ cursoId: web.id, codigo: 'WEB-NOITE', professor: 'Rafael Souza', sala: 'Laboratório 1', dias: ['Ter', 'Qui'], turno: 'Noite', horaInicio: '19:00', horaFim: '22:00', dataInicio: mes(-3, 4), dataFim: mes(6, 28), vagas: 10, status: 'Em andamento' });
    const tInfo = turma({ cursoId: info.id, codigo: 'INFO-SABADO', professor: 'Ana Lima', sala: 'Laboratório 2', dias: ['Sáb'], turno: 'Manhã', horaInicio: '08:00', horaFim: '12:00', dataInicio: mes(-2, 6), dataFim: mes(2, 20), vagas: 8, status: 'Em andamento' });
    const tAdm = turma({ cursoId: adm.id, codigo: 'ADM-ONLINE', professor: 'Paulo Reis', sala: 'Online', dias: ['Qua'], turno: 'Noite', horaInicio: '20:00', horaFim: '21:30', dataInicio: mes(1, 10), dataFim: mes(7, 10), vagas: 30, status: 'Planejada' });

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
      curso: '', status: 'Interessado',
    }));

    // ---------- Matrículas (+ financeiro gerado automaticamente) ----------
    const matricular = (aluno, t, curso, n, extras = {}) => {
      const m = Matriculas.salvar(Matriculas.preparar({
        alunoId: aluno.id, turmaId: t.id, dataMatricula: Utils.somarDias(t.dataInicio, -n),
        status: 'Ativa', valorMensalidade: curso.mensalidade, desconto: 0,
        taxaMatricula: curso.taxaMatricula, parcelas: curso.duracaoMeses, diaVencimento: 10, observacoes: '', ...extras,
      }));
      Matriculas.gerarFinanceiro(m);
      Alunos.salvar({ id: aluno.id, status: extras.status === 'Cancelada' ? 'Inativo' : 'Ativo', curso: curso.nome });
      return m;
    };
    [0, 1, 2, 3, 4, 5, 6, 7, 8].forEach((i) => matricular(alunos[i], tIng, ingles, 5 + i, i === 2 ? { desconto: 10 } : {}));
    [9, 10, 11, 12].forEach((i) => matricular(alunos[i], tWeb, web, 3 + i));
    [0, 5, 13].forEach((i) => matricular(alunos[i], tInfo, info, 2 + i, i === 13 ? { desconto: 15 } : {}));
    matricular(alunos[4], tIngB, ingles, 20);
    matricular(alunos[7], tAdm, adm, 25);
    const cancelada = matricular(alunos[3], tWeb, web, 1);

    // Simula pagamentos: tudo que já venceu foi pago, exceto alguns atrasos
    const formas = ['PIX', 'Boleto', 'Cartão de crédito', 'PIX', 'Dinheiro'];
    const devedores = [alunos[1].id, alunos[10].id, alunos[6].id];
    Financeiro.listar()
      .filter((l) => l.vencimento < hoje)
      .forEach((l, i) => {
        const atrasaUltimo = devedores.includes(l.alunoId) && l.vencimento >= mes(-1, 1);
        if (atrasaUltimo) return;
        const atrasoDias = i % 4 === 0 ? 3 : 0;
        const pagoEm = Utils.somarDias(l.vencimento, atrasoDias - (i % 3));
        Financeiro.pagar(l.id, {
          dataPagamento: pagoEm > hoje ? hoje : pagoEm,
          valorPago: l.valor, formaPagamento: formas[i % formas.length],
        });
      });

    // Uma matrícula cancelada (parcelas futuras canceladas)
    Matriculas.salvar({ id: cancelada.id, status: 'Cancelada' });
    Financeiro.cancelarPendentes(cancelada.id);

    // ---------- Leads ----------
    const lead = (dados, nota) => Leads.salvarComNota({ email: '', responsavel: 'Patrícia', observacoes: '', ...dados }, nota);
    lead({ nome: 'Ricardo Nunes', telefone: '(11) 97123-4567', origem: 'Instagram', cursoId: web.id, etapa: 'Novo', proximoContato: hoje });
    lead({ nome: 'Sofia Lima', telefone: '(11) 96234-5678', email: 'sofia@exemplo.com', origem: 'Google', cursoId: ingles.id, etapa: 'Novo', proximoContato: dia(1) });
    lead({ nome: 'Marcos Vieira', telefone: '(21) 95345-6789', origem: 'Indicação', cursoId: adm.id, etapa: 'Contato feito', proximoContato: dia(-2), responsavel: 'Diego' }, 'Pediu a grade do curso.');
    lead({ nome: 'Helena Prado', telefone: '(11) 94456-7890', origem: 'WhatsApp', cursoId: ingles.id, etapa: 'Contato feito', proximoContato: dia(3) });
    lead({ nome: 'Otávio Freitas', telefone: '(31) 93567-8901', origem: 'Site', cursoId: web.id, etapa: 'Visita agendada', proximoContato: dia(2), responsavel: 'Diego' });
    lead({ nome: 'Isabela Moura', telefone: '(11) 92678-9012', origem: 'Facebook', cursoId: info.id, etapa: 'Negociação', proximoContato: dia(-1) });
    lead({ nome: 'Caio Antunes', telefone: '(11) 91789-0123', origem: 'Instagram', cursoId: ingles.id, etapa: 'Negociação', proximoContato: dia(5) });
    lead({ nome: 'Valéria Campos', telefone: '(41) 99890-1234', origem: 'Presencial', cursoId: adm.id, etapa: 'Perdido', proximoContato: '' });
    lead({ nome: 'Diana Lopes', telefone: '(11) 98901-2345', origem: 'Instagram', cursoId: web.id, etapa: 'Perdido', proximoContato: '' });
    [[4, 'Instagram', ingles], [7, 'Indicação', adm], [12, 'Google', web], [13, 'Site', info]].forEach(([i, origem, c]) =>
      lead({ nome: alunos[i].nome, telefone: alunos[i].telefone, email: alunos[i].email, origem, cursoId: c.id, etapa: 'Matriculado', proximoContato: '', alunoId: alunos[i].id }));

    // Um aluno só interessado (sem matrícula)
    Alunos.salvar({ nome: 'Fernando Dias', cpf: this.cpf(741852963), email: 'fernando@exemplo.com', telefone: '(11) 98000-1122', cidade: 'Osasco', uf: 'SP', curso: adm.nome, status: 'Interessado', nascimento: '', cep: '', endereco: '', numero: '', bairro: '', observacoes: '' });

    location.hash = '#painel';
    App.renderizarAtual();
    Utils.toast('Dados de exemplo carregados!');
  },
};
