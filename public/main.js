/**
 * SOLANA SCANNER LOGIC - V6.4 (DEBUG & ERROR HANDLING)
 * Architecture:
 * 1. Market Data -> DexScreener
 * 2. On-Chain Data -> Backend -> Helius
 * 3. Added Console Logs for debugging API responses
 */

const BACKEND_URL = '/api/helius';

// --- 0. HELPERS ---
const safeSetText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
};
const safeSetClass = (id, className) => {
    const el = document.getElementById(id);
    if (el) el.className = className;
};
const formatCompact = (num) => new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(num);
const truncateAddress = (str) => str.length > 10 ? str.substring(0, 4) + '...' + str.substring(str.length - 4) : str;

// --- 1. VISUALS (Particles) ---
const canvas = document.getElementById('particles-canvas');
if (canvas) {
    const ctx = canvas.getContext('2d');
    let particlesArray;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    class Particle {
        constructor(x, y, directionX, directionY, size, color) {
            this.x = x; this.y = y;
            this.directionX = directionX; this.directionY = directionY;
            this.size = size; this.color = color;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
        update() {
            if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
            if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;
            this.x += this.directionX;
            this.y += this.directionY;
            this.draw();
        }
    }
    function initParticles() {
        particlesArray = [];
        let numberOfParticles = (canvas.height * canvas.width) / 15000; 
        for (let i = 0; i < numberOfParticles; i++) {
            let size = (Math.random() * 2) + 1;
            let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
            let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);
            let directionX = (Math.random() * 0.4) - 0.2;
            let directionY = (Math.random() * 0.4) - 0.2;
            let color = Math.random() > 0.5 ? '#9945FF' : '#14F195';
            particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
        }
    }
    function animateParticles() {
        requestAnimationFrame(animateParticles);
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
            for (let j = i; j < particlesArray.length; j++) {
                let distance = ((particlesArray[i].x - particlesArray[j].x) * (particlesArray[i].x - particlesArray[j].x))
                + ((particlesArray[i].y - particlesArray[j].y) * (particlesArray[i].y - particlesArray[j].y));
                if (distance < (canvas.width/7) * (canvas.height/7)) {
                    ctx.strokeStyle = `rgba(153, 69, 255, ${1 - (distance/15000)})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(particlesArray[i].x, particlesArray[i].y);
                    ctx.lineTo(particlesArray[j].x, particlesArray[j].y);
                    ctx.stroke();
                }
            }
        }
    }
    window.addEventListener('resize', () => {
        canvas.width = innerWidth;
        canvas.height = innerHeight;
        initParticles();
    });
    initParticles();
    animateParticles();
}
lucide.createIcons();

// --- 2. Tab Logic ---
let currentMode = 'token';
const searchInput = document.getElementById('searchInput');

window.switchTab = function(mode) {
    currentMode = mode;
    const btnToken = document.getElementById('tab-token');
    const btnWallet = document.getElementById('tab-wallet');
    const input = document.getElementById('searchInput');
    
    if(mode === 'token') {
        btnToken.classList.add('bg-white/10', 'text-white', 'shadow-lg');
        btnToken.classList.remove('text-gray-400');
        btnWallet.classList.remove('bg-white/10', 'text-white', 'shadow-lg');
        btnWallet.classList.add('text-gray-400');
        input.placeholder = "Enter Solana Mint Address (Base58)...";
    } else {
        btnWallet.classList.add('bg-white/10', 'text-white', 'shadow-lg');
        btnWallet.classList.remove('text-gray-400');
        btnToken.classList.remove('bg-white/10', 'text-white', 'shadow-lg');
        btnToken.classList.add('text-gray-400');
        input.placeholder = "Enter Wallet Address...";
    }
    input.value = "";
    document.getElementById('resultsArea').classList.add('hidden');
    document.getElementById('emptyState').classList.remove('hidden');
    document.getElementById('errorMessage').classList.add('hidden');
}

// --- 3. EXECUTION ---
window.runAnalysis = async function() {
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');
    const emptyState = document.getElementById('emptyState');
    const resultsArea = document.getElementById('resultsArea');
    const errorMessage = document.getElementById('errorMessage');
    const inputValue = searchInput.value.trim();

    if(btnText) btnText.classList.add('hidden');
    if(btnLoader) btnLoader.classList.remove('hidden');
    if(emptyState) emptyState.classList.add('hidden');
    if(resultsArea) resultsArea.classList.add('hidden');
    if(errorMessage) errorMessage.classList.add('hidden');

    try {
        if (inputValue.length < 32 || inputValue.length > 44) throw new Error("Invalid address length.");

        if (currentMode === 'token') {
            await handleTokenAnalysis(inputValue);
        } else {
            await handleWalletAnalysis(inputValue);
        }
        if(resultsArea) resultsArea.classList.remove('hidden');

    } catch (error) {
        console.error(error);
        if(errorMessage) {
            errorMessage.textContent = `Error: ${error.message}`;
            errorMessage.classList.remove('hidden');
        }
    } finally {
        if(btnText) btnText.classList.remove('hidden');
        if(btnLoader) btnLoader.classList.add('hidden');
    }
}

async function handleTokenAnalysis(mintAddress) {
    const tokenRes = document.getElementById('tokenResults');
    const walletRes = document.getElementById('walletResults');
    if(tokenRes) tokenRes.classList.remove('hidden');
    if(walletRes) walletRes.classList.add('hidden');

    let pair = null;
    let heliusData = null;
    let priceChange = 0;
    let topHolders = [];
    let supplyFormatted = 0;

    // A. DexScreener
    try {
        const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`);
        const dexData = await dexRes.json();
        if (dexData.pairs && dexData.pairs.length > 0) {
            pair = dexData.pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
            priceChange = pair.priceChange?.h24 || 0;
        }
    } catch(e) { console.warn("DexScreener API error", e); }

    // B. Helius Asset & Holders
    try {
        // Asset (Metadata & Authorities)
        const assetRes = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                jsonrpc: '2.0', 
                id: 'asset', 
                method: 'getAsset', 
                params: { id: mintAddress } 
            })
        });
        
        if (!assetRes.ok) throw new Error(`Backend Error: ${assetRes.status}`);
        
        const jsonAsset = await assetRes.json();
        // Check if Helius returned an error or empty result
        if (jsonAsset.error) {
            console.error("Helius getAsset Error:", jsonAsset.error);
        } else if (jsonAsset.result) {
            heliusData = jsonAsset.result;
        }

        // Holders (Top 20)
        const holdersRes = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                jsonrpc: '2.0', 
                id: 'holders', 
                method: 'getTokenLargestAccounts', 
                params: [mintAddress] 
            })
        });
        const jsonHolders = await holdersRes.json();
        if (jsonHolders.result && jsonHolders.result.value) {
            topHolders = jsonHolders.result.value;
        } else {
             console.warn("Helius getTokenLargestAccounts no result:", jsonHolders);
        }

    } catch (e) { console.warn("Helius API fetch failed", e); }

    if (!pair && !heliusData) throw new Error("Token not found on-chain. Check address or API key.");

    // C. UI Updates
    const name = heliusData?.content?.metadata?.name || pair?.baseToken?.name || "Unknown Token";
    const symbol = heliusData?.content?.metadata?.symbol || pair?.baseToken?.symbol || "UNK";
    safeSetText('tokenName', name);
    safeSetText('tokenSymbol', symbol);
    
    const explorerLink = document.getElementById('viewExplorer');
    if(explorerLink) explorerLink.href = `https://solscan.io/token/${mintAddress}`;

    if (pair) {
        safeSetText('res-price', `$${pair.priceUsd || '0'}`);
        safeSetText('res-mcap', formatCompact(pair.fdv || 0));
        safeSetText('res-liquidity', formatCompact(pair.liquidity?.usd || 0));
        safeSetText('res-volume', formatCompact(pair.volume?.h24 || 0));
        
        const ageMs = pair.pairCreatedAt ? Date.now() - pair.pairCreatedAt : 0;
        safeSetText('res-age', pair.pairCreatedAt ? `${Math.floor(ageMs/(86400000))} Days` : "Unknown");
        
        const priceEl = document.getElementById('res-price');
        if(priceEl) priceEl.className = `text-2xl font-bold font-display ${priceChange >= 0 ? 'text-green-400' : 'text-red-500'}`;
    } else {
        safeSetText('res-price', "Not Trading");
        safeSetText('res-mcap', "---");
        safeSetText('res-liquidity', "---");
        safeSetText('res-volume', "---");
        safeSetText('res-age', "On-Chain");
    }

    if (heliusData && heliusData.token_info) {
        const decimals = heliusData.token_info.decimals || 0;
        const rawSupply = heliusData.token_info.supply || 0;
        supplyFormatted = rawSupply / Math.pow(10, decimals);
        safeSetText('res-supply', formatCompact(supplyFormatted));
        
        safeSetText('res-standard', heliusData.interface || "Spl Token");
        safeSetText('res-decimals', decimals);
        safeSetText('res-program', heliusData.ownership?.owner || "Unknown");

        const mintAuth = heliusData.token_info.mint_authority;
        const freezeAuth = heliusData.token_info.freeze_authority;
        const isMutable = heliusData.mutable;

        safeSetText('res-mint-stat', mintAuth ? "Active" : "Revoked");
        safeSetClass('res-mint-stat', mintAuth ? "text-xl font-bold font-display text-red-500" : "text-xl font-bold font-display text-neon-green");
        safeSetText('res-freeze-stat', freezeAuth ? "Active" : "Revoked");
        safeSetClass('res-freeze-stat', freezeAuth ? "text-xl font-bold font-display text-red-500" : "text-xl font-bold font-display text-neon-green");
        safeSetText('res-mutable', isMutable ? "Yes" : "No");
        safeSetClass('res-mutable', isMutable ? "text-xl font-bold font-display text-yellow-400" : "text-xl font-bold font-display text-neon-green");

        updateSolanaSecurityUI({
            mutable: isMutable,
            mint: mintAuth !== null,
            freeze: freezeAuth !== null,
            available: true
        });
    } else {
        safeSetText('res-supply', "---");
        updateSolanaSecurityUI({ available: false });
    }

    // Render Charts & List
    renderCharts(pair ? priceChange : 0, topHolders, supplyFormatted);
    renderTokenHoldersList(topHolders, supplyFormatted);
}

