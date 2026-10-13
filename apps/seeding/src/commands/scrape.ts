import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { defaultLogger, getElapsedTime, LogCallBackFunc, MessageType } from "../services/logger";
import { getImageBaseUrl } from "../services/config";
import { resolveParser } from "../scraping/registry";
import { SiteParser } from "../scraping/types";
import { buildImageRefs, downloadImages } from "../scraping/image-downloader";
import { generateSeed, SeedMode } from "../scraping/generate-seed";

export interface ScrapeArgs {
    url: string;
    site?: string;             // explicit parser id; otherwise auto-detected from url
    out?: string;              // output yaml path; default output/products/<site>-products.yml
    imageBaseUrl?: string;     // overrides PRODUCT_IMAGE_BASE_URL
    catalogId?: string;        // default "scraped-products"
    mode?: SeedMode;           // "complete" (default) | "fragment"
    scaffoldPath?: string;     // base seed file for complete mode; default bundled Simple-B2C
    limit?: number;            // cap products scraped
    noImages?: boolean;        // skip downloading images (still references hosted urls)
    logger?: LogCallBackFunc;
}

export interface ScrapeResult {
    outputPath: string;
    productCount: number;
}

export async function scrape(args: ScrapeArgs): Promise<ScrapeResult | void> {
    var {
        url,
        site,
        out,
        imageBaseUrl,
        catalogId,
        mode = "complete",
        scaffoldPath,
        limit,
        noImages = false,
        logger = defaultLogger,
    } = args;

    if (!url) {
        return logger(`Missing required argument: url`, MessageType.Error);
    }

    var baseUrl: string;
    try {
        baseUrl = getImageBaseUrl(imageBaseUrl);
    } catch (e) {
        return logger((e as Error).message, MessageType.Error);
    }

    var parser: SiteParser;
    try {
        parser = resolveParser(url, site);
    } catch (e) {
        return logger((e as Error).message, MessageType.Error);
    }

    var effectiveCatalogId = catalogId || `scraped-${parser.id}-products`;

    var startTime = Date.now();

    // 1. Scrape normalized products from the site. A non-positive limit means "no limit".
    var effectiveLimit = typeof limit === "number" && limit > 0 ? limit : undefined;
    var products = await parser.scrape(url, { limit: effectiveLimit, logger });
    if (!products.length) {
        return logger(`No products scraped from "${url}"; nothing to write.`, MessageType.Warn);
    }
    logger(`Scraped ${products.length} products using the "${parser.id}" parser.`, MessageType.Success);

    // 2. Download images locally so they can be re-hosted at the base URL.
    var allImageUrls: string[] = [];
    for (var prod of products) {
        allImageUrls = allImageUrls.concat(prod.imageUrls || []);
    }
    var imageRefs = buildImageRefs(allImageUrls, baseUrl);
    var imagesDir = path.resolve(process.cwd(), "output/products/images");
    if (noImages) {
        logger(`Skipping image download (--no-images); ${imageRefs.size} images referenced at ${baseUrl}.`, MessageType.Info);
    } else {
        await downloadImages(imageRefs, imagesDir, logger);
    }

    // 3. Build the seed YAML in the requested mode.
    var marketplace = generateSeed(products, { catalogId: effectiveCatalogId, mode, scaffoldPath, imageRefs });

    // 4. Write it out.
    var outputPath = path.resolve(process.cwd(), out || `output/products/${parser.id}-products.yml`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, yaml.dump(marketplace));

    logger(
        `Wrote ${products.length} products (mode: ${mode}) to ${outputPath}. Total elapsed time: ${getElapsedTime(startTime, Date.now())}`,
        MessageType.Done
    );
    return { outputPath, productCount: products.length };
}
