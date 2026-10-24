// ===== Tela: Agenda (calendário mensal e lista) =====
const TelaCalendario = {
  mes: null,            // "AAAA-MM" exibido
  dia: null,            // dia selecionado
  visao: null,          // 'mes' | 'lista'
  CHAVE_CAMADAS: 'crmplus_camadas_agenda',
  SEMANA: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],

  iniciar() {
    $('btnNovoEvento').addEventListener('click', () => this.abrirEvento(null, this.dia));
    $('btnFeriados').addEventListener('click', () => this.importarFeriados());
    $('agendaAnterior').addEventListener('click', () => this.mudarMes(-1));
    $('agendaProximo').addEventListener('click', () => this.mudarMes(1));
    $('agendaHojeBtn').addEventListener('click', () => { this.mes = Utils.mesAtual(); this.dia = Utils.hoje(); this.renderizar(); });
    $('agendaVisao').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-visao]');
      if (btn) { this.visao = btn.dataset.visao; this.renderizar(); }
    });
    $('agendaCamadas').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-camada]');
      if (!btn) return;
      const ativas = this.camadasAtivas();
      const id = btn.dataset.camada;
      this.salvarCamadas(ativas.includes(id) ? ativas.filter((c) => c !== id) : [...ativas, id]);
      this.renderizar();
    });

    $('agendaCalendario').addEventListener('click', (e) => {
      const item = e.target.closest('[data-item]');
      if (item && this.visao === 'lista') return this.abrirItem(JSON.parse(item.dataset.item));
      const cel = e.target.closest('[data-dia]');
      if (!cel) return;
      this.dia = cel.dataset.dia;
      if (cel.dataset.dia.slice(0, 7) !== this.mes) this.mes = cel.dataset.dia.slice(0, 7);
      this.renderizar();
    });
    $('agendaCalendario').addEventListener('dblclick', (e) => {
      const cel = e.target.closest('[data-dia]');
      if (cel && this.visao === 'mes') this.abrirEvento(null, cel.dataset.dia);
    });
    $('agendaDia').addEventListener('click', (e) => {
      const novo = e.target.closest('[data-novo-evento]');
      if (novo) return this.abrirEvento(null, this.dia);
      const whats = e.target.closest('[data-whats-aluno]');
      if (whats) return Mensageiro.abrir({ tipo: 'aluno', id: whats.dataset.whatsAluno, modelo: 'Feliz aniversário' });
      const item = e.target.closest('[data-item]');
      if (item) this.abrirItem(JSON.parse(item.dataset.item));
    });

    // ---------- Formulário de evento ----------
    const form = $('formEvento');
    form.elements.tipo.innerHTML = Utils.opcoes(Object.keys(Eventos.TIPOS), { texto: (t) => `${Eventos.icone(t)} ${t}` });
    form.elements.tipo.addEventListener('change', () => {
      const t = form.elements.tipo.value;
      if (t === 'Feriado' || t === 'Recesso') {
        form.querySelector('[name=semAula]').checked = true;
        form.querySelector('[name=diaInteiro]').checked = true;
        this.ajustarHorario();
      }
    });
    form.querySelector('[name=diaInteiro]').addEventListener('change', () => this.ajustarHorario());
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const dados = Utils.lerForm(form);
      const ev = { ...dados, id: dados.id || undefined, diaInteiro: dados.diaInteiro.length > 0, semAula: dados.semAula.length > 0 };
      if (ev.diaInteiro) { ev.horaInicio = ''; ev.horaFim = ''; }
      const erros = Eventos.validar(ev);
      if (erros.length) return Utils.mostrarErros(form, erros);
      const editando = Boolean(ev.id);
      const salvo = Eventos.salvar(ev);
      Atividades.registrar('agenda', editando ? 'Evento editado' : 'Evento criado',
        `${Eventos.icone(ev.tipo)} ${ev.titulo} – ${Utils.formatarData(ev.data)}${ev.horaInicio ? ` ${ev.horaInicio}` : ''}`, { refId: salvo.id });
      Utils.fecharModal('modalEvento');
      this.dia = ev.data;
      this.mes = ev.data.slice(0, 7);
      App.renderizarAtual();
      Utils.toast(editando ? 'Evento atualizado!' : 'Evento criado!');
    });
    $('btnExcluirEvento').addEventListener('click', () => {
      const ev = Eventos.buscarPorId(form.elements.id.value);
      if (!ev || !confirm(`Excluir o evento "${ev.titulo}"?`)) return;
      Eventos.excluir(ev.id);
      Atividades.registrar('agenda', 'Evento excluído', `${ev.titulo} – ${Utils.formatarData(ev.data)}`, { refId: ev.id });
      Utils.fecharModal('modalEvento');
      App.renderizarAtual();
      Utils.toast('Evento excluído.');
    });
  },

  // Camadas visíveis (guardadas neste navegador)
  camadasAtivas() {
    const permitidas = Calendario.camadasPermitidas().map((c) => c.id);
    let salvas = null;
    try { salvas = JSON.parse(localStorage.getItem(this.CHAVE_CAMADAS)); } catch { /* ignora */ }
    return (Array.isArray(salvas) ? salvas : permitidas).filter((c) => permitidas.includes(c));
  },

  salvarCamadas(lista) {
    try { localStorage.setItem(this.CHAVE_CAMADAS, JSON.stringify(lista)); } catch { /* ignora */ }
  },

  mudarMes(delta) {
    this.mes = Utils.somarMeses(`${this.mes}-01`, delta).slice(0, 7);
    this.dia = this.mes === Utils.mesAtual() ? Utils.hoje() : `${this.mes}-01`;
    this.renderizar();
  },

  ajustarHorario() {
    const inteiro = $('formEvento').querySelector('[name=diaInteiro]').checked;
    $('formEvento').querySelectorAll('.campo-hora').forEach((el) => { el.hidden = inteiro; });
  },

  abrirEvento(ev = null, dia = null) {
    const form = $('formEvento');
    form.elements.turmaId.innerHTML = Utils.opcoes(Turmas.listar().filter((t) => Turmas.estaAberta(t) || t.id === ev?.turmaId),
      { valor: (t) => t.id, texto: (t) => `${t.codigo} – ${Turmas.nomeCurso(t)}`, vazio: 'Todas / nenhuma' });
    Utils.preencherForm(form, ev
      ? { ...ev, diaInteiro: ev.diaInteiro ? ['sim'] : [], semAula: ev.semAula ? ['sim'] : [] }
      : { tipo: 'Reunião', data: dia || Utils.hoje(), horaInicio: '09:00', horaFim: '10:00', diaInteiro: [], semAula: [] });
    $('btnExcluirEvento').hidden = !ev;
    this.ajustarHorario();
    Utils.abrirModal('modalEvento', ev ? 'Editar evento' : 'Novo evento');
  },

  importarFeriados() {
    const ano = Number(this.mes.slice(0, 4));
    const qtd = Eventos.importarFeriados(ano);
    if (qtd) Atividades.registrar('agenda', 'Feriados importados', `${qtd} feriado(s) nacional(is) de ${ano}`);
    Utils.toast(qtd ? `${qtd} feriado(s) nacional(is) de ${ano} adicionado(s)!` : `Os feriados nacionais de ${ano} já estão na agenda.`);
    this.renderizar();
  },

  // Ação ao clicar em um item da agenda
  abrirItem(ref) {
    if (ref.tipo === 'evento') this.abrirEvento(Eventos.buscarPorId(ref.id));
    if (ref.tipo === 'aula') {
      if (!Sessao.pode('academico')) return Utils.toast('Você não tem acesso ao módulo Acadêmico.', 'erro');
      TelaAcademico.abrirChamada(ref.id, ref.data <= Utils.hoje() ? ref.data : null);
    }
    if (ref.tipo === 'receita') {
      const l = Financeiro.buscarPorId(ref.id);
      if (['Pendente', 'Atrasado'].includes(Financeiro.situacao(l))) TelaFinanceiro.abrirPagamento(l);
      else FichaAluno.abrir(l.alunoId, 'financeiro');
    }
    if (ref.tipo === 'despesa') {
      const d = Despesas.buscarPorId(ref.id);
      if (['Pendente', 'Atrasado'].includes(Despesas.situacao(d))) TelaDespesas.abrirPagamento(d);
      else TelaDespesas.abrir(d);
    }
    if (ref.tipo === 'lead') TelaLeads.abrir(Leads.buscarPorId(ref.id));
    if (ref.tipo === 'aluno') FichaAluno.abrir(ref.id);
  },

  renderizar() {
    if (!this.mes) this.mes = Utils.mesAtual();
    if (!this.dia) this.dia = Utils.hoje();
    if (!this.visao) this.visao = window.innerWidth < 700 ? 'lista' : 'mes';
    const [ano, m] = this.mes.split('-').map(Number);
    $('agendaTitulo').textContent = Utils.capitalizar(new Date(ano, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
    document.querySelectorAll('#agendaVisao [data-visao]').forEach((b) => b.classList.toggle('ativo', b.dataset.visao === this.visao));

    const ativas = this.camadasAtivas();
    $('agendaCamadas').innerHTML = Calendario.camadasPermitidas().map((c) => `
      <button class="camada ${ativas.includes(c.id) ? 'ativa' : ''}" data-camada="${c.id}" aria-pressed="${ativas.includes(c.id)}">
        <i class="ponto ${c.cor}"></i>${c.icone} ${c.nome}</button>`).join('');

    // Intervalo exibido: semanas completas que cobrem o mês
    const primeiro = `${this.mes}-01`;
    const ultimo = Utils.somarDias(Utils.somarMeses(primeiro, 1), -1);
    const inicio = Utils.somarDias(primeiro, -new Date(ano, m - 1, 1).getDay());
    const fim = Utils.somarDias(ultimo, 6 - new Date(ano, m, 0).getDay());
    const itens = Calendario.itens(inicio, fim, ativas);

    $('agendaCalendario').classList.toggle('modo-lista', this.visao === 'lista');
    $('agendaCalendario').innerHTML = this.visao === 'mes'
      ? this.htmlMes(inicio, fim, itens) : this.htmlLista(primeiro, ultimo, itens);
    $('agendaDia').hidden = this.visao === 'lista';
    if (this.visao === 'mes') this.renderizarDia(itens[this.dia] || []);
  },

  chip(item) {
    const camada = Calendario.CAMADAS.find((c) => c.id === item.camada);
    return `<span class="ag-chip ${item.suspensa ? 'suspensa' : ''}" title="${Utils.escapar(`${item.titulo} – ${item.detalhe}`)}">
      <i class="ponto ${camada.cor}"></i>${item.hora ? `<b>${item.hora}</b> ` : ''}${Utils.escapar(item.titulo)}</span>`;
  },

  // Agrupa itens financeiros e aniversários do dia em um resumo
  resumirDia(lista) {
    const resumidos = [];
    const grupos = {};
    lista.forEach((i) => {
      if (['receber', 'pagar', 'aniversarios'].includes(i.camada)) (grupos[i.camada] ||= []).push(i);
      else resumidos.push(i);
    });
    Object.entries(grupos).forEach(([camada, itens]) => {
      if (itens.length === 1) return resumidos.push(itens[0]);
      const total = itens.reduce((s, i) => s + (i.valor || 0), 0);
      const nomes = { receber: 'a receber', pagar: 'a pagar', aniversarios: 'aniversários' };
      resumidos.push({ camada, titulo: `${itens.length} ${nomes[camada]}${total ? ` · ${Utils.formatarMoeda(total)}` : ''}`, detalhe: '' });
    });
    const ordem = Calendario.CAMADAS.map((c) => c.id);
    return resumidos.sort((a, b) => ordem.indexOf(a.camada) - ordem.indexOf(b.camada) || (a.hora || '').localeCompare(b.hora || ''));
  },

  htmlMes(inicio, fim, itens) {
    const hoje = Utils.hoje();
    const semAula = Eventos.diasSemAula();
    let html = `<div class="cal-semana cal-cabecalho">${this.SEMANA.map((d) => `<div>${d}</div>`).join('')}</div><div class="cal-grade">`;
    for (let d = inicio; d <= fim; d = Utils.somarDias(d, 1)) {
      const lista = this.resumirDia(itens[d] || []);
      const visiveis = lista.slice(0, 4);
      html += `
        <div class="cal-dia ${d.slice(0, 7) !== this.mes ? 'fora' : ''} ${d === hoje ? 'hoje' : ''} ${d === this.dia ? 'selecionado' : ''} ${semAula.has(d) ? 'sem-aula' : ''}"
             data-dia="${d}" role="button" tabindex="0" aria-label="${Utils.formatarData(d)}: ${(itens[d] || []).length} item(ns)">
          <span class="cal-numero">${Number(d.slice(8))}</span>
          <div class="cal-itens">${visiveis.map((i) => this.chip(i)).join('')}
            ${lista.length > 4 ? `<span class="cal-mais">+${lista.length - 4} mais</span>` : ''}</div>
        </div>`;
    }
    return `${html}</div>`;
  },

  htmlLista(primeiro, ultimo, itens) {
    const hoje = Utils.hoje();
    // No mês atual, a lista começa hoje
    const de = this.mes === Utils.mesAtual() ? hoje : primeiro;
    const dias = Object.keys(itens).filter((d) => d >= de && d <= ultimo).sort();
    if (!dias.length) return '<p class="graf-vazio">Nada na agenda neste período.</p>';
    return dias.map((d) => `
      <section class="lista-dia">
        <h4>${d === hoje ? 'Hoje · ' : ''}${Utils.dataPorExtenso(d)}</h4>
        ${this.htmlItensDia(itens[d])}
      </section>`).join('');
  },

  htmlItensDia(lista) {
    const e = Utils.escapar;
    return Calendario.CAMADAS.map((c) => {
      const doGrupo = lista.filter((i) => i.camada === c.id);
      if (!doGrupo.length) return '';
      const total = doGrupo.reduce((s, i) => s + (i.valor || 0), 0);
      return `<div class="dia-grupo">
        <h5><i class="ponto ${c.cor}"></i>${c.icone} ${c.nome} <span class="texto-suave">(${doGrupo.length}${total ? ` · ${Utils.formatarMoeda(total)}` : ''})</span></h5>
        <ul>${doGrupo.map((i) => `
          <li class="${i.ref?.tipo === 'turma' ? '' : 'clicavel'} ${i.suspensa ? 'suspensa' : ''}" ${i.ref?.tipo === 'turma' ? '' : `data-item='${e(JSON.stringify(i.ref))}'`}>
            <span class="dia-hora">${i.hora || i.icone}</span>
            <div><strong>${e(i.titulo)}</strong><small>${e(i.detalhe)}</small></div>
            ${i.camada === 'aniversarios' ? `<button class="btn-icon" data-whats-aluno="${i.ref.id}" title="Mandar parabéns">💬</button>` : ''}
          </li>`).join('')}</ul></div>`;
    }).join('');
  },

  renderizarDia(lista) {
    $('agendaDia').innerHTML = `
      <header class="dia-topo">
        <div><strong>${Utils.dataPorExtenso(this.dia)}</strong>
          <small>${lista.length ? `${lista.length} item(ns)` : 'Nada agendado'}</small></div>
        <button class="btn btn-light btn-pequeno" data-novo-evento>+ Evento</button>
      </header>
      ${lista.length ? this.htmlItensDia(lista) : '<p class="graf-vazio">Dê dois cliques num dia do calendário para criar um evento.</p>'}`;
  },
};
