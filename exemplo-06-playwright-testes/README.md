# exemplo-06-playwright-testes

Testes end-to-end com **Playwright** (só o `@playwright/test` e só o Chromium) para a aplicação de exemplo:

https://erickwendel.github.io/vanilla-js-web-app-example/

A aplicação é um formulário (título + URL de imagem) que adiciona cards a uma lista e guarda os dados no `localStorage` do navegador. Os testes cobrem o envio do formulário, a atualização da lista e a validação dos campos.

## Estrutura

```
exemplo-06-playwright-testes/
├── .github/workflows/playwright.yml   # CI do GitHub Actions (veja "Ao clonar a pasta completa")
├── .playwright-mcp/                   # snapshots gerados pelo Playwright MCP (veja "Ao clonar a pasta completa")
├── prompts/                           # prompts usados para gerar os testes com IA
│   ├── generate_test.prompt.md
│   ├── generate-tests.md
│   └── project-scaffolding.md
├── tests/
│   ├── submit-form.spec.ts            # envio do formulário e atualização da lista
│   ├── form-validation.spec.ts        # validação dos campos
│   └── add-card-with-image.spec.ts    # cenário: adicionar um card com imagem própria
├── example.mcp.json                   # exemplo de configuração do Playwright MCP
├── playwright.config.ts               # configuração usada pelos testes e pelo CI
├── playwright.demo.config.ts          # configuração do modo demonstração (npm run demo)
├── package.json
└── tsconfig.json
```

## Requisitos

- **Node.js** 18 ou superior (testado com Node 22)
- Acesso à internet: os testes abrem a página publicada no GitHub Pages

## Como testar

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Instale só o navegador Chromium (menor e mais rápido que instalar todos). O download tem cerca de 124 MB:

   ```bash
   npx playwright install --with-deps chromium
   ```

3. Rode os testes:

   ```bash
   npm test
   ```

### Outros comandos

| Comando | O que faz |
| --- | --- |
| `npm test` | Roda todos os testes sem abrir janela (headless) |
| `npm run test:headed` | Roda todos os testes com o navegador visível |
| `npm run demo` | Roda só o cenário "adicionar card com imagem", com o navegador visível, em câmera lenta e com uma pausa no final para ver o resultado |
| `npm run report` | Abre o relatório HTML da última execução (inclui a captura do card criado) |
| `npx playwright test --ui` | Abre a interface do Playwright para rodar e depurar os testes |
| `npx playwright test -g "validation"` | Roda só os testes cujo nome contém o texto informado |

## O que os testes cobrem

**`submit-form.spec.ts`** — envio e atualização da lista:

- adiciona um card novo;
- mantém os cards existentes e coloca o novo no fim;
- limpa o formulário e devolve o foco ao título;
- mantém o card depois de recarregar a página;
- adiciona um card por envio.

**`form-validation.spec.ts`** — validação:

- nenhum erro aparece antes do primeiro envio;
- formulário vazio mostra os dois erros e foca o título;
- título obrigatório, mesmo com URL válida;
- URL obrigatória, mesmo com título preenchido;
- URL inválida é rejeitada e o que foi digitado é mantido;
- os erros somem depois de corrigir os campos e enviar.

**`add-card-with-image.spec.ts`** — adiciona um card com uma imagem SVG gerada no próprio teste (enviada como URL `data:`, sem depender de site externo) e confere que a imagem foi realmente carregada (600×300 px).

### Como os testes foram escritos

- Cada teste roda em um contexto de navegador novo, então o `localStorage` começa vazio e os testes não dependem de estado anterior.
- Os localizadores usam `getByRole` com nomes acessíveis, em vez de seletores frágeis.
- O timeout é de **5 segundos** (teste, asserções e ações), como pedido no roteiro. Se a rede estiver lenta e algum teste estourar o tempo, aumente o `timeout` em `playwright.config.ts` para 10 s.

## CI (GitHub Actions)

O workflow `.github/workflows/playwright.yml`:

- dispara em `push`, em `pull_request` e manualmente (`workflow_dispatch`), mas só quando mudam arquivos de `exemplo-06-playwright-testes/**` ou o próprio workflow;
- usa `working-directory: exemplo-06-playwright-testes`, porque o projeto fica em uma subpasta do repositório;
- faz checkout, configura o Node 22, roda `npm ci`, instala só o Chromium e roda `npm test`;
- envia o relatório HTML como artefato **somente se houver falha**.

O workflow ainda não foi executado no GitHub. Só foi simulado localmente (`npm ci` e `npm test` com `CI=true`).

## Ao clonar a pasta completa (importante)

Esta pasta foi montada dentro de um repositório maior (`study`), em que o projeto fica em uma subpasta. Por isso, duas pastas **só funcionam na raiz do repositório** e estão guardadas aqui dentro apenas para manter o commit organizado.

Depois de clonar o repositório completo, **mova estas duas pastas de `exemplo-06-playwright-testes/` para a raiz do repositório**:

| Pasta | Por que ir para a raiz |
| --- | --- |
| `.github/` | O GitHub só executa workflows que estejam em `.github/workflows` na **raiz** do repositório. Dentro do `exemplo-06`, o CI não roda. |
| `.playwright-mcp/` | O Playwright MCP grava os snapshots nesta pasta, no diretório onde ele é executado, normalmente a raiz. Ela não é necessária para rodar os testes. |

A partir da raiz do repositório clonado:

**Git Bash / Linux / macOS**

```bash
mv exemplo-06-playwright-testes/.github .github
mv exemplo-06-playwright-testes/.playwright-mcp .playwright-mcp
```

**PowerShell**

```powershell
Move-Item exemplo-06-playwright-testes\.github .github
Move-Item exemplo-06-playwright-testes\.playwright-mcp .playwright-mcp
```

Se a raiz já tiver uma pasta `.github`, mova só o arquivo `workflows/playwright.yml` para dentro dela, em vez de substituir a pasta.

Se você usar o `exemplo-06-playwright-testes` sozinho, como um repositório próprio, faça o contrário: deixe o `.github` na raiz desse repositório e remova a linha `defaults.run.working-directory` e os prefixos `exemplo-06-playwright-testes/` do workflow (em `cache-dependency-path` e no `path` do upload do relatório).

## Playwright MCP e prompts (opcional)

A pasta `prompts/` guarda os prompts usados para configurar o projeto e gerar os testes com uma IA conectada ao Playwright MCP. O arquivo `example.mcp.json` mostra como configurar esse servidor MCP. Troque `YOUR_TOKEN_HERE` pelo seu token e **não faça commit com o token real**.
