const API_URL = "https://api.coingecko.com/api/v3/coins/";
let selectedAsset = "bitcoin";
let priceHistory = [];
let balance = 10000;
let priceChart;

// Toggle Dark Mode
document.getElementById("toggle-theme").addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});

// When coin selection changes, fetch new data
document.getElementById("coin-select").addEventListener("change", () => {
  selectedAsset = document.getElementById("coin-select").value;
  fetchHistoricalData();
});

// When trading type changes, recalc signals
document.getElementById("trading-type").addEventListener("change", () => {
  calculateTradingSignal();
});

// Buy/Sell simulation buttons
document.getElementById("buy-btn").addEventListener("click", buyCrypto);
document.getElementById("sell-btn").addEventListener("click", sellCrypto);

// Fetch historical price data from CoinGecko (30 days of daily data)
async function fetchHistoricalData() {
  try {
    const url = `${API_URL}${selectedAsset}/market_chart?vs_currency=usd&days=30&interval=daily`;
    const response = await fetch(url);
    const data = await response.json();
    priceHistory = data.prices.map(entry => entry[1]);

    updateChart();
    const lastPrice = priceHistory[priceHistory.length - 1];
    document.getElementById("live-price").innerText = `$${lastPrice.toFixed(2)}`;

    calculateIndicators();
    calculateTradingSignal();
  } catch (error) {
    console.error("Error fetching data:", error);
    document.getElementById("live-price").innerText = "Error loading price";
  }
}

// Update or create a line chart with the price history
function updateChart() {
  if (!priceHistory.length) return;
  if (!priceChart) {
    const ctx = document.getElementById("priceChart").getContext("2d");
    priceChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: priceHistory.map((_, i) => i + 1),
        datasets: [{
          label: `${selectedAsset.toUpperCase()} Price`,
          data: priceHistory,
          borderColor: "blue",
          borderWidth: 2,
          fill: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2,
        scales: {
          y: {
            beginAtZero: false,
            title: { display: true, text: "Price (USD)" }
          },
          x: { display: false }
        }
      }
    });
  } else {
    priceChart.data.labels = priceHistory.map((_, i) => i + 1);
    priceChart.data.datasets[0].data = priceHistory;
    priceChart.update();
  }
}

// Calculate technical indicators and update UI
function calculateIndicators() {
  calculateRSI();
  calculateMACD();
  calculateBollingerBands();
}

// RSI calculation
function calculateRSI() {
  if (priceHistory.length < 15) {
    document.getElementById("rsi-value").innerText = "Insufficient Data";
    return;
  }
  let gains = [], losses = [];
  for (let i = 1; i < priceHistory.length; i++) {
    const diff = priceHistory[i] - priceHistory[i - 1];
    diff > 0 ? gains.push(diff) : losses.push(Math.abs(diff));
  }
  const avgGain = gains.reduce((a, b) => a + b, 0) / gains.length;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  document.getElementById("rsi-value").innerText = rsi.toFixed(2);
  return rsi;
}

// MACD calculation (simple approximation using EMAs)
function calculateMACD() {
  if (priceHistory.length < 26) {
    document.getElementById("macd-value").innerText = "Insufficient Data";
    return;
  }
  const shortEMA = average(priceHistory.slice(-12));
  const longEMA = average(priceHistory.slice(-26));
  const macd = shortEMA - longEMA;
  document.getElementById("macd-value").innerText = macd.toFixed(2);
  return macd;
}

// Bollinger Bands calculation
function calculateBollingerBands() {
  if (priceHistory.length < 20) {
    document.getElementById("bollinger-value").innerText = "Insufficient Data";
    return;
  }
  const last20 = priceHistory.slice(-20);
  const sma = average(last20);
  const squaredDiffs = last20.map(p => Math.pow(p - sma, 2));
  const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / last20.length);
  const upperBand = sma + 2 * stdDev;
  const lowerBand = sma - 2 * stdDev;
  document.getElementById("bollinger-value").innerText =
    `Upper: $${upperBand.toFixed(2)}, Lower: $${lowerBand.toFixed(2)}`;
  return { upperBand, lowerBand, sma };
}

// Helper: calculate average of an array
function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Calculate trading signal based on RSI, MACD, Bollinger Bands, and trading type
function calculateTradingSignal() {
  const rsi = calculateRSI();
  const macd = calculateMACD();
  const bb = calculateBollingerBands();
  const currentPrice = priceHistory[priceHistory.length - 1];
  const tradingType = document.getElementById("trading-type").value;

  let rsiSignal = "Hold";
  if (tradingType === "Day Trading") {
    if (rsi < 40) rsiSignal = "Buy";
    else if (rsi > 60) rsiSignal = "Sell";
  } else { // Swing Trading
    if (rsi < 30) rsiSignal = "Buy";
    else if (rsi > 70) rsiSignal = "Sell";
  }

  let macdSignal = "Hold";
  if (macd > 0) macdSignal = "Buy";
  else if (macd < 0) macdSignal = "Sell";

  let bbSignal = "Hold";
  const buffer = tradingType === "Day Trading" ? 1.015 : 1.01;
  if (currentPrice <= bb.lowerBand * buffer) bbSignal = "Buy";
  else if (currentPrice >= bb.upperBand / buffer) bbSignal = "Sell";

  // Final signal via majority vote
  let buyCount = 0, sellCount = 0;
  [rsiSignal, macdSignal, bbSignal].forEach(signal => {
    if (signal === "Buy") buyCount++;
    if (signal === "Sell") sellCount++;
  });
  let finalSignal = "Hold";
  if (buyCount >= 2) finalSignal = "Buy";
  else if (sellCount >= 2) finalSignal = "Sell";

  const signalDiv = document.getElementById("trading-signal");
  signalDiv.innerText = finalSignal;
  signalDiv.classList.remove("buy", "sell", "hold");
  if (finalSignal === "Buy") signalDiv.classList.add("buy");
  else if (finalSignal === "Sell") signalDiv.classList.add("sell");
  else signalDiv.classList.add("hold");
}

// Buy crypto simulation
function buyCrypto() {
  const amount = parseFloat(document.getElementById("trade-amount").value);
  if (isNaN(amount) || amount <= 0) {
    document.getElementById("trade-status").innerText = "Enter a valid amount!";
    return;
  }
  if (amount > balance) {
    document.getElementById("trade-status").innerText = "Not enough balance!";
    return;
  }
  balance -= amount;
  document.getElementById("balance").innerText = balance.toFixed(2);
  document.getElementById("trade-status").innerText =
    `Bought $${amount} worth of ${selectedAsset}`;
}

// Sell crypto simulation
function sellCrypto() {
  const amount = parseFloat(document.getElementById("trade-amount").value);
  if (isNaN(amount) || amount <= 0) {
    document.getElementById("trade-status").innerText = "Enter a valid amount!";
    return;
  }
  balance += amount;
  document.getElementById("balance").innerText = balance.toFixed(2);
  document.getElementById("trade-status").innerText =
    `Sold $${amount} worth of ${selectedAsset}`;
}

// Auto-refresh data every 30 seconds
setInterval(fetchHistoricalData, 30000);

// Initial data load
fetchHistoricalData();
