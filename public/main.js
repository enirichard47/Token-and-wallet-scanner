/**
 * SOLANA SCANNER LOGIC - V7.3 (NEURAL NETWORK MESH + LIVE PREVIEW)
 */

const BACKEND_URL = '/api/helius';

// --- HELPERS ---
const safeSetText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
};
const safeSetClass = (id, className) => {
    const el = document.getElementById(id);
    if (el) el.className = className;
};
const formatCompact = (num) => {
    if(num === undefined || num === null || num === "---") return "---";
    return new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short", maximumFractionDigits: 2 }).format(num);
};
const truncateAddress = (str) => str.length > 10 ? str.substring(0, 4) + '...' + str.substring(str.length - 4) : str;

// --- VISUALS: NEURAL BLOCKCHAIN MESH ---
// Interactive particle system representing nodes and connections
const canvas = document.getElementById('network-canvas');
if (canvas) {
    const ctx = canvas.getContext('2d');
    let width, height;
    
    // Mouse state for interaction
    const mouse = { x: null, y: null, radius: 150 };

    window.addEventListener('mousemove', (event) => {
        mouse.x = event.x;
        mouse.y = event.y;
    });

    const resize = () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.directionX = (Math.random() * 0.4) - 0.2; // Slow movement
            this.directionY = (Math.random() * 0.4) - 0.2;
            this.size = Math.random() * 2 + 1;
            this.color = '#00F0FF'; // Neon Cyan
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
            
            // Glow effect
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.shadowBlur = 0; // Reset for performance
        }

        update() {
            // Boundary checks
            if (this.x > width || this.x < 0) this.directionX = -this.directionX;
            if (this.y > height || this.y < 0) this.directionY = -this.directionY;

            // Mouse interaction (Push/Pull effect)
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx*dx + dy*dy);

            if (distance < mouse.radius) {
                if (mouse.x < this.x && this.x < width - 10) this.x += 2;
                if (mouse.x > this.x && this.x > 10) this.x -= 2;
                if (mouse.y < this.y && this.y < height - 10) this.y += 2;
                if (mouse.y > this.y && this.y > 10) this.y -= 2;
                // Change color near mouse
                this.color = '#BD00FF'; // Neon Purple
            } else {
                this.color = '#00F0FF'; // Back to Cyan
            }

            this.x += this.directionX;
            this.y += this.directionY;
            this.draw();
        }
    }

    const particlesArray = [];
    const numberOfParticles = Math.min((width * height) / 15000, 100); // Responsive count

    function init() {
        particlesArray.length = 0;
        for (let i = 0; i < numberOfParticles; i++) {
            particlesArray.push(new Particle());
        }
    }
    init();

    function connect() {
        let opacityValue = 1;
        for (let a = 0; a < particlesArray.length; a++) {
            for (let b = a; b < particlesArray.length; b++) {
                let distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x)) + 
                               ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));
                
                // Connection threshold (distance squared)
                if (distance < (width/7) * (height/7)) {
                    opacityValue = 1 - (distance / 20000);
                    ctx.strokeStyle = `rgba(0, 240, 255, ${opacityValue * 0.15})`; // Low opacity cyan lines
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                    ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                    ctx.stroke();
                }
            }
        }
    }

    function animateNetwork() {
        requestAnimationFrame(animateNetwork);
        ctx.clearRect(0, 0, width, height);
        
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
        }
        connect();
    }
    
    // Start Animation
    animateNetwork();
}

// Initialize Icons & Empty Charts
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}

// --- LOGIC ---
let currentMode = 'token';
let priceChart = null;
let distChartInstance = null;

// Initialize Empty Charts on Load
window.addEventListener('load', () => {
    initCharts(); 
});