// --- Helper: Render Top Holders List ---
function renderTokenHoldersList(holders, totalSupply) {
    const listContainer = document.getElementById('token-holders-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    if (!holders || holders.length === 0) {
        listContainer.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500 italic">No holder data available.</td></tr>';
        return;
    }

    // Helius returns largest accounts. Usually up to 20.
    holders.forEach((holder, index) => {
        const amount = holder.uiAmount || 0;
        const percentage = totalSupply > 0 ? ((amount / totalSupply) * 100).toFixed(2) : '0.00';
        const isWhale = parseFloat(percentage) > 5.0; // Mark > 5% as whale
        
        const tr = document.createElement('tr');
        tr.className = "hover:bg-white/5 transition-colors border-b border-white/5 last:border-0";
        
        tr.innerHTML = `
            <td class="px-4 py-3 text-gray-400 font-mono text-xs">${index + 1}</td>
            <td class="px-4 py-3">
                <a href="https://solscan.io/account/${holder.address}" target="_blank" class="text-white hover:text-neon-green transition-colors font-mono text-xs flex items-center gap-2">
                    ${truncateAddress(holder.address)}
                    <i data-lucide="external-link" class="w-3 h-3 opacity-50 hover:opacity-100"></i>
                </a>
            </td>
            <td class="px-4 py-3 text-right text-gray-300 font-mono text-xs">${formatCompact(amount)}</td>
            <td class="px-4 py-3 text-right font-bold text-xs ${isWhale ? 'text-neon-purple' : 'text-neon-green'}">
                ${percentage}%
                ${isWhale ? '<i data-lucide="crown" class="w-3 h-3 inline ml-1"></i>' : ''}
            </td>
        `;
        listContainer.appendChild(tr);
    });
    
    lucide.createIcons();
}

