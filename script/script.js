const API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';
let previousPrice = null; // Variable para almacenar el precio anterior
let timerInterval; // Variable para manejar el cronómetro del tiempo general
let priceTimerInterval; // Variable para manejar el cronómetro del precio de BTC

async function fetchBTCPriceIA() {
    try {
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`Error en la respuesta: ${response.statusText}`);
        }

        const data = await response.json();
        const price = data.bitcoin?.usd;

        if (price === undefined) {
            throw new Error('Datos no disponibles para el precio de Bitcoin.');
        }

        const priceElement = document.getElementById('btc-price');
        if (priceElement) {
            priceElement.textContent = `$${price.toFixed(2)}`;

            if (previousPrice !== null) {
                const arrow = price > previousPrice ? '🔼' : (price < previousPrice ? '🔽' : '➡️');
                priceElement.textContent += ` ${arrow}`;

                const trendElement = document.getElementById('trend-indicator');
                if (trendElement) {
                    trendElement.textContent = price > previousPrice ? 'IA: Vela Alta 🔼' : (price < previousPrice ? 'IA: Vela Baja 🔽' : 'IA: Tendencia Estable ➡️');
                }
            }

            const futurePriceElement = document.getElementById('future-price');
            if (futurePriceElement) {
                const futurePriceChange = price * (Math.random() * 0.1 - 0.05);
                const futurePrice = price + futurePriceChange;
                const futureArrow = futurePriceChange >= 0 ? '🔼' : '🔽';
                futurePriceElement.textContent = `IA: Precio Futuro (estimado): $${futurePrice.toFixed(2)} ${futureArrow}`;
            }
        }

        previousPrice = price;

        resetTimer();
        resetPriceTimer();
    } catch (error) {
        const errorPriceElement = document.getElementById('btc-price');
       
        const errorPredictionElement = document.getElementById('btc-prediction');
        if (errorPredictionElement) {
            errorPredictionElement.textContent = 'Error en predicción.';
        }
        console.error('Error al obtener los datos:', error);
    }
}

function resetTimer() {
    let seconds = 0;
    const timerElement = document.getElementById('timer');

    if (timerElement) {
        if (timerInterval) {
            clearInterval(timerInterval);
        }

        timerInterval = setInterval(() => {
            seconds++;
            timerElement.textContent = `IA: Tiempo desde la última actualización: ${seconds} segundos`;
        }, 1000);
    }
}

function resetPriceTimer() {
    let priceSeconds = 0;
    const priceTimerElement = document.getElementById('btc-price-timer');

    if (priceTimerElement) {
        if (priceTimerInterval) {
            clearInterval(priceTimerInterval);
        }

        priceTimerInterval = setInterval(() => {
            priceSeconds++;
            priceTimerElement.textContent = `IA: Tiempo desde la última actualización de BTC: ${priceSeconds} segundos`;
        }, 1000);
    }
}

fetchBTCPriceIA();
setInterval(fetchBTCPriceIA, 60000);
