import { SiteParser } from "./types";

// Register every site parser here. Adding support for a new site is just: write a
// parser implementing SiteParser (see types.ts), put it under ./parsers/, then add it
// to this array. No site parsers ship with the public repo — only scrape sites whose
// terms of use allow it.
export const parsers: SiteParser[] = [];

// Resolve a parser by explicit --site id, otherwise by matching the URL's hostname.
export function resolveParser(url: string, siteId?: string): SiteParser {
    if (siteId) {
        var byId = parsers.find((p) => p.id.toLowerCase() === siteId.toLowerCase());
        if (!byId) {
            throw new Error(
                `Unknown site parser "${siteId}". Available: ${parsers.map((p) => p.id).join(", ")}`
            );
        }
        return byId;
    }
    var byUrl = parsers.find((p) => p.matches(url));
    if (!byUrl) {
        throw new Error(
            `No site parser matches "${url}". Pass --site with one of: ${parsers.map((p) => p.id).join(", ")}`
        );
    }
    return byUrl;
}