function initCharts() {
    // Price Chart (Flat Line Initially)
    const ctx = document.getElementById('priceChart')?.getContext('2d');
    if(ctx) {
        priceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [1,2,3,4,5,6,7,8],
                datasets: [{
                    data: [0, 0, 0, 0, 0, 0, 0, 0],
                    borderColor: '#333', // Dark grey for idle
                    borderWidth: 2, pointRadius: 0, tension: 0.4
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { legend: false }, 
                scales: { x: { display: false }, y: { display: false } },
                animation: false
            }
        });
    }

    // Distribution Chart (Empty Initially)
    const ctxDist = document.getElementById('distributionChart')?.getContext('2d');
    if (ctxDist) {
        distChartInstance = new Chart(ctxDist, {
            type: 'bar',
            data: {
                labels: ["Waiting..."],
                datasets: [{ label: '% Held', data: [0], backgroundColor: '#333', borderRadius: 4 }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { display: false } },
                    y: { grid: { display: false }, ticks: { color: '#555' } }
                }
            }
        });
    }
}


window.switchTab = function(mode) {
    currentMode = mode;
    const btnToken = document.getElementById('tab-token');
    const btnWallet = document.getElementById('tab-wallet');
    const input = document.getElementById('searchInput');
    
    // Reset styles
    btnToken.className = "flex-1 py-6 text-sm font-mono tracking-widest transition-all hover:bg-white/10";
    btnWallet.className = "flex-1 py-6 text-sm font-mono tracking-widest transition-all hover:bg-white/10";

    if(mode === 'token') {
        btnToken.classList.add('text-neon-cyan', 'border-b-2', 'border-neon-cyan', 'bg-white/5');
        btnToken.classList.remove('text-gray-600');
        btnWallet.classList.add('text-gray-600');
        input.placeholder = "ENTER_MINT_ADDRESS...";
        
        // Show Token UI, Hide Wallet UI
        document.getElementById('tokenResults').classList.remove('hidden');
        document.getElementById('walletResults').classList.add('hidden');
    } else {
        btnWallet.classList.add('text-neon-cyan', 'border-b-2', 'border-neon-cyan', 'bg-white/5');
        btnWallet.classList.remove('text-gray-600');
        btnToken.classList.add('text-gray-600');
        input.placeholder = "ENTER_WALLET_ADDRESS...";
        
        // Show Wallet UI, Hide Token UI
        document.getElementById('walletResults').classList.remove('hidden');
        document.getElementById('tokenResults').classList.add('hidden');
    }
    input.value = "";
    document.getElementById('errorMessage').classList.add('hidden');
}

window.runAnalysis = async function() {
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');
    const errorBox = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const inputValue = document.getElementById('searchInput').value.trim();

    // UI Loading State
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    errorBox.classList.add('hidden');
    
    // Dim the results slightly during load
    document.getElementById('resultsArea').style.opacity = '0.5';

    try {
        if (inputValue.length < 32 || inputValue.length > 44) throw new Error("INVALID_ADDRESS_FORMAT");

        if (currentMode === 'token') {
            await handleTokenAnalysis(inputValue);
        } else {
            await handleWalletAnalysis(inputValue);
        }

    } catch (error) {
        console.error(error);
        errorText.textContent = error.message || "CONNECTION_FAILED";
        errorBox.classList.remove('hidden');
    } finally {
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
        document.getElementById('resultsArea').style.opacity = '1';
    }
}

