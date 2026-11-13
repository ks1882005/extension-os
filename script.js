// =====================================
// ELEMENTS
// =====================================
const API_BASE_URL = "https://extension-os.onrender.com";
const promptInput = document.getElementById("promptInput");
const charCount = document.getElementById("charCount");
const compareBtn = document.getElementById("compareBtn");

const gptResponse = document.getElementById("gptResponse");
const claudeResponse = document.getElementById("claudeResponse");
const geminiResponse = document.getElementById("geminiResponse");

const gptStatus = document.getElementById("gptStatus");
const claudeStatus = document.getElementById("claudeStatus");
const geminiStatus = document.getElementById("geminiStatus");
const recommendationPlaceholder =
    document.getElementById("recommendationPlaceholder");

const recommendationResult =
    document.getElementById("recommendationResult");

const recommendedModel =
    document.getElementById("recommendedModel");

const recommendedScore =
    document.getElementById("recommendedScore");

const recommendationReason =
    document.getElementById("recommendationReason");
const copyButtons = document.querySelectorAll(".copy-btn");


// =====================================
// CHARACTER COUNTER
// =====================================

function updateCharacterCount() {
    const length = promptInput.value.length;

    charCount.textContent = `${length} / 1000`;

    compareBtn.disabled = promptInput.value.trim() === "";
}

promptInput.addEventListener("input", updateCharacterCount);


// =====================================
// ESCAPE HTML
// =====================================

function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}


// =====================================
// FORMAT AI RESPONSE
// =====================================

function formatAIResponse(text) {
    let safeText = escapeHTML(text);

    // Bold
    safeText = safeText.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
    );

    // Inline code
    safeText = safeText.replace(
        /`([^`]+)`/g,
        '<code class="inline-code">$1</code>'
    );

    // Headings
    safeText = safeText.replace(
        /^### (.*)$/gm,
        "<h4>$1</h4>"
    );

    safeText = safeText.replace(
        /^## (.*)$/gm,
        "<h3>$1</h3>"
    );

    safeText = safeText.replace(
        /^# (.*)$/gm,
        "<h2>$1</h2>"
    );

    // Line breaks
    safeText = safeText.replace(
        /\n\n/g,
        "</p><p>"
    );

    safeText = safeText.replace(
        /\n/g,
        "<br>"
    );

    return safeText;
}


// =====================================
// LOADING STATE
// =====================================

function showLoading(responseElement, statusElement) {
    responseElement.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">✦</div>
            <p>Thinking...</p>
        </div>
    `;

    statusElement.textContent = "Thinking";
}


// =====================================
// SHOW RESPONSE
// =====================================

function showResponse(
    responseElement,
    statusElement,
    text
) {
    responseElement.innerHTML = `
        <p>${formatAIResponse(text)}</p>
    `;

    statusElement.textContent = "Complete";
}


// =====================================
// SHOW ERROR
// =====================================

function showError(
    responseElement,
    statusElement,
    message
) {
    responseElement.innerHTML = `
        <p class="error-message">
            ${escapeHTML(message)}
        </p>
    `;

    statusElement.textContent = "Unavailable";
}


// =====================================
// API REQUEST
// =====================================

async function requestAI(endpoint, prompt) {

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
        controller.abort();
    }, 20000);


    try {

        const response = await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    prompt: prompt
                }),

                signal: controller.signal
            }
        );


        const data =
            await response.json().catch(() => ({}));


        if (!response.ok) {
            throw new Error(
                data.error || "AI request failed."
            );
        }


        if (!data.response) {
            throw new Error(
                "AI returned an empty response."
            );
        }


        return data.response;

    } catch (error) {

        if (error.name === "AbortError") {
            throw new Error(
                "Request timed out."
            );
        }

        throw error;

    } finally {

        clearTimeout(timeoutId);
    }
}


// =====================================
// AI RECOMMENDATION REQUEST
// =====================================

async function requestRecommendation(
    prompt,
    openRouterText,
    nvidiaText,
    geminiText
) {

    const response = await fetch(
        `${API_BASE_URL}/api/recommend`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                prompt: prompt,

                responses: {
                    OpenRouter: openRouterText,
                    NVIDIA: nvidiaText,
                    Gemini: geminiText
                }
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.error || "Recommendation failed."
        );
    }

    return data;
}


