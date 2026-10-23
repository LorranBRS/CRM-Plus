// ===== Agenda semanal (grade horária) das turmas =====
const Agenda = {
  DIAS: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],

  // turmas: lista de turmas; mostrar: 'professor' ou 'curso' como informação secundária
  render(el, turmas, { mostrar = 'professor' } = {}) {
    const e = Utils.escapar;
    const comHorario = turmas.filter((t) => (t.dias || []).length);
    if (!comHorario.length) {
      el.innerHTML = '<p class="graf-vazio">Nenhuma turma aberta com dias e horários definidos.</p>';
      return;
    }
    // Esconde sábado/domingo se não houver aula
    const dias = this.DIAS.filter((d, i) => i < 5 || comHorario.some((t) => t.dias.includes(d)));

    el.innerHTML = `<div class="agenda" style="--colunas:${dias.length}">${dias.map((dia) => {
      const doDia = comHorario.filter((t) => t.dias.includes(dia))
        .sort((a, b) => (a.horaInicio || '').localeCompare(b.horaInicio || ''));
      return `
        <div class="agenda-dia">
          <header>${dia}</header>
          ${doDia.map((t) => `
            <div class="agenda-aula" data-dica="${e(`${t.codigo} – ${Turmas.nomeCurso(t)} · ${Turmas.nomeProfessor(t) || 'sem professor'} · ${t.sala || ''}`)}">
              <strong>${e(t.horaInicio || '--:--')}–${e(t.horaFim || '--:--')}</strong>
              <span>${e(t.codigo)}</span>
              <small>${e(mostrar === 'professor' ? (Turmas.nomeProfessor(t) || 'Sem professor') : Turmas.nomeCurso(t))}</small>
              ${t.sala ? `<small>📍 ${e(t.sala)}</small>` : ''}
            </div>`).join('') || '<p class="agenda-livre">—</p>'}
        </div>`;
    }).join('')}</div>`;
  },
};
