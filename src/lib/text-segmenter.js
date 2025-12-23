import { v4 as uuidv4 } from 'uuid';

const MAX_CHUNK_SIZE = 1500; // Characters per translation request approx

/**
 * Segments an HTML chapter into translation units.
 * @param {string} htmlString - Raw HTML content of the chapter
 * @returns {object} { modifiedHtmlString, chunks }
 * - chunks: Array of { ids: string[], text: string }
 */
export function segmentChapter(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "application/xhtml+xml"); // EPUB is XHTML

    const chunks = [];
    let currentChunk = { ids: [], text: "", nodes: [] };

    // Traverse top-level block elements in body
    const body = doc.body;
    if (!body) return { modifiedHtmlString: htmlString, chunks: [] };

    const processNode = (node) => {
        const tag = node.tagName?.toLowerCase();

        // Skip scripts, styles
        if (tag === 'script' || tag === 'style') return;

        // Determine if this is a "Translation Unit" candidate
        // A unit is a block that contains text.
        // If a P tag has a SPAN inside, we want to translate the whole P tag.
        // If a DIV wraps multiple Ps, we want to descend into the DIV.

        const isBlockCandidate = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote'].includes(tag);

        // Check if the node has 'direct' or 'meaningful' text content worthy of preserving as a block
        // We want to avoid splitting a sentence interrupted by a span.
        // So if it's a P, we take it whole.
        // But if it's a DIV, does it represent a block or a container?
        // Heuristic: If it's a P/Heading/LI, always treat as unit.
        if (isBlockCandidate) {
            const text = node.textContent?.trim();
            if (!text) {
                // Empty block? Skip.
                return;
            }

            // Mark the node with an ID
            const id = `tid-${Math.random().toString(36).substr(2, 9)}`;
            node.setAttribute('data-translate-id', id);

            const entrySize = text.length;

            // Chunking Logic
            if (currentChunk.text.length + entrySize > MAX_CHUNK_SIZE && currentChunk.ids.length > 0) {
                chunks.push({
                    ids: currentChunk.ids,
                    text: currentChunk.text
                });
                currentChunk = { ids: [], text: "" };
            }

            currentChunk.ids.push(id);
            currentChunk.text += `<${tag} id="${id}">${node.innerHTML}</${tag}>\n`;
        } else {
            // For DIVs, Sections, etc., we usually want to recurse unless they are leaf-like.
            // But some DIVs are just P substitutes.
            // Strategy: Recurse into generic containers.
            if (node.children?.length) {
                Array.from(node.children).forEach(processNode);
            }
        }
    };

    Array.from(body.children).forEach(processNode);

    // Push last chunk
    if (currentChunk.ids.length > 0) {
        chunks.push({ ids: currentChunk.ids, text: currentChunk.text });
    }

    const serializer = new XMLSerializer();
    return {
        modifiedHtmlString: serializer.serializeToString(doc),
        chunks
    };
}

/**
 * Injects translated text back into the HTML structure.
 * @param {string} modifiedHtml - HTML string with data-translate-id attributes
 * @param {Array<{id: string, translated_html: string}>} translations - Array of translated segments
 * @returns {string} Final HTML with translations
 */
export function injectTranslations(modifiedHtml, translations) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(modifiedHtml, "application/xhtml+xml");

    // Create a quick lookup map
    const translationMap = new Map();
    translations.forEach(t => translationMap.set(t.id, t.translated_html));

    // Iterate over all elements with data-translate-id
    const elements = doc.querySelectorAll('[data-translate-id]');
    elements.forEach(el => {
        const id = el.getAttribute('data-translate-id');
        if (translationMap.has(id)) {
            // Inject translated content
            // Note: We deliberately use innerHTML to insert formatting tags returned by AI
            try {
                el.innerHTML = translationMap.get(id);
            } catch (e) {
                console.error("Injection error for ID:", id, e);
            }
        }
        // Clean up attribute
        el.removeAttribute('data-translate-id');
    });

    const serializer = new XMLSerializer();
    return serializer.serializeToString(doc);
}