// =====================================
// DISPLAY AI RECOMMENDATION
// =====================================

function displayRecommendation(data) {

    recommendationPlaceholder.classList.add("hidden");

    recommendationResult.classList.remove("hidden");

    recommendedModel.textContent = data.winner;

    recommendedScore.textContent =
        `Score: ${data.score}/10`;

    const scores = data.scores;

    recommendationReason.textContent =
        `${data.reason}\n\n` +
        `OpenRouter: ${scores.OpenRouter.overall}/10\n` +
        `NVIDIA: ${scores.NVIDIA.overall}/10\n` +
        `Gemini: ${scores.Gemini.overall}/10`;
}

// =====================================
// COPY BUTTONS
// =====================================

copyButtons.forEach((button) => {

    button.addEventListener("click", async () => {

        const targetId = button.dataset.target;

        const target =
            document.getElementById(targetId);

        if (!target) {
            return;
        }


        const text =
            target.innerText.trim();


        if (!text) {
            return;
        }


        try {

            await navigator.clipboard.writeText(text);

            button.textContent = "Copied!";


            setTimeout(() => {
                button.textContent = "Copy";
            }, 1200);


        } catch (error) {

            console.error(
                "Copy failed:",
                error
            );

        }

    });

});


// =====================================
// COMPARE ALL 3
// =====================================

compareBtn.addEventListener("click", async () => {

    const prompt =
        promptInput.value.trim();


    if (!prompt) {
        return;
    }
    // Reset previous recommendation

    recommendationPlaceholder.classList.remove("hidden");

    recommendationResult.classList.add("hidden");

    recommendationPlaceholder.textContent =
        "Waiting for all three AI responses...";

    // -------------------------------------
    // BUTTON STATE
    // -------------------------------------

    compareBtn.disabled = true;

    compareBtn.innerHTML =
        'Comparing <span>...</span>';


    // -------------------------------------
    // RESET ALL 3 CARDS FIRST
    // -------------------------------------

    showLoading(
        gptResponse,
        gptStatus
    );

    showLoading(
        claudeResponse,
        claudeStatus
    );

    showLoading(
        geminiResponse,
        geminiStatus
    );


    // Disable copy buttons
    copyButtons.forEach((button) => {
        button.disabled = true;
    });


    // -------------------------------------
    // IMPORTANT:
    // START ALL THREE REQUESTS TOGETHER
    // -------------------------------------

    const gptPromise =
        requestAI(
            "/api/openai",
            prompt
        );

    const nvidiaPromise =
        requestAI(
            "/api/nvidia",
            prompt
        );

    const geminiPromise =
        requestAI(
            "/api/gemini",
            prompt
        );


    // -------------------------------------
    // OPENAI
    // -------------------------------------

    gptPromise
        .then((text) => {

            showResponse(
                gptResponse,
                gptStatus,
                text
            );

            copyButtons[0].disabled = false;

        })
        .catch((error) => {

            console.error(
                "OpenAI error:",
                error
            );

            showError(
                gptResponse,
                gptStatus,
                error.message
            );

        });


    // -------------------------------------
    // NVIDIA
    // -------------------------------------

    nvidiaPromise
        .then((text) => {

            showResponse(
                claudeResponse,
                claudeStatus,
                text
            );

            copyButtons[1].disabled = false;

        })
        .catch((error) => {

            console.error(
                "NVIDIA error:",
                error
            );

            showError(
                claudeResponse,
                claudeStatus,
                error.message
            );

        });


    // -------------------------------------
    // GEMINI
    // -------------------------------------

    geminiPromise
        .then((text) => {

            showResponse(
                geminiResponse,
                geminiStatus,
                text
            );

            copyButtons[2].disabled = false;

        })
        .catch((error) => {

            console.error(
                "Gemini error:",
                error
            );

            showError(
                geminiResponse,
                geminiStatus,
                error.message
            );

        });



    // -------------------------------------
    // WAIT FOR ALL THREE RESPONSES
    // -------------------------------------

    const results = await Promise.allSettled([
        gptPromise,
        nvidiaPromise,
        geminiPromise
    ]);

    // Check whether all three succeeded

    const allSuccessful = results.every(
        result => result.status === "fulfilled"
    );


    // -------------------------------------
    // RUN AI RECOMMENDATION
    // -------------------------------------

    if (allSuccessful) {

        recommendationPlaceholder.classList.add("hidden");

        recommendationResult.classList.remove("hidden");

        recommendedModel.textContent = "Evaluating...";

        recommendedScore.textContent = "Please wait";

        recommendationReason.textContent =
            "Comparing accuracy, relevance, clarity and completeness.";

        try {

            const evaluation = await requestRecommendation(
                prompt,
                results[0].value,
                results[1].value,
                results[2].value
            );

            displayRecommendation(evaluation);

        } catch (error) {

            console.error("Recommendation error:", error);

            recommendedModel.textContent =
                "Evaluation unavailable";

            recommendedScore.textContent = "—";

            recommendationReason.textContent =
                error.message;
        }

    } else {

        recommendationPlaceholder.classList.remove("hidden");

        recommendationResult.classList.add("hidden");

        recommendationPlaceholder.textContent =
            "Recommendation requires successful responses from all three models.";
    }


    // -------------------------------------
    // RESET COMPARE BUTTON
    // -------------------------------------
    compareBtn.disabled = false;

    compareBtn.innerHTML =
        'Compare <span>→</span>';
});
copyButtons.forEach((button, index) => {
    const responseElements = [
        gptResponse,
        claudeResponse,
        geminiResponse
    ];

    button.disabled =
        !responseElements[index].querySelector("p") ||
        responseElements[index].querySelector(".error-message") !== null;
});


