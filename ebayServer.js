// ebayServer.js
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use(express.json());

const {
    EBAY_CLIENT_ID,
    EBAY_CLIENT_SECRET,
    EBAY_ENV,
    PORT = 3000,
} = process.env;


const EBAY_OAUTH_URL = EBAY_ENV === 'SANDBOX'
    ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
    : 'https://api.ebay.com/identity/v1/oauth2/token';

const EBAY_BROWSING_BASE =
    EBAY_ENV === 'SANDBOX'
        ? 'https://api.sandbox.ebay.com/buy/browse/v1'
        : 'https://api.ebay.com/buy/browse/v1';

let ebayAccessToken = null;
let ebayTokenExpiry = null;

async function getEbayAccessToken() {
    const now = Date.now();
    if (ebayAccessToken && now < ebayTokenExpiry - 30_000){
        return ebayAccessToken;
    }

    const basicAuth = Buffer.from(
        `${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`
    ).toString('base64');

    const body = new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'https://api.ebay.com/oauth/api_scope',
    });

    const response = await fetch(EBAY_OAUTH_URL, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to get eBay access token:', errorText);
        throw new Error('Failed to get eBay access token');
    }

    const data = await response.json();
    ebayAccessToken = data.access_token;
    ebayTokenExpiry = now + data.expires_in * 1000;
    
    return ebayAccessToken;
}

async function searchEbayItemsByCompatibility({year, make, model}) {
    const accessToken = await getEbayAccessToken();

    const params = new URLSearchParams({
        q: 'tire',
        limit: '50',
    });

    const filters = [];
    if (year) filters.push(`Year:${year}`);
    if (make) filters.push(`Make:${make}`);
    if (model) filters.push(`Model:${model}`);
    if (filters.length > 0){
        params.append('compatibility_filter', filters.join(';'));
    }

    const ebayUrl = `${EBAY_BROWSING_BASE}/item_summary/search?${params.toString()}`;

    const response = await fetch(ebayUrl, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok){
        const errorText = await response.text();
        console.error('Failed to search eBay items:', errorText);
        throw new Error('Failed to search eBay items');
    }

    const ebayData = await response.json();
    return ebayData.itemSummaries || [];
}

app.get('/api/vehicle-makes', async (req, res) => {
    const { year } = req.query;
    
    if (!year){
        return res.status(400).json({ error: 'Year parameter is required' });
    }

    try{
        const items = await searchEbayItemsByCompatibility({ year });

        const makesSet = new Set();

        items.forEach((item) => {
            const props = item.compatibilityProperties || [];
            props.forEach((prop) => {
                if(prop.name === "Make"){
                    makesSet.add(prop.value);
                }
            });
        });

        res.json({ makes: Array.from(makesSet).sort() });
    } catch (error) {
        console.error('Error in /api/vehicle-search:', error);
        res.status(500).json({ error: 'Failed to retrieve makes from eBay' });
    }
});

app.get('/api/vehicle-models', async (req, res) => {
    const { year, make } = req.query;
    if (!year || !make){
        return res.status(400).json({ error: 'Year and Make parameters are required' });
    }

    try {
        const items = await searchEbayItemsByCompatibility({ year, make });

        const modelsSet = new Set();
        items.forEach((item) => {
            const props = item.compatibilityProperties || [];
            props.forEach((prop) => {
                if (prop.name === "Model"){
                    modelsSet.add(prop.value);
                }
            });
        });
        res.json({ models: Array.from(modelsSet).sort() });
    }catch(error){
        console.error('Error in /api/vehicle-models:', error);
        res.status(500).json({ error: 'Failed to retrieve models from eBay' });
    }
});

app.post('/api/search-tires', async (req, res) => {
    const { year, make, model} = req.body;
    if (!year || !make || !model){
        return res.status(400).json({ error: 'Year, Make, and Model are required' });
    }

    try {
        const ebayItems = await searchEbayItemsByCompatibility({ year, make, model });

        const ebayResults = ebayItems.map((item) => ({
            id: item.itemId,
            title: item.title,
            price: item.price?.value,
            currentCurrency: item.price?.currency,
            image: item.image?.imageUrl,
            url: item.itemWebUrl,
            condition: item.condition,
            shippingOptions: item.shippingOptions,
        }));
        res.json({ results: ebayResults });
    } catch (error) {
        console.error('Error in /api/search-tires:', error);
        res.status(500).json({ error: 'Failed to search tires on eBay' });
    }
});

app.listen(PORT, () => {
    console.log(`eBay server running on port http://localhost:${PORT}`);
});