async function handleTokenAnalysis(mintAddress) {
    let pair = null, heliusData = null, topHolders = [], priceChange = 0;

    // Use simulated delay to show "Scanning" effect if backend is missing
    await new Promise(r => setTimeout(r, 800));

    try {
        const promises = [
            fetch(`https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`).then(r=>r.json()).catch(()=>({pairs:null})),
            
            // NOTE: Replace BACKEND_URL with your actual backend or use this fallback logic
            fetch(BACKEND_URL, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({jsonrpc:'2.0', id:'asset', method:'getAsset', params:{id:mintAddress}}) })
                .then(r => r.ok ? r.json() : { result: null }) // proceed to mock if fail
                .catch(()=>({result:null})),
                
            fetch(BACKEND_URL, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({jsonrpc:'2.0', id:'holders', method:'getTokenLargestAccounts', params:[mintAddress]}) })
                .then(r => r.ok ? r.json() : { result: { value: [] } }) 
                .catch(()=>({result:null}))
        ];

        const [dexData, assetData, holdersData] = await Promise.all(promises);

        if (dexData?.pairs?.length > 0) {
            pair = dexData.pairs.sort((a,b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
            priceChange = pair.priceChange?.h24 || 0;
        }
        if (assetData?.result) heliusData = assetData.result;
        if (holdersData?.result?.value) topHolders = holdersData.result.value;

    } catch (e) {
        console.log("Using Fallback Data");
    }

    // --- FALLBACK MOCK DATA (If API fails, show this so UI updates) ---
    // If you have a real backend, remove this or make it smarter.
    if (!pair && !heliusData) {
        // Simulating data for "cool effect" if API is not connected
        pair = {
            baseToken: { name: "Mock Token", symbol: "MOCK" },
            priceUsd: "1.24",
            fdv: 12000000,
            liquidity: { usd: 450000 },
            volume: { h24: 2100000 },
            pairCreatedAt: Date.now() - 864000000
        };
        heliusData = {
            token_info: {
                decimals: 9,
                supply: 1000000000000000, // 1B
                mint_authority: null,
                freeze_authority: null
            },
            mutable: true
        };
        priceChange = 12.5;
        topHolders = [
            { address: "Raydium...Auth", uiAmount: 120000000 },
            { address: "Wallet...X9", uiAmount: 40000000 }
        ];
    }

    // --- UI UPDATES ---
    safeSetText('tokenName', heliusData?.content?.metadata?.name || pair?.baseToken?.name || "Unknown");
    safeSetText('tokenSymbol', heliusData?.content?.metadata?.symbol || pair?.baseToken?.symbol || "UNK");
    
    const explorer = document.getElementById('viewExplorer');
    if(explorer) {
        explorer.href = `https://solscan.io/token/${mintAddress}`;
        explorer.classList.remove('pointer-events-none', 'opacity-50');
        explorer.classList.add('text-neon-cyan');
    }

    safeSetText('res-price', pair ? `$${pair.priceUsd}` : "N/A");
    safeSetText('res-mcap', pair ? `$${formatCompact(pair.fdv)}` : "---");
    safeSetText('res-liquidity', pair ? `$${formatCompact(pair.liquidity?.usd)}` : "---");
    safeSetText('res-volume', pair ? `$${formatCompact(pair.volume?.h24)}` : "---");
    safeSetText('res-age', pair ? `${Math.floor((Date.now()-pair.pairCreatedAt)/86400000)}d` : "---");

    let supply = 0;
    if (heliusData?.token_info) {
        const decimals = heliusData.token_info.decimals;
        supply = heliusData.token_info.supply / Math.pow(10, decimals);
        safeSetText('res-supply', formatCompact(supply));
        safeSetText('res-decimals', decimals);
        safeSetText('res-program', "Token2022"); // Showing as 2022 for specific request
        
        updateRiskUI({
            mint: heliusData.token_info.mint_authority !== null,
            freeze: heliusData.token_info.freeze_authority !== null,
            mutable: heliusData.mutable
        });
    }

    // Render Charts & Lists
    renderCharts(priceChange, topHolders, supply > 0 ? supply : 1000000000);
    renderHoldersList(topHolders, supply > 0 ? supply : 1000000000);
}

async function handleWalletAnalysis(address) {
    // Simulated Delay
    await new Promise(r => setTimeout(r, 800));

    // Mock Wallet Data (Replace with real fetch if available)
    safeSetText('wallet-balance', "145.20 SOL");
    safeSetText('wallet-usd', "≈ $21,054.00");
    safeSetText('wallet-tokens', "12");
    safeSetText('wallet-nfts', "4");

    const assetList = document.getElementById('wallet-asset-list');
    assetList.innerHTML = `
        <tr class="border-b border-white/5"><td class="py-2 text-white">USDC</td><td class="py-2 text-right font-mono text-neon-cyan">4,500.00</td></tr>
        <tr class="border-b border-white/5"><td class="py-2 text-white">JUP</td><td class="py-2 text-right font-mono text-neon-cyan">1,200.00</td></tr>
        <tr class="border-b border-white/5"><td class="py-2 text-white">BONK</td><td class="py-2 text-right font-mono text-neon-cyan">15M</td></tr>
    `;

    const txList = document.getElementById('wallet-tx-list');
    txList.innerHTML = `
        <tr class="border-b border-white/5"><td class="py-2 font-mono text-gray-400">5x9a...2b</td><td class="py-2 text-right text-neon-green">SUCCESS</td></tr>
        <tr class="border-b border-white/5"><td class="py-2 font-mono text-gray-400">8k2m...9p</td><td class="py-2 text-right text-neon-green">SUCCESS</td></tr>
        <tr class="border-b border-white/5"><td class="py-2 font-mono text-gray-400">1p4x...33</td><td class="py-2 text-right text-neon-red">FAIL</td></tr>
    `;
}

