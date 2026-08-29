// Replace with your Vercel URL
const BACKEND_URL = "https://manavamate.vercel.app/api/generate"; 

// Guarded lookup: a missing element must never throw and strand the UI
function $(id) {
    return document.getElementById(id) || null;
}

let isRunning = false;

function setBusy(busy) {
    isRunning = busy;
    const btn = $("generateBtn");
    if (!btn) return;
    btn.disabled = busy;
    btn.classList.toggle("opacity-50", busy);
    btn.classList.toggle("cursor-not-allowed", busy);
    btn.innerHTML = busy ? '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Thinking...' : "🚀 Ask MANAVAMATE";
}

async function runAgents() {
    if (isRunning) return;

    const input = $("topicInput");
    const topic = input ? input.value.trim() : "";

    if (!topic) {
        alert("Please enter an ECE topic!");
        return;
    }

    // Everything below is inside try/finally, so the Ask button is ALWAYS
    // re-enabled - even if rendering throws. No page refresh needed to retry.
    setBusy(true);

    try {
        resetOutput();
        setLoadingMessage("MANAVAMATE agents are writing your Tanglish notes & exam answers...");
        show("loading", true);

        // The YouTube link needs no API call, so show it instantly
        renderReels(topic);
        show("outputArea", true);

        let offTopic = false;
        const stopIfOffTopic = (text) => {
            if (!isOffTopic(text)) return false;
            offTopic = true;
            showOffTopic(topic);
            return true;
        };

        // Both agents run in parallel AND render the moment they land,
        // so the Tanglish card appears without waiting for the long exam answer.
        const tanglishJob = callBackend(buildTanglishPrompt(topic), { maxOutputTokens: 1200 })
            .then((result) => {
                if (offTopic || stopIfOffTopic(result)) return;
                setHTML("tanglishOutput", cleanMath(result));
            });

        const examJob = callBackend(buildExamPrompt(topic), { maxOutputTokens: 3500 })
            .then((result) => {
                if (offTopic || stopIfOffTopic(result)) return;
                renderExamAnswers(result);
            });

        await Promise.all([tanglishJob, examJob]);

    } catch (error) {
        alert("MANAVAMATE Error: " + friendlyError(error.message));
        show("outputArea", false);
    } finally {
        show("loading", false);
        setBusy(false);
    }
}

function show(id, visible) {
    const el = $(id);
    if (el) el.classList.toggle("hidden", !visible);
}

function setHTML(id, html) {
    const el = $(id);
    if (el) el.innerHTML = html;
}

// Off-topic card: clear it and put the cursor back in the box
function tryAnotherTopic() {
    show("offTopic", false);
    const input = $("topicInput");
    if (input) {
        input.value = "";
        input.focus();
    }
}

// Enter key searches too, and typing a new topic clears the off-topic warning
function wireUpInput() {
    const input = $("topicInput");
    if (!input) return;

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !isRunning) runAgents();
    });

    input.addEventListener("input", () => show("offTopic", false));
}

if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("DOMContentLoaded", wireUpInput);
}

function buildTanglishPrompt(topic) {
    return `You are MANAVAMATE, an AI study partner for ECE engineering students in Tamil Nadu.

    ${ECE_GATE(topic)}

    Explain the topic "${topic}" in clear, easy, simple Tanglish (Tamil written in English script).
    Use funny, relatable everyday analogies (like water pipes, traffic signals, or cricket).
    Keep it tight - about 150 to 200 words, no filler.
    Format output nicely using basic HTML paragraph <p> and bold <strong> tags.
    Never use LaTeX or dollar signs for formulas. If you mention a formula, write it plainly like V = I &times; R
    inside a <p class="formula"> tag and explain each symbol in Tanglish.`;
}

// Every agent gets the same relevance check, so one off-topic reply stops the whole page
function ECE_GATE(topic) {
    return `FIRST, decide whether "${topic}" is a genuine Electronics and Communication Engineering study topic
    (electronic devices, circuits, semiconductors, digital logic, signals and systems, communication systems,
    microprocessors, microcontrollers, embedded systems, VLSI, antennas, electromagnetic fields, control systems,
    computer networks, or the engineering maths and physics directly used in ECE).
    If it is NOT such a topic - for example cooking, movies, cricket, politics, relationships, jokes,
    general knowledge, or any non-engineering question - then reply with EXACTLY this one line and nothing else:
    ${OFF_TOPIC_FLAG}
    Do not explain, do not apologise, do not add any other text in that case.`;
}

function renderReels(topic) {
    const encodedTopic = encodeURIComponent(topic + " ece tamil reels shorts explanation");
    setHTML("reelsOutput", `
        <a href="https://www.youtube.com/results?search_query=${encodedTopic}" 
           target="_blank" 
           class="flex items-center justify-between p-4 bg-slate-900 hover:bg-slate-950 border border-pink-500/20 hover:border-pink-500/50 rounded-xl text-pink-400 font-semibold transition">
           <span><i class="fa-brands fa-youtube mr-2 text-xl"></i> Find "${topic}" Tamil Reels & Shorts on YouTube</span>
           <i class="fa-solid fa-arrow-up-right-from-square"></i>
        </a>
    `);
}