// ... (Wallet Analysis & Other functions remain unchanged, include them here) ...
// For brevity, pasting the rest of the required functions below:

async function handleWalletAnalysis(walletAddress) {
    // ... (Code from previous step) ...
    const tokenRes = document.getElementById('tokenResults');
    const walletRes = document.getElementById('walletResults');
    if(tokenRes) tokenRes.classList.add('hidden');
    if(walletRes) walletRes.classList.remove('hidden');

    try {
        const balanceRes = await fetch(BACKEND_URL, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 'bal', method: 'getBalance', params: [walletAddress] })
        });
        const jsonBalance = await balanceRes.json();
        if (jsonBalance.error) throw new Error("Wallet not found.");
        const solBalance = jsonBalance.result.value / 1000000000;
        safeSetText('wallet-balance', `${formatCompact(solBalance)} SOL`);
        safeSetText('wallet-usd', `≈ $${formatCompact(solBalance * 145)}`);

        const assetsRes = await fetch(BACKEND_URL, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0', id: 'assets', method: 'getAssetsByOwner',
                params: { ownerAddress: walletAddress, page: 1, limit: 100, displayOptions: { showFungible: true, showNativeBalance: true } }
            })
        });
        const jsonAssets = await assetsRes.json();
        
        let tokenCount = 0, nftCount = 0, holdings = [];
        if (jsonAssets.result && jsonAssets.result.items) {
            jsonAssets.result.items.forEach(item => {
                if (item.interface === "FungibleToken" || item.interface === "FungibleAsset") {
                    tokenCount++;
                    const decimals = item.token_info?.decimals || 0;
                    const balance = (item.token_info?.balance || 0) / Math.pow(10, decimals);
                    if(balance > 0) holdings.push({ name: item.content?.metadata?.name || "Unknown", type: "SPL Token", balance: balance });
                } else { nftCount++; }
            });
        }
        safeSetText('wallet-tokens', tokenCount);
        safeSetText('wallet-nfts', nftCount);

        const assetList = document.getElementById('wallet-asset-list');
        if (assetList) {
            assetList.innerHTML = '';
            if (holdings.length === 0) assetList.innerHTML = '<tr><td colspan="3" class="px-6 py-4 text-center text-gray-500 italic">No SPL tokens found.</td></tr>';
            else {
                holdings.sort((a,b) => b.balance - a.balance).slice(0, 5).forEach(h => {
                    assetList.innerHTML += `
                        <tr class="hover:bg-white/5 transition-colors">
                            <td class="px-6 py-4 text-white font-medium">${h.name}</td>
                            <td class="px-6 py-4 text-gray-400 text-xs">${h.type}</td>
                            <td class="px-6 py-4 text-right text-neon-green font-mono">${formatCompact(h.balance)}</td>
                        </tr>`;
                });
            }
        }
        // Tx history logic...
        const txRes = await fetch(BACKEND_URL, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 'txs', method: 'getSignaturesForAddress', params: [walletAddress, { limit: 10 }] })
        });
        const jsonTx = await txRes.json();
        const txList = document.getElementById('wallet-tx-list');
        if (txList) {
            txList.innerHTML = '';
            if (jsonTx.result && jsonTx.result.length > 0) {
                jsonTx.result.forEach(tx => {
                    const isError = tx.err !== null;
                    const icon = isError ? '<i data-lucide="x-circle" class="text-red-500 w-4 h-4 inline"></i>' : '<i data-lucide="check-circle-2" class="text-neon-green w-4 h-4 inline"></i>';
                    const age = "Recent"; // Simple for now
                    const sigShort = truncateAddress(tx.signature);
                    txList.innerHTML += `
                        <tr class="hover:bg-white/5 transition-colors">
                            <td class="px-6 py-4 text-white font-mono text-xs"><a href="https://solscan.io/tx/${tx.signature}" target="_blank" class="hover:text-neon-purple transition-colors">${sigShort}</a></td>
                            <td class="px-6 py-4 text-gray-400 text-xs">${age}</td>
                            <td class="px-6 py-4 text-right">${icon}</td>
                        </tr>`;
                });
                lucide.createIcons();
            } else { txList.innerHTML = '<tr><td colspan="3" class="px-6 py-4 text-center text-gray-500 italic">No transactions found.</td></tr>'; }
        }

    } catch (e) { throw e; }
}

