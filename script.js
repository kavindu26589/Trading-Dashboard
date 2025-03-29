const API_URL = "https://api.coingecko.com/api/v3/coins/";
let selectedAsset = "bitcoin";
let priceHistory = [];
let balance = 10000;

// Fetch historical price data from CoinGecko
async function fetchHistoricalData() {
    try {
        let response = await fetch(`${API_URL}${selectedAsset}/market_chart?vs_currency=usd&days=30&interval=daily`);
        let data = await response.json();
        priceHistory = data.prices.map(entry => entry[1]);

        updateChart();  // Ensure this function is defined before calling it
        calculateIndicators();
        predictNextPrice();
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

// Chart.js setup
let ctx = document.getElementById("priceChart").getContext("2d");
let priceChart = new Chart(ctx, {
    type: "line",
    data: {
        labels: [],
        datasets: [{
            label: "Price",
            data: [],
            borderColor: "blue",
            borderWidth: 1
        }]
    }
});

// ✅ **Define updateChart function**
function updateChart() {
    if (priceHistory.length === 0) return;

    priceChart.data.labels = Array.from({ length: priceHistory.length }, (_, i) => i + 1);
    priceChart.data.datasets[0].data = priceHistory;
    priceChart.update();
}

// Calculate RSI
function calculateRSI() {
    if (priceHistory.length < 15) return "Insufficient Data";

    let gains = [], losses = [];
    for (let i = 1; i < priceHistory.length; i++) {
        let diff = priceHistory[i] - priceHistory[i - 1];
        if (diff > 0) gains.push(diff);
        else losses.push(Math.abs(diff));
    }

    let avgGain = gains.reduce((a, b) => a + b, 0) / gains.length;
    let avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;

    let rs = avgGain / avgLoss;
    let rsi = 100 - (100 / (1 + rs));

    document.getElementById("rsi-value").innerText = rsi.toFixed(2);
}

// Calculate Bollinger Bands
function calculateBollingerBands() {
    if (priceHistory.length < 20) return "Insufficient Data";

    let sma = priceHistory.slice(-20).reduce((a, b) => a + b, 0) / 20;
    let squaredDiffs = priceHistory.slice(-20).map(p => Math.pow(p - sma, 2));
    let stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / 20);

    let upperBand = (sma + (2 * stdDev)).toFixed(2);
    let lowerBand = (sma - (2 * stdDev)).toFixed(2);

    document.getElementById("bollinger-value").innerText = `Upper: $${upperBand}, Lower: $${lowerBand}`;
}

// LSTM AI Predictions
let model;
async function trainModel() {
    model = tf.sequential();
    model.add(tf.layers.lstm({ units: 10, inputShape: [5, 1], returnSequences: false }));
    model.add(tf.layers.dense({ units: 1 }));

    model.compile({ optimizer: "adam", loss: "meanSquaredError" });

    let xs = tf.tensor2d(priceHistory.slice(-10, -5), [5, 1]);
    let ys = tf.tensor2d(priceHistory.slice(-5), [5, 1]);

    await model.fit(xs, ys, { epochs: 50 });
    predictNextPrice();
}

async function predictNextPrice() {
    if (!model || priceHistory.length < 5) return;

    let input = tf.tensor2d([priceHistory.slice(-5)], [1, 5]);
    let prediction = model.predict(input);
    
    prediction.data().then((data) => {
        document.getElementById("predicted-price").innerText = `$${data[0].toFixed(2)}`;
    });
}

// Buy/Sell Simulation
function buyCrypto() {
    let amount = parseFloat(document.getElementById("trade-amount").value);
    let price = priceHistory[priceHistory.length - 1];

    if (amount > balance) {
        document.getElementById("trade-status").innerText = "Not enough balance!";
        return;
    }

    balance -= amount;
    document.getElementById("balance").innerText = balance.toFixed(2);
    document.getElementById("trade-status").innerText = `Bought $${amount} worth of ${selectedAsset}`;
}

function sellCrypto() {
    let amount = parseFloat(document.getElementById("trade-amount").value);
    balance += amount;
    document.getElementById("balance").innerText = balance.toFixed(2);
    document.getElementById("trade-status").innerText = `Sold $${amount} worth of ${selectedAsset}`;
}

// Fetch data initially
fetchHistoricalData();