function updateRiskUI(data) {
    const setBar = (id, isRisk, labelId) => {
        const bar = document.getElementById(id);
        const label = document.getElementById(labelId);
        if(isRisk) {
            bar.className = "h-full w-full bg-neon-red transition-all duration-1000";
            label.textContent = "ENABLED (RISK)";
            label.className = "text-xs font-mono font-bold text-neon-red";
        } else {
            bar.className = "h-full w-full bg-neon-green transition-all duration-1000";
            label.textContent = "REVOKED";
            label.className = "text-xs font-mono font-bold text-neon-green";
        }
    };

    setBar('bar-mint', data.mint, 'val-mint');
    setBar('bar-freeze', data.freeze, 'val-freeze');
    setBar('bar-meta', data.mutable, 'val-meta');

    let score = 100;
    if(data.mint) score -= 40; if(data.freeze) score -= 40; if(data.mutable) score -= 20;
    
    const scoreEl = document.getElementById('res-score');
    safeSetText('res-score', score);
    
    const verdict = document.getElementById('res-verdict');
    if(score > 80) { 
        verdict.textContent = "SAFE"; 
        verdict.className = "inline-block px-4 py-2 border border-neon-green/30 bg-neon-green/10 text-xs font-mono tracking-widest text-neon-green rounded"; 
        scoreEl.className = "text-5xl font-bold font-mono text-neon-green";
    } else { 
        verdict.textContent = "CAUTION"; 
        verdict.className = "inline-block px-4 py-2 border border-neon-red/30 bg-neon-red/10 text-xs font-mono tracking-widest text-neon-red rounded"; 
        scoreEl.className = "text-5xl font-bold font-mono text-neon-red";
    }
}

function renderHoldersList(holders, supply) {
    const list = document.getElementById('token-holders-list');
    list.innerHTML = '';
    if(!holders || holders.length === 0) {
        list.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-gray-500">No holder data available</td></tr>`;
        return;
    }
    holders.slice(0,20).forEach((h, i) => {
        const pct = supply > 0 ? ((h.uiAmount / supply)*100).toFixed(2) : 0;
        list.innerHTML += `<tr class="border-b border-white/5 hover:bg-white/5"><td class="px-6 py-3 text-gray-500">#${i+1}</td><td class="px-6 py-3 font-mono text-gray-300" title="${h.address}">${h.address.substring(0,4)}...${h.address.substring(h.address.length-4)}</td><td class="px-6 py-3 text-right font-mono text-white">${formatCompact(h.uiAmount)}</td><td class="px-6 py-3 text-right font-bold ${pct > 5 ? 'text-neon-purple' : 'text-neon-green'}">${pct}%</td></tr>`;
    });
}

function renderCharts(change, holders, supply) {
    // Update Price Chart
    if(priceChart) {
        // Mocking chart data based on price change direction
        const isPositive = change >= 0;
        const newData = isPositive 
            ? [100, 105, 102, 110, 108, 115, 120, 118] 
            : [100, 95, 98, 90, 92, 85, 80, 82];
            
        priceChart.data.datasets[0].data = newData;
        priceChart.data.datasets[0].borderColor = isPositive ? '#00FF94' : '#FF003C';
        priceChart.update();
    }

    // Update Distribution Chart
    if (distChartInstance) {
        let labels = [], data = [];
        if (holders && holders.length > 0 && supply > 0) {
            const subset = holders.slice(0, 5);
            labels = subset.map((_, i) => `Holder ${i + 1}`);
            data = subset.map(h => ((h.uiAmount / supply) * 100).toFixed(2));
        } else { labels = ['No Data']; data = [0]; }

        distChartInstance.data.labels = labels;
        distChartInstance.data.datasets[0].data = data;
        distChartInstance.data.datasets[0].backgroundColor = '#00FF94';
        distChartInstance.update();
    }
}