import * as dotenv from "dotenv";

// dotenv ships with the package but was previously unused. Load apps/seeding/.env.local
// first (gitignored, repo convention) then fall back to .env. Loading is best-effort:
// a missing file is not an error.
var loaded = false;
export function loadEnv(): void {
    if (loaded) return;
    dotenv.config({ path: ".env.local" });
    dotenv.config(); // .env (does not override values already set above)
    loaded = true;
}

// The base URL the scraped images will be hosted at. A CLI flag, when provided,
// takes precedence over the PRODUCT_IMAGE_BASE_URL env var (per the chosen config).
export function getImageBaseUrl(flagValue?: string): string {
    loadEnv();
    var value = flagValue ?? process.env.PRODUCT_IMAGE_BASE_URL;
    if (!value) {
        throw new Error(
            "No image base URL configured. Pass --image-base-url or set PRODUCT_IMAGE_BASE_URL in apps/seeding/.env.local"
        );
    }
    return value.replace(/\/+$/, ""); // normalize trailing slash so joins are clean
}
