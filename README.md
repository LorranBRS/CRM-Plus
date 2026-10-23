# CRM Plus – Gestão Educacional

Sistema web de CRM voltado para instituições de ensino (cursos livres, escolas técnicas, etc.).
Desenvolvido em **HTML, CSS e JavaScript puro**, sem dependências.

🔗 **Demonstração:** https://lorranbrs.github.io/CRM-Plus/

## Funcionalidades

> Use o botão **"Carregar dados de exemplo"** no menu lateral para ver o sistema preenchido.

### Etapa 1 – Alunos
- Cadastro, edição e exclusão de alunos
- Validação de CPF (dígitos verificadores), e-mail e telefone; bloqueio de CPF duplicado
- Máscaras de CPF, telefone e CEP; endereço automático pelo CEP (API ViaCEP)
- Busca, filtro por status, indicadores e exportação para CSV
- Curso de interesse sugerido a partir dos cursos cadastrados

### Etapa 2 – Cursos e Turmas
- **Cursos:** nome, código, área, modalidade (Presencial/Online/Híbrido), carga horária,
  duração, mensalidade, taxa de matrícula, descrição e status
- **Turmas:** curso, código, professor(a), sala, dias da semana, turno, horário,
  período (início/término), vagas e status (Planejada, Em andamento, Concluída, Cancelada)
- Regras: código de curso/turma único, datas e horários coerentes, curso com turmas não pode ser excluído
- Atalho "ver turmas" a partir do curso; filtros por curso e status
- Indicadores: cursos ativos, mensalidade média, turmas em andamento e vagas ofertadas

> Os dados ficam salvos no **localStorage** do navegador (cada navegador tem seus próprios dados).

## Estrutura

```
CRM-Plus/
├── index.html            # Layout, telas e formulários
├── css/style.css         # Estilos globais
└── js/
    ├── utils.js          # Máscaras, validações, formulários, modais
    ├── storage.js        # Camada de dados + CRUD genérico (criarRepositorio)
    ├── modelos/          # Regras de negócio
    │   ├── alunos.js
    │   ├── cursos.js
    │   └── turmas.js
    ├── telas/            # Eventos e renderização de cada tela
    │   ├── alunos.js
    │   ├── cursos.js
    │   └── turmas.js
    ├── exemplos.js       # Dados de demonstração
    └── app.js            # Navegação entre telas (#alunos, #cursos, #turmas)
```

## Como rodar localmente

Basta abrir o `index.html` no navegador.

## Roadmap

- [x] Cadastro de alunos
- [x] Cursos e turmas
- [ ] Matrículas
- [ ] Leads e funil de vendas (captação)
- [ ] Financeiro (mensalidades, boletos)
- [ ] Relatórios e dashboard
- [ ] Backend + banco de dados e login de usuários