// =====================================
// INITIAL STATE
// =====================================

updateCharacterCount();

// =====================================
// MICROPHONE / VOICE INPUT
// =====================================

const micBtn = document.getElementById("micBtn");
const micStatus = document.getElementById("micStatus");

const SpeechRecognitionAPI =
    window.SpeechRecognition || window.webkitSpeechRecognition;

if (micBtn && promptInput) {

    if (!SpeechRecognitionAPI) {

        micBtn.disabled = true;
        micStatus.textContent =
            "Voice input is not supported. Try Chrome.";

    } else {

        let recognition;
        let isListening = false;
        let baseText = "";
        let finalTranscript = "";
        let speechError = "";

        micBtn.addEventListener("click", () => {

            if (isListening && recognition) {
                recognition.stop();
                return;
            }

            recognition = new SpeechRecognitionAPI();

            recognition.lang = "en-IN";
            recognition.continuous = false;
            recognition.interimResults = true;

            baseText = promptInput.value.trim();
            finalTranscript = "";
            speechError = "";

            recognition.onstart = () => {

                isListening = true;

                micBtn.classList.add("listening");
                micBtn.textContent = "⏹";
                micStatus.textContent = "Listening... Speak now";
            };

            recognition.onresult = (event) => {

                let interimTranscript = "";

                for (
                    let i = event.resultIndex;
                    i < event.results.length;
                    i++
                ) {

                    const spokenText =
                        event.results[i][0].transcript;

                    if (event.results[i].isFinal) {
                        finalTranscript += spokenText;
                    } else {
                        interimTranscript += spokenText;
                    }
                }

                const completeTranscript =
                    `${finalTranscript} ${interimTranscript}`.trim();

                promptInput.value = [
                    baseText,
                    completeTranscript
                ].filter(Boolean).join(" ");

                // Update the existing character counter
                promptInput.dispatchEvent(
                    new Event("input", { bubbles: true })
                );
            };

            recognition.onerror = (event) => {

                const errors = {
                    "not-allowed": "Please allow microphone access.",
                    "no-speech": "No speech detected. Try again.",
                    "network": "Speech recognition network error.",
                    "audio-capture": "No microphone detected."
                };

                speechError =
                    errors[event.error] ||
                    `Microphone error: ${event.error}`;

                micStatus.textContent = speechError;
            };

            recognition.onend = () => {

                isListening = false;

                micBtn.classList.remove("listening");
                micBtn.textContent = "🎙️";

                if (speechError) {
                    micStatus.textContent = speechError;
                } else if (finalTranscript.trim()) {
                    micStatus.textContent = "Voice input added!";
                } else {
                    micStatus.textContent = "Ready";
                }
            };

            try {
                recognition.start();
            } catch (error) {
                micStatus.textContent =
                    "Could not start microphone. Try again.";
            }

        });
    }
}
