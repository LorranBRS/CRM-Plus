// ===== Tela: Painel (visão geral) =====
const TelaPainel = {
  iniciar() {
    $('listaContatos').addEventListener('click', (e) => {
      const item = e.target.closest('[data-lead]');
      if (item) TelaLeads.abrir(Leads.buscarPorId(item.dataset.lead));
    });
    $('listaAtrasos').addEventListener('click', (e) => {
      const item = e.target.closest('[data-lancamento]');
      if (item) TelaFinanceiro.abrirPagamento(Financeiro.buscarPorId(item.dataset.lancamento));
    });
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
      </li>`).join('') + (atrasos.length > 6
        ? `<li><a href="#financeiro" class="link-mais" id="verTodosAtrasos">Ver todos os ${atrasos.length} lançamentos em atraso →</a></li>` : '')
      : '<li class="graf-vazio">Nenhuma mensalidade em atraso. 🎉</li>';

    const verTodos = $('verTodosAtrasos');
    if (verTodos) verTodos.onclick = () => { $('filtroSituacaoFinanceiro').value = 'Atrasado'; $('filtroMesFinanceiro').value = ''; };
  },
};
