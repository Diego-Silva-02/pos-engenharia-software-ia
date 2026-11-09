import tf from '@tensorflow/tfjs-node';

async function trainModel(inputXs, outputYs) {
    const model = tf.sequential();

    // Primeira camada da rede:
    // entrada de 7 posições (idade normalizada, + 3 cores, + 3 localizações)

    // 80 neuronios = aqui coloquei tudo isto porque tem pouca base de treino
    // quanto mais neuronios mais complexidade a rede pode aprender
    // e consequentemente, mais processamento e mais tempo de treino ela vai precisar

    // A relu age como um filtro
    // É como se ela só deixasse os dados interessantes seguirem viagem na rede neural
    // Se a informação chegou nesse neuronio é positiva, passa pra frente!
    // Se for zero ou negativa, não passa pra frente, é descartada.
    model.add(tf.layers.dense({ inputShape: [7], units: 80, activation: 'relu' }));

    // Saída: 3 neuronios, um para cada categoria (premium, medium, basic)

    // activation: softmax - normaliza a saída da rede neural, transformando os valores em probabilidades
    model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));

    // Compilando o modelo com o otimizador Adam
    // optimizer Adam (Adaptive Moment Estimation)
    // é um treinador pessoal moderno para redes neurais, que ajusta os pesos da rede neural de forma eficiente e inteligente, com base no histórico de gradientes.
    // aprende com o histórico de erros e acertos

    // loss: 'categoricalCrossentropy'
    // Ele compara o que o modelo "acha" (os scores de cada categoria) com o que é a resposta correta (o label one-hot encoded)
    // A categoriam premiu será sempre [1, 0, 0], medium será [0, 1, 0] e basic será [0, 0, 1]

    // metrics: ['accuracy'] - mede a precisão do modelo, ou seja, quantas vezes ele acertou a previsão em relação ao total de previsões feitas.

    // quanto mais distante da previsão do modelo da resposta correta, maior será a perda (loss) e o modelo vai ajustar os pesos da rede neural para tentar acertar mais na próxima vez.
    // Exemplo: classificação de imagens, recomendação e categorização de usuário

    model.compile({ 
        optimizer: 'adam', 
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy'] 
    });

    // Treinamento do modelo com os dados de entrada (inputXs) e saída (outputYs)
    // verbose: 0 - não exibe informações do treinamento no console (desabilita log interno)
    // epochs: 100 - número de vezes que o modelo vai passar por todo o dataset de treino
    // shuffle: true - embaralha os dados a cada época de treino, para evitar que o modelo aprenda padrões específicos da ordem dos dados
    // callbacks: onEpochEnd - função que é chamada ao final de cada época de treino, exibindo a perda (loss) e a precisão (accuracy) do modelo no console
    await model.fit(
        inputXs, 
        outputYs, 
        { 
            verbose: 0,
            epochs: 100,
            shuffle: true,
            callbacks: {
                // onEpochEnd: (epoch, logs) => {
                //     console.log(`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc.toFixed(4)}`);
                // }
            }
        }
    );

    return model;
}

async function predict(model, pessoa) {
    // transformar o array de entrada em tensor (tfjs)
    const tfInput = tf.tensor2d(pessoa);

    // previsão do modelo (output será um vetor de 3 probabilidades, uma para cada categoria)
    const prediction = model.predict(tfInput);
    const predictionArray = await prediction.array();

    return predictionArray[0].map((probabilidade, index) => ({ probabilidade, index }));
}

// Exemplo de pessoas para treino (cada pessoa com idade, cor e localização)
// const pessoas = [
//     { nome: "Erick", idade: 30, cor: "azul", localizacao: "São Paulo" },
//     { nome: "Ana", idade: 25, cor: "vermelho", localizacao: "Rio" },
//     { nome: "Carlos", idade: 40, cor: "verde", localizacao: "Curitiba" }
// ];

// Vetores de entrada com valores já normalizados e one-hot encoded
// Ordem: [idade_normalizada, azul, vermelho, verde, São Paulo, Rio, Curitiba]
// const tensorPessoas = [
//     [0.33, 1, 0, 0, 1, 0, 0], // Erick
//     [0, 0, 1, 0, 0, 1, 0],    // Ana
//     [1, 0, 0, 1, 0, 0, 1]     // Carlos
// ]

// Usamos apenas os dados numéricos, como a rede neural só entende números.
// tensorPessoasNormalizado corresponde ao dataset de entrada do modelo.
const tensorPessoasNormalizado = [
    [0.33, 1, 0, 0, 1, 0, 0], // Erick
    [0, 0, 1, 0, 0, 1, 0],    // Ana
    [1, 0, 0, 1, 0, 0, 1]     // Carlos
]

// Labels das categorias a serem previstas (one-hot encoded)
// [premium, medium, basic]
const labelsNomes = ["premium", "medium", "basic"]; // Ordem dos labels
const tensorLabels = [
    [1, 0, 0], // premium - Erick
    [0, 1, 0], // medium - Ana
    [0, 0, 1]  // basic - Carlos
];

// Criamos tensores de entrada (xs) e saída (ys) para treinar o modelo
const inputXs = tf.tensor2d(tensorPessoasNormalizado)
const outputYs = tf.tensor2d(tensorLabels)

// Quanto mais dados de treino, melhor será a precisão do modelo. Aqui temos apenas 3 exemplos, o que é muito pouco para treinar uma rede neural. Idealmente, deveríamos ter centenas ou milhares de exemplos para cada categoria.
const model = await trainModel(inputXs, outputYs);

// Exemplo de pessoa para previsão (idade, cor e localização)
const pessoa = { nome: "Cleyton", idade: 28, cor: "azul", localizacao: "São Paulo" };

// Normalizando a idade da nova pessoa usando o mesmo padrão do treino
// Exemplo: idade_min = 25, idade_max = 40, então (28 - 25) / (40 - 25) = 0.2

const pessoaTensorNormalizado = [
    [
        0.2, // idade normalizada
        1,   // azul
        0,   // vermelho
        0,   // verde
        1,   // São Paulo
        0,   // Rio
        0    // Curitiba
    ]
]

// Fazendo a previsão para uma nova pessoa
const predictions = await predict(model, pessoaTensorNormalizado);
const results = predictions
    .sort((a, b) => b.probabilidade - a.probabilidade)
    .map(prediction => `${labelsNomes[prediction.index]}: ${(prediction.probabilidade * 100).toFixed(2)}%`)
    .join('\n');

console.log(results);


// inputXs.print();
// outputYs.print();