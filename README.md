# CRM Plus – Gestão Educacional

Sistema web de CRM para instituições de ensino (cursos livres, escolas de idiomas, escolas técnicas).
Feito em **HTML, CSS e JavaScript puro**, sem dependências nem etapa de build.

🔗 **Demonstração:** https://lorranbrs.github.io/CRM-Plus/

> Na tela de entrada, clique em **"Entrar na demonstração"** para ver o sistema preenchido
> (equipe, professores, cursos, turmas, alunos, financeiro e leads de exemplo).

## Perfis de acesso

Ao abrir o site, escolha **Diretor** ou **Funcionário** (com PIN opcional).

| Perfil | O que vê |
|---|---|
| 👔 **Diretor** | Tudo, mais **Equipe** (usuários, acessos, desempenho por funcionário) e **Atividades** (linha do tempo de quem fez cada contato, matrícula, fatura e pagamento) |
| 🧑‍💼 **Funcionário** | Só os módulos liberados pelo diretor. Acessos sugeridos por função: Secretaria, Comercial, Financeiro, Coordenação pedagógica |

Tudo o que é feito no sistema fica registrado com o usuário, a data e a hora.

🌙 **Modo escuro**: botão no menu lateral (segue o tema do sistema na primeira visita).

## Módulos

| Módulo | O que faz |
|---|---|
| 🏠 **Painel** | Indicadores, **lucro do mês**, **metas do mês**, o que tem **hoje na agenda**, receita (6 meses), funil, ocupação, contatos e atrasos |
| 📅 **Agenda** | Calendário mensal e lista com aulas, contas a pagar e a receber, retornos de leads, aniversários, eventos e **feriados nacionais** (importação automática); camadas liga/desliga; feriados suspendem as aulas |
| 🧮 **Simulador** | Propostas para o cliente: PIX/boleto à vista com desconto, parcelado sem juros até N vezes e **com juros acima disso (Tabela Price)**, entrada, desconto especial com limite do atendente; copiar, enviar por WhatsApp, PDF, registrar no lead e matricular com a condição. **Calculadora** e **desconto rápido**. Regras definidas pelo diretor. **Histórico de propostas** (numeradas, situação Enviada/Aceita/Recusada/Vencida, motivos de recusa, retornos), **aprovação de desconto pelo diretor** e relatório de aceite por atendente |
| 💬 **Conversas** | Tela de chat com alunos, leads e professores: histórico, envio pelo WhatsApp (abre com o texto pronto), registro das respostas e **modelos de mensagem** com campos automáticos ({primeiro_nome}, {valor}, {vencimento}...) |
| 🎯 **Leads / Funil** | Kanban com 6 etapas (arrastar e soltar), origem, responsável, próximo contato, histórico de interações e **conversão em aluno → matrícula** |
| 👩‍🎓 **Alunos** | Cadastro completo, validação de CPF, máscaras, endereço pelo CEP (ViaCEP) e **ficha do aluno** (foto, matrículas, frequência, notas, financeiro, histórico e anotações; impressão) |
| 📚 **Cursos** | Catálogo com modalidade, carga horária, mensalidade, coordenador e **grade curricular** (módulos com professor, carga horária e ementa; impressão da grade) |
| 👨‍🏫 **Professores** | Cadastro, formação, especialidades, valor hora-aula, turmas, disciplinas, horas/semana e **agenda semanal** |
| 🏫 **Turmas** | Professor, sala, dias, turno, horário, período, vagas, ocupação e **grade semanal**; bloqueia conflito de horário do professor |
| 🎓 **Acadêmico** | **Chamada** (presente/falta/justificada, aulas sem chamada), **notas** por módulo da grade, situação (aprovado/reprovado) e **certificado de conclusão** com código de verificação |
| 📝 **Matrículas** | Aluno × turma, controle de vagas, desconto, parcelas, dia de vencimento; gera o financeiro automaticamente |
| 💰 **Financeiro** | **Receitas**: contas a receber, fatura numerada, recibo, pagamentos e estorno · **Despesas**: contas a pagar por categoria, recorrência mensal e **pagamento de professores** calculado pelas aulas dadas × valor da hora-aula · **Resultado** *(diretor)*: lucro, margem, gráfico de 6 meses e demonstrativo |
| 📊 **Relatórios** | Exportação CSV de todos os módulos, inadimplência, resumo por turma, **documentos emitidos** e backup/restauração em JSON |
| 🏆 **Metas** *(diretor)* | Metas mensais de matrículas, leads, receita e lucro, metas individuais por funcionário, projeção pelo ritmo atual e histórico |
| 👥 **Equipe** *(diretor)* | Usuários, perfis, PIN, módulos liberados, desempenho no período e dados da instituição (**logo, cor da escola**, média e frequência mínimas) |
| 🕒 **Atividades** *(diretor)* | Linha do tempo filtrável por funcionário, módulo e período, com exportação |

### Documentos (PDF)
Contrato de prestação de serviços, certificado, diploma, **declarações** (matrícula, frequência, conclusão), fatura e recibo —
todos com prévia, **⬇ Baixar PDF** e impressão. Fatura com **QR Code PIX** (BR Code com valor) e "copia e cola".
Contratos, certificados, diplomas e declarações recebem **código e QR Code de verificação** (`verificar.html`).

