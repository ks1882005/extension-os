const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());


// =====================================
// HOME
// =====================================

app.get("/", (req, res) => {
    res.json({
        message: "Extension OS backend is running!"
    });
});


// =====================================
// OPENROUTER FREE MODEL
// =====================================
app.post("/api/openai", async (req, res) => {

    try {

        const { prompt } = req.body;

        if (!prompt?.trim()) {
            return res.status(400).json({
                error: "Prompt is required."
            });
        }

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "X-Title": "Extension OS"
                },

                body: JSON.stringify({
                    model: "openrouter/free",

                    messages: [
                        {
                            role: "system",
                            content: "Give only the final answer to the user's question. Do not reveal internal reasoning, chain-of-thought, hidden analysis, or a thinking process. Be clear, concise, and useful. Use examples when helpful."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],

                    max_tokens: 5000
                })
            }
        );

        const data = await response.json();

        console.log("OPENROUTER STATUS:", response.status);
        console.log("OPENROUTER DATA:", data);

        if (!response.ok) {
            return res.status(response.status).json({
                error:
                    data?.error?.message ||
                    "OpenRouter request failed."
            });
        }

        const text =
            data?.choices?.[0]?.message?.content ||
            data?.choices?.[0]?.text ||
            data?.output?.[0]?.content?.[0]?.text ||
            "";

        if (!text.trim()) {

            return res.status(500).json({
                error:
                    "OpenRouter returned no readable text. Check the terminal for the full API response."
            });
        }

        res.json({
            response: text
        });

    } catch (error) {

        console.error("OPENROUTER ERROR:", error);

        res.status(500).json({
            error: error.message
        });
    }
});


// =====================================
// NVIDIA Nemotron 3.5 Lightning
// =====================================

app.post("/api/nvidia", async (req, res) => {
    try {
        const { prompt } = req.body;
        console.log("========== NVIDIA ROUTE HIT ==========");
        if (!prompt?.trim()) {
            return res.status(400).json({
                error: "Prompt is required."
            });
        }

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "X-Title": "Extension OS"
                },

                body: JSON.stringify({
                    model: "nvidia/nemotron-3.5-lightning:free",

                    messages: [
                        {
                            role: "system",
                            content: "You are a helpful educational assistant. Answer the user's question directly. Return only the final answer, without analysis, planning, drafts or thinking-process descriptions. Use clear headings and examples where useful."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],

                    reasoning_effort: "none",
                    max_completion_tokens: 5000,
                    temperature: 0.4
                })
            }
        );

        const data = await response.json();

        console.log("NVIDIA STATUS:", response.status);
        console.log(
            "NVIDIA MESSAGE:",
            JSON.stringify(data?.choices?.[0]?.message, null, 2)
        );

        console.log(
            "NVIDIA USAGE:",
            JSON.stringify(data?.usage, null, 2)
        );
        if (!response.ok) {
            console.log("NVIDIA API ERROR:", data);

            return res.status(response.status).json({
                error: data?.error?.message || "NVIDIA API request failed."
            });
        }

        // Extract only the final answer.
        const text = data?.choices?.[0]?.message?.content;

        if (typeof text !== "string" || !text.trim()) {
            console.log(
                "NVIDIA RESPONSE DATA:",
                JSON.stringify(data, null, 2)
            );

            return res.status(500).json({
                error: "NVIDIA returned no final answer."
            });
        }

        res.json({
            response: text.trim()
        });

    } catch (error) {
        console.error("NVIDIA error:", error);

        res.status(500).json({
            error: error.message
        });
    }
});


// =====================================
// GEMINI
// =====================================

app.post("/api/gemini", async (req, res) => {

    try {

        const { prompt } = req.body;

        if (!prompt?.trim()) {
            return res.status(400).json({
                error: "Prompt is required."
            });
        }


        const response = await fetch(

            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key":
                        process.env.GEMINI_API_KEY
                },

                body: JSON.stringify({

                    contents: [
                        {
                            parts: [
                                {
                                    text: `Answer the user's question directly and clearly.
Do not include a thinking process, internal reasoning, hidden analysis, or planning.
Give only the final answer.
Use concise explanations, examples, bullets, or code when useful.

User question:
${prompt}`
                                }
                            ]
                        }
                    ],

                    generationConfig: {
                        maxOutputTokens: 5000
                    }

                })
            }

        );


        const data = await response.json();


        if (!response.ok) {

            return res.status(response.status).json({

                error:
                    data?.error?.message ||
                    "Gemini request failed."
            });
        }


        const text =
            data?.candidates?.[0]
                ?.content?.parts
                ?.map(part => part.text || "")
                .join("");


        if (!text) {

            return res.status(500).json({
                error:
                    "Gemini returned an empty response."
            });
        }


        res.json({
            response: text
        });


    } catch (error) {

        console.error(
            "Gemini error:",
            error
        );

        res.status(500).json({
            error: error.message
        });
    }

});


