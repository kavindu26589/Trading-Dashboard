/* -------------------------------------
 * GLOBAL VARIABLES
 * ------------------------------------- */
const API_URL = "https://api.coingecko.com/api/v3/coins/";
let selectedAsset = "bitcoin";
let priceHistory = [];
let balance = 10000;
let model;

/* -------------------------------------
 * CHART SETUP
 * ------------------------------------- */
const ctx = document.getElementById("priceChart").getContext("2d");
const priceChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "Price",
        data: [],
        borderColor: "blue",
        borderWidth: 1,
      },
    ],
  },
});

/* -------------------------------------
 * UPDATE CHART
 * ------------------------------------- */
function updateChart() {
  if (!priceHistory.length) return;
  priceChart.data.labels = priceHistory.map((_, i) => i + 1);
  priceChart.data.datasets[0].data = priceHistory;
  priceChart.update();
}

/* -------------------------------------
 * FETCH HISTORICAL DATA
 * ------------------------------------- */
async function fetchHistoricalData() {
  try {
    const url = `${API_URL}${selectedAsset}/market_chart?vs_currency=usd&days=30&interval=daily`;
    const response = await fetch(url);
    const data = await response.json();

    // Price array from last 30 days
    priceHistory = data.prices.map((entry) => entry[1]);

    // Update UI
    updateChart();
    calculateIndicators();
    predictNextPrice();
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

/* -------------------------------------
 * INDICATORS
 * ------------------------------------- */
function calculateIndicators() {
  // 1) RSI
  calculateRSI();

  // 2) MACD (basic approximation)
  calculateMACD();

  // 3) Bollinger Bands
  calculateBollingerBands();
}

function calculateRSI() {
  if (priceHistory.length < 15) {
    document.getElementById("rsi-value").innerText = "Insufficient Data";
    return;
  }

  let gains = [],
    losses = [];
  for (let i = 1; i < priceHistory.length; i++) {
    const diff = priceHistory[i] - priceHistory[i - 1];
    if (diff > 0) gains.push(diff);
    else losses.push(Math.abs(diff));
  }

  const avgGain = gains.reduce((a, b) => a + b, 0) / gains.length;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;
  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  document.getElementById("rsi-value").innerText = rsi.toFixed(2);
}

function calculateMACD() {
  // For a real MACD, you'd do 12-day EMA, 26-day EMA, etc.
  // We'll do a simplified approach
  if (priceHistory.length < 26) {
    document.getElementById("macd-value").innerText = "Insufficient Data";
    return;
  }

  const shortEMA =
    priceHistory.slice(-12).reduce((a, b) => a + b, 0) / 12;
  const longEMA =
    priceHistory.slice(-26).reduce((a, b) => a + b, 0) / 26;

  const macd = shortEMA - longEMA;
  document.getElementById("macd-value").innerText = macd.toFixed(2);
}

function calculateBollingerBands() {
  if (priceHistory.length < 20) {
    document.getElementById("bollinger-value").innerText =
      "Insufficient Data";
    return;
  }

  const last20 = priceHistory.slice(-20);
  const sma =
    last20.reduce((acc, val) => acc + val, 0) / last20.length;
  const squaredDiffs = last20.map((p) => (p - sma) ** 2);
  const stdDev = Math.sqrt(
    squaredDiffs.reduce((a, b) => a + b, 0) / last20.length
  );

  const upperBand = sma + 2 * stdDev;
  const lowerBand = sma - 2 * stdDev;

  document.getElementById("bollinger-value").innerText = `Upper: $${upperBand.toFixed(
    2
  )}, Lower: $${lowerBand.toFixed(2)}`;
}

/* -------------------------------------
 * LSTM AI PREDICTIONS (TENSORFLOW.JS)
 * ------------------------------------- */
async function trainModel() {
  if (priceHistory.length < 10) {
    alert("Not enough data to train model");
    return;
  }

  // Define a simple LSTM model
  model = tf.sequential();
  model.add(
    tf.layers.lstm({
      units: 10,
      inputShape: [5, 1],
      returnSequences: false,
    })
  );
  model.add(tf.layers.dense({ units: 1 }));

  model.compile({ optimizer: "adam", loss: "meanSquaredError" });

  // We'll train on the last 10 data points
  // X: first 5 points, Y: next 5 points
  const xs = tf.tensor2d(priceHistory.slice(-10, -5), [5, 1]);
  const ys = tf.tensor2d(priceHistory.slice(-5), [5, 1]);

  await model.fit(xs, ys, { epochs: 50 });
  predictNextPrice();
}

async function predictNextPrice() {
  if (!model || priceHistory.length < 5) return;

  const input = tf.tensor2d([priceHistory.slice(-5)], [1, 5]);
  const prediction = model.predict(input);

  prediction.data().then((data) => {
    document.getElementById("predicted-price").innerText = `$${data[0].toFixed(
      2
    )}`;
  });
}

/* -------------------------------------
 * BUY/SELL SIMULATION
 * ------------------------------------- */
function buyCrypto() {
  const amount = parseFloat(
    document.getElementById("trade-amount").value
  );
  const price = priceHistory[priceHistory.length - 1];

  if (amount > balance) {
    document.getElementById("trade-status").innerText =
      "Not enough balance!";
    return;
  }

  balance -= amount;
  document.getElementById("balance").innerText = balance.toFixed(2);
  document.getElementById(
    "trade-status"
  ).innerText = `Bought $${amount} worth of ${selectedAsset}`;
}

function sellCrypto() {
  const amount = parseFloat(
    document.getElementById("trade-amount").value
  );
  balance += amount;
  document.getElementById("balance").innerText = balance.toFixed(2);
  document.getElementById(
    "trade-status"
  ).innerText = `Sold $${amount} worth of ${selectedAsset}`;
}

/* -------------------------------------
 * EVENT LISTENERS
 * ------------------------------------- */
document.getElementById("coin-select").addEventListener("change", () => {
  selectedAsset = document.getElementById("coin-select").value;
  fetchHistoricalData();
});

document
  .getElementById("train-model")
  .addEventListener("click", trainModel);

// Optional: Toggle Dark Mode
document.getElementById("toggle-theme").addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});

/* -------------------------------------
 * INITIALIZE
 * ------------------------------------- */
fetchHistoricalData();
