// ===== Documentos para impressão: fatura, recibo e grade curricular =====
const Documentos = {
  // Abre o contrato da matrícula (numera na primeira emissão)
  abrirContrato(matriculaId) {
    let m = Matriculas.buscarPorId(matriculaId);
    const primeira = !m.contratoNumero;
    if (primeira) {
      m = Matriculas.salvar({ id: m.id, contratoNumero: Instituicao.proximoNumeroContrato(),
        contratoEmitidoEm: new Date().toISOString(), contratoEmitidoPor: Sessao.idAtual() });
    }
    const aluno = Alunos.buscarPorId(m.alunoId);
    Registros.registrar({ codigo: this.codigo('contrato', m), tipo: 'contrato', matricula: m,
      detalhes: `${m.parcelas}x ${Utils.formatarMoeda(m.valorFinal)}${m.taxaMatricula ? ` + taxa ${Utils.formatarMoeda(m.taxaMatricula)}` : ''}` });
    Atividades.registrar('matriculas', primeira ? 'Contrato emitido' : 'Contrato reimpresso',
      `Nº ${this.numero(m.contratoNumero)} – ${aluno.nome} – ${Matriculas.turma(m)?.codigo || ''}`, { refId: m.id });
    const idade = Utils.idade(aluno.nascimento);
    const menor = idade !== null && idade < 18;
    App.documento(`Contrato Nº ${this.numero(m.contratoNumero)}`, this.contrato(m), {
      arquivo: `Contrato_${this.numero(m.contratoNumero)}_${aluno.nome.replace(/\s+/g, '_')}`,
      dica: menor && !aluno.responsavelNome ? '⚠ Aluno menor de idade sem responsável cadastrado.' : 'Modelo padrão – revise as cláusulas com seu advogado.',
    });
  },

  // Certificado ou diploma (só para alunos aprovados); numera na primeira emissão
  abrirConclusao(matriculaId, tipo) {
    let m = Matriculas.buscarPorId(matriculaId);
    const turma = Turmas.buscarPorId(m.turmaId);
    if (Notas.situacao(turma, m.alunoId) !== 'Aprovado') return Utils.toast('O aluno ainda não está aprovado nesta turma.', 'erro');
    const campo = tipo === 'diploma' ? 'diploma' : 'certificado';
    const primeira = !m[`${campo}Numero`];
    if (primeira) {
      const numero = tipo === 'diploma' ? Instituicao.proximoNumeroDiploma() : Instituicao.proximoNumeroCertificado();
      m = Matriculas.salvar({ id: m.id, [`${campo}Numero`]: numero, [`${campo}EmitidoEm`]: new Date().toISOString(), [`${campo}EmitidoPor`]: Sessao.idAtual() });
    }
    const nomeTipo = tipo === 'diploma' ? 'Diploma' : 'Certificado';
    const aluno = Matriculas.nomeAluno(m);
    const freq = Frequencias.resumoAluno(turma.id, m.alunoId);
    const media = Notas.media(turma, m.alunoId);
    Registros.registrar({ codigo: this.codigo(campo, m), tipo: campo, matricula: m,
      detalhes: `Média final ${media !== null ? media.toFixed(1).replace('.', ',') : '-'} · frequência ${freq.aulas ? `${freq.percentual}%` : '-'} · período ${Utils.formatarData(turma.dataInicio)} a ${Utils.formatarData(turma.dataFim)}` });
    Atividades.registrar('academico', `${nomeTipo} ${primeira ? 'emitido' : 'reimpresso'}`,
      `Nº ${this.numero(m[`${campo}Numero`])} – ${aluno} – ${Turmas.nomeCurso(turma)}`, { refId: m.id });
    App.documento(`${nomeTipo} – ${aluno}`, tipo === 'diploma' ? this.diploma(m) : this.certificado(m), {
      classe: 'certificado', orientacao: 'landscape',
      arquivo: `${nomeTipo}_${this.numero(m[`${campo}Numero`])}_${aluno.replace(/\s+/g, '_')}`,
      dica: 'Frente e verso. No PDF, imprima em papel A4 paisagem.',
    });
    App.renderizarAtual();
    FichaAluno.atualizarSeAberta();
  },

  cabecalho(titulo, numero = '') {
    const i = Instituicao.ler();
    const e = Utils.escapar;
    return `
      <header class="doc-cabecalho">
        ${i.logo ? `<img class="doc-logo" src="${i.logo}" alt="">` : ''}
        <div class="doc-instituicao">
          <h1>${e(i.nome || 'Instituição de Ensino')}</h1>
          <p>${e([i.cnpj && `CNPJ ${i.cnpj}`, i.telefone, i.email].filter(Boolean).join(' · '))}</p>
          <p>${e(i.endereco || '')}</p>
        </div>
        <div class="doc-titulo"><h2>${e(titulo)}</h2>${numero ? `<p>${e(numero)}</p>` : ''}</div>
      </header>`;
  },

  dadosAluno(aluno) {
    const e = Utils.escapar;
    if (!aluno) return '<p>Aluno não encontrado.</p>';
    const endereco = [aluno.endereco, aluno.numero, aluno.bairro, aluno.cidade && `${aluno.cidade}/${aluno.uf}`]
      .filter(Boolean).join(', ');
    return `
      <section class="doc-bloco">
        <h3>Aluno</h3>
        <p><strong>${e(aluno.nome)}</strong> · CPF ${e(aluno.cpf)}</p>
        <p>${e([aluno.email, aluno.telefone].filter(Boolean).join(' · '))}</p>
        ${endereco ? `<p>${e(endereco)}</p>` : ''}
      </section>`;
  },

  fatura(l) {
    const e = Utils.escapar;
    const i = Instituicao.ler();
    const numero = `Nº ${String(l.numeroFatura).padStart(6, '0')}`;
    return `
      ${this.cabecalho('FATURA', numero)}
      ${this.dadosAluno(Alunos.buscarPorId(l.alunoId))}
      <table class="doc-tabela">
        <thead><tr><th>Descrição</th><th>Vencimento</th><th>Valor</th></tr></thead>
        <tbody><tr><td>${e(l.descricao)}</td><td>${Utils.formatarData(l.vencimento)}</td>
          <td>${Utils.formatarMoeda(l.valor)}</td></tr></tbody>
        <tfoot><tr><td colspan="2">Total a pagar</td><td>${Utils.formatarMoeda(l.valor)}</td></tr></tfoot>
      </table>
      ${this.blocoPix(l, numero)}
      <footer class="doc-rodape">Emitida em ${Utils.formatarDataHora(l.faturaEmitidaEm)}
        por ${e(Usuarios.nome(l.faturaEmitidaPor) || '-')}</footer>`;
  },

  // ---------- Proposta comercial (simulador) ----------
  proposta({ resultado, escolhida, curso, cliente, proposta }) {
    const e = Utils.escapar;
    const r = resultado;
    const linha = (op) => `<tr class="${op.id === escolhida?.id ? 'proposta-escolhida' : ''}">
      <td>${Simulador.FORMAS[op.forma].icone} ${Simulador.FORMAS[op.forma].nome}</td>
      <td>${op.parcelas === 1 ? 'À vista' : `${op.entrada ? `${Utils.formatarMoeda(op.entrada)} + ` : ''}${op.parcelas}x de ${Utils.formatarMoeda(op.valorParcela)}`}</td>
      <td>${op.parcelas === 1 ? (op.desconto ? `${String(op.desconto).replace('.', ',')}% de desconto` : '—') : (op.juros ? `${String(op.juros).replace('.', ',')}% a.m.` : 'sem juros')}</td>
      <td>${Utils.formatarMoeda(op.total)}</td></tr>`;
    const opcoes = Simulador.destaques(r);
    if (escolhida && !opcoes.some((o) => o.id === escolhida.id)) opcoes.push(escolhida);
    return `
      ${this.cabecalho('PROPOSTA', proposta ? `${Propostas.numero(proposta)} · ${Utils.formatarData(proposta.criadoEm)}` : Utils.formatarData(Utils.hoje()))}
      <h2 class="contrato-titulo">Proposta comercial</h2>
      <section class="doc-bloco">
        <h3>Para</h3>
        <p><strong>${e(cliente?.nome || 'Cliente')}</strong>${cliente?.telefone ? ` · ${e(cliente.telefone)}` : ''}${cliente?.item?.email ? ` · ${e(cliente.item.email)}` : ''}</p>
      </section>
      ${curso ? `<section class="doc-bloco">
        <h3>Curso</h3>
        <p><strong>${e(curso.nome)}</strong> – ${curso.cargaHoraria} horas${curso.duracaoMeses ? `, ${curso.duracaoMeses} meses` : ''}, ${e((curso.modalidade || '').toLowerCase())}</p>
        ${curso.descricao ? `<p>${e(curso.descricao)}</p>` : ''}
        ${(curso.grade || []).length ? `<p class="texto-pequeno">Conteúdo: ${curso.grade.map((g) => e(g.nome)).join(' · ')}</p>` : ''}
      </section>` : ''}
      <section class="doc-bloco">
        <h3>Investimento</h3>
        <p>Valor do curso: <strong>${Utils.formatarMoeda(r.valor)}</strong>${r.descontoExtra
          ? ` · desconto especial de ${String(r.descontoExtra).replace('.', ',')}%: <strong>${Utils.formatarMoeda(r.base)}</strong>` : ''}</p>
        <table class="doc-tabela">
          <thead><tr><th>Forma</th><th>Condição</th><th>Desconto / juros</th><th>Total</th></tr></thead>
          <tbody>${opcoes.map(linha).join('')}</tbody>
        </table>
        ${escolhida ? `<p class="proposta-combinada">✅ Condição combinada: <strong>${e(Simulador.descreverOpcao(escolhida))}</strong></p>` : ''}
      </section>
      <p class="texto-pequeno">Proposta válida até ${Utils.formatarData(proposta?.validade || Utils.somarDias(Utils.hoje(), r.regras.validadeDias))}.
        Parcelas acima do limite sem juros calculadas com juros compostos (Tabela Price).</p>
      <div class="doc-assinatura"><span></span><p>${e(Sessao.usuario()?.nome || '')}<br>${e(Instituicao.nome())}</p></div>`;
  },

  // QR Code PIX com valor e identificação da fatura + código "copia e cola"
  blocoPix(l, numero) {
    const e = Utils.escapar;
    const i = Instituicao.ler();
    const codigo = Pix.copiaECola({ valor: l.valor, txid: `FAT${String(l.numeroFatura || '').padStart(6, '0')}` });
    if (!codigo) {
      return `<section class="doc-bloco"><h3>Como pagar</h3><p>Pagamento na secretaria (PIX, cartão ou dinheiro).</p></section>`;
    }
    return `<section class="doc-bloco doc-pix">
      ${QR.imagem(codigo, { tamanho: 150 })}
      <div>
        <h3>Pague com PIX</h3>
        <p>Abra o app do seu banco, escolha <strong>PIX → Ler QR Code</strong> ou <strong>PIX Copia e Cola</strong>.</p>
        <p>Valor: <strong>${Utils.formatarMoeda(l.valor)}</strong> · Chave: ${e(i.chavePix)} · Ref.: ${e(numero)}</p>
        <p class="pix-codigo">${e(codigo)}</p>
      </div>
    </section>`;
  },

  recibo(l) {
    const e = Utils.escapar;
    const aluno = Alunos.buscarPorId(l.alunoId);
    return `
      ${this.cabecalho('RECIBO', l.numeroFatura ? `Ref. fatura Nº ${String(l.numeroFatura).padStart(6, '0')}` : '')}
      <p class="doc-texto">Recebemos de <strong>${e(aluno?.nome || '-')}</strong> (CPF ${e(aluno?.cpf || '-')})
        a quantia de <strong>${Utils.formatarMoeda(l.valorPago)}</strong>, referente a
        <strong>${e(l.descricao)}</strong>, paga em ${Utils.formatarData(l.dataPagamento)}
        via ${e(l.formaPagamento || '-')}.</p>
      <div class="doc-assinatura">
        <span></span>
        <p>${e(Instituicao.nome())}<br>${e(Usuarios.nome(l.recebidoPor) || '')}</p>
      </div>
      <footer class="doc-rodape">Emitido em ${Utils.formatarDataHora(new Date().toISOString())}</footer>`;
  },

  // Data por extenso com a cidade da escola: "São Paulo/SP, 23 de outubro de 2026"
  localData(iso) {
    const i = Instituicao.ler();
    const cidade = i.foro || (i.endereco || '').split('–').pop().trim();
    const data = new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    return `${cidade ? `${cidade}, ` : ''}${data}`;
  },

  numero(n) {
    return String(n).padStart(6, '0');
  },

  // Códigos de verificação: CT (contrato), CP (certificado), DP (diploma)
  codigo(tipo, m) {
    const prefixo = { contrato: 'CT', certificado: 'CP', diploma: 'DP' }[tipo];
    return `${prefixo}-${new Date(m[`${tipo}EmitidoEm`]).getFullYear()}-${this.numero(m[`${tipo}Numero`])}`;
  },

  // QR Code + código para conferir a autenticidade
  verificacao(codigo, tamanho = 84) {
    const url = Registros.urlVerificacao(codigo);
    return `<div class="doc-verificacao">${QR.imagem(url, { tamanho })}
      <div><strong>Verificação de autenticidade</strong><small>Código: <b>${Utils.escapar(codigo)}</b></small>
        <small>${Utils.escapar(url.split('?')[0])}</small></div></div>`;
  },

  // ---------- Declarações (matrícula, frequência, conclusão) ----------
  abrirDeclaracao(matriculaId, tipo) {
    const m = Matriculas.buscarPorId(matriculaId);
    const turma = Turmas.buscarPorId(m.turmaId);
    if (tipo === 'decl-conclusao' && Notas.situacao(turma, m.alunoId) !== 'Aprovado') {
      return Utils.toast('Declaração de conclusão só para alunos aprovados.', 'erro');
    }
    const codigo = Registros.novoCodigo('DC');
    const f = Frequencias.resumoAluno(turma.id, m.alunoId);
    const reg = Registros.registrar({ codigo, tipo, matricula: m,
      detalhes: tipo === 'decl-frequencia' ? `Frequência ${f.percentual}% em ${f.aulas} aula(s) até ${Utils.formatarData(Utils.hoje())}` : '' });
    Atividades.registrar('academico', 'Declaração emitida', `${Registros.TIPOS[tipo]} – ${Matriculas.nomeAluno(m)} (${codigo})`, { refId: m.id });
    App.documento(Registros.TIPOS[tipo], this.declaracao(tipo, m, reg), {
      arquivo: `${Registros.TIPOS[tipo].replace(/\s+/g, '_')}_${Matriculas.nomeAluno(m).replace(/\s+/g, '_')}`,
      dica: `Código ${codigo} – registrado para verificação.`,
    });
  },

  declaracao(tipo, m, reg) {
    const e = Utils.escapar;
    const i = Instituicao.ler();
    const aluno = Alunos.buscarPorId(m.alunoId);
    const turma = Turmas.buscarPorId(m.turmaId);
    const curso = Cursos.buscarPorId(turma.cursoId);
    const f = Frequencias.resumoAluno(turma.id, aluno.id);
    const media = Notas.media(turma, aluno.id);
    const quem = `<strong>${e(aluno.nome)}</strong>, CPF ${e(aluno.cpf)}${aluno.nascimento ? `, nascido(a) em ${Utils.formatarData(aluno.nascimento)}` : ''}`;
    const cursoTxt = `<strong>${e(curso.nome)}</strong> (${curso.cargaHoraria} horas, modalidade ${e((curso.modalidade || '').toLowerCase())}), turma ${e(turma.codigo)}`;
    const horario = `${e((turma.dias || []).join(', '))}${turma.horaInicio ? `, das ${e(turma.horaInicio)} às ${e(turma.horaFim)}` : ''}`;
    const textos = {
      'decl-matricula': `Declaramos, para os devidos fins, que ${quem}, está regularmente matriculado(a) nesta instituição no curso ${cursoTxt},
        com aulas às ${horario}, no período de ${Utils.formatarData(turma.dataInicio)} a ${Utils.formatarData(turma.dataFim)}.
        A matrícula foi realizada em ${Utils.formatarData(m.dataMatricula)} e encontra-se <strong>${e(m.status.toLowerCase())}</strong>.`,
      'decl-frequencia': `Declaramos, para os devidos fins, que ${quem}, aluno(a) do curso ${cursoTxt}, compareceu a
        <strong>${f.aulas - f.faltas} de ${f.aulas} aulas</strong> registradas até ${Utils.formatarData(Utils.hoje())},
        o que corresponde a uma frequência de <strong>${f.percentual}%</strong>${f.justificadas ? ` (${f.justificadas} falta(s) justificada(s) não descontada(s))` : ''}.`,
      'decl-conclusao': `Declaramos, para os devidos fins, que ${quem}, concluiu com aproveitamento o curso ${cursoTxt},
        realizado no período de ${Utils.formatarData(turma.dataInicio)} a ${Utils.formatarData(turma.dataFim)}${
        media !== null ? `, com média final <strong>${media.toFixed(1).replace('.', ',')}</strong>` : ''}${f.aulas ? ` e frequência de ${f.percentual}%` : ''}.
        O certificado de conclusão ${m.certificadoNumero ? `foi emitido sob o nº ${this.numero(m.certificadoNumero)}` : 'encontra-se em fase de emissão'}.`,
    };
    return `
      ${this.cabecalho('DECLARAÇÃO', reg.codigo)}
      <h2 class="contrato-titulo">${e(Registros.TIPOS[tipo])}</h2>
      <p class="doc-texto declaracao-texto">${textos[tipo]}</p>
      <p class="doc-texto declaracao-texto">Por ser verdade, firmamos a presente declaração.</p>
      <p class="contrato-data">${e(this.localData(reg.emitidoEm))}.</p>
      <div class="doc-assinatura"><span></span><p>${e(reg.emitidoPorNome || 'Secretaria')}<br>${e(i.nome || 'Instituição de Ensino')}</p></div>
      ${this.verificacao(reg.codigo)}`;
  },

  // ---------- Contrato de prestação de serviços educacionais ----------
  contrato(m) {
    const e = Utils.escapar;
    const i = Instituicao.ler();
    const aluno = Alunos.buscarPorId(m.alunoId);
    const turma = Turmas.buscarPorId(m.turmaId);
    const curso = Cursos.buscarPorId(turma.cursoId);
    const temResp = Boolean(aluno.responsavelNome);
    const endereco = [aluno.endereco, aluno.numero, aluno.bairro, aluno.cidade && `${aluno.cidade}/${aluno.uf}`, aluno.cep && `CEP ${aluno.cep}`]
      .filter(Boolean).join(', ') || 'endereço não informado';
    const parcelas = Financeiro.listar().filter((l) => l.matriculaId === m.id && l.status !== 'Cancelado')
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
    const total = (m.taxaMatricula || 0) + m.valorFinal * m.parcelas;
    const multa = i.multaAtraso ?? 2;
    const juros = i.jurosMes ?? 1;
    const aviso = i.avisoPrevio ?? 30;
    const rescisoria = i.multaRescisoria ?? 10;
    const n = { num: 0 };
    const clausula = (titulo, texto) => `<section class="clausula"><h3>Cláusula ${++n.num}ª – ${titulo}</h3>${texto}</section>`;

    return `
      ${this.cabecalho('CONTRATO', `Nº ${this.numero(m.contratoNumero)}`)}
      <h2 class="contrato-titulo">Contrato de Prestação de Serviços Educacionais</h2>
      <section class="clausula partes">
        <p><strong>CONTRATADA:</strong> ${e(i.nome || 'Instituição de Ensino')}${i.cnpj ? `, inscrita no CNPJ sob o nº ${e(i.cnpj)}` : ''}${
          i.endereco ? `, com sede em ${e(i.endereco)}` : ''}, doravante denominada <strong>ESCOLA</strong>.</p>
        <p><strong>CONTRATANTE:</strong> ${temResp
          ? `${e(aluno.responsavelNome)}, CPF ${e(aluno.responsavelCpf || 'não informado')}${aluno.responsavelParentesco ? `, ${e(aluno.responsavelParentesco.toLowerCase())} do(a) aluno(a)` : ''}, telefone ${e(aluno.responsavelTelefone || aluno.telefone)}`
          : `${e(aluno.nome)}, CPF ${e(aluno.cpf)}, telefone ${e(aluno.telefone)}, e-mail ${e(aluno.email)}`}, residente em ${e(endereco)}.</p>
        ${temResp ? `<p><strong>ALUNO(A):</strong> ${e(aluno.nome)}, CPF ${e(aluno.cpf)}${aluno.nascimento ? `, nascido(a) em ${Utils.formatarData(aluno.nascimento)}` : ''}.</p>` : ''}
        <p>As partes acima identificadas celebram o presente contrato, que se regerá pelas cláusulas a seguir.</p>
      </section>
      ${clausula('Do objeto', `<p>A ESCOLA prestará ao(à) aluno(a) os serviços educacionais do curso <strong>${e(curso.nome)}</strong>${curso.area ? ` (${e(curso.area)})` : ''},
        na modalidade ${e((curso.modalidade || '').toLowerCase())}, com carga horária total de <strong>${curso.cargaHoraria} horas</strong>,
        na turma <strong>${e(turma.codigo)}</strong>, com aulas às ${e((turma.dias || []).join(', ') || 'datas a definir')}${turma.horaInicio ? `, das ${e(turma.horaInicio)} às ${e(turma.horaFim)}` : ''},
        no período de ${Utils.formatarData(turma.dataInicio)} a ${Utils.formatarData(turma.dataFim)}${turma.sala ? `, em ${e(turma.sala)}` : ''}.
        O conteúdo programático consta no Anexo II.</p>`)}
      ${clausula('Do valor e da forma de pagamento', `<p>Pelos serviços, o CONTRATANTE pagará:</p>
        <ul>
          ${m.taxaMatricula ? `<li>Taxa de matrícula de <strong>${Utils.formatarMoeda(m.taxaMatricula)}</strong>, com vencimento em ${Utils.formatarData(m.dataMatricula)};</li>` : ''}
          <li><strong>${m.parcelas}</strong> mensalidade(s) de <strong>${Utils.formatarMoeda(m.valorFinal)}</strong>${m.desconto
            ? ` (valor cheio de ${Utils.formatarMoeda(m.valorMensalidade)} com desconto de ${m.desconto}%)` : ''}, com vencimento todo dia <strong>${m.diaVencimento}</strong>;</li>
          <li>Valor total do contrato: <strong>${Utils.formatarMoeda(total)}</strong>.</li>
        </ul>
        <p>Os pagamentos poderão ser feitos por PIX${i.chavePix ? ` (chave ${e(i.chavePix)})` : ''}, boleto, cartão ou na secretaria. O cronograma consta no Anexo I.</p>`)}
      ${clausula('Do atraso no pagamento', `<p>O pagamento após o vencimento acarretará multa de ${String(multa).replace('.', ',')}% e juros de
        ${String(juros).replace('.', ',')}% ao mês, calculados proporcionalmente aos dias de atraso, sem prejuízo da cobrança dos valores devidos.</p>`)}
      ${clausula('Das obrigações da escola', `<p>A ESCOLA se compromete a ministrar as aulas conforme o plano do curso, com professores qualificados,
        e a emitir certificado de conclusão ao(à) aluno(a) que obtiver média final igual ou superior a ${Academico.mediaMinima()} e frequência mínima
        de ${Academico.frequenciaMinima()}% das aulas.</p>`)}
      ${clausula('Das obrigações do contratante', `<p>O CONTRATANTE se compromete a efetuar os pagamentos nas datas acordadas, zelar pela frequência
        e pelo bom desempenho do(a) aluno(a), respeitar as normas internas da ESCOLA e manter seus dados cadastrais atualizados.</p>`)}
      ${clausula('Do cancelamento e do trancamento', `<p>O cancelamento deverá ser solicitado por escrito com antecedência mínima de ${aviso} dias.
        Permanecem devidas as parcelas vencidas até a data do pedido, e será cobrada multa rescisória de ${rescisoria}% sobre o saldo das parcelas a vencer.
        O trancamento, quando aceito, suspende as cobranças futuras e poderá ser retomado conforme disponibilidade de vagas.</p>`)}
      ${clausula('Das aulas e reposições', `<p>Não haverá aulas em feriados e recessos previstos no calendário da ESCOLA. Aulas canceladas por iniciativa
        da ESCOLA serão repostas. A ESCOLA poderá alterar horários e professores, comunicando previamente o CONTRATANTE.</p>`)}
      ${clausula('Dos dados pessoais', `<p>Os dados pessoais fornecidos serão tratados pela ESCOLA exclusivamente para a execução deste contrato,
        comunicação acadêmica e cumprimento de obrigações legais, nos termos da Lei nº 13.709/2018 (LGPD).</p>`)}
      ${clausula('Do foro', `<p>Fica eleito o foro da comarca de ${e(i.foro || (i.endereco || '').split('–').pop().trim() || 'sede da ESCOLA')}
        para dirimir quaisquer dúvidas oriundas deste contrato.</p>`)}
      <p class="contrato-fecho">E, por estarem de acordo, as partes assinam o presente contrato em duas vias de igual teor.</p>
      <p class="contrato-data">${e(this.localData(m.contratoEmitidoEm || new Date().toISOString()))}.</p>
      <div class="assinaturas-contrato">
        <div><span></span><p>${e(temResp ? aluno.responsavelNome : aluno.nome)}<br><small>CONTRATANTE</small></p></div>
        <div><span></span><p>${e(i.nome || 'Instituição de Ensino')}<br><small>CONTRATADA</small></p></div>
        <div><span></span><p>Testemunha 1<br><small>Nome / CPF</small></p></div>
        <div><span></span><p>Testemunha 2<br><small>Nome / CPF</small></p></div>
      </div>

      <section class="anexo">
        <h3>Anexo I – Cronograma de pagamentos</h3>
        <table class="doc-tabela">
          <thead><tr><th>#</th><th>Descrição</th><th>Vencimento</th><th>Valor</th></tr></thead>
          <tbody>${(parcelas.length ? parcelas : Array.from({ length: m.parcelas }, (_, k) => ({
            descricao: `Mensalidade ${k + 1}/${m.parcelas}`, vencimento: Utils.somarMeses(m.dataMatricula, k + 1, m.diaVencimento), valor: m.valorFinal,
          }))).map((l, k) => `<tr><td>${k + 1}</td><td>${e(l.descricao)}</td><td>${Utils.formatarData(l.vencimento)}</td><td>${Utils.formatarMoeda(l.valor)}</td></tr>`).join('')}</tbody>
          <tfoot><tr><td colspan="3">Total</td><td>${Utils.formatarMoeda(total)}</td></tr></tfoot>
        </table>
      </section>
      <section class="anexo">
        <h3>Anexo II – Conteúdo programático</h3>
        <table class="doc-tabela">
          <thead><tr><th>#</th><th>Módulo / disciplina</th><th>Carga</th></tr></thead>
          <tbody>${(curso.grade || []).map((g, k) => `<tr><td>${k + 1}</td><td><strong>${e(g.nome)}</strong>${g.ementa ? `<br><small>${e(g.ementa)}</small>` : ''}</td><td>${g.cargaHoraria}h</td></tr>`).join('')
            || `<tr><td colspan="3">${e(curso.descricao || 'Conforme plano do curso.')}</td></tr>`}</tbody>
        </table>
      </section>
      ${this.verificacao(this.codigo('contrato', m), 72)}
      <footer class="doc-rodape">Contrato Nº ${this.numero(m.contratoNumero)} · matrícula de ${Utils.formatarData(m.dataMatricula)} · gerado pelo CRM Plus</footer>`;
  },

  // ---------- Diploma de conclusão (frente + verso com registro e histórico) ----------
  diploma(m) {
    const e = Utils.escapar;
    const i = Instituicao.ler();
    const aluno = Alunos.buscarPorId(m.alunoId);
    const turma = Turmas.buscarPorId(m.turmaId);
    const curso = Cursos.buscarPorId(turma.cursoId);
    const freq = Frequencias.resumoAluno(turma.id, aluno.id);
    const media = Notas.media(turma, aluno.id);
    const numero = this.numero(m.diplomaNumero);
    const livro = Math.ceil(m.diplomaNumero / 100);
    const folha = ((m.diplomaNumero - 1) % 100) + 1;
    const codigo = `DP-${new Date(m.diplomaEmitidoEm).getFullYear()}-${numero}`;
    const notas = Notas.notasDoAluno(turma.id, aluno.id);
    const ornamento = (classe) => `<svg class="dip-canto ${classe}" viewBox="0 0 60 60"><path d="M4 56V20C4 11 11 4 20 4h36" fill="none" stroke="currentColor" stroke-width="2.5"/>
      <path d="M12 56V24c0-7 5-12 12-12h32" fill="none" stroke="currentColor" stroke-width="1"/><circle cx="20" cy="20" r="4" fill="currentColor"/></svg>`;
    const selo = i.logo ? `<img src="${i.logo}" alt="">` : `<strong>${e(Usuarios.iniciais(i.nome || 'C P'))}</strong>`;

    return `
      <section class="diploma">
        <div class="dip-moldura">
          ${ornamento('sup-esq')}${ornamento('sup-dir')}${ornamento('inf-esq')}${ornamento('inf-dir')}
          ${i.logo ? `<img class="dip-logo" src="${i.logo}" alt="">` : ''}
          <p class="dip-escola">${e(i.nome || 'Instituição de Ensino')}</p>
          <h1 class="dip-titulo">Diploma</h1>
          <p class="dip-texto">A <strong>${e(i.nome || 'Instituição de Ensino')}</strong>, no uso de suas atribuições, confere a</p>
          <p class="dip-nome">${e(aluno.nome)}</p>
          <p class="dip-texto">o presente Diploma por haver concluído com êxito o curso de <strong>${e(curso.nome)}</strong>,
            com carga horária de <strong>${curso.cargaHoraria} horas</strong>, realizado de ${Utils.formatarData(turma.dataInicio)}
            a ${Utils.formatarData(turma.dataFim)}${media !== null ? `, com média final <strong>${media.toFixed(1).replace('.', ',')}</strong>` : ''}${
            freq.aulas ? ` e frequência de ${freq.percentual}%` : ''}, para que possa gozar de todos os direitos e prerrogativas legais.</p>
          ${i.amparoLegal ? `<p class="dip-amparo">${e(i.amparoLegal)}</p>` : ''}
          <p class="dip-data">${e(this.localData(m.diplomaEmitidoEm))}.</p>
          <div class="dip-rodape">
            <div class="dip-assinatura"><span></span><p>${e(i.responsavelCertificado || 'Direção')}<br><small>Diretor(a)</small></p></div>
            <div class="dip-selo">${selo}<small>Reg. ${numero}</small></div>
            <div class="dip-assinatura"><span></span><p>${e(aluno.nome)}<br><small>Diplomado(a)</small></p></div>
          </div>
        </div>
      </section>
      <section class="dip-verso">
        <div class="dip-verso-grade">
          <div class="dip-registro">
            <h3>Registro</h3>
            <p>Diploma registrado sob o nº <strong>${numero}</strong>,<br>Livro <strong>${livro}</strong>, Folha <strong>${folha}</strong>,<br>
              em ${Utils.formatarData(m.diplomaEmitidoEm)}.</p>
            <div class="dip-assinatura"><span></span><p>${e(Usuarios.nome(m.diplomaEmitidoPor) || 'Secretaria')}<br><small>Secretaria acadêmica</small></p></div>
            <div class="dip-codigo">${QR.imagem(Registros.urlVerificacao(codigo), { tamanho: 96 })}
              <p>Código de verificação<br><strong>${codigo}</strong></p></div>
          </div>
          <div class="dip-historico">
            <h3>Histórico escolar – ${e(curso.nome)}</h3>
            <p class="texto-pequeno">Aluno(a): ${e(aluno.nome)} · CPF ${e(aluno.cpf)} · Turma ${e(turma.codigo)}</p>
            <table class="doc-tabela">
              <thead><tr><th>#</th><th>Módulo / disciplina</th><th>Professor(a)</th><th>Carga</th><th>Nota</th></tr></thead>
              <tbody>${Notas.avaliacoes(turma).map((a, k) => {
                const g = (curso.grade || []).find((x) => x.id === a.id);
                return `<tr><td>${k + 1}</td><td>${e(a.nome)}</td><td>${e(Professores.nome(g?.professorId) || Turmas.nomeProfessor(turma) || '-')}</td>
                  <td>${g ? `${g.cargaHoraria}h` : `${curso.cargaHoraria}h`}</td><td>${notas[a.id] ?? '-'}</td></tr>`;
              }).join('')}</tbody>
              <tfoot><tr><td colspan="3">Carga horária total · Frequência ${freq.aulas ? `${freq.percentual}%` : '-'}</td>
                <td>${curso.cargaHoraria}h</td><td>${media !== null ? media.toFixed(1).replace('.', ',') : '-'}</td></tr></tfoot>
            </table>
            <p class="texto-pequeno">Situação final: <strong>Aprovado(a)</strong> · Coordenação: ${e(Cursos.nomeCoordenador(curso) || '-')}</p>
          </div>
        </div>
      </section>`;
  },

  // Certificado de conclusão (página 1) + conteúdo programático (página 2)
  certificado(m) {
    const e = Utils.escapar;
    const i = Instituicao.ler();
    const aluno = Alunos.buscarPorId(m.alunoId);
    const turma = Turmas.buscarPorId(m.turmaId);
    const curso = Cursos.buscarPorId(turma.cursoId);
    const freq = Frequencias.resumoAluno(turma.id, aluno.id);
    const media = Notas.media(turma, aluno.id);
    const codigo = `CP-${new Date(m.certificadoEmitidoEm).getFullYear()}-${String(m.certificadoNumero).padStart(6, '0')}`;
    const cidade = (i.endereco || '').split('–').pop().trim() || '';
    const dataExtenso = new Date(m.certificadoEmitidoEm).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    const coordenador = Cursos.nomeCoordenador(curso);
    return `
      <section class="cert">
        <div class="cert-moldura">
          ${i.logo ? `<img class="cert-logo" src="${i.logo}" alt="">` : ''}
          <p class="cert-escola">${e(i.nome || 'Instituição de Ensino')}</p>
          <h1 class="cert-titulo">Certificado</h1>
          <p class="cert-sub">de conclusão de curso</p>
          <p class="cert-texto">Certificamos que <strong class="cert-nome">${e(aluno.nome)}</strong>
            inscrito(a) no CPF ${e(aluno.cpf)}, concluiu com aproveitamento o curso
            <strong>${e(curso.nome)}</strong>, na modalidade ${e((curso.modalidade || '').toLowerCase())},
            com carga horária de <strong>${curso.cargaHoraria} horas</strong>, realizado no período de
            ${Utils.formatarData(turma.dataInicio)} a ${Utils.formatarData(turma.dataFim)}${
              freq.aulas ? `, com frequência de ${freq.percentual}%` : ''}${
              media !== null ? ` e média final ${media.toFixed(1).replace('.', ',')}` : ''}.</p>
          ${i.amparoLegal ? `<p class="dip-amparo">${e(i.amparoLegal)}</p>` : ''}
          <p class="cert-data">${e(cidade ? `${cidade}, ` : '')}${dataExtenso}.</p>
          <div class="cert-assinaturas">
            <div><span></span><p>${e(i.responsavelCertificado || 'Direção')}<br><small>Direção</small></p></div>
            <div><span></span><p>${e(coordenador || 'Coordenação')}<br><small>Coordenação do curso</small></p></div>
          </div>
          <p class="cert-codigo">Certificado Nº ${String(m.certificadoNumero).padStart(6, '0')} · Código de verificação ${codigo}</p>
        </div>
      </section>
      <section class="cert-verso">
        <h2>Conteúdo programático – ${e(curso.nome)}</h2>
        <table class="doc-tabela">
          <thead><tr><th>#</th><th>Módulo / disciplina</th><th>Professor(a)</th><th>Carga</th><th>Nota</th></tr></thead>
          <tbody>${(curso.grade || []).map((g, n) => `
            <tr><td>${n + 1}</td><td><strong>${e(g.nome)}</strong>${g.ementa ? `<br><small>${e(g.ementa)}</small>` : ''}</td>
              <td>${e(Professores.nome(g.professorId) || '-')}</td><td>${g.cargaHoraria}h</td>
              <td>${Notas.notasDoAluno(turma.id, aluno.id)[g.id] ?? '-'}</td></tr>`).join('') ||
            `<tr><td colspan="5">${e(curso.descricao || 'Conteúdo conforme plano do curso.')}</td></tr>`}</tbody>
          <tfoot><tr><td colspan="3">Carga horária total</td><td colspan="2">${curso.cargaHoraria}h</td></tr></tfoot>
        </table>
        ${this.verificacao(codigo)}
        <p class="doc-rodape">Turma ${e(turma.codigo)} · Professor(a) responsável: ${e(Turmas.nomeProfessor(turma) || '-')}
          · Registro ${codigo}</p>
      </section>`;
  },

  // Ficha cadastral do aluno para impressão
  fichaAluno(aluno) {
    const e = Utils.escapar;
    const matriculas = Matriculas.listar().filter((m) => m.alunoId === aluno.id);
    return `
      ${this.cabecalho('FICHA DO ALUNO')}
      <div class="doc-ficha">
        ${aluno.foto ? `<img class="doc-foto" src="${aluno.foto}" alt="">` : ''}
        ${this.dadosAluno(aluno)}
      </div>
      <section class="doc-bloco"><h3>Matrículas</h3>
        <table class="doc-tabela">
          <thead><tr><th>Turma</th><th>Curso</th><th>Data</th><th>Situação</th><th>Frequência</th><th>Média</th></tr></thead>
          <tbody>${matriculas.map((m) => {
            const t = Turmas.buscarPorId(m.turmaId);
            const f = t ? Frequencias.resumoAluno(t.id, aluno.id) : null;
            const media = t ? Notas.media(t, aluno.id) : null;
            return `<tr><td>${e(t?.codigo || '-')}</td><td>${e(t ? Turmas.nomeCurso(t) : '-')}</td>
              <td>${Utils.formatarData(m.dataMatricula)}</td><td>${e(m.status)}</td>
              <td>${f?.aulas ? `${f.percentual}%` : '-'}</td><td>${media !== null ? media.toFixed(1) : '-'}</td></tr>`;
          }).join('') || '<tr><td colspan="6">Nenhuma matrícula.</td></tr>'}</tbody>
        </table>
      </section>
      ${aluno.observacoes ? `<section class="doc-bloco"><h3>Observações</h3><p>${e(aluno.observacoes)}</p></section>` : ''}
      <footer class="doc-rodape">Impresso em ${Utils.formatarDataHora(new Date().toISOString())}</footer>`;
  },

  grade(curso) {
    const e = Utils.escapar;
    const grade = curso.grade || [];
    const turmas = Turmas.listar().filter((t) => t.cursoId === curso.id && Turmas.estaAberta(t));
    return `
      ${this.cabecalho('GRADE CURRICULAR', curso.codigo || '')}
      <section class="doc-bloco">
        <h3>${e(curso.nome)}</h3>
        <p>${e([curso.area, curso.modalidade, `${curso.cargaHoraria}h`,
          curso.duracaoMeses && `${curso.duracaoMeses} meses`].filter(Boolean).join(' · '))}</p>
        ${curso.coordenadorId ? `<p>Coordenação: <strong>${e(Cursos.nomeCoordenador(curso))}</strong></p>` : ''}
        ${curso.descricao ? `<p>${e(curso.descricao)}</p>` : ''}
      </section>
      <table class="doc-tabela">
        <thead><tr><th>#</th><th>Módulo / disciplina</th><th>Professor(a)</th><th>Carga</th></tr></thead>
        <tbody>${grade.map((g, i) => `
          <tr><td>${i + 1}</td><td><strong>${e(g.nome)}</strong>${g.ementa ? `<br><small>${e(g.ementa)}</small>` : ''}</td>
            <td>${e(Professores.nome(g.professorId) || 'A definir')}</td><td>${g.cargaHoraria}h</td></tr>`).join('') ||
          '<tr><td colspan="4">Grade ainda não definida.</td></tr>'}</tbody>
        <tfoot><tr><td colspan="3">Carga horária total</td><td>${Cursos.cargaDaGrade(curso)}h</td></tr></tfoot>
      </table>
      ${turmas.length ? `<section class="doc-bloco"><h3>Turmas abertas</h3>${turmas.map((t) => `
        <p><strong>${e(t.codigo)}</strong> – ${e((t.dias || []).join(', '))} ${e(t.horaInicio || '')}–${e(t.horaFim || '')}
        · ${e(Turmas.nomeProfessor(t) || 'professor a definir')} · início ${Utils.formatarData(t.dataInicio)}</p>`).join('')}</section>` : ''}
      <footer class="doc-rodape">Gerado em ${Utils.formatarDataHora(new Date().toISOString())}</footer>`;
  },
};
