// ===== Documentos para impressão: fatura, recibo e grade curricular =====
const Documentos = {
  cabecalho(titulo, numero = '') {
    const i = Instituicao.ler();
    const e = Utils.escapar;
    return `
      <header class="doc-cabecalho">
        ${i.logo ? `<img class="doc-logo" src="${i.logo}" alt="">` : ''}
        <div class="doc-instituicao">
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

  // Certificado de conclusão (página 1) + conteúdo programático (página 2)
  certificado(m) {
    const e = Utils.escapar;
    const i = Instituicao.ler();
    const aluno = Alunos.buscarPorId(m.alunoId);
    const turma = Turmas.buscarPorId(m.turmaId);
    const curso = Cursos.buscarPorId(turma.cursoId);
    const freq = Frequencias.resumoAluno(turma.id, aluno.id);
    const media = Notas.media(turma, aluno.id);
    const codigo = `CP-${(m.certificadoEmitidoEm || '').slice(0, 4)}-${String(m.certificadoNumero).padStart(6, '0')}`;
    const cidade = (i.endereco || '').split('–').pop().trim() || '';
    const dataExtenso = new Date(m.certificadoEmitidoEm).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    const coordenador = Cursos.nomeCoordenador(curso);
    return `
      <section class="cert">
        <div class="cert-moldura">
          ${i.logo ? `<img class="cert-logo" src="${i.logo}" alt="">` : ''}
          <p class="cert-escola">${e(i.nome || 'Instituição de Ensino')}</p>
          <h1 class="cert-titulo">Certificado</h1>
          <p class="cert-sub">de conclusão de curso</p>
          <p class="cert-texto">Certificamos que <strong class="cert-nome">${e(aluno.nome)}</strong>
            inscrito(a) no CPF ${e(aluno.cpf)}, concluiu com aproveitamento o curso
            <strong>${e(curso.nome)}</strong>, na modalidade ${e((curso.modalidade || '').toLowerCase())},
            com carga horária de <strong>${curso.cargaHoraria} horas</strong>, realizado no período de
            ${Utils.formatarData(turma.dataInicio)} a ${Utils.formatarData(turma.dataFim)}${
              freq.aulas ? `, com frequência de ${freq.percentual}%` : ''}${
              media !== null ? ` e média final ${media.toFixed(1).replace('.', ',')}` : ''}.</p>
          <p class="cert-data">${e(cidade ? `${cidade}, ` : '')}${dataExtenso}.</p>
          <div class="cert-assinaturas">
            <div><span></span><p>${e(i.responsavelCertificado || 'Direção')}<br><small>Direção</small></p></div>
            <div><span></span><p>${e(coordenador || 'Coordenação')}<br><small>Coordenação do curso</small></p></div>
          </div>
          <p class="cert-codigo">Certificado Nº ${String(m.certificadoNumero).padStart(6, '0')} · Código de verificação ${codigo}</p>
        </div>
      </section>
      <section class="cert-verso">
        <h2>Conteúdo programático – ${e(curso.nome)}</h2>
        <table class="doc-tabela">
          <thead><tr><th>#</th><th>Módulo / disciplina</th><th>Professor(a)</th><th>Carga</th><th>Nota</th></tr></thead>
          <tbody>${(curso.grade || []).map((g, n) => `
            <tr><td>${n + 1}</td><td><strong>${e(g.nome)}</strong>${g.ementa ? `<br><small>${e(g.ementa)}</small>` : ''}</td>
              <td>${e(Professores.nome(g.professorId) || '-')}</td><td>${g.cargaHoraria}h</td>
              <td>${Notas.notasDoAluno(turma.id, aluno.id)[g.id] ?? '-'}</td></tr>`).join('') ||
            `<tr><td colspan="5">${e(curso.descricao || 'Conteúdo conforme plano do curso.')}</td></tr>`}</tbody>
          <tfoot><tr><td colspan="3">Carga horária total</td><td colspan="2">${curso.cargaHoraria}h</td></tr></tfoot>
        </table>
        <p class="doc-rodape">Turma ${e(turma.codigo)} · Professor(a) responsável: ${e(Turmas.nomeProfessor(turma) || '-')}
          · Registro ${codigo}</p>
      </section>`;
  },

  // Ficha cadastral do aluno para impressão
  fichaAluno(aluno) {
    const e = Utils.escapar;
    const matriculas = Matriculas.listar().filter((m) => m.alunoId === aluno.id);
    return `
      ${this.cabecalho('FICHA DO ALUNO')}
      <div class="doc-ficha">
        ${aluno.foto ? `<img class="doc-foto" src="${aluno.foto}" alt="">` : ''}
        ${this.dadosAluno(aluno)}
      </div>
      <section class="doc-bloco"><h3>Matrículas</h3>
        <table class="doc-tabela">
          <thead><tr><th>Turma</th><th>Curso</th><th>Data</th><th>Situação</th><th>Frequência</th><th>Média</th></tr></thead>
          <tbody>${matriculas.map((m) => {
            const t = Turmas.buscarPorId(m.turmaId);
            const f = t ? Frequencias.resumoAluno(t.id, aluno.id) : null;
            const media = t ? Notas.media(t, aluno.id) : null;
            return `<tr><td>${e(t?.codigo || '-')}</td><td>${e(t ? Turmas.nomeCurso(t) : '-')}</td>
              <td>${Utils.formatarData(m.dataMatricula)}</td><td>${e(m.status)}</td>
              <td>${f?.aulas ? `${f.percentual}%` : '-'}</td><td>${media !== null ? media.toFixed(1) : '-'}</td></tr>`;
          }).join('') || '<tr><td colspan="6">Nenhuma matrícula.</td></tr>'}</tbody>
        </table>
      </section>
      ${aluno.observacoes ? `<section class="doc-bloco"><h3>Observações</h3><p>${e(aluno.observacoes)}</p></section>` : ''}
      <footer class="doc-rodape">Impresso em ${Utils.formatarDataHora(new Date().toISOString())}</footer>`;
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
