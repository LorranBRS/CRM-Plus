// ===== Interface (eventos e renderização) =====
const $ = (id) => document.getElementById(id);

const CAMPOS = ['nome', 'cpf', 'nascimento', 'email', 'telefone', 'cep', 'endereco', 'numero',
  'bairro', 'cidade', 'uf', 'curso', 'status', 'observacoes'];

// ---------- Renderização ----------
function renderizar() {
  const lista = Alunos.filtrar($('busca').value, $('filtroStatus').value);
  const tbody = $('listaAlunos');

  tbody.innerHTML = lista.map((a) => `
    <tr>
      <td><strong>${Utils.escapar(a.nome)}</strong>
          <small>${Utils.escapar([a.cidade, a.uf].filter(Boolean).join(' / '))}</small></td>
      <td>${Utils.escapar(a.cpf)}</td>
      <td>${Utils.escapar(a.telefone)}<small>${Utils.escapar(a.email)}</small></td>
      <td>${Utils.escapar(a.curso) || '-'}</td>
      <td><span class="badge badge-${Utils.escapar(a.status)}">${Utils.escapar(a.status)}</span></td>
      <td>${Utils.formatarData(a.criadoEm)}</td>
      <td class="acoes">
        <button class="btn-icon" data-editar="${a.id}" title="Editar">✏️</button>
        <button class="btn-icon" data-excluir="${a.id}" title="Excluir">🗑️</button>
      </td>
    </tr>`).join('');

  const total = Alunos.listar().length;
  $('vazio').style.display = lista.length ? 'none' : 'block';
  $('vazio').querySelector('p').textContent = total
    ? 'Nenhum aluno encontrado com esses filtros.'
    : 'Nenhum aluno cadastrado ainda.';
  $('btnNovoVazio').style.display = total ? 'none' : 'inline-block';

  const s = Alunos.estatisticas();
  $('statTotal').textContent = s.total;
  $('statAtivos').textContent = s.ativos;
  $('statInteressados').textContent = s.interessados;
  $('statMes').textContent = s.mes;
}

// ---------- Modal ----------
function abrirModal(aluno = null) {
  $('formAluno').reset();
  document.querySelectorAll('.invalido').forEach((el) => el.classList.remove('invalido'));
  $('alunoId').value = aluno?.id || '';
  $('modalTitulo').textContent = aluno ? 'Editar aluno' : 'Novo aluno';
  if (aluno) CAMPOS.forEach((c) => { $(c).value = aluno[c] ?? ''; });
  $('modal').classList.add('aberto');
  $('nome').focus();
}

function fecharModal() {
  $('modal').classList.remove('aberto');
}

// ---------- Busca de CEP (ViaCEP) ----------
async function buscarCEP() {
  const cep = Utils.somenteDigitos($('cep').value);
  if (cep.length !== 8) return;
  try {
    const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const dados = await resp.json();
    if (dados.erro) return Utils.toast('CEP não encontrado.', 'erro');
    $('endereco').value = dados.logradouro || '';
    $('bairro').value = dados.bairro || '';
    $('cidade').value = dados.localidade || '';
    $('uf').value = dados.uf || '';
    $('numero').focus();
  } catch {
    Utils.toast('Não foi possível consultar o CEP.', 'erro');
  }
}

// ---------- Eventos ----------
$('formAluno').addEventListener('submit', (e) => {
  e.preventDefault();
  const aluno = { id: $('alunoId').value || undefined };
  CAMPOS.forEach((c) => { aluno[c] = $(c).value.trim(); });
  aluno.uf = aluno.uf.toUpperCase();

  document.querySelectorAll('.invalido').forEach((el) => el.classList.remove('invalido'));
  const erros = Alunos.validar(aluno);
  if (erros.length) {
    erros.forEach((er) => $(er.campo).classList.add('invalido'));
    $(erros[0].campo).focus();
    return Utils.toast(erros[0].msg, 'erro');
  }

  const editando = Boolean(aluno.id);
  Alunos.salvar(aluno);
  fecharModal();
  renderizar();
  Utils.toast(editando ? 'Aluno atualizado!' : 'Aluno cadastrado!');
});

$('listaAlunos').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  if (btn.dataset.editar) abrirModal(Alunos.buscarPorId(btn.dataset.editar));
  if (btn.dataset.excluir) {
    const aluno = Alunos.buscarPorId(btn.dataset.excluir);
    if (confirm(`Excluir o aluno "${aluno.nome}"?`)) {
      Alunos.excluir(aluno.id);
      renderizar();
      Utils.toast('Aluno excluído.');
    }
  }
});

$('btnExportar').addEventListener('click', () => {
  if (!Alunos.listar().length) return Utils.toast('Não há alunos para exportar.', 'erro');
  const blob = new Blob([Alunos.exportarCSV()], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `alunos_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
});

$('btnNovo').addEventListener('click', () => abrirModal());
$('btnNovoVazio').addEventListener('click', () => abrirModal());
$('btnFechar').addEventListener('click', fecharModal);
$('btnCancelar').addEventListener('click', fecharModal);
$('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') fecharModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharModal(); });

$('busca').addEventListener('input', renderizar);
$('filtroStatus').addEventListener('change', renderizar);

$('cpf').addEventListener('input', (e) => { e.target.value = Utils.mascaraCPF(e.target.value); });
$('telefone').addEventListener('input', (e) => { e.target.value = Utils.mascaraTelefone(e.target.value); });
$('cep').addEventListener('input', (e) => { e.target.value = Utils.mascaraCEP(e.target.value); });
$('cep').addEventListener('blur', buscarCEP);

$('btnMenu').addEventListener('click', () => $('sidebar').classList.toggle('aberta'));

renderizar();
