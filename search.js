const axios = require('axios');

async function webSearch(query) {
    const apiKey = process.env.GOOGLE_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    const endpoint = "https://www.googleapis.com/customsearch/v1";

    try {
        const response = await axios.get(endpoint, {
            params: {
                key: apiKey,
                cx: searchEngineId,
                q: query,
                num: 5
            }
        });

        return response.data.items.map(result => ({
            title: result.title,
            link: result.link,
            snippet: result.snippet
        }));
    } catch (error) {
        console.error('Error making web search request:', error);
        throw new Error('Failed to perform web search.');
    }
}

module.exports = { webSearch };
