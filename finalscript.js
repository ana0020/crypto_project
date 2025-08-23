// script.js
const coinListEl = document.getElementById('coin-list');
const coinSelectEl = document.getElementById('coin-select');
const chartSection = document.getElementById('chart-section');
const coinTitle = document.getElementById('coin-title');
const chartCanvas = document.getElementById('coin-chart');
const themeToggleBtn = document.getElementById('theme-toggle');
const chartTypeContainer = document.querySelector('.chart-type-selector');
const rangeSelectorContainer = document.querySelector('.range-selector');
const chartTypeButtons = document.querySelectorAll('.chart-type-selector button');

let chart;
let coins = [];
let currentRange = 7; 
let currentCoinId = null;
let currentChartType = 'line';

// Theme toggle
function setTheme(mode) {
  document.body.className = mode;
  localStorage.setItem('theme', mode);
  themeToggleBtn.textContent = mode === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
  if (chart) {
    chart.options.scales.x.ticks.color = getComputedStyle(document.body).color;
    chart.options.scales.x.grid.color = getGridColor();
    chart.options.scales.y.ticks.color = getComputedStyle(document.body).color;
    chart.options.scales.y.grid.color = getGridColor();
    chart.update();
  }
}

function toggleTheme() {
  const current = document.body.className;
  setTheme(current === 'dark' ? 'light' : 'dark');
}

themeToggleBtn.addEventListener('click', toggleTheme);

chartTypeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    chartTypeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const type = btn.getAttribute('data-type');
    currentChartType = type === 'area' ? 'line' : type;
    if (currentCoinId) loadCoinChart(currentCoinId);
  });
});

(function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(saved || (prefersDark ? 'dark' : 'light'));
})();

async function loadCoinOptions() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1');
    const data = await res.json();
    coins = data;

    new TomSelect("#coin-select", {
      options: coins.map(c => ({
        value: c.id,
        text: `${c.name} (${c.symbol.toUpperCase()}) - $${c.current_price}`
      })),
      onChange: value => loadCoinChart(value)
    });

    renderCoinCards();
  } catch (err) {
    console.error('Failed to load coin options:', err);
  }
}

function renderCoinCards() {
  coinListEl.innerHTML = '';
  coins.forEach(coin => {
    const card = document.createElement('div');
    card.className = 'crypto-card';
    card.innerHTML = `
      <h2>${coin.name} (${coin.symbol.toUpperCase()})</h2>
      <p>💲 Price: $${coin.current_price.toFixed(2)}</p>
      <p>📈 Change 24h: ${coin.price_change_percentage_24h.toFixed(2)}%</p>
      <img src="${coin.image}" alt="Logo of ${coin.name}" width="40" height="40">
      <button onclick="loadCoinChart('${coin.id}')">📊 View Chart</button>
    `;
    coinListEl.appendChild(card);
  });
}

async function loadCoinChart(coinId) {
  try {
    const [priceData, chartData] = await Promise.all([
      fetch(`https://api.coingecko.com/api/v3/coins/${coinId}`).then(res => res.json()),
      fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${currentRange}`).then(res => res.json())
    ]);

    if (!chartData.prices || chartData.prices.length === 0) {
      alert("No chart data available for this range.");
      return;
    }

    currentCoinId = coinId;
    const data = chartData.prices.map(p => ({ x: new Date(p[0]), y: p[1] }));

    chartSection.style.display = 'block';
    coinListEl.style.display = 'none';
    chartTypeContainer.style.display = 'flex';
    rangeSelectorContainer.style.display = 'flex';
    coinTitle.textContent = `${priceData.name} (${priceData.symbol.toUpperCase()})`;
    
    

    if (chart) chart.destroy();
    // Set dark colors for bar chart only

    

    chart = new Chart(chartCanvas, {
      type: currentChartType,
      data: {
        datasets: [{
          label: `${priceData.name} Price (USD)`,
          data,
          fill: document.querySelector('.chart-btn.active')?.getAttribute('data-type') === 'area',
          tension: 0.4,


           borderColor: 'transparent',
          backgroundColor: 'rgba(56, 189, 248, 0.1)',
          segment: {
            borderColor: ctx => {
              const curr = ctx.p0.parsed.y;
              const next = ctx.p1.parsed.y;
              return next < curr ? '#ef4444' : '#38bdf8';
            }
          }


          
  
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: currentRange <= 7 ? 'day' : 'month'
            },
            ticks: {
              color: getComputedStyle(document.body).color
            },
            grid: {
              color: getGridColor()
            }
          },
          y: { beginAtZero: false,
            ticks: {
              color: getComputedStyle(document.body).color,
              callback: val => `$${val.toFixed(2)}`
            },
            grid: {
              color: getGridColor()
            }
          }
        }
      }
    });
  } catch (err) {
    console.error(`Error fetching data for ${coinId}:`, err);
  }
}

function goBack() {
  chartSection.style.display = 'none';
  coinListEl.style.display = 'grid';
  chartTypeContainer.style.display = 'none';
  rangeSelectorContainer.style.display = 'none';
  if (chart) chart.destroy();
}

const rangeButtons = document.querySelectorAll('.range-selector button');
rangeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    rangeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentRange = btn.getAttribute('data-range');
    if (currentCoinId) loadCoinChart(currentCoinId);
  });
});

loadCoinOptions();

function getGridColor() {
  const isLight = document.body.classList.contains('light');
  return isLight ? '#cbd5e1' : '#334155';
}

