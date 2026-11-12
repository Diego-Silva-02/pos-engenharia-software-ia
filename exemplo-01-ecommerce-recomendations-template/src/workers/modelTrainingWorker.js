import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
import { workerEvents } from '../events/constants.js';

let _globalCtx = {};
let _model = null;
const WEIGHTS = {
    category: 0.4,
    color: 0.3,
    price: 0.2,
    age: 0.1
}

// Normalize continuous values (price, age) to 0-1 range
// Why? Keeps all features balanced so no one dominates training 
// Formula: (value – min) / (max - min)
// Example: price=129.99, minPrice=39.99, maxPrice=199.99 -0.56
const normalize = (value, min, max) => (value - min) / ((max - min) || 1);
function makeContext(users, products) {
    // fazendo a normalização dos dados de entrada (idade, cor e localização) e a codificação one-hot das categorias
    const ages = users.map(u => u.age);
    const prices = products.map(p => p.price);

    const minAge = Math.min(...ages);
    const maxAge = Math.max(...ages);

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const colors = [...new Set(products.map(p => p.color))];
    const categories = [...new Set(products.map(p => p.category))];

    const colorsIndex = Object.fromEntries(
        colors.map((color, index) => [color, index])
    );
    const categoriesIndex = Object.fromEntries(
        categories.map((category, index) => [category, index])
    );

    // Computar a média de idade dos comprados por produtos 
    // (ajuda a personalizar)

    const midAge = (minAge + maxAge) / 2;
    const ageSums = {};
    const ageCounts = {};

    users.forEach(user => {
        user.purchases.forEach(purchase => {
            ageSums[purchase.name] = (ageSums[purchase.name] || 0) + user.age; // Soma das idades dos usuários que compraram o produto
            ageCounts[purchase.name] = (ageCounts[purchase.name] || 0) + 1; // Contagem de quantos usuários compraram o produto
        })
    });

    // Normalizar a média de idade para cada produto
    const productAvgAgeNormalized = Object.fromEntries(
        products.map(product => {
            const avg = ageCounts[product.name] ?
                ageSums[product.name] / ageCounts[product.name] :
                midAge;
                
                return [product.name, normalize(avg, minAge, maxAge)];
            })
        );
    
    return {
        products,
        users,
        colorsIndex,
        categoriesIndex,
        minAge,
        maxAge,
        minPrice,
        maxPrice,
        productAvgAgeNormalized,
        numCategories: categories.length,
        numColors: colors.length,
        dimentions: 2 + categories.length + colors.length, // idade + preço + categorias + cores (o 2 é para idade e preço, são 2 dimensões)
    }
}

// One-hot encoding with weight applied
// One-hot encoding → Ou tem uma categoria (ou cor) ou não tem, então é 0 ou 1
const oneHotWeighted = (index, length, weight) => 
    tf.oneHot(index, length).cast('float32').mul(weight);

function encodeProduct(product, context) {
    // Normalizando dados para ficar de 0 a 1
    // Aplicar o peso na recomendação (quanto mais importante, maior o peso)
    const price = tf.tensor1d([
        normalize(
            product.price, 
            context.minPrice, 
            context.maxPrice
        ) * WEIGHTS.price
    ]);

    const age = tf.tensor1d([
        (
            context.productAvgAgeNormalized[product.name] ?? 0.5
        ) * WEIGHTS.age
    ]);

    const category = oneHotWeighted(
        context.categoriesIndex[product.category],
        context.numCategories,
        WEIGHTS.category
    );

    const color = oneHotWeighted(
        context.colorsIndex[product.color],
        context.numColors,
        WEIGHTS.color
    );

    return tf.concat(
        [price, age, category, color]
    );
}

