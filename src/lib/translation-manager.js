import { segmentChapter, injectTranslations } from './text-segmenter';
import { GeminiTranslator } from './gemini-translator';

export class TranslationManager {
    constructor(apiKey, files) {
        this.translator = new GeminiTranslator(apiKey);
        this.files = files; // JSZip files object
        this.abortController = new AbortController();
    }

    /**
     * Process a single chapter.
     * @param {string} href - Path to chapter in zip
     * @param {function} onProgress - Callback (percent)
     * @returns {Promise<string>} Translated HTML string
     */
    async processChapter(href, onProgress) {
        // 1. Read Content
        const file = this.files[href];
        if (!file) throw new Error(`File not found: ${href}`);
        const originalHtml = await file.async('string');

        // 2. Segment
        const { modifiedHtmlString, chunks } = segmentChapter(originalHtml);

        // 3. Translate Chunks (Sequential or Parallel? limited parallel)
        // Gemini Flash has high rate limits, but let's be safe: 2 concurrent
        const translations = [];
        const total = chunks.length;
        let completed = 0;
        let failed = 0;

        // Helper for concurrency
        const processChunk = async (chunk) => {
            if (this.abortController.signal.aborted) throw new Error("Aborted");
            try {
                const results = await this.translator.translateChunk(chunk.text);
                if (results && Array.isArray(results)) {
                    translations.push(...results);
                }
                completed++;
            } catch (err) {
                console.error(`Chunk failed`, err);
                failed++;
                completed++; // Still count as processed for progress bar
            }
            if (onProgress) onProgress(Math.round((completed / total) * 100));
        };

        // Simple batching: run 2 at a time
        const BATCH_SIZE = 2;
        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batch = chunks.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(processChunk));
        }

        // 4. Reassemble
        const finalHtml = injectTranslations(modifiedHtmlString, translations);
        return {
            translatedHtml: finalHtml,
            stats: {
                totalChunks: total,
                failedChunks: failed,
                successfulChunks: total - failed
            }
        };
    }
}
```