> A verificação consulta o registro salvo no navegador da escola; a verificação pública por qualquer pessoa depende do banco de dados online.

### Regras de negócio
- CPF válido e único; códigos de curso e turma únicos
- Turma lotada não aceita novas matrículas; só turmas *Planejada* ou *Em andamento* recebem matrícula
- Matrícula nova torna o aluno **Ativo** e gera taxa + mensalidades (com desconto aplicado)
- Cancelar/trancar matrícula oferece cancelar as parcelas pendentes
- Não é possível excluir curso com turmas, turma com matrículas, aluno com histórico ou professor vinculado (use o status)
- Um professor não pode ter duas turmas abertas com dia e horário sobrepostos
- Sempre existe pelo menos um diretor ativo; ninguém desativa o próprio usuário

## Armazenamento

Os dados ficam no **localStorage** do navegador: cada navegador/computador tem seus próprios dados.
Use **Relatórios → Backup** para salvar ou transferir os dados.

> ⚠️ Sem servidor, a escolha de perfil e o PIN **organizam** o acesso, mas não são uma proteção de segurança real
> (quem tiver acesso ao navegador consegue ver os dados). Login seguro depende do backend (próxima etapa).

A camada `js/storage.js` isola o acesso aos dados para facilitar a troca por uma API no futuro.

## Estrutura

```
CRM-Plus/
├── index.html              # Tela de entrada, layout, telas e formulários (modais)
├── verificar.html          # Página de verificação de documentos (código / QR Code)
├── versao.py / versao.json # Marca a versão publicada (cache) e avisa quem está com versão antiga
├── css/
│   ├── style.css           # Estilos e responsividade
│   └── impressao.css       # Fatura, recibo, grade, ficha e certificado impressos
└── js/
    ├── utils.js            # Máscaras, validações, datas, CSV, formulários, modais, impressão
    ├── storage.js          # localStorage + CRUD genérico (registra quem criou/alterou) + backup
    ├── sessao.js           # Usuário logado e permissões
    ├── graficos.js         # Gráficos de barras em HTML/CSS
    ├── tema.js             # Modo claro/escuro e cor da escola
    ├── agenda.js           # Grade semanal das turmas
    ├── documentos.js       # HTML da fatura, recibo e grade curricular
    ├── modelos/            # Regras de negócio
    │   ├── usuarios.js  atividades.js  instituicao.js  professores.js
    │   ├── eventos.js (agenda e feriados)  despesas.js (despesas e resultado)  metas.js
    │   ├── alunos.js  cursos.js  turmas.js  academico.js (frequência e notas)
    │   └── matriculas.js  financeiro.js  leads.js  mensagens.js (WhatsApp, contatos, modelos)
    ├── telas/              # Eventos e renderização de cada tela
    │   ├── entrada.js  painel.js  leads.js  conversas.js  mensageiro.js  alunos.js  ficha.js
    │   ├── calendario.js  cursos.js  professores.js  turmas.js  academico.js  matriculas.js
    │   └── financeiro.js  despesas.js  metas.js  relatorios.js  equipe.js  atividades.js
    ├── exemplos.js         # Dados de demonstração
    └── app.js              # Entrada, menu por permissão e navegação
```

### Backup
- **Cópias automáticas** no próprio navegador (IndexedDB): uma por dia e outra antes de restaurar ou apagar dados (10 mais recentes),
  com restauração em **Relatórios → Cópias automáticas**.
- **Lembrete no Painel** (diretor) quando o último backup baixado tem mais de 7 dias, com download em um clique.
- O sistema pede ao navegador armazenamento persistente (para não apagar os dados quando faltar espaço).

## Publicar uma nova versão

Antes de cada publicação, marque a versão (evita que os navegadores usem arquivos antigos do cache):

```bash
python3 versao.py
```

O script atualiza o `?v=` de todos os `.js`/`.css` no `index.html` e o `versao.json`.
Quem estiver com o sistema aberto vê o aviso **"Nova versão disponível – Atualizar agora"**.

## Como rodar localmente

Abra o `index.html` no navegador, ou sirva a pasta:

```bash
python3 -m http.server 8000
```

## Roadmap

- [x] Alunos
- [x] Cursos e turmas
- [x] Matrículas
- [x] Leads e funil de captação
- [x] Financeiro
- [x] Painel e relatórios
- [x] Perfis Diretor/Funcionário, permissões e registro de atividades
- [x] Professores, grade curricular e grade semanal
- [x] Faturas e recibos
- [x] Ficha do aluno, chamada, notas e certificado
- [x] WhatsApp com mensagens prontas e tela de conversas
- [x] Modo escuro, logo e cor da escola
- [x] Agenda/calendário com feriados
- [x] Metas mensais (escola e funcionários)
- [x] Despesas, pagamento de professores e lucro
- [ ] Receber respostas do WhatsApp automaticamente (API oficial – exige servidor)
- [x] Perfil Professor, contrato e diploma em PDF
- [x] PIX com QR Code, declarações e verificação de documentos
- [x] Simulador de propostas e calculadora
- [x] Versão dos arquivos (cache) e backup automático
- [x] Histórico de propostas e aprovação de desconto
- [ ] Backend + banco de dados (dados compartilhados entre computadores)
- [ ] Login seguro com senha (no servidor)
- [ ] Frequência/notas, emissão de boletos/PIX, envio de WhatsApp/e-mail
