export default async function handler(req, res) {
    // Enable CORS headers for frontend access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Only POST requests allowed' });
    }

    const { prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on Vercel.' });
    }

    try {
        // List of candidate models to attempt in order
        const candidateModels = [
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-1.5-flash"
        ];

        let selectedModel = candidateModels[0];

        // 1. Try listing models to pick an active model for this API key
        try {
            const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const listData = await listRes.json();

            if (listData.models && listData.models.length > 0) {
                const found = listData.models.find(m => 
                    m.supportedGenerationMethods && 
                    m.supportedGenerationMethods.includes("generateContent")
                );
                if (found && found.name) {
                    selectedModel = found.name.replace(/^models\//, "");
                }
            }
        } catch (e) {
            console.warn("Auto-detection failed, using default candidate model.");
        }

        // 2. Query Gemini REST API
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        if (data.error) {
            return res.status(400).json({ error: `[Model: ${selectedModel}] ${data.error.message}` });
        }

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            return res.status(500).json({ error: 'No content returned from Gemini model.' });
        }

        const text = data.candidates[0].content.parts[0].text;
        return res.status(200).json({ text });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