// =====================================
// AI RECOMMENDATION ENGINE
// =====================================

app.post("/api/recommend", async (req, res) => {

    try {

        const { prompt, responses } = req.body;

        // Validate input
        if (
            !prompt?.trim() ||
            !responses?.OpenRouter?.trim() ||
            !responses?.NVIDIA?.trim() ||
            !responses?.Gemini?.trim()
        ) {
            return res.status(400).json({
                error: "Prompt and all three AI responses are required."
            });
        }

        // Give anonymous labels to avoid model-name bias
        const evaluationInput = {
            originalPrompt: prompt,
            responses: {
                A: responses.OpenRouter,
                B: responses.NVIDIA,
                C: responses.Gemini
            }
        };

        const evaluationPrompt = `
You are an impartial AI response evaluator.

Evaluate all three responses to the original user prompt.

Judge them on:
1. Accuracy: Is the information correct?
2. Relevance: Does it answer the actual question?
3. Clarity: Is it easy to understand?
4. Completeness: Does it cover the important points?

Give each category a score from 0 to 10.

Calculate the overall score using:
Accuracy: 40%
Relevance: 25%
Clarity: 15%
Completeness: 20%

Be fair. Do not favor any response because of its length or writing style.
Do not reward unnecessary detail.
Evaluate only the actual answer.

Return ONLY valid JSON in this exact structure:

{
  "scores": {
    "A": {
      "accuracy": 8,
      "relevance": 9,
      "clarity": 8,
      "completeness": 7,
      "overall": 8
    },
    "B": {
      "accuracy": 9,
      "relevance": 9,
      "clarity": 9,
      "completeness": 9,
      "overall": 9
    },
    "C": {
      "accuracy": 8,
      "relevance": 8,
      "clarity": 9,
      "completeness": 8,
      "overall": 8
    }
  },
  "reason": "Explain briefly why the highest-scoring response performed best."
}

The numbers above are only examples. Evaluate the actual responses.

Here are the prompt and responses:

${JSON.stringify(evaluationInput)}
`;

        // Send evaluation request to Gemini
        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": process.env.GEMINI_API_KEY
                },

                body: JSON.stringify({

                    contents: [
                        {
                            parts: [
                                {
                                    text: evaluationPrompt
                                }
                            ]
                        }
                    ],

                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 1200,
                        responseMimeType: "application/json"
                    }
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {

            console.log("RECOMMENDATION API ERROR:", data);

            return res.status(response.status).json({
                error:
                    data?.error?.message ||
                    "AI recommendation failed."
            });
        }

        // Extract Gemini's JSON response
        const resultText =
            data?.candidates?.[0]?.content?.parts
                ?.map(part => part.text || "")
                .join("");

        if (!resultText) {
            return res.status(500).json({
                error: "Gemini returned an empty evaluation."
            });
        }

        // Parse JSON
        let evaluation;

        try {
            evaluation = JSON.parse(
                resultText
                    .replace(/^```json\s*/i, "")
                    .replace(/\s*```$/, "")
                    .trim()
            );
        } catch (error) {

            console.log("INVALID EVALUATION JSON:", resultText);

            return res.status(500).json({
                error: "Could not read the AI evaluation."
            });
        }

        const scores = evaluation.scores;

        const labels = {
            A: "OpenRouter",
            B: "NVIDIA",
            C: "Gemini"
        };

        // Validate and normalize scores
        const normalizedScores = {};

        for (const key of ["A", "B", "C"]) {

            const result = scores?.[key];

            const categories = [
                "accuracy",
                "relevance",
                "clarity",
                "completeness",
                "overall"
            ];

            for (const category of categories) {
                const value = result?.[category];

                if (
                    typeof value !== "number" ||
                    !Number.isFinite(value) ||
                    value < 0 ||
                    value > 10
                ) {
                    return res.status(500).json({
                        error: "Gemini returned invalid evaluation scores."
                    });
                }
            }

            normalizedScores[labels[key]] = result;
        }

        // Select winner using the highest overall score
        const winnerKey = ["A", "B", "C"].reduce(
            (best, current) =>
                scores[current].overall > scores[best].overall
                    ? current
                    : best
        );

        const winner = labels[winnerKey];

        console.log("RECOMMENDATION WINNER:", winner);
        console.log("RECOMMENDATION SCORES:", normalizedScores);

        res.json({
            winner,
            score: scores[winnerKey].overall,
            scores: normalizedScores,
            reason: evaluation.reason || "Selected based on the highest overall score."
        });

    } catch (error) {

        console.error("Recommendation error:", error);

        res.status(500).json({
            error: error.message
        });
    }

});

// =====================================
// START SERVER
// =====================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `Extension OS server running on port ${PORT}`
    );

});