function updateSolanaSecurityUI(data) {
    const setStatus = (id, isSafe, text) => {
        const el = document.getElementById(id);
        const iconContainer = document.getElementById(id.replace('val-', 'icon-'));
        if(el) { el.textContent = text; el.className = `text-xs ${isSafe ? 'text-neon-green' : 'text-red-400'}`; }
        if(iconContainer) {
            const iconName = isSafe ? 'check-circle' : 'alert-triangle';
            const colorClass = isSafe ? 'text-neon-green' : 'text-red-500';
            iconContainer.className = `mt-1 ${colorClass}`;
            iconContainer.innerHTML = `<i data-lucide="${iconName}" class="w-5 h-5 ${colorClass}"></i>`;
        }
    };
    if (!data.available) return;
    setStatus('val-mint', !data.mint, data.mint ? "Enabled (Risk)" : "Revoked (Safe)");
    setStatus('val-freeze', !data.freeze, data.freeze ? "Enabled (Risk)" : "Revoked (Safe)");
    setStatus('val-meta', !data.mutable, data.mutable ? "Mutable (Caution)" : "Immutable (Safe)");
    let score = 100;
    if (data.mint) score -= 40; if (data.freeze) score -= 40; if (data.mutable) score -= 20;
    safeSetText('res-score', `${score}/100`);
    const verdictEl = document.getElementById('res-verdict');
    if(verdictEl) {
        if (score > 80) { verdictEl.textContent = "SAFE"; verdictEl.className = "px-3 py-1 rounded-full bg-green-500/20 text-neon-green text-xs font-bold border border-green-500/30"; }
        else if (score > 40) { verdictEl.textContent = "CAUTION"; verdictEl.className = "px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold border border-yellow-500/30"; }
        else { verdictEl.textContent = "CRITICAL"; verdictEl.className = "px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30"; }
    }
    lucide.createIcons();
}

