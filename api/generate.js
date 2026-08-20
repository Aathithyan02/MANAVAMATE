export default async function handler(req, res) {
    // CORS headers for frontend access
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
        return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing on Vercel.' });
    }

    try {
        // 1. Auto-detect active model supported by this API key
        let targetModel = "gemini-2.5-flash"; // default target
        try {
            const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const listData = await listRes.json();
            
            if (listData.models && listData.models.length > 0) {
                // Look for an available model that supports content generation
                const validModel = listData.models.find(m => 
                    m.supportedGenerationMethods && 
                    m.supportedGenerationMethods.includes("generateContent") &&
                    (m.name.includes("flash") || m.name.includes("pro"))
                );
                
                if (validModel && validModel.name) {
                    // Extract clean model ID (e.g. "models/gemini-2.5-flash" -> "gemini-2.5-flash")
                    targetModel = validModel.name.replace(/^models\//, "");
                }
            }
        } catch (e) {
            console.warn("Auto-detection failed, using default target model.");
        }

        // 2. Call the active model
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        if (data.error) {
            return res.status(400).json({ error: `[Model: ${targetModel}] ${data.error.message}` });
        }

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            return res.status(500).json({ error: 'Empty response returned from Google API.' });
        }

        const text = data.candidates[0].content.parts[0].text;
        return res.status(200).json({ text });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
