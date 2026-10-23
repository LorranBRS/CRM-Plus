# CRM Plus – Gestão Educacional

Sistema web de CRM voltado para instituições de ensino (cursos livres, escolas técnicas, etc.).
Desenvolvido em **HTML, CSS e JavaScript puro**, sem dependências.

🔗 **Demonstração:** https://lorranbrs.github.io/crm-plus/

## Etapa atual – v0.1: Cadastro de alunos

- Cadastro, edição e exclusão de alunos
- Validação de CPF (dígitos verificadores), e-mail e telefone
- Bloqueio de CPF duplicado
- Máscaras de CPF, telefone e CEP
- Preenchimento automático de endereço pelo CEP (API ViaCEP)
- Busca por nome, CPF, e-mail ou telefone e filtro por status
- Indicadores: total, ativos, interessados e novos no mês
- Exportação para CSV (abre no Excel)
- Layout responsivo (desktop e celular)

> Nesta etapa os dados ficam salvos no **localStorage** do navegador (cada navegador tem seus próprios dados).

## Estrutura

```
crm-plus/
├── index.html        # Tela principal (módulo Alunos)
├── css/
│   └── style.css     # Estilos globais
└── js/
    ├── utils.js      # Máscaras, validações e helpers
    ├── storage.js    # Camada de dados (localStorage → futura API)
    ├── alunos.js     # Regras de negócio do módulo Alunos
    └── app.js        # Eventos e renderização da interface
```

## Como rodar localmente

Basta abrir o `index.html` no navegador.

## Roadmap

- [x] Cadastro de alunos
- [ ] Cursos e turmas
- [ ] Matrículas
- [ ] Leads e funil de vendas (captação)
- [ ] Financeiro (mensalidades, boletos)
- [ ] Relatórios e dashboard
- [ ] Backend + banco de dados e login de usuários
