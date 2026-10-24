// ===== Ficha do aluno (visão completa em uma janela) =====
const FichaAluno = {
  alunoId: null,
  aba: 'geral',

  iniciar() {
    $('fichaCorpo').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-acao]');
      if (!btn) return;
      const aluno = Alunos.buscarPorId(this.alunoId);
      const acao = btn.dataset.acao;

      if (acao === 'aba') { this.aba = btn.dataset.aba; this.renderizar(); }
      if (acao === 'whats') Mensageiro.abrir({ tipo: 'aluno', id: aluno.id });
      if (acao === 'whats-lancamento') {
        const l = Financeiro.buscarPorId(btn.dataset.id);
        Mensageiro.abrir({ tipo: 'aluno', id: aluno.id, lancamento: l,
          modelo: Financeiro.situacao(l) === 'Atrasado' ? 'Cobrança em atraso' : 'Mensalidade a vencer' });
      }
      if (acao === 'whats-faltas') {
        Mensageiro.abrir({ tipo: 'aluno', id: aluno.id, turma: Turmas.buscarPorId(btn.dataset.turma), modelo: 'Aviso de faltas' });
      }
      if (acao === 'editar') { Utils.fecharModal('modalFicha'); TelaAlunos.abrir(aluno, { aposSalvar: () => this.abrir(aluno.id) }); }
      if (acao === 'matricular') {
        Utils.fecharModal('modalFicha');
        location.hash = '#matriculas';
        TelaMatriculas.abrir(null, { alunoId: aluno.id });
      }
      if (acao === 'imprimir') Utils.imprimir(`Ficha – ${aluno.nome}`, Documentos.fichaAluno(aluno));
      if (acao === 'foto') $('inputFotoAluno').click();
      if (acao === 'remover-foto' && confirm('Remover a foto do aluno?')) {
        Alunos.salvar({ id: aluno.id, foto: '' });
        this.renderizar();
        App.renderizarAtual();
      }
      if (acao === 'certificado') Documentos.abrirConclusao(btn.dataset.id, 'certificado');
      if (acao === 'diploma') Documentos.abrirConclusao(btn.dataset.id, 'diploma');
      if (acao === 'contrato') Documentos.abrirContrato(btn.dataset.id);
      if (acao === 'conversa') {
        Utils.fecharModal('modalFicha');
        TelaConversas.abrirContato('aluno', aluno.id);
      }
    });

    $('fichaCorpo').addEventListener('submit', (e) => {
      e.preventDefault();
      const campo = e.target.elements.anotacao;
      const texto = campo.value.trim();
      if (!texto) return;
      const aluno = Alunos.buscarPorId(this.alunoId);
      const anotacoes = [...(aluno.anotacoes || []), { data: new Date().toISOString(), texto, usuarioId: Sessao.idAtual() }];
      Alunos.salvar({ id: aluno.id, anotacoes });
      Atividades.registrar('alunos', 'Anotação no aluno', `${aluno.nome}: ${texto}`, { refId: aluno.id });
      this.renderizar();
      Utils.toast('Anotação salva!');
    });

    $('inputFotoAluno').addEventListener('change', async (e) => {
      const arquivo = e.target.files[0];
      e.target.value = '';
      if (!arquivo) return;
      try {
        const foto = await Utils.lerImagem(arquivo, 240);
        Alunos.salvar({ id: this.alunoId, foto });
        this.renderizar();
        App.renderizarAtual();
        Utils.toast('Foto atualizada!');
      } catch (erro) {
        Utils.toast(erro.message, 'erro');
      }
    });
  },

  abrir(alunoId, aba = 'geral') {
    if (!Alunos.buscarPorId(alunoId)) return;
    this.alunoId = alunoId;
    this.aba = Sessao.ehProfessor() ? 'academico' : aba;
    this.renderizar();
    Utils.abrirModal('modalFicha', 'Ficha do aluno');
  },

  atualizarSeAberta() {
    if ($('modalFicha').classList.contains('aberto') && this.alunoId) this.renderizar();
  },

  idade(nascimento) {
    return Utils.idade(nascimento);
  },


  renderizar() {
    const e = Utils.escapar;
    const aluno = Alunos.buscarPorId(this.alunoId);
    const matriculas = Matriculas.listar().filter((m) => m.alunoId === aluno.id)
      .sort((a, b) => b.dataMatricula.localeCompare(a.dataMatricula));
    const lancamentos = Financeiro.listar().filter((l) => l.alunoId === aluno.id);
    const podeFin = Sessao.pode('financeiro');
    const podeEditar = Sessao.pode('alunos');

    // Resumo acadêmico das matrículas ativas
    const ativas = matriculas.filter((m) => m.status === 'Ativa');
    const freqs = ativas.map((m) => Frequencias.resumoAluno(m.turmaId, aluno.id)).filter((f) => f.aulas);
    const medias = ativas.map((m) => { const t = Turmas.buscarPorId(m.turmaId); return t ? Notas.media(t, aluno.id) : null; })
      .filter((m) => m !== null);
    const atraso = lancamentos.filter((l) => Financeiro.situacao(l) === 'Atrasado').reduce((s, l) => s + Number(l.valor), 0);
    const idade = this.idade(aluno.nascimento);

    const abas = Sessao.ehProfessor() ? [['academico', 'Acadêmico'], ['geral', 'Dados']]
      : [['geral', 'Visão geral'], ['academico', 'Acadêmico'], ...(podeFin ? [['financeiro', 'Financeiro']] : []), ['historico', 'Histórico']];
    if (!abas.some(([id]) => id === this.aba)) this.aba = 'geral';

    $('fichaCorpo').innerHTML = `
      <header class="ficha-topo">
        <div class="ficha-foto">
          ${App.avatar({ nome: aluno.nome, foto: aluno.foto }, 'avatar-ficha')}
          ${podeEditar ? `<button class="ficha-foto-btn" data-acao="foto" title="Trocar foto">📷</button>` : ''}
        </div>
        <div class="ficha-identidade">
          <h2>${e(aluno.nome)} ${Utils.badge(aluno.status)}</h2>
          <p>CPF ${e(aluno.cpf)}${idade !== null ? ` · ${idade} anos` : ''}${aluno.cidade ? ` · ${e(aluno.cidade)}/${e(aluno.uf)}` : ''}</p>
          <p>📱 ${e(aluno.telefone)} · ✉️ ${e(aluno.email)}</p>
          ${aluno.foto && podeEditar ? '<button class="link link-pequeno" data-acao="remover-foto">remover foto</button>' : ''}
        </div>
        <div class="ficha-botoes">
          <button class="btn btn-whatsapp" data-acao="whats">💬 WhatsApp</button>
          ${Sessao.pode('conversas') ? '<button class="btn btn-light" data-acao="conversa">🗨️ Conversa</button>' : ''}
          ${podeEditar ? '<button class="btn btn-light" data-acao="editar">✏️ Editar</button>' : ''}
          ${Sessao.pode('matriculas') ? '<button class="btn btn-light" data-acao="matricular">📝 Matricular</button>' : ''}
          ${Sessao.ehProfessor() ? '' : '<button class="btn btn-light" data-acao="imprimir">🖨️ Imprimir</button>'}
        </div>
      </header>

      <section class="ficha-resumo">
        <div><span>Matrículas ativas</span><strong>${ativas.length}</strong></div>
        <div><span>Frequência</span><strong>${freqs.length ? `${Math.round(freqs.reduce((s, f) => s + f.percentual, 0) / freqs.length)}%` : '-'}</strong></div>
        <div><span>Média geral</span><strong>${medias.length ? (medias.reduce((s, m) => s + m, 0) / medias.length).toFixed(1).replace('.', ',') : '-'}</strong></div>
        ${podeFin ? `<div><span>Em atraso</span><strong class="${atraso ? 'texto-perigo' : ''}">${Utils.formatarMoeda(atraso)}</strong></div>` : ''}
      </section>

      <nav class="ficha-abas">${abas.map(([id, nome]) =>
        `<button class="${this.aba === id ? 'ativo' : ''}" data-acao="aba" data-aba="${id}">${nome}</button>`).join('')}</nav>

      <div class="ficha-conteudo">${this[`aba_${this.aba}`](aluno, matriculas, lancamentos)}</div>`;
  },

  aba_geral(aluno, matriculas) {
    const e = Utils.escapar;
    const endereco = [aluno.endereco, aluno.numero, aluno.bairro, aluno.cidade && `${aluno.cidade}/${aluno.uf}`, aluno.cep]
      .filter(Boolean).join(', ');
    const campo = (rotulo, valor) => `<div><span>${rotulo}</span><p>${valor || '-'}</p></div>`;
    return `
      <div class="ficha-dados">
        ${campo('Data de nascimento', Utils.formatarData(aluno.nascimento))}
        ${campo('Curso de interesse', e(aluno.curso))}
        ${campo('Endereço', e(endereco))}
        ${campo('Cadastrado em', `${Utils.formatarData(aluno.criadoEm)}${aluno.criadoPor ? ` por ${e(Usuarios.nome(aluno.criadoPor))}` : ''}`)}
        ${aluno.observacoes ? `<div class="ficha-dados-largo"><span>Observações</span><p>${e(aluno.observacoes)}</p></div>` : ''}
      </div>
      ${Sessao.ehProfessor() ? '' : `<h3 class="titulo-secao">Matrículas</h3>
      ${matriculas.length ? `<div class="table-wrap table-plana"><table>
        <thead><tr><th>Turma</th><th>Data</th><th>Mensalidade</th><th>Atendente</th><th>Status</th><th></th></tr></thead>
        <tbody>${matriculas.map((m) => {
          const t = Turmas.buscarPorId(m.turmaId);
          return `<tr><td><strong>${e(t?.codigo || '-')}</strong><small>${e(t ? Turmas.nomeCurso(t) : '')}</small></td>
            <td>${Utils.formatarData(m.dataMatricula)}</td><td>${Utils.formatarMoeda(m.valorFinal)}</td>
            <td>${e(Usuarios.nome(m.criadoPor)) || '-'}</td><td>${Utils.badge(m.status)}</td>
            <td class="acoes">${Sessao.pode('matriculas') ? `<button class="btn-icon" data-acao="contrato" data-id="${m.id}" title="Contrato${m.contratoNumero ? ` Nº ${m.contratoNumero}` : ''}">📄</button>` : ''}</td></tr>`;
        }).join('')}</tbody></table></div>` : '<p class="graf-vazio">Nenhuma matrícula ainda.</p>'}`}`;
  },

  aba_academico(aluno, matriculas) {
    const e = Utils.escapar;
    const prof = Sessao.professorId();
    const comTurma = matriculas.filter((m) => m.status !== 'Cancelada').map((m) => ({ m, t: Turmas.buscarPorId(m.turmaId) }))
      .filter((x) => x.t && (!prof || x.t.professorId === prof));
    if (!comTurma.length) return '<p class="graf-vazio">Nenhuma matrícula com turma.</p>';
    const minFreq = Academico.frequenciaMinima();
    return comTurma.map(({ m, t }) => {
      const f = Frequencias.resumoAluno(t.id, aluno.id);
      const media = Notas.media(t, aluno.id);
      const situacao = Notas.situacao(t, aluno.id);
      const notas = Notas.notasDoAluno(t.id, aluno.id);
      const baixa = f.aulas && f.percentual < minFreq;
      return `
        <article class="ficha-turma">
          <header>
            <div><strong>${e(t.codigo)} – ${e(Turmas.nomeCurso(t))}</strong>
              <small>${e(Turmas.nomeProfessor(t) || 'Professor a definir')} · ${e((t.dias || []).join(', '))} ${e(t.horaInicio || '')}</small></div>
            ${Utils.badge(situacao)}
          </header>
          <div class="ficha-turma-corpo">
            <div>
              <span class="rotulo">Frequência</span>
              <div class="barra-frequencia ${baixa ? 'baixa' : ''}"><span style="width:${f.percentual}%"></span></div>
              <p>${f.aulas ? `<strong>${f.percentual}%</strong> · ${f.faltas} falta(s)${f.justificadas ? `, ${f.justificadas} justificada(s)` : ''} em ${f.aulas} aula(s)` : 'Nenhuma aula registrada'}</p>
              ${baixa ? `<button class="link link-pequeno" data-acao="whats-faltas" data-turma="${t.id}">💬 Avisar sobre as faltas</button>` : ''}
            </div>
            <div>
              <span class="rotulo">Notas</span>
              <ul class="ficha-notas">${Notas.avaliacoes(t).map((a) =>
                `<li><span>${e(a.nome)}</span><strong>${notas[a.id] ?? '–'}</strong></li>`).join('')}</ul>
              <p>Média: <strong>${media !== null ? media.toFixed(1).replace('.', ',') : '-'}</strong></p>
            </div>
          </div>
          ${situacao === 'Aprovado' && Sessao.pode('academico') && !Sessao.ehProfessor() ? `<footer class="botoes-documentos">
            <button class="btn btn-primary" data-acao="certificado" data-id="${m.id}">🎓 ${m.certificadoNumero
              ? `Certificado Nº ${String(m.certificadoNumero).padStart(6, '0')}` : 'Emitir certificado'}</button>
            <button class="btn btn-primary" data-acao="diploma" data-id="${m.id}">📜 ${m.diplomaNumero
              ? `Diploma Nº ${String(m.diplomaNumero).padStart(6, '0')}` : 'Emitir diploma'}</button></footer>` : ''}
        </article>`;
    }).join('');
  },

  aba_financeiro(aluno, matriculas, lancamentos) {
    const e = Utils.escapar;
    if (!lancamentos.length) return '<p class="graf-vazio">Nenhum lançamento financeiro.</p>';
    const lista = [...lancamentos].sort((a, b) => a.vencimento.localeCompare(b.vencimento));
    const soma = (fn) => lista.filter(fn).reduce((s, l) => s + Number(l.status === 'Pago' ? l.valorPago : l.valor), 0);
    return `
      <div class="ficha-totais">
        <span>Pago: <strong>${Utils.formatarMoeda(soma((l) => l.status === 'Pago'))}</strong></span>
        <span>A vencer: <strong>${Utils.formatarMoeda(soma((l) => Financeiro.situacao(l) === 'Pendente'))}</strong></span>
        <span>Em atraso: <strong class="texto-perigo">${Utils.formatarMoeda(soma((l) => Financeiro.situacao(l) === 'Atrasado'))}</strong></span>
      </div>
      <div class="table-wrap table-plana"><table>
        <thead><tr><th>Descrição</th><th>Vencimento</th><th>Valor</th><th>Situação</th><th></th></tr></thead>
        <tbody>${lista.map((l) => {
          const sit = Financeiro.situacao(l);
          return `<tr><td>${e(l.descricao)}${l.dataPagamento ? `<small>Pago em ${Utils.formatarData(l.dataPagamento)} · ${e(l.formaPagamento)}</small>` : ''}</td>
            <td>${Utils.formatarData(l.vencimento)}</td><td>${Utils.formatarMoeda(l.valor)}</td><td>${Utils.badge(sit)}</td>
            <td class="acoes">${['Pendente', 'Atrasado'].includes(sit)
              ? `<button class="btn-icon" data-acao="whats-lancamento" data-id="${l.id}" title="Enviar lembrete/cobrança">💬</button>` : ''}</td></tr>`;
        }).join('')}</tbody></table></div>`;
  },

  aba_historico(aluno, matriculas, lancamentos) {
    const e = Utils.escapar;
    const refs = new Set([aluno.id, ...matriculas.map((m) => m.id), ...lancamentos.map((l) => l.id)]);
    const eventos = [
      ...(aluno.anotacoes || []).map((a) => ({ data: a.data, icone: '📝', titulo: 'Anotação', texto: a.texto, usuario: Usuarios.nome(a.usuarioId) })),
      ...Mensagens.doContato('aluno', aluno.id).map((m) => ({ data: m.data, icone: m.direcao === 'enviada' ? '💬' : '📩',
        titulo: m.direcao === 'enviada' ? 'Mensagem enviada' : 'Resposta recebida', texto: m.texto, usuario: Usuarios.nome(m.usuarioId) })),
      ...Atividades.listar().filter((a) => refs.has(a.refId) && !['Anotação no aluno', 'Mensagem enviada', 'Resposta registrada'].includes(a.acao))
        .map((a) => ({ data: a.data, icone: TelaAtividades.ICONES[a.modulo] || '•', titulo: a.acao, texto: a.descricao, usuario: a.usuarioNome })),
    ].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 80);

    return `
      <form class="ficha-anotacao">
        <textarea name="anotacao" rows="2" placeholder="Nova anotação sobre o aluno (atendimento, combinado, observação...)"></textarea>
        <button type="submit" class="btn btn-primary">Salvar</button>
      </form>
      <ul class="timeline">${eventos.map((ev) => `
        <li><span class="avatar">${ev.icone}</span>
          <div><p><strong>${e(ev.titulo)}</strong>${ev.usuario ? ` · <span class="texto-suave">${e(ev.usuario)}</span>` : ''}</p>
            <p class="descricao-atividade">${e(ev.texto)}</p></div>
          <time>${Utils.formatarDataHora(ev.data)}</time></li>`).join('') ||
        '<li class="graf-vazio">Nenhum registro ainda.</li>'}</ul>`;
  },
};
