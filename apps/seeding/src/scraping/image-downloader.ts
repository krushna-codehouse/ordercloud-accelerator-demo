import axios from "axios";
import fs from "fs";
import path from "path";
import { LogCallBackFunc, MessageType } from "../services/logger";
import { slugify } from "./util";

export interface ImageRef {
    sourceUrl: string;   // where we scraped it from
    fileName: string;    // what we save it as locally
    hostedUrl: string;   // where the YAML says it will live (imageBaseUrl + fileName)
}

const BROWSER_UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

const KNOWN_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"];

// Derive a stable, OC-id-safe file name from an image URL, keeping its extension.
// Query strings (e.g. Shopify's ?v=123) are dropped before slugifying.
function fileNameFor(sourceUrl: string, seen: Set<string>): string {
    var withoutQuery = sourceUrl.split("?")[0];
    var base = withoutQuery.split("/").pop() || "image";
    var ext = path.extname(base).toLowerCase();
    if (!KNOWN_IMAGE_EXTENSIONS.includes(ext)) {
        ext = ".jpg"; // sensible default when the URL carries no usable extension
    }
    var stem = slugify(base.slice(0, base.length - path.extname(base).length));

    var candidate = `${stem}${ext}`;
    var counter = 2;
    while (seen.has(candidate)) {
        candidate = `${stem}-${counter++}${ext}`;
    }
    seen.add(candidate);
    return candidate;
}

// Build the source -> { fileName, hostedUrl } mapping without doing any IO. The hosted
// URL is what ends up in the seed YAML; the file name is what we save (or would save).
export function buildImageRefs(sourceUrls: string[], imageBaseUrl: string): Map<string, ImageRef> {
    var base = imageBaseUrl.replace(/\/+$/, "");
    var seenNames = new Set<string>();
    var refs = new Map<string, ImageRef>();
    for (var url of sourceUrls) {
        if (!url || refs.has(url)) continue;
        var fileName = fileNameFor(url, seenNames);
        refs.set(url, { sourceUrl: url, fileName, hostedUrl: `${base}/${fileName}` });
    }
    return refs;
}

// Stream each unique image to `outDir`. Failures are logged and skipped so one bad
// asset never aborts the whole run. Returns the count actually written.
export async function downloadImages(
    refs: Map<string, ImageRef>,
    outDir: string,
    logger: LogCallBackFunc
): Promise<number> {
    fs.mkdirSync(outDir, { recursive: true });
    var written = 0;
    for (var ref of Array.from(refs.values())) {
        try {
            var response = await axios.get(ref.sourceUrl, {
                responseType: "stream",
                timeout: 30000,
                headers: { "User-Agent": BROWSER_UA },
            });
            var dest = path.join(outDir, ref.fileName);
            await new Promise<void>((resolve, reject) => {
                var writer = fs.createWriteStream(dest);
                response.data.pipe(writer);
                writer.on("finish", () => resolve());
                writer.on("error", reject);
                response.data.on("error", reject);
            });
            written++;
        } catch (e) {
            logger(`Failed to download image ${ref.sourceUrl}: ${(e as Error).message}`, MessageType.Warn);
        }
    }
    logger(`Downloaded ${written}/${refs.size} images to ${outDir}.`, MessageType.Info);
    return written;
}
