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

## Módulos

| Módulo | O que faz |
|---|---|
| 🏠 **Painel** | Indicadores, receita prevista × recebida (6 meses), funil de leads, ocupação das turmas, próximos contatos e mensalidades em atraso |
| 🎯 **Leads / Funil** | Kanban com 6 etapas (arrastar e soltar), origem, responsável, próximo contato, histórico de interações e **conversão em aluno → matrícula** |
| 👩‍🎓 **Alunos** | Cadastro completo, validação de CPF, máscaras, endereço automático pelo CEP (ViaCEP), busca, filtros e CSV |
| 📚 **Cursos** | Catálogo com modalidade, carga horária, mensalidade, coordenador e **grade curricular** (módulos com professor, carga horária e ementa; impressão da grade) |
| 👨‍🏫 **Professores** | Cadastro, formação, especialidades, valor hora-aula, turmas, disciplinas, horas/semana e **agenda semanal** |
| 🏫 **Turmas** | Professor, sala, dias, turno, horário, período, vagas, ocupação e **grade semanal**; bloqueia conflito de horário do professor |
| 📝 **Matrículas** | Aluno × turma, controle de vagas, desconto, parcelas, dia de vencimento; gera o financeiro automaticamente |
| 💰 **Financeiro** | Contas a receber, situação automática, **emissão de fatura numerada** e **recibo** (impressão/PDF), pagamentos com registro de quem recebeu, estorno e CSV |
| 📊 **Relatórios** | Exportação CSV de todos os módulos, inadimplência, resumo por turma, backup/restauração em JSON |
| 👥 **Equipe** *(diretor)* | Usuários, perfis, PIN, módulos liberados, dados da instituição e desempenho no período |
| 🕒 **Atividades** *(diretor)* | Linha do tempo filtrável por funcionário, módulo e período, com exportação |

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
├── css/
│   ├── style.css           # Estilos e responsividade
│   └── impressao.css       # Fatura, recibo e grade impressos
└── js/
    ├── utils.js            # Máscaras, validações, datas, CSV, formulários, modais, impressão
    ├── storage.js          # localStorage + CRUD genérico (registra quem criou/alterou) + backup
    ├── sessao.js           # Usuário logado e permissões
    ├── graficos.js         # Gráficos de barras em HTML/CSS
    ├── agenda.js           # Grade semanal das turmas
    ├── documentos.js       # HTML da fatura, recibo e grade curricular
    ├── modelos/            # Regras de negócio
    │   ├── usuarios.js  atividades.js  instituicao.js  professores.js
    │   ├── alunos.js  cursos.js  turmas.js
    │   └── matriculas.js  financeiro.js  leads.js
    ├── telas/              # Eventos e renderização de cada tela
    │   ├── entrada.js  painel.js  leads.js  alunos.js  cursos.js  professores.js
    │   └── turmas.js  matriculas.js  financeiro.js  relatorios.js  equipe.js  atividades.js
    ├── exemplos.js         # Dados de demonstração
    └── app.js              # Entrada, menu por permissão e navegação
```

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
- [ ] Backend + banco de dados (dados compartilhados entre computadores)
- [ ] Login seguro com senha (no servidor)
- [ ] Frequência/notas, emissão de boletos/PIX, envio de WhatsApp/e-mail