const OFF_TOPIC_FLAG = "NOT_ECE";

function isOffTopic(text) {
    return new RegExp(`^\\s*<?[a-z]*>?\\s*${OFF_TOPIC_FLAG}`, "i").test(text || "");
}

function showOffTopic(topic) {
    show("outputArea", false);
    show("loading", false);
    const label = $("offTopicTopic");
    if (label) label.textContent = topic;
    show("offTopic", true);
}

const SKELETON = `<div class="animate-pulse space-y-2">
        <div class="h-3 bg-slate-700 rounded w-11/12"></div>
        <div class="h-3 bg-slate-700 rounded w-9/12"></div>
        <div class="h-3 bg-slate-700 rounded w-10/12"></div>
    </div>`;

function resetOutput() {
    show("offTopic", false);
    ["tanglishOutput", "twoMarkOutput", "fiveMarkOutput", "thirteenMarkOutput"].forEach((id) => {
        setHTML(id, SKELETON);
    });
    setCardVisible("fiveMarkCard", true);
    setCardVisible("thirteenMarkCard", true);
}

// One prompt that produces the 2 / 5 / 13 mark answers, separated by markers
function buildExamPrompt(topic) {
    return `You are MANAVAMATE's exam answer coach for ECE engineering students in Tamil Nadu (Anna University pattern).
    The student asked about "${topic}".

    ${ECE_GATE(topic)}

    Otherwise, show them exactly how to write this in the exam for three different mark weightages.

    Output EXACTLY three sections, separated by these markers on their own line, in this order and nothing else:

    ===2MARK===
    The exact answer for a 2 mark question: 3-4 crisp lines only, a textbook-style definition plus one key point.
    End with a short "<strong>Tip:</strong> ..." line in Tanglish saying what the examiner is looking for.

    ===5MARK===
    The answer structure for a 5 mark question: <strong>Definition</strong> (2 lines),
    <strong>Working / Explanation</strong> (4-5 points as a <ul><li> list),
    <strong>Diagram</strong> (one line saying which diagram to draw and label),
    <strong>Applications</strong> (2-3 points). Mention roughly how much to write (about 1 page).

    ===13MARK===
    The full answer plan for a 13 mark question, the way a university topper would present it.
    Numbered sections: 1. Introduction & Definition, 2. Neat Labelled Diagram (say exactly what to draw and label),
    3. Construction / Block description, 4. Working Principle step by step, 5. Characteristics or Types,
    6. Advantages & Disadvantages, 7. Applications, 8. Conclusion.
    Under each section write the actual content the student can reproduce, not just instructions.
    Also give the mark split per section (like "Diagram - 3 marks") and how many pages to write.

    Rules:
    - Write the technical answer content in simple English (that is what goes in the answer sheet),
      but give the guidance, tips and side notes in friendly Tanglish (Tamil in English script).
    - This is a "how to write it in the exam" answer. No long mathematical derivations - if a formula is truly needed,
      just state the final formula in one line and define the terms. Do not derive it.
    - NEVER use LaTeX or markdown maths. No dollar signs, no \\frac, no \\times, no ^ or _ markup, no backslash commands.
      Write every formula exactly the way a student writes it on paper, for example:
      <p class="formula">V = I &times; R</p> and below it <p>where V = voltage in volts, I = current in amperes, R = resistance in ohms.</p>
      For a division write it as V / R. For subscripts just write Vout, Ic, Vce.
    - Wrap each important formula in <p class="formula">...</p> and always define what every symbol means right after it.
    - Output clean HTML only using <p>, <strong>, <ul>, <li>, <ol> tags. No markdown, no code fences, no <html> or <body> tags.
    - Do not repeat the mark headings, they are already shown on the page.
    - Be compact. Write short punchy points, not long paragraphs. Every line must be worth marks.`;
}

// Models sometimes ignore instructions and emit LaTeX ($V = IR$, \frac{V}{R}).
// That renders as unreadable junk in a browser, so convert it to plain exam-style maths.
const GREEK_AND_SYMBOLS = {
    alpha: "α", beta: "β", gamma: "γ", delta: "δ", Delta: "Δ",
    epsilon: "ε", varepsilon: "ε", zeta: "ζ", eta: "η", theta: "θ",
    lambda: "λ", mu: "μ", nu: "ν", pi: "π", rho: "ρ",
    sigma: "σ", Sigma: "Σ", tau: "τ", phi: "φ", Phi: "Φ",
    omega: "ω", Omega: "Ω",
    times: "×", cdot: "·", div: "÷", pm: "±", mp: "∓",
    leq: "≤", le: "≤", geq: "≥", ge: "≥", neq: "≠", ne: "≠",
    approx: "≈", propto: "∝", infty: "∞", partial: "∂",
    rightarrow: "→", to: "→", leftarrow: "←", Rightarrow: "⇒",
    int: "∫", sum: "Σ", sqrt: "√", angle: "∠", degree: "°"
};

