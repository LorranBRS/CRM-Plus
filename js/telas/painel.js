// ===== Tela: Painel (visão geral) =====
const TelaPainel = {
  iniciar() {
    $('conteudoPainelPropostas').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-acao]');
      if (btn) TelaSimulador.acaoProposta(btn.dataset.acao, btn.dataset.id);
    });
    $('linkPainelPropostas').addEventListener('click', () => { TelaSimulador.aba = 'propostas'; });
    $('btnBackupPainel').addEventListener('click', () => TelaRelatorios.baixarBackup());
    $('painelProfessor').addEventListener('click', (e) => {
      const chamada = e.target.closest('[data-chamada]');
      if (chamada) return TelaAcademico.abrirChamada(chamada.dataset.chamada, chamada.dataset.data);
      const ficha = e.target.closest('[data-ficha]');
      if (ficha) FichaAluno.abrir(ficha.dataset.ficha);
    });
    $('listaContatos').addEventListener('click', (e) => {
      const item = e.target.closest('[data-lead]');
      if (item) TelaLeads.abrir(Leads.buscarPorId(item.dataset.lead));
    });
    $('listaAtrasos').addEventListener('click', (e) => {
      const whats = e.target.closest('[data-whats]');
      if (whats) {
        const l = Financeiro.buscarPorId(whats.dataset.whats);
        return Mensageiro.abrir({ tipo: 'aluno', id: l.alunoId, lancamento: l, modelo: 'Cobrança em atraso' });
      }
      const item = e.target.closest('[data-lancamento]');
      if (item) TelaFinanceiro.abrirPagamento(Financeiro.buscarPorId(item.dataset.lancamento));
    });
  },

  // Diretor: descontos para aprovar · Atendente: propostas liberadas/recusadas e retornos
  renderizarPropostas() {
    const e = Utils.escapar;
    if (!Sessao.pode('simulador')) { $('painelPropostas').hidden = true; return; }
    const diretor = Sessao.ehDiretor();
    const eu = Sessao.idAtual();
    const item = (p, detalhe, botoes) => `<li>
      <div><strong>${Propostas.numero(p)} – ${e(p.clienteNome)}</strong><small>${detalhe}</small></div>
      <span class="painel-prop-botoes">${botoes}</span></li>`;
    const btn = (acao, id, texto, classe = 'btn-light') => `<button class="btn ${classe} btn-pequeno" data-acao="${acao}" data-id="${id}">${texto}</button>`;
    const grupos = [];

    if (diretor) {
      const pedidos = Propostas.aguardandoAprovacao();
      if (pedidos.length) {
        grupos.push(`<h4 class="titulo-secao">🔒 Descontos aguardando sua aprovação (${pedidos.length})</h4><ul class="lista-simples">${pedidos.map((p) => item(p,
          `${e(Usuarios.nome(p.atendenteId))} pede <strong>${String(p.descontoExtra).replace('.', ',')}%</strong> de desconto · ${e(p.cursoNome)} · ${e(p.descricao)}`,
          btn('aprovar', p.id, '✅ Aprovar', 'btn-primary') + btn('recusar-desconto', p.id, '⛔ Recusar'))).join('')}</ul>`);
      }
    } else {
      const liberadas = Propostas.listar().filter((p) => p.atendenteId === eu && p.status === 'Aberta' && p.aprovacao?.status === 'Aprovado');
      const negadas = Propostas.listar().filter((p) => p.atendenteId === eu && p.status === 'Desconto recusado' &&
        Utils.noPeriodo(p.aprovacao?.em, Utils.periodo('7dias')));
      if (liberadas.length) {
        grupos.push(`<h4 class="titulo-secao">✅ Desconto aprovado – pronto para enviar</h4><ul class="lista-simples">${liberadas.map((p) => item(p,
          `${e(p.descricao)}${p.aprovacao.comentario ? ` · “${e(p.aprovacao.comentario)}”` : ''}`, btn('abrir', p.id, '📂 Abrir e enviar', 'btn-primary'))).join('')}</ul>`);
      }
      if (negadas.length) {
        grupos.push(`<h4 class="titulo-secao">⛔ Desconto não aprovado</h4><ul class="lista-simples">${negadas.map((p) => item(p,
          `${String(p.descontoExtra).replace('.', ',')}% recusado${p.aprovacao.comentario ? ` · “${e(p.aprovacao.comentario)}”` : ''}`, btn('ver', p.id, '🕒 Ver'))).join('')}</ul>`);
      }
    }
    const retornos = Propostas.aguardandoRetorno(diretor ? null : eu);
    if (retornos.length) {
      grupos.push(`<h4 class="titulo-secao">⏰ Propostas sem resposta – cobrar retorno (${retornos.length})</h4><ul class="lista-simples">${retornos.slice(0, 6).map((p) => item(p,
        `${e(p.descricao)} · enviada em ${Utils.formatarData(p.ultimoEnvio)}${diretor ? ` · ${e(Usuarios.nome(p.atendenteId))}` : ''}`,
        (p.clienteId ? btn('reenviar', p.id, '💬 Cobrar') : '') + btn('cliente-recusou', p.id, '👎 Recusou'))).join('')}</ul>`);
    }
    $('painelPropostas').hidden = !grupos.length;
    $('tituloPainelPropostas').textContent = diretor ? 'Propostas – pendências' : 'Minhas propostas';
    $('conteudoPainelPropostas').innerHTML = grupos.join('');
  },

  // Barras de progresso das metas do mês
  renderizarMetas() {
    const e = Utils.escapar;
    const mes = Utils.mesAtual();
    const doc = Metas.doMes(mes);
    const linha = (rotulo, icone, ind, p) => {
      const st = Metas.status(p);
      return `<div class="meta-linha">
        <span class="meta-linha-nome">${icone} ${e(rotulo)}</span>
        <div class="meta-barra"><span class="meta-${st.classe}" style="width:${Math.min(100, p.pct || 0)}%"></span></div>
        <span class="meta-linha-valor"><strong>${Metas.formatar(ind, p.realizado)}</strong> / ${Metas.formatar(ind, p.meta)}</span>
        <span class="badge badge-${st.classe}">${st.icone} ${p.pct}%</span>
      </div>`;
    };
    const escola = Metas.indicadoresVisiveis().map((i) => ({ i, p: Metas.progresso(mes, i.id) })).filter(({ p }) => p.meta);
    let html = escola.map(({ i, p }) => linha(i.nome, i.icone, i.id, p)).join('');

    // Funcionário vê as próprias metas; o diretor vê as de cada um (matrículas)
    if (Sessao.ehDiretor()) {
      const individuais = Usuarios.ativos().map((u) => ({ u, p: Metas.progresso(mes, 'matriculas', u.id) })).filter(({ p }) => p.meta);
      if (individuais.length) html += `<h4 class="titulo-secao">Matrículas por funcionário</h4>${individuais.map(({ u, p }) => linha(u.nome, '👤', 'matriculas', p)).join('')}`;
    } else {
      const minhas = Metas.INDICADORES.filter((i) => i.individual).map((i) => ({ i, p: Metas.progresso(mes, i.id, Sessao.idAtual()) })).filter(({ p }) => p.meta);
      if (minhas.length) html += `<h4 class="titulo-secao">Minhas metas</h4>${minhas.map(({ i, p }) => linha(i.nome, i.icone, i.id, p)).join('')}`;
    }
    $('painelMetas').hidden = !html && !Sessao.ehDiretor();
    $('tituloMetasPainel').textContent = `Metas de ${new Date().toLocaleDateString('pt-BR', { month: 'long' })}`;
    $('metasPainel').innerHTML = html || `<p class="graf-vazio">Nenhuma meta definida para este mês. ${doc.id ? '' : 'Clique em "definir metas".'}</p>`;
  },

  // O que acontece hoje (aulas, eventos, vencimentos, retornos...)
  renderizarHoje() {
    const e = Utils.escapar;
    const hoje = Utils.hoje();
    const itens = Calendario.itens(hoje, hoje, Calendario.camadasPermitidas().map((c) => c.id))[hoje] || [];
    const resumidos = TelaCalendario.resumirDia(itens);
    $('agendaHoje').innerHTML = resumidos.slice(0, 8).map((i) => {
      const c = Calendario.CAMADAS.find((x) => x.id === i.camada);
      return `<li><div><strong><i class="ponto ${c.cor}"></i>${i.hora ? `${i.hora} · ` : ''}${e(i.titulo)}</strong>
        ${i.detalhe ? `<small>${e(i.detalhe)}</small>` : ''}</div><span class="texto-suave">${c.icone}</span></li>`;
    }).join('') + (resumidos.length > 8 ? `<li><a href="#agenda" class="link-mais">+${resumidos.length - 8} itens na agenda →</a></li>` : '')
      || '<li class="graf-vazio">Nada na agenda para hoje.</li>';
  },

  // Painel exclusivo do perfil Professor
  renderizarProfessor() {
    const e = Utils.escapar;
    const prof = Sessao.professorId();
    const hoje = Utils.hoje();
    const turmas = Turmas.listar().filter((t) => t.professorId === prof && Turmas.estaAberta(t));
    const alunos = turmas.flatMap((t) => Academico.alunosDaTurma(t.id, ['Ativa']).map((x) => ({ ...x, turma: t })));
    const semAula = Eventos.diasSemAula();
    const aulasHoje = turmas.filter((t) => Academico.diasDeAula(t, hoje, hoje, semAula).length);
    const pendentes = turmas.flatMap((t) => Academico.diasDeAula(t, Utils.somarDias(hoje, -1), null, semAula)
      .filter((d) => !Frequencias.buscarAula(t.id, d)).slice(-5).map((d) => ({ t, d })));
    const baixa = alunos.map((x) => ({ ...x, f: Frequencias.resumoAluno(x.turma.id, x.aluno.id) }))
      .filter((x) => x.f.aulas && x.f.percentual < Academico.frequenciaMinima()).sort((a, b) => a.f.percentual - b.f.percentual);
    const eventos = Eventos.listar().filter((ev) => (ev.dataFim || ev.data) >= hoje && ev.data <= Utils.somarDias(hoje, 14)
      && (!ev.turmaId || turmas.some((t) => t.id === ev.turmaId))).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 6);
    const proximas = [];
    for (let d = hoje; d <= Utils.somarDias(hoje, 6) && proximas.length < 6; d = Utils.somarDias(d, 1)) {
      turmas.filter((t) => Academico.diasDeAula(t, d, d, semAula).length).forEach((t) => proximas.push({ t, d }));
    }

    $('painelProfessor').innerHTML = `
      <section class="cards">
        <div class="card"><span>Minhas turmas</span><strong>${turmas.length}</strong></div>
        <div class="card"><span>Alunos</span><strong>${alunos.length}</strong></div>
        <div class="card"><span>Aulas hoje</span><strong>${aulasHoje.length}</strong></div>
        <div class="card ${pendentes.length ? 'card-alerta' : ''}"><span>Chamadas pendentes</span><strong>${pendentes.length}</strong></div>
      </section>
      <section class="paineis">
        <article class="painel">
          <h3>Próximas aulas</h3>
          <ul class="lista-simples">${proximas.map(({ t, d }) => `
            <li><div><strong>${d === hoje ? 'Hoje' : Utils.dataPorExtenso(d)} · ${e(t.horaInicio || '')}–${e(t.horaFim || '')}</strong>
              <small>${e(t.codigo)} – ${e(Turmas.nomeCurso(t))}${t.sala ? ` · ${e(t.sala)}` : ''}</small></div>
              ${d === hoje ? `<button class="btn btn-primary btn-pequeno" data-chamada="${t.id}" data-data="${d}">Fazer chamada</button>` : ''}</li>`).join('')
            || '<li class="graf-vazio">Nenhuma aula nos próximos 7 dias.</li>'}</ul>
        </article>
        <article class="painel">
          <h3>Chamadas pendentes</h3>
          <ul class="lista-simples">${pendentes.map(({ t, d }) => `
            <li class="clicavel" data-chamada="${t.id}" data-data="${d}"><div><strong>${Utils.dataPorExtenso(d)}</strong>
              <small>${e(t.codigo)} – ${e(Turmas.nomeCurso(t))}</small></div><span class="texto-alerta">Registrar →</span></li>`).join('')
            || '<li class="graf-vazio">Tudo em dia! ✅</li>'}</ul>
        </article>
        <article class="painel">
          <h3>Alunos com frequência baixa</h3>
          <ul class="lista-simples">${baixa.slice(0, 8).map((x) => `
            <li class="clicavel" data-ficha="${x.aluno.id}"><div><strong>${e(x.aluno.nome)}</strong>
              <small>${e(x.turma.codigo)} · ${x.f.faltas} falta(s)</small></div><span class="texto-perigo">${x.f.percentual}%</span></li>`).join('')
            || '<li class="graf-vazio">Nenhum aluno abaixo do mínimo.</li>'}</ul>
        </article>
        <article class="painel">
          <h3>Próximos eventos <a href="#agenda" class="link-mais">agenda →</a></h3>
          <ul class="lista-simples">${eventos.map((ev) => `
            <li><div><strong>${Eventos.icone(ev.tipo)} ${e(ev.titulo)}</strong>
              <small>${Utils.dataPorExtenso(ev.data)}${ev.horaInicio ? ` · ${ev.horaInicio}` : ''}${ev.local ? ` · ${e(ev.local)}` : ''}</small></div></li>`).join('')
            || '<li class="graf-vazio">Nenhum evento nos próximos 14 dias.</li>'}</ul>
        </article>
        <article class="painel painel-largo">
          <h3>Minha semana</h3>
          <div id="agendaPainelProfessor"></div>
        </article>
      </section>`;
    Agenda.render($('agendaPainelProfessor'), turmas, { mostrar: 'curso' });
  },

  renderizar() {
    const professor = Sessao.ehProfessor();
    $('painelProfessor').hidden = !professor;
    $('painelKpis').hidden = professor;
    $('painelEquipe').hidden = professor;
    // Lembrete de backup (diretor)
    const lembrar = Sessao.ehDiretor() && Backup.precisaLembrar();
    $('avisoBackup').hidden = !lembrar;
    if (lembrar) {
      const dias = Backup.diasSemDownload();
      $('avisoBackupTitulo').textContent = dias === null ? 'Você ainda não baixou nenhum backup dos dados' : `Seu último backup foi há ${dias} dias`;
    }
    if (professor) {
      $('painelData').textContent = `Olá, ${Sessao.usuario().nome.split(' ')[0]}! ${Utils.dataPorExtenso(Utils.hoje())}`;
      return this.renderizarProfessor();
    }
    const hoje = Utils.hoje();
    $('painelData').textContent = new Date().toLocaleDateString('pt-BR',
      { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

    // Indicadores
    const fin = Financeiro.estatisticas();
    $('kpiAlunos').textContent = Alunos.estatisticas().ativos;
    $('kpiMatriculas').textContent = Matriculas.estatisticas().ativas;
    $('kpiLeads').textContent = Leads.estatisticas().abertos;
    $('kpiRecebido').textContent = Utils.formatarMoeda(fin.recebido);
    $('kpiAtraso').textContent = Utils.formatarMoeda(fin.atraso);
    if (Sessao.ehDiretor()) {
      const lucro = Resultado.doMes(Utils.mesAtual()).lucro;
      $('kpiLucro').textContent = Utils.formatarMoeda(lucro);
      $('kpiLucro').className = lucro < 0 ? 'texto-perigo' : 'texto-sucesso';
    }
    this.renderizarMetas();
    this.renderizarPropostas();
    this.renderizarHoje();

    // Receita dos últimos 6 meses
    const meses = [];
    for (let i = 5; i >= 0; i--) meses.push(Utils.somarMeses(`${Utils.mesAtual()}-01`, -i).slice(0, 7));
    Graficos.colunas($('grafReceita'),
      meses.map((m) => {
        const t = Financeiro.totaisDoMes(m);
        return { rotulo: Utils.nomeMes(m), valores: [t.previsto, t.recebido] };
      }),
      [{ nome: 'Previsto', classe: 'serie-2' }, { nome: 'Recebido', classe: 'serie-1' }],
      { formatar: Utils.formatarMoeda });

    // Funil e origem dos leads
    Graficos.barrasH($('grafFunil'), Leads.contarPor('etapa', Leads.ETAPAS));
    Graficos.barrasH($('grafOrigem'),
      Leads.contarPor('origem', Leads.ORIGENS).filter((i) => i.valor).sort((a, b) => b.valor - a.valor));

    // Ocupação das turmas abertas
    Graficos.barrasH($('grafOcupacao'),
      Turmas.listar().filter((t) => Turmas.estaAberta(t)).map((t) => {
        const ocup = Matriculas.ocupadas(t.id);
        return {
          rotulo: t.codigo,
          valor: Math.round((ocup / t.vagas) * 100),
          texto: `${ocup}/${t.vagas}`,
          dica: `${t.codigo} – ${Turmas.nomeCurso(t)}: ${ocup} de ${t.vagas} vagas (${Math.round((ocup / t.vagas) * 100)}%)`,
        };
      }).sort((a, b) => b.valor - a.valor),
      { max: 100 });

    // Atividades recentes (diretor)
    if (Sessao.pode('atividades')) {
      const recentes = Atividades.filtrar().filter((a) => a.acao !== 'Entrada').slice(0, 8);
      $('painelAtividades').innerHTML = recentes.length ? TelaAtividades.itens(recentes)
        : '<li class="graf-vazio">Nenhuma atividade registrada ainda.</li>';
    }

    // Próximos contatos (funcionário vê os seus)
    const meu = Sessao.ehDiretor() ? null : Sessao.idAtual();
    $('tituloContatos').textContent = meu ? 'Meus próximos contatos (7 dias)' : 'Próximos contatos (7 dias)';
    const contatos = Leads.proximosContatos(7, meu).slice(0, 8);
    $('listaContatos').innerHTML = contatos.length ? contatos.map((l) => `
      <li data-lead="${l.id}" class="clicavel">
        <div><strong>${Utils.escapar(l.nome)}</strong>
          <small>${Utils.escapar([l.etapa, Leads.nomeCurso(l), !meu && Leads.nomeResponsavel(l)].filter(Boolean).join(' · '))}</small></div>
        <span class="${l.proximoContato < hoje ? 'texto-perigo' : ''}">
          ${l.proximoContato < hoje ? '⚠ ' : ''}${Utils.formatarData(l.proximoContato)}</span>
      </li>`).join('') : '<li class="graf-vazio">Nenhum contato agendado.</li>';

    // Mensalidades em atraso
    const atrasos = Financeiro.atrasados().sort((a, b) => a.vencimento.localeCompare(b.vencimento));
    $('listaAtrasos').innerHTML = atrasos.length ? atrasos.slice(0, 6).map((l) => `
      <li data-lancamento="${l.id}" class="clicavel" title="Registrar pagamento">
        <div><strong>${Utils.escapar(Financeiro.nomeAluno(l))}</strong>
          <small>${Utils.escapar(l.descricao)} · venceu ${Utils.formatarData(l.vencimento)}</small></div>
        <span class="texto-perigo">${Utils.formatarMoeda(l.valor)}</span>
        <button class="btn-icon" data-whats="${l.id}" title="Cobrar por WhatsApp">💬</button>
      </li>`).join('') + (atrasos.length > 6
        ? `<li><a href="#financeiro" class="link-mais" id="verTodosAtrasos">Ver todos os ${atrasos.length} lançamentos em atraso →</a></li>` : '')
      : '<li class="graf-vazio">Nenhuma mensalidade em atraso. 🎉</li>';

    const verTodos = $('verTodosAtrasos');
    if (verTodos) verTodos.onclick = () => { $('filtroSituacaoFinanceiro').value = 'Atrasado'; $('filtroMesFinanceiro').value = ''; };
  },
};
