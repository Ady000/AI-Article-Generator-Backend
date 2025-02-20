const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors({
    origin: "https://ai-article-generator-frontend.vercel.app/", // Replace with your actual Vercel domain
    methods: ["GET", "POST"],
    credentials: true
}));

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Fetch Search Results from Google
async function fetchSearchResults(topic) {
    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(
        topic
    )}&key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}`;

    try {
        const response = await axios.get(url);
        if (!response.data.items) return [];
        return response.data.items.map((article) => ({
            title: article.title,
            snippet: article.snippet,
            url: article.link,
        }));
    } catch (error) {
        console.error("Error fetching Google search results:", error);
        return [];
    }
}

// Generate Article using OpenAI
async function generateArticle(topic, searchResults) {
    if (searchResults.length === 0) {
        return `No relevant search results were found for "${topic}".`;
    }

    const prompt = `Act like a news article writer and write an informative article on "${topic}" using these sources:\n\n${searchResults
        .map((s, i) => `${i + 1}. ${s.title}: ${s.snippet}`)
        .join("\n")}`;

    try {
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4",
                messages: [{ role: "user", content: prompt }],
            },
            {
                headers: {
                    "Authorization": `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data.choices?.[0]?.message?.content || "Error generating article.";
    } catch (error) {
        console.error("Error generating article:", error);
        return "Error generating article.";
    }
}

// API Endpoint
app.post("/generate-article", async (req, res) => {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ error: "Topic is required" });

    const searchResults = await fetchSearchResults(topic);
    const article = await generateArticle(topic, searchResults);

    res.json({ topic, article });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