// Função utilizada para retornar o perfil de compra deste usuário, que será utilizado para recomendar produtos
function encodeUser(user, context) {
    // Se o usuário comprou produtos, então vamos calcular o vetor médio dos produtos comprados
    if (user.purchases.length) {
        return tf.stack(
            user.purchases.map(
                product => encodeProduct(product, context)
            )
        )
        .mean(0)
        .reshape([
            1, 
            context.dimentions
        ]);
    }

    // Se o usuário não comprou produtos, então vamos retornar um vetor
    return tf.concat1d(
        [
            tf.zeros([1]), // preço é ignorado (afinal ele não comprou nada)
            tf.tensor1d([
                // normalizando a idade para mostrar a recomendação de quem tem a idade mais próxima dele
                normalize(user.age, context.minAge, context.maxAge) * WEIGHTS.age
            ]),
            tf.zeros([context.numCategories]), // categoria ignorada
            tf.zeros([context.numColors]), // cor ignorada
        ]
    ).reshape([1, context.dimentions]);
}

// Função para criar os dados de treinamento a partir do contexto
function createTrainingData(context) {
    const inputs = [];
    const labels = [];

    // Para cada usuário, vamos criar um vetor de entrada que é a concatenação do vetor do usuário com o vetor do produto
    context.users
    .filter(user => user.purchases.length) // filtra apenas usuários que compraram produtos (temporário)
    .forEach(user => {
        const userVector = encodeUser(user, context).dataSync();
        context.products.forEach(product => {
            const productVector = encodeProduct(product, context)
                .dataSync();
            
            const label = user.purchases.some(
                p => p.name === product.name ?
                1 :
                0
            );

            // Concatenando o vetor do usuário com o vetor do produto
            inputs.push([...userVector, ...productVector]);
            labels.push(label);
        })
    })
    
    return {
        xs: tf.tensor2d(inputs),
        ys: tf.tensor2d(labels, [labels.length, 1]),
        inputDimensions: context.dimentions * 2,
        // tamanho = userVector + productVector, então é 2 * dimentions
    }
}

async function configureNeutralNetAndTrain(trainData) {
    // Criando o modelo de rede neural
    // O modelo é sequencial, ou seja, cada camada é conectada à próxima
    const model = tf.sequential();

    // Nesta primeira camada ele usa esses dados para entender os padrões e retornar os valores
    model.add(
        tf.layers.dense({
            inputShape: [trainData.inputDimensions], // tamanho do vetor de entrada
            units: 128, // número de neurônios na camada oculta
            activation: 'relu' // função de ativação, mantem apenas valores positivos, ajuda a rede a aprender padrões não lineares
        })
    )

    // Aqui ele trabalha com os dados que ele recebeu da primeira camada, e vai aprendendo padrões mais complexos
    model.add(
        tf.layers.dense({
            units: 64, // número de neurônios na camada oculta
            activation: 'relu' // função de ativação, mantem apenas valores positivos, ajuda a rede a aprender padrões não lineares
        })
    )

    // Aqui ele continua comprimindo os dados (destilando as informações mais importantes) e vai treinar com menos neurônios
    model.add(
        tf.layers.dense({
            units: 32, // número de neurônios na camada oculta
            activation: 'relu' // função de ativação, mantem apenas valores positivos, ajuda a rede a aprender padrões não lineares
        })
    )

    // camada de saída, que vai retornar a probabilidade de o usuário comprar o produto (0 ou 1)
    model.add(
        tf.layers.dense({
            units: 1, // número de neurônios na camada de saída (apenas para retornar sim ou não, possibilidade de comprar ou não)
            activation: 'sigmoid' // função de ativação, retorna valores entre 0 e 1 (ordenador), que é a probabilidade de o usuário comprar o produto
        })
    )

    model.compile({
        optimizer: tf.train.adam(0.01), // algoritmo de otimização, que vai ajustar os pesos da rede neural para minimizar o erro
        loss: 'binaryCrossentropy', // função de perda, que vai medir o erro da rede neural (quanto mais próximo de 0, melhor)
        metrics: ['accuracy'] // métrica de avaliação, que vai medir a acurácia da rede neural (quanto mais próximo de 1, melhor)
    })

    await model.fit(trainData.xs, trainData.ys, {
        epochs: 100, // número de vezes que o modelo vai passar pelos dados de treinamento
        batchSize: 32, // número de amostras que o modelo vai usar para atualizar os pesos da rede neural
        shuffle: true, // embaralhar os dados de treinamento para evitar overfitting
        callbacks: { // função que vai ser chamada a cada época de treinamento
            onEpochEnd: (epoch, logs) => {
                postMessage({ // enviando mensagem para o thread principal com o progresso do treinamento
                    type: workerEvents.trainingLog,
                    epoch: epoch,
                    loss: logs.loss,
                    accuracy: logs.acc
                });
            }}
    })

    return model;
}

