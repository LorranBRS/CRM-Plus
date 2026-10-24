// ===== Tela: Acadêmico (chamada, notas, situação e certificados) =====
const TelaAcademico = {
  aba: 'chamada',
  dataChamada: null,

  iniciar() {
    $('turmaAcademico').addEventListener('change', () => { this.dataChamada = null; this.renderizar(); });
    $('abasAcademico').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-aba]');
      if (btn) { this.aba = btn.dataset.aba; this.renderizar(); }
    });

    const el = $('academicoConteudo');
    el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-acao]');
      if (!btn) return;
      const acao = btn.dataset.acao;
      const turma = this.turmaAtual();

      if (acao === 'presenca') {
        const linha = btn.closest('[data-aluno]');
        linha.dataset.estado = btn.dataset.valor;
        linha.querySelectorAll('[data-acao=presenca]').forEach((b) => b.classList.toggle('ativo', b === btn));
        this.atualizarContagem();
      }
      if (acao === 'todos-presentes') {
        el.querySelectorAll('.chamada-linha').forEach((linha) => {
          linha.dataset.estado = 'P';
          linha.querySelectorAll('[data-acao=presenca]').forEach((b) => b.classList.toggle('ativo', b.dataset.valor === 'P'));
        });
        this.atualizarContagem();
      }
      if (acao === 'salvar-chamada') this.salvarChamada(turma);
      if (acao === 'aula') { this.dataChamada = btn.dataset.data; this.renderizar(); }
      if (acao === 'salvar-notas') this.salvarNotas(turma);
      if (acao === 'certificado') Documentos.abrirConclusao(btn.dataset.id, 'certificado');
      if (acao === 'diploma') Documentos.abrirConclusao(btn.dataset.id, 'diploma');
      if (acao === 'ficha') FichaAluno.abrir(btn.dataset.id, 'academico');
      if (acao === 'whats-faltas') Mensageiro.abrir({ tipo: 'aluno', id: btn.dataset.id, turma, modelo: 'Aviso de faltas' });
      if (acao === 'whats-certificado') Mensageiro.abrir({ tipo: 'aluno', id: btn.dataset.id, turma, modelo: 'Certificado disponível' });
    });
    el.addEventListener('change', (e) => {
      if (e.target.id === 'dataChamada') { this.dataChamada = e.target.value; this.renderizar(); }
    });
    el.addEventListener('input', (e) => {
      if (e.target.matches('[data-nota]')) this.atualizarMediaLinha(e.target.closest('tr'));
    });
  },

  turmasDisponiveis() {
    const ordem = { 'Em andamento': 0, Planejada: 1, 'Concluída': 2 };
    const prof = Sessao.professorId();
    return Turmas.listar().filter((t) => t.status !== 'Cancelada' && (!prof || t.professorId === prof))
      .sort((a, b) => ordem[a.status] - ordem[b.status] || a.codigo.localeCompare(b.codigo));
  },

  // Chamado pela Agenda: abre a chamada da turma na data da aula
  abrirChamada(turmaId, data) {
    this.aba = 'chamada';
    this.dataChamada = data;
    this.turmaPreferida = turmaId;
    if (location.hash !== '#academico') location.hash = '#academico';
    else this.renderizar();
  },

  turmaAtual() {
    return Turmas.buscarPorId($('turmaAcademico').value);
  },

  renderizar() {
    const sel = $('turmaAcademico');
    const atual = sel.value;
    const turmas = this.turmasDisponiveis();
    sel.innerHTML = Utils.opcoes(turmas, { valor: (t) => t.id, texto: (t) => `${t.codigo} – ${Turmas.nomeCurso(t)} (${t.status})` });
    sel.value = this.turmaPreferida || atual;
    this.turmaPreferida = null;
    if (sel.selectedIndex < 0 && turmas.length) sel.value = turmas[0].id;

    document.querySelectorAll('#abasAcademico [data-aba]').forEach((b) => b.classList.toggle('ativo', b.dataset.aba === this.aba));

    const turma = this.turmaAtual();
    if (!turma) {
      $('academicoConteudo').innerHTML = `<div class="painel"><p class="graf-vazio">${Sessao.ehProfessor()
        ? 'Você ainda não tem turmas atribuídas. Fale com a coordenação.' : 'Nenhuma turma cadastrada.'}</p></div>`;
      return;
    }
    const alunos = Academico.alunosDaTurma(turma.id);
    const freq = Frequencias.resumoTurma(turma.id);
    const media = Notas.mediaTurma(turma);
    $('statAcadAlunos').textContent = alunos.length;
    $('statAcadAulas').textContent = freq.aulas;
    $('statAcadFreq').textContent = freq.media !== null ? `${freq.media}%` : '-';
    $('statAcadMedia').textContent = media !== null ? media.toFixed(1).replace('.', ',') : '-';

    if (!alunos.length) {
      $('academicoConteudo').innerHTML = '<div class="painel"><p class="graf-vazio">Nenhum aluno matriculado nesta turma.</p></div>';
      return;
    }
    $('academicoConteudo').innerHTML = this[`aba_${this.aba}`](turma, alunos);
    if (this.aba === 'chamada') this.atualizarContagem();
    if (this.aba === 'notas') document.querySelectorAll('#academicoConteudo tr[data-aluno]').forEach((tr) => this.atualizarMediaLinha(tr));
  },

  // ---------- Chamada ----------
  aba_chamada(turma, alunos) {
    const e = Utils.escapar;
    const diasAula = Academico.diasDeAula(turma);
    const data = this.dataChamada || diasAula[diasAula.length - 1] || Utils.hoje();
    const aula = Frequencias.buscarAula(turma.id, data);
    const ehDiaDeAula = (turma.dias || []).includes(Academico.diaDaSemana(data));
    const registradas = Frequencias.daTurma(turma.id);
    const semChamada = diasAula.filter((d) => !registradas.some((r) => r.data === d)).slice(-6).reverse();
    const ativos = alunos.filter(({ matricula }) => matricula.status === 'Ativa' && matricula.dataMatricula <= data);

    return `
      <div class="academico-grid">
        <section class="painel">
          <div class="chamada-topo">
            <label>Data da aula <input type="date" id="dataChamada" value="${data}" max="${Utils.hoje()}"></label>
            <label class="chamada-conteudo">Conteúdo da aula
              <input type="text" id="conteudoAula" value="${e(aula?.conteudo || '')}" placeholder="Ex.: Present perfect – exercícios"></label>
          </div>
          ${!ehDiaDeAula ? `<p class="aviso">⚠ ${Academico.diaDaSemana(data)} não é dia de aula desta turma (${e((turma.dias || []).join(', '))}). Você pode registrar como reposição.</p>` : ''}
          ${aula ? `<p class="ajuda">Chamada já registrada${aula.criadoPor ? ` por ${e(Usuarios.nome(aula.criadoPor))}` : ''}. Alterações substituem a anterior.</p>` : ''}
          <div class="chamada-acoes">
            <span id="contagemChamada" class="texto-suave"></span>
            <button class="btn btn-light" data-acao="todos-presentes">✓ Todos presentes</button>
          </div>
          <ul class="chamada-lista">${ativos.map(({ aluno }) => {
            const estado = aula?.presencas[aluno.id] || 'P';
            const f = Frequencias.resumoAluno(turma.id, aluno.id);
            return `
              <li class="chamada-linha" data-aluno="${aluno.id}" data-estado="${estado}">
                ${App.avatar(aluno)}
                <div class="chamada-nome">
                  <button class="link" data-acao="ficha" data-id="${aluno.id}">${e(aluno.nome)}</button>
                  <small class="${f.aulas && f.percentual < Academico.frequenciaMinima() ? 'texto-perigo' : ''}">
                    ${f.aulas ? `Frequência ${f.percentual}% · ${f.faltas} falta(s)` : 'Sem aulas registradas'}</small>
                </div>
                <div class="presenca">
                  ${[['P', 'Presente'], ['F', 'Falta'], ['J', 'Justificada']].map(([v, t]) =>
                    `<button class="presenca-${v} ${estado === v ? 'ativo' : ''}" data-acao="presenca" data-valor="${v}" title="${t}">${v}</button>`).join('')}
                </div>
              </li>`;
          }).join('') || '<li class="graf-vazio">Nenhum aluno ativo nesta data.</li>'}</ul>
          <div class="chamada-rodape">
            <button class="btn btn-primary" data-acao="salvar-chamada" ${ativos.length ? '' : 'disabled'}>Salvar chamada</button>
          </div>
        </section>

        <aside class="painel">
          ${semChamada.length ? `<h3>Aulas sem chamada</h3>
            <div class="chips-aulas">${semChamada.map((d) =>
              `<button class="chip chip-botao chip-alerta" data-acao="aula" data-data="${d}">${Academico.diaDaSemana(d)} ${Utils.formatarData(d).slice(0, 5)}</button>`).join('')}</div>` : ''}
          <h3>Aulas registradas (${registradas.length})</h3>
          <ul class="lista-simples aulas-lista">${registradas.slice(0, 40).map((r) => {
            const total = Object.keys(r.presencas).length;
            const faltas = Object.values(r.presencas).filter((v) => v === 'F').length;
            return `<li class="clicavel ${r.data === data ? 'selecionada' : ''}" data-acao="aula" data-data="${r.data}">
              <div><strong>${Academico.diaDaSemana(r.data)}, ${Utils.formatarData(r.data)}</strong>
                <small>${e(r.conteudo || 'Sem conteúdo informado')}</small></div>
              <span class="${faltas ? '' : 'texto-suave'}">${total - faltas}/${total}</span></li>`;
          }).join('') || '<li class="graf-vazio">Nenhuma aula registrada.</li>'}</ul>
        </aside>
      </div>`;
  },

  atualizarContagem() {
    const linhas = [...document.querySelectorAll('#academicoConteudo .chamada-linha')];
    const conta = (v) => linhas.filter((l) => l.dataset.estado === v).length;
    const el = $('contagemChamada');
    if (el) el.textContent = `${conta('P')} presente(s) · ${conta('F')} falta(s) · ${conta('J')} justificada(s)`;
  },

  salvarChamada(turma) {
    const data = $('dataChamada').value;
    if (!data) return Utils.toast('Informe a data da aula.', 'erro');
    if (data > Utils.hoje()) return Utils.toast('Não é possível registrar chamada de uma data futura.', 'erro');
    const presencas = {};
    document.querySelectorAll('#academicoConteudo .chamada-linha').forEach((l) => { presencas[l.dataset.aluno] = l.dataset.estado; });
    const conteudo = $('conteudoAula').value.trim();
    const existia = Boolean(Frequencias.buscarAula(turma.id, data));
    Frequencias.salvarAula({ turmaId: turma.id, data, conteudo, presencas });
    const faltas = Object.values(presencas).filter((v) => v === 'F').length;
    Atividades.registrar('academico', existia ? 'Chamada alterada' : 'Chamada registrada',
      `${turma.codigo} – ${Utils.formatarData(data)}: ${Object.keys(presencas).length - faltas} presente(s), ${faltas} falta(s)${conteudo ? ` – ${conteudo}` : ''}`,
      { refId: turma.id });
    this.dataChamada = data;
    this.renderizar();
    Utils.toast('Chamada salva!');
  },

  // ---------- Notas ----------
  aba_notas(turma, alunos) {
    const e = Utils.escapar;
    const avaliacoes = Notas.avaliacoes(turma);
    const doc = Notas.daTurma(turma.id);
    return `
      <section class="painel">
        <p class="ajuda">Notas de 0 a 10 por módulo da grade curricular. Média mínima para aprovação:
          <strong>${Academico.mediaMinima()}</strong> · frequência mínima: <strong>${Academico.frequenciaMinima()}%</strong>.
          ${avaliacoes[0].id === 'final' ? 'Este curso não tem grade curricular: é lançada uma nota final.' : ''}</p>
        <div class="table-wrap table-plana tabela-notas"><table>
          <thead><tr><th>Aluno</th>${avaliacoes.map((a, i) =>
            `<th title="${e(a.nome)}">${i + 1}. ${e(a.nome)}${a.cargaHoraria ? `<small>${a.cargaHoraria}h</small>` : ''}</th>`).join('')}
            <th>Média</th><th>Situação</th></tr></thead>
          <tbody>${alunos.map(({ aluno }) => `
            <tr data-aluno="${aluno.id}">
              <td><button class="link" data-acao="ficha" data-id="${aluno.id}">${e(aluno.nome)}</button></td>
              ${avaliacoes.map((a) => `<td><input type="number" class="input-nota" data-nota="${a.id}" min="0" max="10" step="0.1"
                value="${doc.valores[aluno.id]?.[a.id] ?? ''}"></td>`).join('')}
              <td class="celula-media"></td>
              <td>${Utils.badge(Notas.situacao(turma, aluno.id))}</td>
            </tr>`).join('')}</tbody>
        </table></div>
        <div class="chamada-rodape"><button class="btn btn-primary" data-acao="salvar-notas">Salvar notas</button></div>
      </section>`;
  },

  atualizarMediaLinha(tr) {
    const valores = [...tr.querySelectorAll('[data-nota]')].map((i) => i.value).filter((v) => v !== '').map(Number);
    const media = valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : null;
    const cel = tr.querySelector('.celula-media');
    cel.textContent = media !== null ? media.toFixed(1).replace('.', ',') : '-';
    cel.className = `celula-media ${media !== null && media < Academico.mediaMinima() ? 'texto-perigo' : ''}`;
  },

  salvarNotas(turma) {
    const valores = {};
    let invalida = null;
    document.querySelectorAll('#academicoConteudo tr[data-aluno]').forEach((tr) => {
      const notas = {};
      tr.querySelectorAll('[data-nota]').forEach((input) => {
        input.classList.remove('invalido');
        if (input.value === '') return;
        const n = Number(input.value);
        if (Number.isNaN(n) || n < 0 || n > 10) { input.classList.add('invalido'); invalida = invalida || input; return; }
        notas[input.dataset.nota] = Math.round(n * 10) / 10;
      });
      valores[tr.dataset.aluno] = notas;
    });
    if (invalida) { invalida.focus(); return Utils.toast('As notas devem ficar entre 0 e 10.', 'erro'); }
    Notas.salvarTurma(turma.id, valores);
    Atividades.registrar('academico', 'Notas lançadas', `${turma.codigo} – ${Turmas.nomeCurso(turma)}`, { refId: turma.id });
    this.renderizar();
    Utils.toast('Notas salvas!');
  },

  // ---------- Situação e certificados ----------
  aba_situacao(turma, alunos) {
    const e = Utils.escapar;
    const minFreq = Academico.frequenciaMinima();
    return `
      <section class="painel">
        <div class="table-wrap table-plana"><table>
          <thead><tr><th>Aluno</th><th>Frequência</th><th>Média</th><th>Situação</th>${Sessao.ehProfessor() ? '' : '<th>Documentos</th>'}<th class="acoes">Ações</th></tr></thead>
          <tbody>${alunos.map(({ aluno, matricula }) => {
            const f = Frequencias.resumoAluno(turma.id, aluno.id);
            const media = Notas.media(turma, aluno.id);
            const sit = Notas.situacao(turma, aluno.id);
            const baixa = f.aulas && f.percentual < minFreq;
            return `<tr>
              <td><div class="celula-usuario">${App.avatar(aluno)}<div>
                <button class="link" data-acao="ficha" data-id="${aluno.id}">${e(aluno.nome)}</button>
                <small>Matrícula ${e(matricula.status.toLowerCase())}</small></div></div></td>
              <td>${f.aulas ? `<div class="barra-frequencia ${baixa ? 'baixa' : ''}"><span style="width:${f.percentual}%"></span></div>
                <small>${f.percentual}% · ${f.faltas} falta(s)</small>` : '<span class="texto-suave">-</span>'}</td>
              <td class="${media !== null && media < Academico.mediaMinima() ? 'texto-perigo' : ''}">${media !== null ? media.toFixed(1).replace('.', ',') : '-'}</td>
              <td>${Utils.badge(sit)}</td>
              ${Sessao.ehProfessor() ? '' : `<td><div class="botoes-documentos">${sit === 'Aprovado' ? `
                <button class="btn ${matricula.certificadoNumero ? 'btn-light' : 'btn-primary'} btn-pequeno" data-acao="certificado" data-id="${matricula.id}"
                  title="Certificado de conclusão">🎓 ${matricula.certificadoNumero ? `Cert. ${String(matricula.certificadoNumero).padStart(6, '0')}` : 'Certificado'}</button>
                <button class="btn ${matricula.diplomaNumero ? 'btn-light' : 'btn-primary'} btn-pequeno" data-acao="diploma" data-id="${matricula.id}"
                  title="Diploma de conclusão">📜 ${matricula.diplomaNumero ? `Dipl. ${String(matricula.diplomaNumero).padStart(6, '0')}` : 'Diploma'}</button>`
                : '<span class="texto-suave">—</span>'}</div></td>`}
              <td class="acoes">
                ${baixa ? `<button class="btn-icon" data-acao="whats-faltas" data-id="${aluno.id}" title="Avisar sobre faltas">💬</button>` : ''}
                ${(matricula.certificadoNumero || matricula.diplomaNumero) && !Sessao.ehProfessor() ? `<button class="btn-icon" data-acao="whats-certificado" data-id="${aluno.id}" title="Avisar que o documento está pronto">📨</button>` : ''}
              </td></tr>`;
          }).join('')}</tbody>
        </table></div>
        <p class="ajuda legenda-situacao">Aprovado: todas as notas lançadas, média ≥ ${Academico.mediaMinima()} e frequência ≥ ${minFreq}%.</p>
      </section>`;
  },

  emitirCertificado(matriculaId) {
    Documentos.abrirConclusao(matriculaId, 'certificado');
  },

};
