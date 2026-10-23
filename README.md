# CRM Plus – Gestão Educacional

Sistema web de CRM para instituições de ensino (cursos livres, escolas de idiomas, escolas técnicas).
Feito em **HTML, CSS e JavaScript puro**, sem dependências nem etapa de build.

🔗 **Demonstração:** https://lorranbrs.github.io/CRM-Plus/

> Clique em **"Carregar dados de exemplo"** no menu lateral para ver o sistema preenchido.

## Módulos

| Módulo | O que faz |
|---|---|
| 🏠 **Painel** | Indicadores, receita prevista × recebida (6 meses), funil de leads, ocupação das turmas, próximos contatos e mensalidades em atraso |
| 🎯 **Leads / Funil** | Kanban com 6 etapas (arrastar e soltar), origem, responsável, próximo contato, histórico de interações e **conversão em aluno → matrícula** |
| 👩‍🎓 **Alunos** | Cadastro completo, validação de CPF, máscaras, endereço automático pelo CEP (ViaCEP), busca, filtros e CSV |
| 📚 **Cursos** | Catálogo com modalidade, carga horária, duração, mensalidade e taxa de matrícula |
| 🏫 **Turmas** | Professor, sala, dias, turno, horário, período, vagas e barra de ocupação |
| 📝 **Matrículas** | Aluno × turma, controle de vagas, desconto, parcelas, dia de vencimento; gera o financeiro automaticamente |
| 💰 **Financeiro** | Contas a receber, situação automática (pendente/atrasado/pago/cancelado), registro e estorno de pagamentos, totais e CSV |
| 📊 **Relatórios** | Exportação CSV de todos os módulos, inadimplência, resumo por turma, backup/restauração em JSON |

### Regras de negócio
- CPF válido e único; códigos de curso e turma únicos
- Turma lotada não aceita novas matrículas; só turmas *Planejada* ou *Em andamento* recebem matrícula
- Matrícula nova torna o aluno **Ativo** e gera taxa + mensalidades (com desconto aplicado)
- Cancelar/trancar matrícula oferece cancelar as parcelas pendentes
- Não é possível excluir curso com turmas, turma com matrículas ou aluno com histórico (use o status)

## Armazenamento

Os dados ficam no **localStorage** do navegador: cada navegador/computador tem seus próprios dados.
Use **Relatórios → Backup** para salvar ou transferir os dados.
A camada `js/storage.js` isola o acesso aos dados para facilitar a troca por uma API no futuro.

## Estrutura

```
CRM-Plus/
├── index.html              # Layout, telas e formulários (modais)
├── css/style.css           # Estilos e responsividade
└── js/
    ├── utils.js            # Máscaras, validações, datas, CSV, formulários, modais
    ├── storage.js          # localStorage + CRUD genérico + backup
    ├── graficos.js         # Gráficos de barras em HTML/CSS
    ├── modelos/            # Regras de negócio
    │   ├── alunos.js  cursos.js  turmas.js
    │   └── matriculas.js  financeiro.js  leads.js
    ├── telas/              # Eventos e renderização de cada tela
    │   ├── painel.js  leads.js  alunos.js  cursos.js
    │   └── turmas.js  matriculas.js  financeiro.js  relatorios.js
    ├── exemplos.js         # Dados de demonstração
    └── app.js              # Navegação (#painel, #leads, #alunos, ...)
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
- [ ] Backend + banco de dados (dados compartilhados entre computadores)
- [ ] Login de usuários e permissões (secretaria, comercial, financeiro)
- [ ] Frequência/notas, emissão de boletos/PIX, envio de WhatsApp/e-mail
