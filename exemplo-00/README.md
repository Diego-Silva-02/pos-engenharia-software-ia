# exemplo-00

Primeiro exemplo de estudo com **TensorFlow.js (Node.js)**. O projeto treina uma pequena rede neural de classificação com dados de pessoas e, no final, usa o modelo treinado para calcular a **probabilidade de cada categoria (premium, medium, basic) para uma pessoa nova**.

## O que o projeto faz

O arquivo [index.js](index.js) executa as etapas abaixo.

### 1. Preparação dos dados de treino

Um dataset de 3 pessoas, já **normalizado** e com **one-hot encoding**. Cada vetor de entrada segue a ordem:

```
[idade_normalizada, azul, vermelho, verde, São Paulo, Rio, Curitiba]
```

| Pessoa | Idade | Cor      | Localização | Vetor de entrada                | Label   |
| ------ | ----- | -------- | ----------- | ------------------------------- | ------- |
| Erick  | 30    | azul     | São Paulo   | `[0.33, 1, 0, 0, 1, 0, 0]`      | premium |
| Ana    | 25    | vermelho | Rio         | `[0, 0, 1, 0, 0, 1, 0]`         | medium  |
| Carlos | 40    | verde    | Curitiba    | `[1, 0, 0, 1, 0, 0, 1]`         | basic   |

Os labels também são one-hot, na ordem `["premium", "medium", "basic"]`:
premium = `[1, 0, 0]`, medium = `[0, 1, 0]`, basic = `[0, 0, 1]`.

A idade usa normalização **min-max**: `(idade - min) / (max - min)`, com `min = 25` e `max = 40`. Assim, Ana (25) vira `0`, Carlos (40) vira `1` e Erick (30) vira `(30 - 25) / 15 ≈ 0.33`.

Os dados viram tensores com `tf.tensor2d` (`inputXs` e `outputYs`).

### 2. Treinamento do modelo (`trainModel`)

Rede neural sequencial com duas camadas densas:

| Camada | Configuração                                  | Função                                                                 |
| ------ | --------------------------------------------- | ---------------------------------------------------------------------- |
| Entrada/oculta | `inputShape: [7]`, `units: 80`, `activation: 'relu'` | Recebe os 7 valores e só deixa passar os sinais positivos (ReLU). |
| Saída  | `units: 3`, `activation: 'softmax'`           | 1 neurônio por categoria; o softmax transforma a saída em probabilidades que somam 100%. |

Compilação e treino:

- **Otimizador:** `adam`
- **Loss:** `categoricalCrossentropy` (compara a probabilidade prevista com o label one-hot correto)
- **Métrica:** `accuracy`
- **Treino:** `epochs: 100`, `shuffle: true`, `verbose: 0` (o log por época está comentado no código)

Com apenas 3 exemplos, a rede serve para fins didáticos. Em um caso real seriam necessários centenas ou milhares de exemplos por categoria.

### 3. Previsão para uma pessoa nova (`predict`)

Depois do treino, o modelo recebe um caso que não estava no dataset:

| Pessoa  | Idade | Cor  | Localização | Vetor de entrada            |
| ------- | ----- | ---- | ----------- | --------------------------- |
| Cleyton | 28    | azul | São Paulo   | `[0.2, 1, 0, 0, 1, 0, 0]`   |

A idade de Cleyton é normalizada com o mesmo padrão do treino: `(28 - 25) / (40 - 25) = 0.2`.

A função `predict` transforma o vetor em tensor, chama `model.predict` e devolve a probabilidade de cada categoria. O resultado é ordenado da maior para a menor probabilidade e impresso em porcentagem.

### Saída esperada

Exemplo de execução:

```
premium: 80.82%
basic: 10.31%
medium: 8.88%
```

Cleyton tem cor e localização iguais às de Erick (premium) e idade próxima, então o modelo indica **premium** como a categoria mais provável.

