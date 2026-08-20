// Replace with your Vercel URL
const BACKEND_URL = "https://YOUR_VERCEL_APP_NAME.vercel.app/api/generate"; 

async function runAgents() {
    const topic = document.getElementById("topicInput").value.trim();

    if (!topic) {
        alert("Please enter an ECE topic!");
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
        
        const tanglishResult = await callBackend(tanglishPrompt);

        // Agent 2: Math Specialist
        const mathPrompt = `You are MANAVAMATE's mathematical engine. Provide the core derivations, formulas, 
        and variable definitions for "${topic}". Explain every step logically using clear formula breakdowns.`;
        
        const mathResult = await callBackend(mathPrompt);

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
        alert("MANAVAMATE Error: " + error.message);
        document.getElementById("loading").classList.add("hidden");
    }
}

async function callBackend(prompt) {
    const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.text;
}