let priceChartInstance = null;
let distChartInstance = null;

function renderCharts(priceChange, topHolders = [], totalSupply = 0) {
    // 1. Price Chart
    const priceCanvas = document.getElementById('priceChart');
    if (priceCanvas) {
        const ctxPrice = priceCanvas.getContext('2d');
        if (priceChartInstance) priceChartInstance.destroy();
        if (priceChange !== 0) {
            const isPositive = priceChange >= 0;
            const color = isPositive ? '#14F195' : '#ff3366';
            let dataPoints = [100];
            let current = 100;
            for(let i=0; i<8; i++) {
                current += (Math.random() - (isPositive ? 0.3 : 0.7)) * 2;
                dataPoints.push(current);
            }
            let gradient = ctxPrice.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, isPositive ? 'rgba(20, 241, 149, 0.5)' : 'rgba(255, 51, 102, 0.5)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            priceChartInstance = new Chart(ctxPrice, {
                type: 'line',
                data: {
                    labels: ['1h', '2h', '3h', '4h', '5h', '6h', '7h', '8h', '9h'],
                    datasets: [{ label: 'Trend', data: dataPoints, borderColor: color, backgroundColor: gradient, fill: true, borderWidth: 2, pointRadius: 0 }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
            });
        }
    }

    // 2. Distribution Chart (Bar)
    const distCanvas = document.getElementById('distributionChart');
    if (distCanvas) {
        const ctxDist = distCanvas.getContext('2d');
        if (distChartInstance) distChartInstance.destroy();
        
        let labels = [], data = [];
        if (topHolders.length > 0 && totalSupply > 0) {
            const subset = topHolders.slice(0, 5);
            labels = subset.map((_, i) => `Holder ${i+1}`);
            data = subset.map(h => ((h.uiAmount / totalSupply) * 100).toFixed(2));
        } else { labels = ['No Data']; data = [0]; }

        distChartInstance = new Chart(ctxDist, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{ label: '% Held', data: data, backgroundColor: '#14F195', borderRadius: 4 }]
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