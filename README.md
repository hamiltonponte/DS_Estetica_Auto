# DS Estética Auto — PWA Offline

Sistema de gestão para estúdios de **estética automotiva** (detailing), sem login, com dados salvos na pasta escolhida no aparelho.

**Repositório:** [github.com/hamiltonponte/DS_Estetica_Auto](https://github.com/hamiltonponte/DS_Estetica_Auto.git)

**App publicado:** [hamiltonponte.github.io/DS_Estetica_Auto](https://hamiltonponte.github.io/DS_Estetica_Auto/)

## Funcionalidades

- **PWA** instalável (Chrome, Edge, Android)
- **Sem login** — acesso direto ao painel
- **Pasta local** — na primeira abertura, selecione onde salvar os dados
- **Excel automático** — `ds-estetica-dados.xlsx` com abas: Clientes, Produtos, Serviços, Agendamentos, Financeiros
- **GitHub Pages** — hospedagem estática

## Desenvolvimento local

```bash
git clone https://github.com/hamiltonponte/DS_Estetica_Auto.git
cd DS_Estetica_Auto
npm install
npm run dev
```

Abra no **Chrome** ou **Edge** para testar a seleção de pasta.

## Publicar no GitHub Pages

1. Push deste projeto para `https://github.com/hamiltonponte/DS_Estetica_Auto.git`
2. No GitHub: **Settings → Pages → Source: GitHub Actions**
3. O workflow publica automaticamente em cada push na branch `main`

URL final: `https://hamiltonponte.github.io/DS_Estetica_Auto/`

Deploy manual:

```bash
npm run build
npm run deploy
```

## Estrutura da pasta de dados (no aparelho)

```
sua-pasta/
├── ds-estetica.json
├── ds-estetica-dados.xlsx
├── data/
│   ├── clients.json
│   ├── products.json
│   └── ...
└── uploads/
```

## Páginas

| Rota | Tela |
|------|------|
| `#/` | Dashboard |
| `#/clientes` | Clientes |
| `#/veiculos` | Veículos |
| `#/agendamentos` | Agendamentos |
| `#/servicos` | Serviços |
| `#/produtos` | Produtos |
| `#/execucao` | Execução |
| `#/financeiro` | Financeiro |
| `#/selos` | Fidelidade |
| `#/configuracoes` | Configurações |

## Enviar código para o repositório

Se você ainda está na pasta `autoglow1.1` dentro de outro projeto:

```bash
cd "H:\ESTUDOS PROGRAMACAO\AUTOGLOW\autoglow1.1"
git init
git remote add origin https://github.com/hamiltonponte/DS_Estetica_Auto.git
git add .
git commit -m "DS Estética Auto — PWA offline com dados locais"
git branch -M main
git push -u origin main
```
