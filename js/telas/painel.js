// ===== Tela: Painel (visão geral) =====
const TelaPainel = {
  iniciar() {
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

  renderizar() {
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
