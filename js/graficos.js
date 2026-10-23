// ===== Gráficos simples em HTML/CSS (sem bibliotecas externas) =====
const Graficos = {
  vazio(el, msg = 'Sem dados ainda.') {
    el.innerHTML = `<p class="graf-vazio">${msg}</p>`;
  },

  // Barras horizontais. itens: [{ rotulo, valor, texto?, dica? }]
  barrasH(el, itens, { formatar = (v) => v, max } = {}) {
    if (!itens.length || itens.every((i) => !i.valor)) return this.vazio(el);
    const maior = max ?? Math.max(...itens.map((i) => i.valor));
    el.innerHTML = `<div class="graf-barras">${itens.map((i) => {
      const pct = maior ? Math.max((i.valor / maior) * 100, i.valor ? 1.5 : 0) : 0;
      const texto = i.texto ?? formatar(i.valor);
      return `
        <div class="graf-linha" data-dica="${Utils.escapar(i.dica ?? `${i.rotulo}: ${texto}`)}">
          <span class="graf-rotulo" title="${Utils.escapar(i.rotulo)}">${Utils.escapar(i.rotulo)}</span>
          <span class="graf-trilho"><span class="graf-barra" style="width:${pct}%"></span></span>
          <span class="graf-valor">${Utils.escapar(texto)}</span>
        </div>`;
    }).join('')}</div>`;
  },

  // Colunas agrupadas. categorias: [{ rotulo, valores: [s1, s2] }], series: [{ nome, classe }]
  colunas(el, categorias, series, { formatar = (v) => v } = {}) {
    const todos = categorias.flatMap((c) => c.valores);
    if (!todos.some(Boolean)) return this.vazio(el);
    const maior = Math.max(...todos);

    const legenda = series.map((s) =>
      `<span class="graf-legenda-item"><i class="graf-cor ${s.classe}"></i>${Utils.escapar(s.nome)}</span>`).join('');

    const grupos = categorias.map((c) => `
      <div class="graf-grupo">
        <div class="graf-colunas">
          ${c.valores.map((v, i) => `
            <span class="graf-coluna ${series[i].classe}"
                  style="height:${maior ? Math.max((v / maior) * 100, v ? 1.5 : 0) : 0}%"
                  data-dica="${Utils.escapar(`${c.rotulo} · ${series[i].nome}: ${formatar(v)}`)}"
                  aria-label="${Utils.escapar(`${c.rotulo} ${series[i].nome} ${formatar(v)}`)}"></span>`).join('')}
        </div>
        <span class="graf-eixo">${Utils.escapar(c.rotulo)}</span>
      </div>`).join('');

    el.innerHTML = `
      <div class="graf-legenda">${legenda}<span class="graf-max">máx. ${Utils.escapar(formatar(maior))}</span></div>
      <div class="graf-area">${grupos}</div>`;
  },

  // Dica flutuante para qualquer elemento com data-dica
  iniciarDicas() {
    const dica = $('dica');
    document.addEventListener('mouseover', (e) => {
      const alvo = e.target.closest('[data-dica]');
      if (!alvo) return dica.classList.remove('visivel');
      dica.textContent = alvo.dataset.dica;
      dica.classList.add('visivel');
    });
    document.addEventListener('mousemove', (e) => {
      if (!dica.classList.contains('visivel')) return;
      const x = Math.min(e.clientX + 14, window.innerWidth - dica.offsetWidth - 8);
      dica.style.left = `${x}px`;
      dica.style.top = `${e.clientY + 16}px`;
    });
  },
};
