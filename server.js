const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serve the frontend files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// THE SECRET PROXY ROUTE
app.post('/api/helius', async (req, res) => {
    // 1. Get the API Key from the server's environment variables (Secure)
    const API_KEY = process.env.HELIUS_API_KEY;

    if (!API_KEY) {
        return res.status(500).json({ error: 'Server configuration error: API Key missing' });
    }

    try {
        // 2. Forward the request to Helius
        const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body) // Pass the request from frontend (getAsset, etc)
        });

        const data = await response.json();
        
        // 3. Send Helius data back to frontend
        res.json(data);

    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ error: 'Failed to fetch data from Helius' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});