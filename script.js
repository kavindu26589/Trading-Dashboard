/*******************************************************
 * 1) MANUALLY REGISTER THE CANDLESTICK PLUGIN
 *******************************************************/
const ChartFinancial = window['chartjs-chart-financial']; 
// The plugin exports a global named "chartjs-chart-financial"

const {
  CandlestickController,
  CandlestickElement,
  OhlcController,
  OhlcElement
} = ChartFinancial;

// Register them with Chart.js
Chart.register(
  CandlestickController,
  CandlestickElement,
  OhlcController,
  OhlcElement
);

/*******************************************************
 * 2) GLOBALS & SETUP
 *******************************************************/
const COIN_GECKO_API = "https://api.coingecko.com/api/v3";
let selectedAsset = "bitcoin";
let candlestickChart;

// Toggle Dark Mode
document.getElementById("toggle-theme").addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});

// Coin selection
document.getElementById("coin-select").addEventListener("change", () => {
  selectedAsset = document.getElementById("coin-select").value;
  fetchDataAndRender();
});

/*******************************************************
 * 3) FETCH & RENDER
 *******************************************************/
async function fetchDataAndRender() {
  await fetchLivePrice();
  const ohlcData = await fetchOHLC();
  if (ohlcData) {
    renderCandlestickChart(ohlcData);
  }
}

/*******************************************************
 * 4) FETCH LIVE PRICE
 *******************************************************/
async function fetchLivePrice() {
  try {
    const url = `${COIN_GECKO_API}/simple/price?ids=${selectedAsset}&vs_currencies=usd`;
    const resp = await fetch(url);
    const data = await resp.json();
    const price = data[selectedAsset].usd;
    document.getElementById("live-price").innerText = `$${price.toLocaleString()}`;
  } catch (err) {
    console.error("Error fetching live price:", err);
    document.getElementById("live-price").innerText = "Error loading price";
  }
}

/*******************************************************
 * 5) FETCH OHLC DATA (1 Day)
 *    Returns arrays: [timestamp, open, high, low, close]
 *******************************************************/
async function fetchOHLC() {
  try {
    // 'days=1' => last 24h of OHLC
    const url = `${COIN_GECKO_API}/coins/${selectedAsset}/ohlc?vs_currency=usd&days=1`;
    const resp = await fetch(url);
    const data = await resp.json();

    // Convert to Chart.js format
    // { x: timestamp, o:..., h:..., l:..., c:... }
    const ohlc = data.map(candle => ({
      x: candle[0], // ms timestamp
      o: candle[1],
      h: candle[2],
      l: candle[3],
      c: candle[4]
    }));
    return ohlc;
  } catch (err) {
    console.error("Error fetching OHLC data:", err);
    return null;
  }
}

/*******************************************************
 * 6) RENDER CANDLESTICK CHART
 *******************************************************/
function renderCandlestickChart(ohlcData) {
  // If chart exists, update data only
  if (candlestickChart) {
    candlestickChart.data.datasets[0].data = ohlcData;
    candlestickChart.update();
    return;
  }

  const ctx = document.getElementById("candlestickChart").getContext("2d");
  candlestickChart = new Chart(ctx, {
    type: 'candlestick',
    data: {
      datasets: [{
        label: `${selectedAsset.toUpperCase()} (24h)`,
        data: ohlcData,
        borderColor: 'rgba(0,0,0,1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        x: {
          type: 'time',
          time: {
            tooltipFormat: 'MMM dd, HH:mm'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Price (USD)'
          },
          beginAtZero: false
        }
      }
    }
  });
}

/*******************************************************
 * 7) AUTO-REFRESH EVERY 30s
 *******************************************************/
setInterval(fetchDataAndRender, 30000);

// Initial load
fetchDataAndRender();

