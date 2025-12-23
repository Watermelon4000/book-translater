import JSZip from 'jszip';

/**
 * Parses an EPUB file and returns metadata and chapter structure.
 * @param {File} file 
 */
export async function parseEpub(file) {
    const zip = new JSZip();
    await zip.loadAsync(file);

    // 1. Locate the OPF file from META-INF/container.xml
    const opfPath = await getOpfPath(zip);
    if (!opfPath) throw new Error("Invalid EPUB: No OPF content file found.");

    // 2. Read and parse the OPF file
    const opfContent = await zip.file(opfPath).async('string');
    const parser = new DOMParser();
    const opfDoc = parser.parseFromString(opfContent, "application/xml");

    // 3. Extract Metadata
    const metadata = extractMetadata(opfDoc);

    // 4. Extract Manifest (ID -> Href mapping)
    const manifest = extractManifest(opfDoc);

    // 5. Extract Spine (Reading Order)
    const spine = extractSpine(opfDoc, manifest);

    // 6. Resolve absolute paths for chapters relative to the ZIP root
    // The OPF path might be "OEBPS/content.opf", so relative paths in manifest need OEBPS/ prefix.
    const rootDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
    spine.forEach(chapter => {
        chapter.href = rootDir + chapter.href;
    });

    return {
        metadata,
        spine,
        files: zip.files, // Keep reference to raw files for reading later
        zip, // Return the JSZip instance for writing
    };
}

async function getOpfPath(zip) {
    const containerXml = await zip.file("META-INF/container.xml")?.async("string");
    if (!containerXml) return null;

    const parser = new DOMParser();
    const doc = parser.parseFromString(containerXml, "application/xml");
    const rootfile = doc.getElementsByTagName("rootfile")[0];
    return rootfile?.getAttribute("full-path");
}

function extractMetadata(opfDoc) {
    const getMeta = (tag) => {
        const el = opfDoc.getElementsByTagNameNS("*", tag)[0] || opfDoc.getElementsByTagName(tag)[0];
        return el?.textContent || "Unknown";
    };

    return {
        title: getMeta("title"),
        creator: getMeta("creator"),
        language: getMeta("language"),
    };
}

function extractManifest(opfDoc) {
    const manifest = {};
    const items = opfDoc.getElementsByTagName("item");
    for (let item of items) {
        manifest[item.getAttribute("id")] = item.getAttribute("href");
    }
    return manifest;
}

function extractSpine(opfDoc, manifest) {
    const spine = [];
    const itemrefs = opfDoc.getElementsByTagName("itemref");

    for (let itemref of itemrefs) {
        const idref = itemref.getAttribute("idref");
        const href = manifest[idref];
        if (href) {
            spine.push({
                id: idref,
                href: href,
            });
        }
    }
    return spine;
}
