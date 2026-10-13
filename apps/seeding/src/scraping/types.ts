import { LogCallBackFunc } from "../services/logger";

// A single product after a site parser has normalized it. Site-agnostic shape that
// the image downloader and seed generator both consume.
export interface ScrapedProduct {
    externalId: string;      // the site's own id/handle - basis for the OrderCloud ID
    name: string;
    description?: string;
    price: number;
    currency: string;        // ISO code, e.g. "AUD"
    imageUrls: string[];     // absolute source URLs to download
    categoryName?: string;   // optional flat category - becomes a Category + CategoryProductAssignment
    // optional category hierarchy (root -> leaf). When present it takes precedence over
    // categoryName: the seed generator builds the parent/child Category tree and assigns
    // the product to every level. `id` is the source site's stable category id (keeps
    // same-named categories in different branches distinct); `name` is the display name.
    categoryPath?: { id: string; name: string }[];
    sku?: string;
}

export interface ScrapeOptions {
    limit?: number;          // cap the number of products (handy for quick test runs)
    logger: LogCallBackFunc;
}

// One implementation per site. Each parser owns its own fetch strategy (headless
// browser, static HTML, JSON API, ...) so sites that work differently don't leak
// their concerns into each other. Add a site by adding a parser and registering it.
export interface SiteParser {
    id: string;                                  // stable key used by --site, e.g. "my-site"
    matches(url: string): boolean;               // hostname-based auto-detection
    scrape(url: string, opts: ScrapeOptions): Promise<ScrapedProduct[]>;
}
