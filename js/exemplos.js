// ===== Dados de exemplo (para demonstração do sistema) =====
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
    if (Alunos.listar().length || Cursos.listar().length || Turmas.listar().length) {
      return Utils.toast('Os exemplos só podem ser carregados com o sistema vazio.', 'erro');
    }
    if (!confirm('Carregar cursos, turmas e alunos de exemplo?')) return;

    const curso = (dados) => Cursos.salvar({ status: 'Ativo', descricao: '', ...dados });
    const ingles = curso({ nome: 'Inglês Intermediário', codigo: 'ING-INT', area: 'Idiomas', modalidade: 'Presencial', cargaHoraria: 120, duracaoMeses: 12, mensalidade: 289.9, taxaMatricula: 99 });
    const web = curso({ nome: 'Programação Web', codigo: 'PROG-WEB', area: 'Tecnologia', modalidade: 'Híbrido', cargaHoraria: 180, duracaoMeses: 9, mensalidade: 349, taxaMatricula: 120 });
    const info = curso({ nome: 'Informática Básica', codigo: 'INFO-BAS', area: 'Tecnologia', modalidade: 'Presencial', cargaHoraria: 60, duracaoMeses: 4, mensalidade: 159.9, taxaMatricula: '' });
    curso({ nome: 'Administração para Pequenos Negócios', codigo: 'ADM-PN', area: 'Gestão e Negócios', modalidade: 'Online', cargaHoraria: 80, duracaoMeses: 6, mensalidade: 199, taxaMatricula: 50 });

    const turma = (dados) => Turmas.salvar({ sala: '', observacoes: '', ...dados });
    turma({ cursoId: ingles.id, codigo: 'ING-2026-1A', professor: 'Carla Mendes', sala: 'Sala 2', dias: ['Seg', 'Qua'], turno: 'Noite', horaInicio: '19:00', horaFim: '20:40', dataInicio: '2026-02-09', dataFim: '2026-12-16', vagas: 20, status: 'Em andamento' });
    turma({ cursoId: ingles.id, codigo: 'ING-2027-1A', professor: 'Carla Mendes', sala: 'Sala 2', dias: ['Ter', 'Qui'], turno: 'Manhã', horaInicio: '08:00', horaFim: '09:40', dataInicio: '2027-02-08', dataFim: '2027-12-15', vagas: 20, status: 'Planejada' });
    turma({ cursoId: web.id, codigo: 'WEB-2026-2N', professor: 'Rafael Souza', sala: 'Laboratório 1', dias: ['Ter', 'Qui'], turno: 'Noite', horaInicio: '19:00', horaFim: '22:00', dataInicio: '2026-08-04', dataFim: '2027-04-29', vagas: 25, status: 'Em andamento' });
    turma({ cursoId: info.id, codigo: 'INFO-2026-1S', professor: 'Ana Lima', sala: 'Laboratório 2', dias: ['Sáb'], turno: 'Manhã', horaInicio: '08:00', horaFim: '12:00', dataInicio: '2026-03-07', dataFim: '2026-06-27', vagas: 15, status: 'Concluída' });

    const aluno = (dados) => Alunos.salvar({ nascimento: '', cep: '', endereco: '', numero: '', bairro: '', observacoes: '', ...dados });
    aluno({ nome: 'Maria Oliveira', cpf: this.cpf(123456789), email: 'maria@exemplo.com', telefone: '(11) 98765-4321', cidade: 'São Paulo', uf: 'SP', curso: ingles.nome, status: 'Ativo' });
    aluno({ nome: 'João Pereira', cpf: this.cpf(987654321), email: 'joao@exemplo.com', telefone: '(21) 99876-5432', cidade: 'Rio de Janeiro', uf: 'RJ', curso: web.nome, status: 'Ativo' });
    aluno({ nome: 'Fernanda Costa', cpf: this.cpf(456123789), email: 'fernanda@exemplo.com', telefone: '(31) 98888-1234', cidade: 'Belo Horizonte', uf: 'MG', curso: web.nome, status: 'Interessado' });
    aluno({ nome: 'Lucas Martins', cpf: this.cpf(321654987), email: 'lucas@exemplo.com', telefone: '(41) 97777-4321', cidade: 'Curitiba', uf: 'PR', curso: info.nome, status: 'Inativo' });

    App.navegar();
    Utils.toast('Dados de exemplo carregados!');
  },
};
