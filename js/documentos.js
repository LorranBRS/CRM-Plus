// ===== Documentos para impressão: fatura, recibo e grade curricular =====
const Documentos = {
  cabecalho(titulo, numero = '') {
    const i = Instituicao.ler();
    const e = Utils.escapar;
    return `
      <header class="doc-cabecalho">
        <div>
          <h1>${e(i.nome || 'Instituição de Ensino')}</h1>
          <p>${e([i.cnpj && `CNPJ ${i.cnpj}`, i.telefone, i.email].filter(Boolean).join(' · '))}</p>
          <p>${e(i.endereco || '')}</p>
        </div>
        <div class="doc-titulo"><h2>${e(titulo)}</h2>${numero ? `<p>${e(numero)}</p>` : ''}</div>
      </header>`;
  },

  dadosAluno(aluno) {
    const e = Utils.escapar;
    if (!aluno) return '<p>Aluno não encontrado.</p>';
    const endereco = [aluno.endereco, aluno.numero, aluno.bairro, aluno.cidade && `${aluno.cidade}/${aluno.uf}`]
      .filter(Boolean).join(', ');
    return `
      <section class="doc-bloco">
        <h3>Aluno</h3>
        <p><strong>${e(aluno.nome)}</strong> · CPF ${e(aluno.cpf)}</p>
        <p>${e([aluno.email, aluno.telefone].filter(Boolean).join(' · '))}</p>
        ${endereco ? `<p>${e(endereco)}</p>` : ''}
      </section>`;
  },

  fatura(l) {
    const e = Utils.escapar;
    const i = Instituicao.ler();
    const numero = `Nº ${String(l.numeroFatura).padStart(6, '0')}`;
    return `
      ${this.cabecalho('FATURA', numero)}
      ${this.dadosAluno(Alunos.buscarPorId(l.alunoId))}
      <table class="doc-tabela">
        <thead><tr><th>Descrição</th><th>Vencimento</th><th>Valor</th></tr></thead>
        <tbody><tr><td>${e(l.descricao)}</td><td>${Utils.formatarData(l.vencimento)}</td>
          <td>${Utils.formatarMoeda(l.valor)}</td></tr></tbody>
        <tfoot><tr><td colspan="2">Total a pagar</td><td>${Utils.formatarMoeda(l.valor)}</td></tr></tfoot>
      </table>
      <section class="doc-bloco">
        <h3>Como pagar</h3>
        <p>${i.chavePix ? `PIX – chave: <strong>${e(i.chavePix)}</strong>` : 'Pagamento na secretaria (PIX, cartão ou dinheiro).'}</p>
        <p>Após o vencimento, entre em contato com a secretaria.</p>
      </section>
      <footer class="doc-rodape">Emitida em ${Utils.formatarDataHora(l.faturaEmitidaEm)}
        por ${e(Usuarios.nome(l.faturaEmitidaPor) || '-')}</footer>`;
  },

  recibo(l) {
    const e = Utils.escapar;
    const aluno = Alunos.buscarPorId(l.alunoId);
    return `
      ${this.cabecalho('RECIBO', l.numeroFatura ? `Ref. fatura Nº ${String(l.numeroFatura).padStart(6, '0')}` : '')}
      <p class="doc-texto">Recebemos de <strong>${e(aluno?.nome || '-')}</strong> (CPF ${e(aluno?.cpf || '-')})
        a quantia de <strong>${Utils.formatarMoeda(l.valorPago)}</strong>, referente a
        <strong>${e(l.descricao)}</strong>, paga em ${Utils.formatarData(l.dataPagamento)}
        via ${e(l.formaPagamento || '-')}.</p>
      <div class="doc-assinatura">
        <span></span>
        <p>${e(Instituicao.nome())}<br>${e(Usuarios.nome(l.recebidoPor) || '')}</p>
      </div>
      <footer class="doc-rodape">Emitido em ${Utils.formatarDataHora(new Date().toISOString())}</footer>`;
  },

  grade(curso) {
    const e = Utils.escapar;
    const grade = curso.grade || [];
    const turmas = Turmas.listar().filter((t) => t.cursoId === curso.id && Turmas.estaAberta(t));
    return `
      ${this.cabecalho('GRADE CURRICULAR', curso.codigo || '')}
      <section class="doc-bloco">
        <h3>${e(curso.nome)}</h3>
        <p>${e([curso.area, curso.modalidade, `${curso.cargaHoraria}h`,
          curso.duracaoMeses && `${curso.duracaoMeses} meses`].filter(Boolean).join(' · '))}</p>
        ${curso.coordenadorId ? `<p>Coordenação: <strong>${e(Cursos.nomeCoordenador(curso))}</strong></p>` : ''}
        ${curso.descricao ? `<p>${e(curso.descricao)}</p>` : ''}
      </section>
      <table class="doc-tabela">
        <thead><tr><th>#</th><th>Módulo / disciplina</th><th>Professor(a)</th><th>Carga</th></tr></thead>
        <tbody>${grade.map((g, i) => `
          <tr><td>${i + 1}</td><td><strong>${e(g.nome)}</strong>${g.ementa ? `<br><small>${e(g.ementa)}</small>` : ''}</td>
            <td>${e(Professores.nome(g.professorId) || 'A definir')}</td><td>${g.cargaHoraria}h</td></tr>`).join('') ||
          '<tr><td colspan="4">Grade ainda não definida.</td></tr>'}</tbody>
        <tfoot><tr><td colspan="3">Carga horária total</td><td>${Cursos.cargaDaGrade(curso)}h</td></tr></tfoot>
      </table>
      ${turmas.length ? `<section class="doc-bloco"><h3>Turmas abertas</h3>${turmas.map((t) => `
        <p><strong>${e(t.codigo)}</strong> – ${e((t.dias || []).join(', '))} ${e(t.horaInicio || '')}–${e(t.horaFim || '')}
        · ${e(Turmas.nomeProfessor(t) || 'professor a definir')} · início ${Utils.formatarData(t.dataInicio)}</p>`).join('')}</section>` : ''}
      <footer class="doc-rodape">Gerado em ${Utils.formatarDataHora(new Date().toISOString())}</footer>`;
  },
};
