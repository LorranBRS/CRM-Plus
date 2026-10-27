// ===== Eventos da agenda (reuniões, provas, feriados...) e feriados nacionais =====
const Eventos = {
  ...criarRepositorio('eventos'),

  TIPOS: {
    'Reunião': '🤝', 'Evento': '🎉', 'Prova': '📝', 'Feriado': '🏖️', 'Recesso': '🌴', 'Tarefa': '✅', 'Outro': '📌',
  },

  icone(tipo) {
    return this.TIPOS[tipo] || '📌';
  },

  validar(ev) {
    const erros = [];
    if (!ev.titulo) erros.push({ campo: 'titulo', msg: 'Informe o título.' });
    if (!ev.data) erros.push({ campo: 'data', msg: 'Informe a data.' });
    if (ev.dataFim && ev.data && ev.dataFim < ev.data) erros.push({ campo: 'dataFim', msg: 'A data final deve ser depois da inicial.' });
    if (!ev.diaInteiro && ev.horaInicio && ev.horaFim && ev.horaFim <= ev.horaInicio) {
      erros.push({ campo: 'horaFim', msg: 'O horário final deve ser depois do inicial.' });
    }
    return erros;
  },

  // Eventos que acontecem em um dia (inclui eventos de vários dias)
  doDia(dia) {
    return this.listar().filter((ev) => ev.data <= dia && (ev.dataFim || ev.data) >= dia)
      .sort((a, b) => (a.diaInteiro ? '' : a.horaInicio || '').localeCompare(b.diaInteiro ? '' : b.horaInicio || ''));
  },

  // Conjunto de dias sem aula (feriados/recessos marcados como "sem aula")
  diasSemAula() {
    const dias = new Set();
    this.listar().filter((ev) => ev.semAula).forEach((ev) => {
      for (let d = ev.data; d <= (ev.dataFim || ev.data); d = Utils.somarDias(d, 1)) dias.add(d);
    });
    return dias;
  },

  // Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher)
  pascoa(ano) {
    const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
    return Utils.paraISO(new Date(ano, mes - 1, dia));
  },

  feriadosNacionais(ano) {
    const p = this.pascoa(ano);
    const fixo = (md, titulo) => ({ data: `${ano}-${md}`, titulo });
    return [
      fixo('01-01', 'Confraternização Universal'),
      { data: Utils.somarDias(p, -48), titulo: 'Carnaval (segunda)' },
      { data: Utils.somarDias(p, -47), titulo: 'Carnaval (terça)' },
      { data: Utils.somarDias(p, -2), titulo: 'Sexta-feira Santa' },
      fixo('04-21', 'Tiradentes'),
      fixo('05-01', 'Dia do Trabalho'),
      { data: Utils.somarDias(p, 60), titulo: 'Corpus Christi' },
      fixo('09-07', 'Independência do Brasil'),
      fixo('10-12', 'Nossa Senhora Aparecida'),
      fixo('11-02', 'Finados'),
      fixo('11-15', 'Proclamação da República'),
      fixo('11-20', 'Dia da Consciência Negra'),
      fixo('12-25', 'Natal'),
    ].sort((a, b) => a.data.localeCompare(b.data));
  },

  // Cria os feriados que ainda não existem; retorna quantos foram criados
  importarFeriados(ano, opcoes = {}) {
    const existentes = new Set(this.listar().filter((ev) => ev.tipo === 'Feriado').map((ev) => ev.data));
    const novos = this.feriadosNacionais(ano).filter((f) => !existentes.has(f.data));
    novos.forEach((f) => this.salvar({
      titulo: f.titulo, tipo: 'Feriado', data: f.data, dataFim: '', diaInteiro: true, horaInicio: '', horaFim: '',
      local: '', descricao: 'Feriado nacional', semAula: true, turmaId: '', ...(opcoes.usuarioId ? { criadoPor: opcoes.usuarioId } : {}),
    }));
    return novos.length;
  },
};

