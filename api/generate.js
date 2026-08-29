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

    const { prompt, generationConfig } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing on Vercel.' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    async function generate(config) {
        const body = { contents: [{ parts: [{ text: prompt }] }] };
        if (config) body.generationConfig = config;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        return response.json();
    }

    try {
        let data = await generate(generationConfig);

        // Older models reject newer tuning fields (e.g. thinkingConfig).
        // Rather than failing the whole request, retry once with plain defaults.
        if (data.error && generationConfig && /invalid|unknown|unsupported|not supported/i.test(data.error.message || '')) {
            data = await generate(null);
        }

        if (data.error) {
            return res.status(400).json({ error: data.error.message });
        }

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            return res.status(500).json({ error: 'Empty response received from Google API.' });
        }

        const text = data.candidates[0].content.parts[0].text;
        return res.status(200).json({ text });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