async function trainModel({ users }) {
    console.log('Training model with users:', users)
    postMessage({ type: workerEvents.progressUpdate, progress: { progress: 50 } });

    // baixando base de produtos para treinar o modelo
    const products = await (await fetch('/data/products.json')).json();
    
    const context = makeContext(users, products);
    context.productVectors = products.map(product => {
        return {
            name: product.name,
            meta: {...product},
            vector: encodeProduct(product, context).dataSync()
        }
    });
    
    _globalCtx = context;

    const trainData = createTrainingData(context);
    _model = await configureNeutralNetAndTrain(trainData);

    postMessage({ type: workerEvents.progressUpdate, progress: { progress: 100 } });
    postMessage({ type: workerEvents.trainingComplete });
}
function recommend(user, ctx) {
    if (!_model) return;
    const context = _globalCtx;
    // Converte o usuário fornecido no vetor de features codificadas
    // (preço ignorado, idade normalizada, categorias e cores ignoradas para quem não possui compras)
    // Isso transforma as informações do usuário no mesmo formato numérico que foi usado para treinar o modelo
    const userVectors = encodeUser(user, context).dataSync();

    // Em aplicações reais:
    // Armazene todos os vetores de produtos em um bando de dados vetorial (como Postgres, Neo4j ou Pinecone)
    // Consulta: Encontre os 200 produtos mais próximos do vetor do usuário
    // Execute _model.predict() apenas nestes produtos

    // Criando pares de entrada: para cada produto, concatenando vetor do usuário, com vetor codificado do produto.
    // Assim o modelo prevê o "score de compatibilidade para cada par (usuário, produto)"

    // Ou seja: Aqui está sendo comparando o vetor do usuário com o vetor de todos os produtos para calcular a probabilidade de o usuário comprar qualquer produto
    const inputs = context.productVectors.map(({vector}) => {
        return [ ...userVectors, ...vector ]
    })
    
    // Fazendo a previsão
    // Convertendo todos esses pares (usuário, produto) em um único Tensor
    // Formato: [numProdutos, inputDim]
    const inputTensor = tf.tensor2d(inputs);

    // Rodando a rede neural treinada em todos os pares (usuário, produto) de uma vez.
    // O resultado é uma pontuação para cada produto entre 0 e 1.
    // Quanto maior o valor, maior a probabilidade do usuário querer aquele produto.
    const predictions = _model.predict(inputTensor);

    // Extrai as pontuações para um array JS normal.
    const scores = predictions.dataSync();

    const recommendations = context.productVectors.map((item, index) => {
        return {
            ...item.meta, // onde estão os dados do próprio produto
            name: item.name,
            score: scores[index] // previsão do modelo para este produto
        }
    });

    // Apenas ordenando pelo score
    const sortedItems = recommendations
        .sort((a, b) => b.score - a.score);

    // console.log('will recommend for user:', user)
    // Envia a lista ordenada de produtos recomendados para a thread principal (a UI pode exibi-los agora).
    postMessage({
        type: workerEvents.recommend,
        user,
        recommendations: sortedItems
    });
}


const handlers = {
    [workerEvents.trainModel]: trainModel,
    [workerEvents.recommend]: d => recommend(d.user, _globalCtx),
};

self.onmessage = e => {
    const { action, ...data } = e.data;
    if (handlers[action]) handlers[action](data);
};
