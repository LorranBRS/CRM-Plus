// ===== Funções utilitárias (máscaras, validações, formatação, formulários) =====
const $ = (id) => document.getElementById(id);

const Utils = {
  somenteDigitos(valor) {
    return (valor || '').replace(/\D/g, '');
  },

  mascaraCPF(valor) {
    return Utils.somenteDigitos(valor).slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  },

  mascaraTelefone(valor) {
    const d = Utils.somenteDigitos(valor).slice(0, 11);
    if (d.length <= 10) {
      return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
    }
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
  },

  mascaraCEP(valor) {
    return Utils.somenteDigitos(valor).slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
  },

  // Validação oficial dos dígitos verificadores do CPF
  cpfValido(cpf) {
    const d = Utils.somenteDigitos(cpf);
    if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
    const calc = (base) => {
      let soma = 0;
      for (let i = 0; i < base; i++) soma += Number(d[i]) * (base + 1 - i);
      const resto = (soma * 10) % 11;
      return resto === 10 ? 0 : resto;
    };
    return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
  },

  emailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  // Aceita ISO completo (criadoEm) ou só a data "AAAA-MM-DD" (campos de formulário)
  formatarData(valor) {
    if (!valor) return '-';
    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      const [a, m, d] = valor.split('-');
      return `${d}/${m}/${a}`;
    }
    return new Date(valor).toLocaleDateString('pt-BR');
  },

  // ---------- Datas (sempre no formato "AAAA-MM-DD", horário local) ----------
  paraISO(data) {
    const p = (n) => String(n).padStart(2, '0');
    return `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}`;
  },

  hoje() {
    return Utils.paraISO(new Date());
  },

  mesAtual() {
    return Utils.hoje().slice(0, 7);
  },

  // Soma "n" meses a uma data; "dia" fixa o dia do mês (limitado ao último dia)
  somarMeses(dataISO, n, dia) {
    const [a, m, d] = dataISO.split('-').map(Number);
    const ultimoDia = new Date(a, m - 1 + n + 1, 0).getDate();
    return Utils.paraISO(new Date(a, m - 1 + n, Math.min(dia ?? d, ultimoDia)));
  },

  somarDias(dataISO, n) {
    const [a, m, d] = dataISO.split('-').map(Number);
    return Utils.paraISO(new Date(a, m - 1, d + n));
  },

  // Período a partir de uma opção de filtro -> { de, ate } ("AAAA-MM-DD")
  periodo(opcao) {
    const hoje = Utils.hoje();
    const inicioMes = `${Utils.mesAtual()}-01`;
    switch (opcao) {
      case 'hoje': return { de: hoje, ate: hoje };
      case '7dias': return { de: Utils.somarDias(hoje, -6), ate: hoje };
      case '30dias': return { de: Utils.somarDias(hoje, -29), ate: hoje };
      case 'mes': return { de: inicioMes, ate: hoje };
      case 'mesPassado': return { de: Utils.somarMeses(inicioMes, -1), ate: Utils.somarDias(inicioMes, -1) };
      default: return {};
    }
  },

  // Aceita data ISO completa ou "AAAA-MM-DD"
  noPeriodo(data, periodo = {}) {
    if (!data) return !periodo.de && !periodo.ate;
    const dia = data.length > 10 ? Utils.paraISO(new Date(data)) : data;
    return (!periodo.de || dia >= periodo.de) && (!periodo.ate || dia <= periodo.ate);
  },

  // "19:00", "20:40" -> 1.67
  duracaoHoras(inicio, fim) {
    if (!inicio || !fim) return 0;
    const min = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
    return Math.max(0, (min(fim) - min(inicio)) / 60);
  },

  formatarHoras(horas) {
    const h = Math.floor(horas);
    const m = Math.round((horas - h) * 60);
    return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
  },

  formatarDataHora(iso) {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  },

  // "2026-10" -> "out/26"
  nomeMes(anoMes) {
    const [a, m] = anoMes.split('-').map(Number);
    return new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      .replace('. de ', '/').replace(' de ', '/').replace('.', '');
  },

  // "sexta-feira, 23 de outubro" -> "Sexta-feira, 23 de outubro"
  capitalizar(texto) {
    return (texto || '').replace(/^./, (c) => c.toUpperCase());
  },

  dataPorExtenso(dataISO) {
    return Utils.capitalizar(new Date(`${dataISO}T12:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }));
  },

  formatarMoeda(valor) {
    if (valor === '' || valor === null || valor === undefined) return '-';
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  },

  // Evita injeção de HTML ao renderizar dados do usuário
  escapar(texto) {
    const div = document.createElement('div');
    div.textContent = texto ?? '';
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  // "Em andamento" -> badge-em-andamento
  badge(status) {
    const classe = (status || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/\s+/g, '-');
    return `<span class="badge badge-${classe}">${Utils.escapar(status)}</span>`;
  },

  gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  toast(mensagem, tipo = '') {
    const el = $('toast');
    el.textContent = mensagem;
    el.className = `toast visivel ${tipo}`;
    clearTimeout(Utils._toastTimer);
    Utils._toastTimer = setTimeout(() => el.classList.remove('visivel'), 2800);
  },

  // ---------- Formulários ----------
  // Lê os campos com atributo "name"; checkboxes com o mesmo nome viram array
  lerForm(form) {
    const dados = {};
    for (const el of form.elements) {
      if (!el.name) continue;
      if (el.type === 'checkbox') {
        dados[el.name] = dados[el.name] || [];
        if (el.checked) dados[el.name].push(el.value);
      } else {
        dados[el.name] = el.value.trim();
      }
    }
    return dados;
  },

  preencherForm(form, dados = {}) {
    form.reset();
    for (const el of form.elements) {
      if (!el.name) continue;
      const valor = dados[el.name];
      if (el.type === 'checkbox') el.checked = Array.isArray(valor) && valor.includes(el.value);
      else el.value = valor ?? (el.tagName === 'SELECT' ? el.options[0]?.value ?? '' : '');
    }
    Utils.limparErros(form);
  },

  limparErros(form) {
    form.querySelectorAll('.invalido').forEach((el) => el.classList.remove('invalido'));
  },

  // Marca os campos com erro e mostra a primeira mensagem
  mostrarErros(form, erros) {
    Utils.limparErros(form);
    erros.forEach((er) => form.elements[er.campo]?.classList.add('invalido'));
    form.elements[erros[0].campo]?.focus();
    Utils.toast(erros[0].msg, 'erro');
  },

  // ---------- Modais ----------
  abrirModal(id, titulo) {
    const modal = $(id);
    if (titulo) modal.querySelector('.modal-titulo').textContent = titulo;
    modal.classList.add('aberto');
    modal.querySelector('input:not([type=hidden]), select')?.focus();
  },

  fecharModal(id) {
    $(id).classList.remove('aberto');
  },

  // Monta as <option> de um <select> a partir de uma lista
  opcoes(lista, { valor = (x) => x, texto = (x) => x, vazio } = {}) {
    const inicio = vazio !== undefined ? `<option value="">${Utils.escapar(vazio)}</option>` : '';
    return inicio + lista.map((x) =>
      `<option value="${Utils.escapar(valor(x))}">${Utils.escapar(texto(x))}</option>`).join('');
  },

  // CSV separado por ";" (padrão do Excel em português). colunas: [[titulo, funcao], ...]
  gerarCSV(lista, colunas) {
    const celula = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const linhas = lista.map((item) => colunas.map(([, fn]) => celula(fn(item))).join(';'));
    // BOM para o Excel reconhecer acentuação
    return '﻿' + [colunas.map(([t]) => celula(t)).join(';'), ...linhas].join('\n');
  },

  baixarCSV(lista, colunas, nome) {
    Utils.baixarArquivo(Utils.gerarCSV(lista, colunas),
      `${nome}_${Utils.hoje()}.csv`, 'text/csv;charset=utf-8');
  },

  // Lê uma imagem enviada e reduz para no máximo "tamanho" px (para caber no navegador)
  lerImagem(arquivo, tamanho = 240, tipo = 'image/jpeg') {
    return new Promise((resolve, reject) => {
      if (!arquivo || !arquivo.type.startsWith('image/')) return reject(new Error('Escolha um arquivo de imagem.'));
      const leitor = new FileReader();
      leitor.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      leitor.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Imagem inválida.'));
        img.onload = () => {
          const escala = Math.min(1, tamanho / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * escala);
          canvas.height = Math.round(img.height * escala);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL(tipo, 0.85));
        };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(arquivo);
    });
  },

  // Abre uma janela pronta para imprimir/salvar em PDF
  imprimir(titulo, corpo, classe = '') {
    const janela = window.open('', '_blank');
    if (!janela) return Utils.toast('Permita pop-ups deste site para imprimir.', 'erro');
    const cor = Instituicao.ler().corPrimaria || Tema.COR_PADRAO;
    janela.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
      <title>${Utils.escapar(titulo)}</title><link rel="stylesheet" href="${new URL('css/impressao.css', location.href)}">
      </head><body class="${classe}" style="--cor:${cor}">${corpo}<script>window.onload = () => setTimeout(() => window.print(), 300);<\/script></body></html>`);
    janela.document.close();
  },

  baixarArquivo(conteudo, nome, tipo) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    link.download = nome;
    link.click();
    URL.revokeObjectURL(link.href);
  },
};
