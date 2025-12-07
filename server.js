const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// --- PROXY ENDPOINT ---
app.post('/api/helius', async (req, res) => {
    const API_KEY = process.env.HELIUS_API_KEY;

    if (!API_KEY) {
        return res.status(500).json({ error: 'Server Config Error: Missing API Key' });
    }

    try {
        const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ error: 'Failed to connect to Solana RPC' });
    }
});

// Fallback to index.html for SPA feeling
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`>> SOLSCANNER NODE SYSTEM ONLINE: PORT ${PORT}`);
});