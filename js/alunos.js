// ===== Módulo de Alunos (regras de negócio) =====
const Alunos = {
  COLECAO: 'alunos',

  listar() {
    return Storage.ler(this.COLECAO);
  },

  buscarPorId(id) {
    return this.listar().find((a) => a.id === id);
  },

  // Retorna lista de erros; vazia = dados válidos
  validar(aluno) {
    const erros = [];
    if (!aluno.nome || aluno.nome.trim().length < 3) erros.push({ campo: 'nome', msg: 'Informe o nome completo.' });
    if (!Utils.cpfValido(aluno.cpf)) erros.push({ campo: 'cpf', msg: 'CPF inválido.' });
    if (!Utils.emailValido(aluno.email)) erros.push({ campo: 'email', msg: 'E-mail inválido.' });
    if (Utils.somenteDigitos(aluno.telefone).length < 10) erros.push({ campo: 'telefone', msg: 'Telefone inválido.' });

    const cpfDuplicado = this.listar().some(
      (a) => a.id !== aluno.id && Utils.somenteDigitos(a.cpf) === Utils.somenteDigitos(aluno.cpf)
    );
    if (cpfDuplicado) erros.push({ campo: 'cpf', msg: 'Já existe um aluno com este CPF.' });

    return erros;
  },

  salvar(aluno) {
    const lista = this.listar();
    if (aluno.id) {
      const i = lista.findIndex((a) => a.id === aluno.id);
      lista[i] = { ...lista[i], ...aluno, atualizadoEm: new Date().toISOString() };
    } else {
      aluno.id = Utils.gerarId();
      aluno.criadoEm = new Date().toISOString();
      lista.push(aluno);
    }
    Storage.salvar(this.COLECAO, lista);
    return aluno;
  },

  excluir(id) {
    Storage.salvar(this.COLECAO, this.listar().filter((a) => a.id !== id));
  },

  filtrar(termo, status) {
    const t = (termo || '').toLowerCase().trim();
    const tDigitos = Utils.somenteDigitos(t);
    return this.listar()
      .filter((a) => !status || a.status === status)
      .filter((a) => {
        if (!t) return true;
        return (
          a.nome.toLowerCase().includes(t) ||
          a.email.toLowerCase().includes(t) ||
          (tDigitos && (Utils.somenteDigitos(a.cpf).includes(tDigitos) ||
                        Utils.somenteDigitos(a.telefone).includes(tDigitos)))
        );
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  },

  estatisticas() {
    const lista = this.listar();
    const agora = new Date();
    return {
      total: lista.length,
      ativos: lista.filter((a) => a.status === 'Ativo').length,
      interessados: lista.filter((a) => a.status === 'Interessado').length,
      mes: lista.filter((a) => {
        const d = new Date(a.criadoEm);
        return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
      }).length,
    };
  },

  exportarCSV() {
    const colunas = ['nome', 'cpf', 'nascimento', 'email', 'telefone', 'cep', 'endereco', 'numero',
      'bairro', 'cidade', 'uf', 'curso', 'status', 'observacoes', 'criadoEm'];
    const linhas = this.listar().map((a) =>
      colunas.map((c) => `"${String(a[c] ?? '').replace(/"/g, '""')}"`).join(';')
    );
    // BOM para o Excel reconhecer acentuação
    return '﻿' + [colunas.join(';'), ...linhas].join('\n');
  },
};
