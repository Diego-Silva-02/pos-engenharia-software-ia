import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
import { workerEvents } from '../events/constants.js';

console.log('Model training worker initialized');
let _globalCtx = {};
// Normalize continuous values (price, age) to 0-1 range
// Why? Keeps all features balanced so no one dominates training 
// Formula: (value – min) / (max - min)
// Example: price=129.99, minPrice=39.99, maxPrice=199.99 -0.56
const normalize = (value, min, max) => (value - min) / ((max - min) || 1);
function makeContext(users, catalog) {
    // fazendo a normalização dos dados de entrada (idade, cor e localização) e a codificação one-hot das categorias
    const ages = users.map(u => u.age);
    const prices = catalog.map(p => p.price);

    const minAge = Math.min(...ages);
    const maxAge = Math.max(...ages);

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const colors = [...new Set(catalog.map(p => p.color))];
    const categories = [...new Set(catalog.map(p => p.category))];

    const colorsIndex = Object.entries(
        colors.map((color, index) => [color, index])
    );
    const categoriesIndex = Object.entries(
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
        catalog.map(product => {
            const avg = ageCounts[product.name] ?
                ageSums[product.name] / ageCounts[product.name] :
                midAge;
                
                return [product.name, normalize(avg, minAge, maxAge)];
            })
        );
    
    return {
        catalog,
        users,
        colorsIndex,
        categoriesIndex,
        minAge,
        maxAge,
        minPrice,
        maxPrice,
        numCategories: categories.length,
        numColors: colors.length,
        dimentions: 2 + categories.length + colors.length, // idade + preço + categorias + cores (o 2 é para idade e preço, são 2 dimensões)
    }
}

async function trainModel({ users }) {
    console.log('Training model with users:', users)
    postMessage({ type: workerEvents.progressUpdate, progress: { progress: 50 } });

    // baixando base de produtos para treinar o modelo
    const catalog = await (await fetch('/data/products.json')).json();
    
    const context = makeContext(users, catalog);
    
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
