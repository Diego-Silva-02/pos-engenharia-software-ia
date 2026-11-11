import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
import { workerEvents } from '../events/constants.js';

let _globalCtx = {};
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
}

// Função para criar os dados de treinamento a partir do contexto
function createTrainingData(context) {
    const inputs = [];
    const labels = [];

    // Para cada usuário, vamos criar um vetor de entrada que é a concatenação do vetor do usuário com o vetor do produto
    context.users.forEach(user => {
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

    postMessage({
        type: workerEvents.trainingLog,
        epoch: 1,
        loss: 1,
        accuracy: 1
    });

    setTimeout(() => {
        postMessage({ type: workerEvents.progressUpdate, progress: { progress: 100 } });
        postMessage({ type: workerEvents.trainingComplete });
    }, 1000);


}
function recommend(user, ctx) {
    console.log('will recommend for user:', user)
    // postMessage({
    //     type: workerEvents.recommend,
    //     user,
    //     recommendations: []
    // });
}


const handlers = {
    [workerEvents.trainModel]: trainModel,
    [workerEvents.recommend]: d => recommend(d.user, _globalCtx),
};

self.onmessage = e => {
    const { action, ...data } = e.data;
    if (handlers[action]) handlers[action](data);
};