Os percentuais **variam um pouco a cada execução** (nas execuções de teste, premium ficou entre 80% e 82%), porque os pesos iniciais da rede são aleatórios. A ordem de `medium` e `basic` também pode trocar. O TensorFlow ainda imprime uma mensagem informativa sobre instruções de CPU (`oneDNN` / `AVX2`), que pode ser ignorada.

## Requisitos

- **Node.js** 18 ou superior (testado com Node v22 no Windows 11, x64)
- **Yarn 1.22.x** (o `package.json` define `packageManager: yarn@1.22.22`), ou npm
- Dependência principal: `@tensorflow/tfjs-node` **4.22.0**

## Como executar

```bash
# 1. Instalar as dependências
yarn install        # ou: npm install

# 2. Aplicar a configuração extra do Windows (veja a seção abaixo)

# 3. Executar
yarn start          # roda: node --no-warnings --watch index.js
# ou, uma única vez:
node index.js
```

O script `start` usa `--watch`, então o Node reexecuta o arquivo (e retreina o modelo) a cada alteração salva.

## Configuração necessária no Windows (erro `ERR_DLOPEN_FAILED`)

Ao rodar o projeto no Windows, o erro abaixo pode aparecer logo após a instalação:

```
Error: Não foi possível encontrar o módulo especificado.
...\node_modules\@tensorflow\tfjs-node\lib\napi-v8\tfjs_binding.node
code: 'ERR_DLOPEN_FAILED'
```

### Causa

Apesar da mensagem falar em "módulo", não falta nenhum pacote npm. O Windows não consegue carregar o `tensorflow.dll`, de que o `tfjs_binding.node` depende.

- O `@tensorflow/tfjs-node@4.22.0` só distribui binário pré-compilado até **N-API v8**, então o `tfjs_binding.node` é baixado em `lib/napi-v8/`.
- O script de instalação copia o `tensorflow.dll` (cerca de 200 MB) para a pasta da N-API que **o seu Node reporta**:

  | Node                 | N-API reportada | Pasta onde a DLL é colocada |
  | -------------------- | --------------- | --------------------------- |
  | 18.16 ou anterior    | 8               | `lib/napi-v8` (funciona)    |
  | 18.17+ e 20          | 9               | `lib/napi-v9`               |
  | 22                   | 10              | `lib/napi-v10`              |

- Nas versões mais novas, a DLL fica numa pasta e o `.node` em outra. O Windows não encontra a dependência e o carregamento falha.

Trocar para Node 18 ou 20 **não resolve**, pois essas versões também reportam N-API 9 ou maior.

### Solução aplicada

Copiar o `tensorflow.dll` para a mesma pasta do `tfjs_binding.node` (`lib/napi-v8`):

```bash
# se o seu Node reporta N-API 10 (Node 22):
cp node_modules/@tensorflow/tfjs-node/lib/napi-v10/tensorflow.dll node_modules/@tensorflow/tfjs-node/lib/napi-v8/

# se o seu Node reporta N-API 9 (Node 18.17+ / 20):
cp node_modules/@tensorflow/tfjs-node/lib/napi-v9/tensorflow.dll node_modules/@tensorflow/tfjs-node/lib/napi-v8/
```

Para saber qual N-API o seu Node reporta:

```bash
node -p "process.versions.napi"
```

> **Atenção:** esse passo precisa ser repetido sempre que `node_modules` for reinstalado (`yarn install`, `npm install` ou exclusão da pasta).

Alternativa sem copiar arquivos: usar um Node que reporte N-API 8 (Node 16 ou Node 18.16 e anteriores, por exemplo via nvm).

## Outros pontos de configuração

- O `package.json` precisa de `"type": "module"` (no singular), porque o `index.js` usa `import` e `await` no nível superior. Com o typo `"types"`, o Node mostra o aviso `MODULE_TYPELESS_PACKAGE_JSON` e tem de adivinhar o formato do arquivo.

## Estrutura

```
exemplo-00/
├── index.js            # treina o modelo e prevê a categoria de uma pessoa nova
├── package.json
├── package-lock.json
└── README.md
```
