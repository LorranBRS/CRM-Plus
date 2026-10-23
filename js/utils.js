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

  // "2026-10" -> "out/26"
  nomeMes(anoMes) {
    const [a, m] = anoMes.split('-').map(Number);
    return new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      .replace('. de ', '/').replace(' de ', '/').replace('.', '');
  },

  formatarMoeda(valor) {
    if (valor === '' || valor === null || valor === undefined) return '-';
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  },

  // Evita injeção de HTML ao renderizar dados do usuário
  escapar(texto) {
    const div = document.createElement('div');
    div.textContent = texto ?? '';
    return div.innerHTML;
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

  baixarArquivo(conteudo, nome, tipo) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    link.download = nome;
    link.click();
    URL.revokeObjectURL(link.href);
  },
};
