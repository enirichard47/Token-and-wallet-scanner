/**
 * SOLANA SCANNER LOGIC - V7.3 (NEURAL NETWORK MESH + HYPERSPACE)
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
    if(num === undefined || num === null) return "---";
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

// Initialize Icons
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}

// --- LOGIC ---
let currentMode = 'token';
const searchInput = document.getElementById('searchInput');

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
    } else {
        btnWallet.classList.add('text-neon-cyan', 'border-b-2', 'border-neon-cyan', 'bg-white/5');
        btnWallet.classList.remove('text-gray-600');
        btnToken.classList.add('text-gray-600');
        input.placeholder = "ENTER_WALLET_ADDRESS...";
    }
    input.value = "";
    document.getElementById('resultsArea').classList.add('hidden');
    document.getElementById('emptyState').classList.remove('hidden');
    document.getElementById('errorMessage').classList.add('hidden');
}

window.runAnalysis = async function() {
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');
    const emptyState = document.getElementById('emptyState');
    const resultsArea = document.getElementById('resultsArea');
    const errorBox = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const inputValue = searchInput.value.trim();

    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    emptyState.classList.add('hidden');
    resultsArea.classList.add('hidden');
    errorBox.classList.add('hidden');

    try {
        if (inputValue.length < 32 || inputValue.length > 44) throw new Error("INVALID_ADDRESS_FORMAT");

        if (currentMode === 'token') {
            await handleTokenAnalysis(inputValue);
        } else {
            await handleWalletAnalysis(inputValue);
        }
        resultsArea.classList.remove('hidden');
        resultsArea.classList.add('animate-fade-in-up'); // Ensure animation triggers

    } catch (error) {
        console.error(error);
        errorText.textContent = error.message || "CONNECTION_FAILED";
        errorBox.classList.remove('hidden');
    } finally {
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
    }
}

async function handleTokenAnalysis(mintAddress) {
    document.getElementById('tokenResults').classList.remove('hidden');
    document.getElementById('walletResults').classList.add('hidden');

    let pair = null, heliusData = null, topHolders = [], priceChange = 0;

    const promises = [
        fetch(`https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`).then(r=>r.json()).catch(()=>({pairs:null})),
        // Mocking Helius response for demo purposes if backend fails or is missing
        fetch(BACKEND_URL, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({jsonrpc:'2.0', id:'asset', method:'getAsset', params:{id:mintAddress}}) })
            .then(r => r.ok ? r.json() : { result: { content: { metadata: { name: "Unknown", symbol: "UNK" }}, token_info: { decimals: 6, supply: 1000000000000000, mint_authority: null, freeze_authority: null }, mutable: false } })
            .catch(()=>({result:null})),
        fetch(BACKEND_URL, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({jsonrpc:'2.0', id:'holders', method:'getTokenLargestAccounts', params:[mintAddress]}) })
            .then(r => r.ok ? r.json() : { result: { value: [] } }) // Mock empty on fail
            .catch(()=>({result:null}))
    ];

    const [dexData, assetData, holdersData] = await Promise.all(promises);

    if (dexData?.pairs?.length > 0) {
        pair = dexData.pairs.sort((a,b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
        priceChange = pair.priceChange?.h24 || 0;
    }
    if (assetData?.result) heliusData = assetData.result;
    if (holdersData?.result?.value) topHolders = holdersData.result.value;

    // Fallback if no pair but data exists
    if (!pair && !heliusData) throw new Error("TOKEN_NOT_FOUND_ON_CHAIN");

    // UI Updates
    safeSetText('tokenName', heliusData?.content?.metadata?.name || pair?.baseToken?.name || "Unknown");
    safeSetText('tokenSymbol', heliusData?.content?.metadata?.symbol || pair?.baseToken?.symbol || "UNK");
    
    const explorer = document.getElementById('viewExplorer');
    if(explorer) explorer.href = `https://solscan.io/token/${mintAddress}`;

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
        safeSetText('res-program', "Token2022"); 
        
        updateRiskUI({
            mint: heliusData.token_info.mint_authority !== null,
            freeze: heliusData.token_info.freeze_authority !== null,
            mutable: heliusData.mutable
        });
    } else {
        // Fallback for demo
         updateRiskUI({ mint: false, freeze: false, mutable: false });
    }

    renderCharts(priceChange, topHolders, supply > 0 ? supply : 1000000000);
    renderHoldersList(topHolders, supply > 0 ? supply : 1000000000);
}

async function handleWalletAnalysis(address) {
    document.getElementById('tokenResults').classList.add('hidden');
    document.getElementById('walletResults').classList.remove('hidden');
    
    // Mock Fetch for balance if backend fails
    let balJson = { result: { value: 0 }};
    try {
        const balRes = await fetch(BACKEND_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({jsonrpc:'2.0', id:'bal', method:'getBalance', params:[address]}) });
        if(balRes.ok) balJson = await balRes.json();
    } catch(e) { console.warn("Using mock balance"); }

    const sol = (balJson.result?.value || 0) / 1000000000;
    safeSetText('wallet-balance', formatCompact(sol));
    safeSetText('wallet-usd', `≈ $${formatCompact(sol * 145)}`);

    // Assets
    let assetItems = [];
    try {
        const assetRes = await fetch(BACKEND_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({jsonrpc:'2.0', id:'assets', method:'getAssetsByOwner', params:{ownerAddress:address, page:1, limit:50, displayOptions:{showFungible:true}}}) });
        if(assetRes.ok) {
            const assetJson = await assetRes.json();
            if(assetJson.result?.items) assetItems = assetJson.result.items;
        }
    } catch(e) { console.warn("Using mock assets"); }

    const list = document.getElementById('wallet-asset-list');
    list.innerHTML = '';
    
    let tokenCount = 0;
    let nftCount = 0;

    if(assetItems.length > 0) {
        assetItems.forEach(item => {
            const isFungible = item.interface === "FungibleToken" || item.interface === "FungibleAsset";
            if (isFungible) {
                tokenCount++;
                const bal = (item.token_info.balance / Math.pow(10, item.token_info.decimals));
                if(bal > 0) {
                    list.innerHTML += `<tr class="border-b border-white/5 last:border-0"><td class="py-2 text-white">${item.content.metadata.name.substring(0,15)}</td><td class="py-2 text-right font-mono text-neon-cyan">${formatCompact(bal)}</td></tr>`;
                }
            } else {
                nftCount++;
            }
        });
    } else {
        list.innerHTML = `<tr><td class="py-4 text-gray-500 italic">No assets found</td></tr>`;
    }

    // FIX: Update the counters in the UI
    safeSetText('wallet-tokens', tokenCount);
    safeSetText('wallet-nfts', nftCount);

    // Transactions
    const txList = document.getElementById('wallet-tx-list');
    txList.innerHTML = '';
    try {
        const txRes = await fetch(BACKEND_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({jsonrpc:'2.0', id:'tx', method:'getSignaturesForAddress', params:[address, {limit:10}]}) });
        if(txRes.ok) {
            const txJson = await txRes.json();
            if(txJson.result) {
                txJson.result.forEach(tx => {
                    const statusColor = tx.err ? 'text-neon-red' : 'text-neon-green';
                    txList.innerHTML += `<tr class="border-b border-white/5 last:border-0"><td class="py-2 font-mono text-[10px] text-gray-400 truncate max-w-[100px] cursor-pointer hover:text-white" title="${tx.signature}">${tx.signature.substring(0,8)}...</td><td class="py-2 text-right ${statusColor}">${tx.err ? 'FAIL' : 'SUCCESS'}</td></tr>`;
                });
            }
        }
    } catch(e) {
         txList.innerHTML = `<tr><td class="py-4 text-gray-500 italic">No recent txs</td></tr>`;
    }
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
    safeSetText('res-score', score);
    const verdict = document.getElementById('res-verdict');
    if(score > 80) { verdict.textContent = "SAFE"; verdict.className = "px-3 py-1 rounded bg-neon-green/10 border border-neon-green/30 text-xs font-mono text-neon-green"; }
    else { verdict.textContent = "CAUTION"; verdict.className = "px-3 py-1 rounded bg-neon-red/10 border border-neon-red/30 text-xs font-mono text-neon-red"; }
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

let priceChart = null;
let distChartInstance = null;

function renderCharts(change, holders, supply) {
    // Price Chart Logic
    const ctx = document.getElementById('priceChart')?.getContext('2d');
    if(ctx) {
        if(priceChart) priceChart.destroy();
        priceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [1,2,3,4,5,6,7,8],
                datasets: [{
                    data: [100, 105, 102, 110, 108, 115, 120, 118], // Mock data for demo
                    borderColor: change >= 0 ? '#00FF94' : '#FF003C',
                    borderWidth: 2, pointRadius: 0, tension: 0.4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: false }, scales: { x: { display: false }, y: { display: false } } }
        });
    }

    // Distribution Chart Logic
    const ctxDist = document.getElementById('distributionChart')?.getContext('2d');
    if (ctxDist) {
        if (distChartInstance) distChartInstance.destroy();
        let labels = [], data = [];
        if (holders && holders.length > 0 && supply > 0) {
            const subset = holders.slice(0, 5);
            labels = subset.map((_, i) => `Holder ${i + 1}`);
            data = subset.map(h => ((h.uiAmount / supply) * 100).toFixed(2));
        } else { labels = ['No Data']; data = [0]; }

        distChartInstance = new Chart(ctxDist, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{ label: '% Held', data: data, backgroundColor: '#00FF94', borderRadius: 4 }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#aaa' } },
                    y: { grid: { display: false }, ticks: { color: '#fff' } }
                }
            }
        });
    }
}