// Junta tudo o que acontece em cada dia (aulas, vencimentos, despesas, leads, aniversários e eventos)
const Calendario = {
  // Ordem = ordem das cores da paleta validada (cor + ícone + texto: nunca só a cor)
  CAMADAS: [
    { id: 'aulas', nome: 'Aulas', icone: '🏫', cor: 'cat-1' },
    { id: 'pagar', nome: 'A pagar', icone: '💸', cor: 'cat-2', modulo: 'financeiro' },
    { id: 'receber', nome: 'A receber', icone: '💵', cor: 'cat-3', modulo: 'financeiro' },
    { id: 'leads', nome: 'Retornos (leads e propostas)', icone: '🎯', cor: 'cat-4' },
    { id: 'aniversarios', nome: 'Aniversários', icone: '🎂', cor: 'cat-5', modulo: 'alunos' },
    { id: 'feriados', nome: 'Feriados', icone: '🏖️', cor: 'cat-6' },
    { id: 'eventos', nome: 'Eventos', icone: '📌', cor: 'cat-7' },
  ],

  camadasPermitidas() {
    return this.CAMADAS.filter((c) => (c.id === 'leads' ? Sessao.pode('leads') || Sessao.pode('simulador') : !c.modulo || Sessao.pode(c.modulo)));
  },

  // Retorna { "AAAA-MM-DD": [itens] } para o intervalo [de, ate]
  itens(de, ate, camadasAtivas) {
    const ativas = new Set(camadasAtivas);
    const mapa = {};
    const add = (dia, item) => { if (dia >= de && dia <= ate) (mapa[dia] ||= []).push(item); };
    const semAula = Eventos.diasSemAula();

    if (ativas.has('eventos') || ativas.has('feriados')) {
      Eventos.listar().forEach((ev) => {
        const camada = ev.tipo === 'Feriado' || ev.tipo === 'Recesso' ? 'feriados' : 'eventos';
        if (!ativas.has(camada)) return;
        for (let d = ev.data; d <= (ev.dataFim || ev.data); d = Utils.somarDias(d, 1)) {
          add(d, { camada, titulo: ev.titulo, icone: Eventos.icone(ev.tipo), hora: ev.diaInteiro ? '' : ev.horaInicio,
            detalhe: [ev.tipo, ev.local, ev.turmaId && Turmas.buscarPorId(ev.turmaId)?.codigo, ev.semAula && 'sem aula'].filter(Boolean).join(' · '),
            ref: { tipo: 'evento', id: ev.id } });
        }
      });
    }

    if (ativas.has('aulas')) {
      const prof = Sessao.professorId();
      Turmas.listar().filter((t) => t.status !== 'Cancelada' && (t.dias || []).length && (!prof || t.professorId === prof)).forEach((t) => {
        Academico.diasDeAula(t, ate, de, semAula).forEach((d) => add(d, {
          camada: 'aulas', titulo: t.codigo, icone: '🏫', hora: t.horaInicio,
          detalhe: `${Turmas.nomeCurso(t)} · ${Turmas.nomeProfessor(t) || 'sem professor'}${t.sala ? ` · ${t.sala}` : ''}`,
          ref: { tipo: 'aula', id: t.id, data: d },
        }));
        // Mostra também as aulas suspensas por feriado
        if (ativas.has('feriados')) {
          for (let d = t.dataInicio > de ? t.dataInicio : de; d <= ate && d <= (t.dataFim || ate); d = Utils.somarDias(d, 1)) {
            if (semAula.has(d) && t.dias.includes(Academico.diaDaSemana(d))) {
              add(d, { camada: 'aulas', titulo: `${t.codigo} (suspensa)`, icone: '🚫', hora: t.horaInicio, detalhe: 'Sem aula neste dia', suspensa: true,
                ref: { tipo: 'turma', id: t.id } });
            }
          }
        }
      });
    }

    if (ativas.has('receber')) {
      Financeiro.listar().filter((l) => l.status !== 'Cancelado').forEach((l) => {
        const sit = Financeiro.situacao(l);
        add(l.vencimento, { camada: 'receber', titulo: Financeiro.nomeAluno(l), icone: sit === 'Pago' ? '✅' : sit === 'Atrasado' ? '⚠️' : '💵',
          detalhe: `${l.descricao} · ${Utils.formatarMoeda(l.valor)} · ${sit}`, valor: Number(l.valor), situacao: sit, ref: { tipo: 'receita', id: l.id } });
      });
    }

    if (ativas.has('pagar')) {
      Despesas.listar().filter((d) => d.status !== 'Cancelado').forEach((d) => {
        const sit = Despesas.situacao(d);
        add(d.vencimento, { camada: 'pagar', titulo: d.descricao, icone: sit === 'Pago' ? '✅' : sit === 'Atrasado' ? '⚠️' : '💸',
          detalhe: `${d.categoria} · ${Utils.formatarMoeda(d.valor)} · ${sit}`, valor: Number(d.valor), situacao: sit, ref: { tipo: 'despesa', id: d.id } });
      });
    }

    if (ativas.has('leads')) {
      Leads.listar().filter((l) => Sessao.pode('leads') && Leads.emAberto(l) && l.proximoContato).forEach((l) => add(l.proximoContato, {
        camada: 'leads', titulo: l.nome, icone: '🎯', detalhe: [l.etapa, Leads.nomeCurso(l), Leads.nomeResponsavel(l)].filter(Boolean).join(' · '),
        ref: { tipo: 'lead', id: l.id },
      }));
      // Propostas enviadas sem resposta: cobrar retorno
      if (Sessao.pode('simulador')) {
        const meu = Sessao.ehDiretor() ? null : Sessao.idAtual();
        Propostas.listar().filter((p) => Propostas.situacao(p) === 'Enviada' && (!meu || p.atendenteId === meu)).forEach((p) => {
          const retorno = Propostas.dataRetorno(p);
          add(retorno < Utils.hoje() ? Utils.hoje() : retorno, { camada: 'leads', titulo: `Proposta: ${p.clienteNome}`, icone: '📋',
            detalhe: `${Propostas.numero(p)} · ${p.descricao} · ${Usuarios.nome(p.atendenteId)}`, ref: { tipo: 'proposta', id: p.id } });
        });
      }
    }

    if (ativas.has('aniversarios')) {
      const anos = [...new Set([de.slice(0, 4), ate.slice(0, 4)])];
      Alunos.listar().filter((a) => a.nascimento && a.status !== 'Inativo').forEach((a) => {
        anos.forEach((ano) => {
          const idade = Number(ano) - Number(a.nascimento.slice(0, 4));
          add(`${ano}${a.nascimento.slice(4)}`, { camada: 'aniversarios', titulo: a.nome, icone: '🎂', detalhe: `${idade} anos`,
            ref: { tipo: 'aluno', id: a.id } });
        });
      });
    }

    const ordem = this.CAMADAS.map((c) => c.id);
    Object.values(mapa).forEach((lista) => lista.sort((a, b) =>
      ordem.indexOf(a.camada) - ordem.indexOf(b.camada) || (a.hora || '').localeCompare(b.hora || '')));
    return mapa;
  },
};
