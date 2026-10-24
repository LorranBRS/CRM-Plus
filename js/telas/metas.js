// ===== Tela: Metas (somente diretor) =====
const TelaMetas = {
  iniciar() {
    $('mesMetas').value = Utils.mesAtual();
    $('mesMetas').addEventListener('change', () => this.renderizar());
    $('btnSalvarMetas').addEventListener('click', () => this.salvar());
    $('btnCopiarMetas').addEventListener('click', () => this.copiarAnterior());
    // Atualiza as barras enquanto digita
    $('metasEscola').addEventListener('input', (e) => {
      if (e.target.matches('[data-meta]')) this.atualizarCartao(e.target.closest('.meta-cartao'));
    });
  },

  mes() {
    return $('mesMetas').value || Utils.mesAtual();
  },

  barra(p) {
    const st = Metas.status(p);
    return `<div class="meta-barra"><span class="meta-${st.classe}" style="width:${Math.min(100, p.pct || 0)}%"></span></div>
      <div class="meta-rodape"><span class="badge badge-${st.classe}">${st.texto}</span>
        <span>${p.pct !== null ? `${st.icone} ${p.pct}%` : ''}</span></div>`;
  },

  renderizar() {
    const e = Utils.escapar;
    const mes = this.mes();
    const doc = Metas.doMes(mes);
    const atual = mes === Utils.mesAtual();
    $('metasInfo').textContent = doc.id ? (atual ? 'Mês em andamento' : mes < Utils.mesAtual() ? 'Mês encerrado' : 'Mês futuro')
      : 'Nenhuma meta definida para este mês ainda';

    // Metas da escola
    $('metasEscola').innerHTML = Metas.INDICADORES.map((ind) => {
      const p = Metas.progresso(mes, ind.id);
      return `<article class="painel meta-cartao" data-indicador="${ind.id}">
        <header><span class="meta-icone">${ind.icone}</span><strong>${ind.nome}</strong></header>
        <label class="meta-input">Meta
          <input type="number" data-meta="${ind.id}" min="0" step="${ind.tipo === 'moeda' ? '0.01' : '1'}" value="${doc.valores?.[ind.id] ?? ''}" placeholder="Definir">
        </label>
        <p class="meta-realizado"><span>Realizado</span><strong>${Metas.formatar(ind.id, p.realizado)}</strong></p>
        <div class="meta-progresso">${this.barra(p)}</div>
        ${p.projecao !== null ? `<p class="ajuda meta-projecao">No ritmo atual: <strong>${Metas.formatar(ind.id, p.projecao)}</strong> até o fim do mês</p>` : ''}
      </article>`;
    }).join('');

    // Metas individuais (funcionários e diretores ativos)
    const individuais = Metas.INDICADORES.filter((i) => i.individual);
    const usuarios = Usuarios.ativos();
    $('metasIndividuais').innerHTML = `<table>
      <thead><tr><th>Funcionário</th>${individuais.map((i) => `<th>${i.icone} ${i.nome}</th>`).join('')}</tr></thead>
      <tbody>${usuarios.map((u) => `<tr data-usuario="${u.id}">
        <td><div class="celula-usuario">${App.avatar(u)}<div><strong>${e(u.nome)}</strong><small>${e(Usuarios.descricao(u))}</small></div></div></td>
        ${individuais.map((i) => {
          const p = Metas.progresso(mes, i.id, u.id);
          return `<td><div class="meta-individual">
            <input type="number" class="input-nota" data-individual="${i.id}" min="0" step="1" value="${doc.individuais?.[u.id]?.[i.id] ?? ''}" placeholder="–">
            <span><strong>${p.realizado}</strong> realizado${p.pct !== null ? ` · ${Metas.status(p).icone} ${p.pct}%` : ''}</span>
          </div></td>`;
        }).join('')}
      </tr>`).join('')}</tbody></table>`;

    // Histórico
    const meses = [];
    for (let i = 5; i >= 0; i--) meses.push(Utils.somarMeses(`${Utils.mesAtual()}-01`, -i).slice(0, 7));
    $('metasHistorico').innerHTML = `<table>
      <thead><tr><th>Mês</th>${Metas.INDICADORES.map((i) => `<th>${i.icone} ${i.nome}</th>`).join('')}</tr></thead>
      <tbody>${meses.reverse().map((m) => `<tr>
        <td><strong>${Utils.nomeMes(m)}</strong></td>
        ${Metas.INDICADORES.map((i) => {
          const p = Metas.progresso(m, i.id);
          const st = Metas.status(p);
          return `<td>${Metas.formatar(i.id, p.realizado)}${p.meta ? `<small>meta ${Metas.formatar(i.id, p.meta)} ·
            <span class="${st.classe === 'aprovado' ? 'texto-sucesso' : st.classe === 'reprovado' ? 'texto-perigo' : 'texto-alerta'}">${st.icone} ${p.pct}%</span></small>` : '<small>sem meta</small>'}</td>`;
        }).join('')}</tr>`).join('')}</tbody></table>`;
  },

  // Recalcula a barra de um cartão ao digitar a meta
  atualizarCartao(cartao) {
    const ind = cartao.dataset.indicador;
    const meta = Number(cartao.querySelector('[data-meta]').value || 0);
    const p = { ...Metas.progresso(this.mes(), ind), meta };
    p.pct = meta ? Math.round((p.realizado / meta) * 100) : null;
    cartao.querySelector('.meta-progresso').innerHTML = this.barra(p);
  },

  lerFormulario() {
    const valores = {};
    document.querySelectorAll('#metasEscola [data-meta]').forEach((i) => { if (i.value !== '') valores[i.dataset.meta] = Number(i.value); });
    const individuais = {};
    document.querySelectorAll('#metasIndividuais tr[data-usuario]').forEach((tr) => {
      const v = {};
      tr.querySelectorAll('[data-individual]').forEach((i) => { if (i.value !== '') v[i.dataset.individual] = Number(i.value); });
      if (Object.keys(v).length) individuais[tr.dataset.usuario] = v;
    });
    return { valores, individuais };
  },

  salvar() {
    const { valores, individuais } = this.lerFormulario();
    const negativos = [...Object.values(valores), ...Object.values(individuais).flatMap(Object.values)].some((v) => v < 0);
    if (negativos) return Utils.toast('As metas não podem ser negativas.', 'erro');
    Metas.salvarMes(this.mes(), valores, individuais);
    Atividades.registrar('metas', 'Metas definidas', `Metas de ${Utils.nomeMes(this.mes())}: ${Metas.INDICADORES.filter((i) => valores[i.id])
      .map((i) => `${i.nome} ${Metas.formatar(i.id, valores[i.id])}`).join(', ') || 'sem metas da escola'}`);
    this.renderizar();
    Utils.toast('Metas salvas!');
  },

  copiarAnterior() {
    const anterior = Metas.doMes(Utils.somarMeses(`${this.mes()}-01`, -1).slice(0, 7));
    if (!anterior.id) return Utils.toast('O mês anterior não tem metas definidas.', 'erro');
    document.querySelectorAll('#metasEscola [data-meta]').forEach((i) => {
      i.value = anterior.valores?.[i.dataset.meta] ?? '';
      this.atualizarCartao(i.closest('.meta-cartao'));
    });
    document.querySelectorAll('#metasIndividuais tr[data-usuario]').forEach((tr) => {
      tr.querySelectorAll('[data-individual]').forEach((i) => { i.value = anterior.individuais?.[tr.dataset.usuario]?.[i.dataset.individual] ?? ''; });
    });
    Utils.toast('Metas do mês anterior copiadas. Confira e clique em "Salvar metas".');
  },
};
