import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const GENERATION_CONFIG = {
    temperature: 0.3, // Low temperature for faithful translation
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
    responseSchema: {
        type: SchemaType.ARRAY,
        items: {
            type: SchemaType.OBJECT,
            properties: {
                id: { type: SchemaType.STRING },
                translated_html: { type: SchemaType.STRING }
            },
            required: ["id", "translated_html"]
        }
    }
};

export class GeminiTranslator {
    constructor(apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: GENERATION_CONFIG,
            systemInstruction: `You are a professional literary translator specializing in English to Chinese translation. 
      
      Your Task:
      1. Translate the text content within the provided HTML snippets to Simplified Chinese.
      2. PRESERVE the literary tone, nuance, and style of the original text.
      3. CRITICAL: Preserve all inner HTML tags (like <em>, <strong>, <br>) EXACTLY as they are. Only translate the text around them.
      4. Return a JSON array where each object contains the 'id' of the segment and the 'translated_html'.
      `
        });
    }

    /**
     * Translates a chunk of text.
     * @param {string} chunkText - The concatenated HTML string from segmenter (e.g. "<p id='1'>Text</p>")
     * @returns {Promise<Array<{id: string, translated_html: string}>>}
     */
    async translateChunk(chunkText) {
        try {
            const result = await this.model.generateContent(chunkText);
            const response = result.response;
            return JSON.parse(response.text());
        } catch (error) {
            console.error("Translation Error:", error);
            throw error;
        }
    }
}
