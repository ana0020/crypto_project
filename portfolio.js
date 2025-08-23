const form = document.getElementById('portfolio-form');
const list = document.getElementById('portfolio-list');
let portfolio = JSON.parse(localStorage.getItem('portfolio')) || [];

// Load coin list with market data (CORS safe)
new TomSelect("#portfolio-coin-select", {
  valueField: 'id',
  labelField: 'name',
  searchField: ['name', 'symbol'],
  load: async function (query, callback) {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1');
      const coins = await res.json();
      const formatted = coins.map(c => ({
        id: c.id,
        name: `${c.name} (${c.symbol.toUpperCase()})`
      }));
      callback(formatted);
    } catch (err) {
      console.error('Coin list fetch failed:', err);
      callback();
    }
  }
});

// Handle form submission
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const coinId = document.getElementById('portfolio-coin-select').value.trim().toLowerCase();
  const quantity = parseFloat(document.getElementById('quantity').value);
  if (!coinId || quantity <= 0) return;

  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}`);
    if (!res.ok) throw new Error('Invalid coin ID');
    const data = await res.json();

    const currentPrice = data.market_data.current_price.usd;

    // Safely handle prompt cancel
    const input = prompt(`Enter your buy price for ${data.name} (leave blank to use current price: $${currentPrice.toFixed(2)})`);
    if (input === null) return;

    let buyPrice = parseFloat(input);
    if (isNaN(buyPrice) || buyPrice <= 0) buyPrice = currentPrice;

    const existingIndex = portfolio.findIndex(c => c.id === coinId);
    if (existingIndex !== -1) {
      const existing = portfolio[existingIndex];
      const totalQty = existing.quantity + quantity;
      const weightedBuyPrice = ((existing.buyPrice * existing.quantity) + (buyPrice * quantity)) / totalQty;
      existing.quantity = totalQty;
      existing.buyPrice = weightedBuyPrice;
      existing.price = currentPrice;
    } else {
      portfolio.push({
        id: coinId,
        name: data.name,
        symbol: data.symbol,
        image: data.image.thumb,
        quantity,
        buyPrice,
        price: currentPrice
      });
    }

    localStorage.setItem('portfolio', JSON.stringify(portfolio));
    renderPortfolio();

    // Reset form and dropdown only after successful update
    form.reset();
    document.querySelector('#portfolio-coin-select').tomselect.clear();

  } catch (err) {
    alert('Failed to fetch coin data. Please check the ID or try again later.');
  }
});

// Display the portfolio
function renderPortfolio() {
  const list = document.getElementById('portfolio-list');
  
  
  list.innerHTML = '';
 
  document.querySelectorAll('.portcrypto-card').forEach(el => el.remove());

  let totalValue = 0;
  let totalCost = 0;

  portfolio.forEach((coin, index) => {
    const value = coin.price * coin.quantity;
    const cost = coin.buyPrice * coin.quantity;
    const gain = value - cost;

    totalValue += value;
    totalCost += cost;

    const card = document.createElement('div');
    card.className = 'crypto-card';
    card.innerHTML = `
      <h3>${coin.name} (${coin.symbol.toUpperCase()})</h3>
      <img src="${coin.image}" alt="${coin.name}" />
      <p>Quantity: <input type="number" value="${coin.quantity}" step="any" data-index="${index}" class="qty-input" /></p>
      <p>Buy Price: $${coin.buyPrice.toFixed(2)}</p>
      <p>Current Price: $${coin.price.toFixed(2)}</p>
      <p>Total Value: $${value.toFixed(2)}</p>
      <p>Gain/Loss: <strong style="color:${gain >= 0 ? 'lime' : 'red'}">$${gain.toFixed(2)}</strong></p>
      <button class="delete-button" data-index="${index}">🗑 Remove</button>
    `;
    list.appendChild(card);
  });

  const totalGain = totalValue - totalCost;
  
  
   
 
  
  


  // Delete coin
  document.querySelectorAll('.delete-button').forEach(btn =>
    btn.addEventListener('click', (e) => {
      const index = e.target.dataset.index;
      portfolio.splice(index, 1);
      localStorage.setItem('portfolio', JSON.stringify(portfolio));
      renderPortfolio();
    })
  );

  // Update quantity
  document.querySelectorAll('.qty-input').forEach(input =>
    input.addEventListener('change', (e) => {
      const index = e.target.dataset.index;
      const newQty = parseFloat(e.target.value);
      if (!isNaN(newQty) && newQty > 0) {
        portfolio[index].quantity = newQty;
        localStorage.setItem('portfolio', JSON.stringify(portfolio));
        renderPortfolio();
      }
    })
  );

  
  const summary = document.createElement('div');
summary.className = 'portcrypto-card';
summary.innerHTML = `
  <div class="summary-content">
    <div class="summary-info">
      <h3>Total Portfolio Value: $${totalValue.toFixed(2)}</h3>
      <h3>Net Gain/Loss: <strong style="color:${totalGain >= 0 ? 'lime' : 'red'}">$${totalGain.toFixed(2)}</strong></h3>
    </div>
    <div class="summary-chart">
      <canvas id="portfolioChart" width="200" height="200"></canvas>
    </div>
  </div>
`;
list.appendChild(summary); // instead of .portcontainer


  // Render chart
  const canvas = document.getElementById('portfolioChart');
  if (!canvas) return;

  if (window.portfolioChart instanceof Chart) {
    window.portfolioChart.destroy();
  }

  const ctx = canvas.getContext('2d');
  const labels = portfolio.map(c => `${c.name} (${c.symbol.toUpperCase()})`);
  const data = portfolio.map(c => (c.price * c.quantity));

  window.portfolioChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        label: 'Portfolio Value',
        data: data,
        backgroundColor: [
          '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
          '#14b8a6', '#eab308', '#6366f1', '#f43f5e'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || '';
              const value = context.parsed;
              return `${label}: $${value.toFixed(2)}`;
            }
          }
        }
      }
    }
  });
}

// Refresh Prices
async function refreshPrices() {
  const ids = portfolio.map(c => c.id).join(',');
  const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
  const prices = await res.json();

  portfolio = portfolio.map(c => ({
    ...c,
    price: prices[c.id]?.usd || c.price
  }));

  localStorage.setItem('portfolio', JSON.stringify(portfolio));
  renderPortfolio();
}

document.getElementById('refresh-btn').addEventListener('click', async () => {
  await refreshPrices();
  alert('Prices refreshed!');
});

renderPortfolio();