function cleanMath(html) {
    let out = html || "";

    // Strip code fences and math delimiters, keeping the contents
    out = out.replace(/```[a-z]*\n?/gi, "");
    out = out.replace(/\$\$([\s\S]*?)\$\$/g, "$1");
    out = out.replace(/\$([^$\n]+)\$/g, "$1");
    out = out.replace(/\\\[|\\\]|\\\(|\\\)/g, "");

    // Unwrap braced commands innermost-first so nested ones like
    // \frac{1}{2\pi\sqrt{LC}} resolve fully rather than half-way.
    for (let i = 0; i < 5; i++) {
        const before = out;
        out = out.replace(/\\(?:text|mathrm|mathbf|textbf|mathit|operatorname)\s*\{([^{}]*)\}/g, "$1");
        out = out.replace(/\\sqrt\s*\{([^{}]*)\}/g, "√($1)");
        out = out.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1) / ($2)");
        if (out === before) break;
    }
    out = out.replace(/\\\\/g, " ");
    out = out.replace(/\\left|\\right|\\!|\\,|\\;|\\:|\\quad|\\qquad/g, "");

    // Named symbols
    out = out.replace(/\\([a-zA-Z]+)/g, (match, name) =>
        Object.prototype.hasOwnProperty.call(GREEK_AND_SYMBOLS, name) ? GREEK_AND_SYMBOLS[name] : name);

    // Escaped punctuation: \% \& \# etc.
    out = out.replace(/\\([%&#_${}])/g, "$1");

    // Superscripts and subscripts -> real HTML
    out = out.replace(/\^\s*\{([^{}]*)\}/g, "<sup>$1</sup>");
    out = out.replace(/\^\s*(-?\w)/g, "<sup>$1</sup>");
    out = out.replace(/_\s*\{([^{}]*)\}/g, "<sub>$1</sub>");
    out = out.replace(/_\s*(\w)/g, "<sub>$1</sub>");

    // Leftover braces from stripped commands
    out = out.replace(/\{([^{}]{0,40})\}/g, "$1");

    return out;
}

function renderExamAnswers(raw) {
    const text = cleanMath(raw).trim();
    const parts = text.split(/={2,}\s*(?:2|5|13)\s*MARKS?\s*={2,}/i);

    // parts[0] is anything before the first marker (usually empty)
    if (parts.length >= 4) {
        setHTML("twoMarkOutput", parts[1].trim());
        setHTML("fiveMarkOutput", parts[2].trim());
        setHTML("thirteenMarkOutput", parts[3].trim());
        setCardVisible("fiveMarkCard", true);
        setCardVisible("thirteenMarkCard", true);
    } else {
        // Markers missing - show the whole answer in one card rather than losing it
        setHTML("twoMarkOutput", text);
        setCardVisible("fiveMarkCard", false);
        setCardVisible("thirteenMarkCard", false);
    }
}

function setCardVisible(id, visible) {
    show(id, visible);
}

function setLoadingMessage(msg) {
    const el = $("loadingText");
    if (el) el.textContent = msg;
}

function isRateLimit(msg) {
    return /quota|rate limit|resource_exhausted|too many requests/i.test(msg || "");
}

// Gemini tells us how long to wait: "Please retry in 26.03s"
function retryDelaySeconds(msg) {
    const match = /retry in ([\d.]+)\s*s/i.exec(msg || "");
    const seconds = match ? Math.ceil(parseFloat(match[1])) : 20;
    return Math.min(Math.max(seconds, 5), 60);
}

function friendlyError(msg) {
    if (isRateLimit(msg)) {
        return "Gemini free tier limit reached (5 requests per minute). Wait a minute and ask again, machan.";
    }
    return msg;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function callBackend(prompt, options = {}, attempt = 0) {
    // thinkingBudget 0 skips the model's internal reasoning pass - the single
    // biggest latency saver here. The backend drops it if the model rejects it.
    const generationConfig = {
        temperature: 0.6,
        maxOutputTokens: options.maxOutputTokens || 2048,
        thinkingConfig: { thinkingBudget: 0 }
    };

    const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, generationConfig })
    });

    const data = await response.json();

    if (data.error) {
        if (isRateLimit(data.error) && attempt < 2) {
            const wait = retryDelaySeconds(data.error);
            setLoadingMessage(`Free tier quota hit - waiting ${wait}s and retrying automatically...`);
            await sleep(wait * 1000);
            setLoadingMessage("Retrying... MANAVAMATE is writing your exam answers...");
            return callBackend(prompt, options, attempt + 1);
        }
        throw new Error(data.error);
    }

    return data.text;
}
