export default async function handler(req, res) {
    // Enable CORS so your frontend web page can communicate with this backend
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
    // Retrieves your key safely from Vercel Environment Variables
    const apiKey = process.env.GEMINI_API_KEY; 

    if (!apiKey) {
        return res.status(500).json({ error: 'Server API key missing' });
    }

    try {
        // Query model list to fetch active Gemini model
        let modelName = "gemini-1.5-flash";
        try {
            const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const listData = await listRes.json();
            if (listData.models && listData.models.length > 0) {
                const found = listData.models.find(m => 
                    m.supportedGenerationMethods && 
                    m.supportedGenerationMethods.includes("generateContent")
                );
                if (found && found.name) {
                    modelName = found.name.replace(/^models\//, "");
                }
            }
        } catch (e) {
            console.warn("Using fallback model.");
        }

        // Call Gemini API securely from server side
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        
        if (data.error) {
            return res.status(400).json({ error: data.error.message });
        }

        const text = data.candidates[0].content.parts[0].text;
        return res.status(200).json({ text });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
