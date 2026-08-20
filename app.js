async function runAgents() {
    const apiKey = document.getElementById("apiKeyInput").value.trim();
    const topic = document.getElementById("topicInput").value.trim();

    if (!apiKey || !topic) {
        alert("Please provide both your Gemini API Key and an ECE topic!");
        return;
    }

    document.getElementById("loading").classList.remove("hidden");
    document.getElementById("outputArea").classList.add("hidden");

    try {
        // Agent 1: Tanglish Concept Tutor
        const tanglishPrompt = `You are MANAVAMATE, an AI study partner for ECE engineering students in Tamil Nadu. 
        Explain the topic "${topic}" in clear, easy, simple Tanglish (Tamil written in English script). 
        Use funny, relatable everyday analogies (like water pipes, traffic signals, or cricket). 
        Format output nicely using basic HTML paragraph <p> and bold <strong> tags.`;
        
        const tanglishResult = await callGemini(apiKey, tanglishPrompt);

        // Agent 2: Math Specialist
        const mathPrompt = `You are MANAVAMATE's mathematical engine. Provide the core derivations, formulas, 
        and variable definitions for "${topic}". Explain every step logically using clear formula breakdowns.`;
        
        const mathResult = await callGemini(apiKey, mathPrompt);

        // Render Outputs
        document.getElementById("tanglishOutput").innerHTML = tanglishResult;
        document.getElementById("mathOutput").innerHTML = mathResult.replace(/\n/g, "<br>");
        
        // Render YouTube Search Link
        const encodedTopic = encodeURIComponent(topic + " ece tamil reels shorts explanation");
        document.getElementById("reelsOutput").innerHTML = `
            <a href="https://www.youtube.com/results?search_query=${encodedTopic}" 
               target="_blank" 
               class="flex items-center justify-between p-4 bg-slate-900 hover:bg-slate-950 border border-pink-500/20 hover:border-pink-500/50 rounded-xl text-pink-400 font-semibold transition">
               <span><i class="fa-brands fa-youtube mr-2 text-xl"></i> Find "${topic}" Tamil Reels & Shorts on YouTube</span>
               <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
        `;

        document.getElementById("loading").classList.add("hidden");
        document.getElementById("outputArea").classList.remove("hidden");

    } catch (error) {
        alert("API Error: " + error.message);
        document.getElementById("loading").classList.add("hidden");
    }
}

async function callGemini(apiKey, prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates[0].content.parts[0].text;
}