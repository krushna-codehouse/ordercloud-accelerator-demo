# @ordercloud/seeding
A CLI to download and upload serialized representations of full [ordercloud](https://ordercloud.io/) marketplaces. 

[npm package](https://www.npmjs.com/package/@ordercloud/seeding)

## Ways to get started

- For node.js users, install with `npm i @ordercloud/seeding -g` and then run `seeding --help`.
    - Alternatively, node.js users can run without install `npx @ordercloud/seeding --help`.

- For docker users `docker run --mount type=bind,source=<local directory>,target=/app oliverheywood/ordercloud-seeding --help`.
    - Subsitute `<local directory>` for an absolute path in order for local file reading and writing to be mounted on the container. 

- Download an executable. Run like `./seeding-win.exe --help`.

| Operating System | Executable |
| --- | --- |                                
| Windows | [seeding-win.exe](https://raw.githubusercontent.com/ordercloud-api/ordercloud-seed/main/exe/seeding-win.exe) |
| Mac | [seeding-macos](https://raw.githubusercontent.com/ordercloud-api/ordercloud-seed/main/exe/seeding-macos)  |
| Linux | [seeding-linux](https://raw.githubusercontent.com/ordercloud-api/ordercloud-seed/main/exe/seeding-linux) |


## CLI Usage 

Create a marketplace from a "Simple-B2C" template.
```
npx @ordercloud/seeding seed Simple-B2C -u={username} -p={password}
```

Create a marketplace based on data in a local file. Looks for files based on the directory the command is run from.
```
npx @ordercloud/seeding seed seed-data-file.yml -u={username} -p={password}
```

Create a marketplace based on a public url.
```
npx @ordercloud/seeding seed https://raw.githubusercontent.com/ordercloud-api/ordercloud-seed/main/seeds/Simple-B2C.yml -u={username} -p={password}
```

Download the data from an existing marketplace to a seed file.
```
npx @ordercloud/seeding download new-file-to-create.yml -i={existing-marketplace-id} -u={username} -p={password}
```

Validate that a local file would seed successfully. 
```
npx @ordercloud/seeding validate my-file.yml
``` 

## Scraping products and seeding them to OrderCloud

> Accelerator extension (not part of upstream `@ordercloud/seeding`). Two commands turn a public product-listing page into products in an existing OrderCloud marketplace: `scrape` builds a seed YAML from the page, then `upload` pushes its products into the marketplace. Run both from `apps/seeding`.

No site parsers ship with this repo. To add one, implement the `SiteParser` interface (`src/scraping/types.ts`) in a file under `src/scraping/parsers/` and register it in `registry.ts`; it is then auto-detected from the URL's hostname, or selected with `--site`. **Only scrape sites whose terms of use permit it.**

### 1. Scrape a listing page into a seed file

```bash
npm install
npm run scrape -- "<listing-page-url>" --limit 100
```

This writes a seed YAML to `output/products/<site>-products.yml` and downloads each product image to `output/products/images/`. The scraper pages through the listing automatically until it reaches `--limit`, so you don't need to bump the URL's `page=` yourself.

Useful options:
- `--limit, -l` — max products to scrape (default `100`; `0` = no limit).
- `--site, -s` — force a parser (by its `id`) instead of auto-detecting from the hostname.
- `--mode, -m` — `complete` (default: a standalone seed = Simple-B2C scaffold + scraped products) or `fragment` (scraped product resources only, to merge into an existing marketplace).
- `--catalog-id` — catalog the products are assigned to (default `scraped-<site>-products`).
- `--out, -o` — output path (default `output/products/<site>-products.yml`).
- `--image-base-url` — base URL the images will be hosted at (overrides `PRODUCT_IMAGE_BASE_URL`); the YAML references each image as `<base>/<filename>`.
- `--no-images` — skip downloading images (the YAML still references the hosted URLs).

#### Host the images
Whichever way you scrape, the seed references images at `PRODUCT_IMAGE_BASE_URL` (or `--image-base-url`). Upload the files saved under `output/products/images/` to that location so the URLs resolve in the storefront. Configure the base URL in `apps/seeding/.env.local` (copy from `.env.local.example`):
```
PRODUCT_IMAGE_BASE_URL=https://your-host.example.com/products/images
```

### 2. (Optional) Validate the seed file
A quick static check before uploading — no OrderCloud calls:
```bash
npx tsx src/cli.ts validate output/products/my-site-products.yml
```

### 3. Upload the products to OrderCloud

`upload` authenticates with **client credentials** and creates only the product-related resources from the seed — Catalogs, Categories, Products, PriceSchedules and their assignments. Scaffold resources (buyers, security profiles, API clients, …) are ignored, so the same file works whether it was generated in `complete` or `fragment` mode.

```bash
npx tsx src/cli.ts upload output/products/my-site-products.yml
```

Configure credentials in `apps/seeding/.env.local` (or pass the equivalent flags — the flag wins):

| Setting | Env var(s) | Flag | Notes |
| --- | --- | --- | --- |
| API base URL | `OC_API_URL` | `--api-url` | Omit the `/v1` suffix (stripped automatically). |
| Client ID | `OC_CLIENT_ID` / `OC_MIDDLEWARE_CLIENT_ID` | `--client-id` | |
| Client secret | `OC_CLIENT_SECRET` / `OC_MIDDLEWARE_CLIENT_SECRET` | `--client-secret` | |
| Marketplace ID | `OC_MARKETPLACE_ID` | `--marketplace-id` | Your seller org ID. |
| Supplier ID | `OC_SUPPLIER_ID` | `--supplier-id` | Optional; defaults to `<source>-supplier` (e.g. `my-site-supplier`). Created if missing; uploaded products are assigned to it. |

The API client must have these roles: **ProductAdmin, PriceScheduleAdmin, CatalogAdmin, CategoryAdmin, SupplierAdmin**.

`upload` is idempotent — objects that already exist (matched by ID) are skipped and assignments are re-saved (PUT), so re-running after a partial run or a re-scrape is safe. (If you've built the CLI with `npm run build`, you can also run `node ./dist/cli.js upload …` instead of `npx tsx src/cli.ts upload …`.)

## Javascript API Usage
 
 ```typescript
import { download, seed, validate, SerializedMarketplace } from "@ordercloud/seeding";


var myData: SerializedMarketplace = { ... };

await seed({
    portalJWT: "xxxxxx", 
    rawData: myData,
    logger: (message:string, type: MessageType) => {
         console.log(message)
    }
}); 
 ```

## Marketplace Templates

These are seeding files maintained as part of this repo that represent templates for common ordercloud use cases. 

| Command Alias | Raw URL |
| --- | --- |                                
| `seed Simple-B2C` | https://raw.githubusercontent.com/ordercloud-api/ordercloud-seed/main/seeds/Simple-B2C.yml |

## Development

- Run `npm install`
- Run `npm run build` everytime you change source files.
- Run `node ./dist/cli.js [command]` to debug a command.
- Run `npm run test` to run unit tests.


## Nice to Have features
- JSON as an option
- Reference other files
- Template variables in YAML for imports. Including allowing OC to define an ID and then applying it later.

## Steps to release new version
> Note: You must have node version 16 to build the package, you will get errors on node v17 and higher

1. Make your code changes
2. Run `npm run build` to build the code
3. Run `npm run test` to run the unit tests against your built code
4. Run `npm run pkg` to generate the executables (The following warning can be safely ignored: Warning Cannot resolve 'config.)
5. Update "version" field in package.json ([use semver](https://semver.org/))
6. Commit all changes and push to master
7. Create a git release/tag
8. Run `npm publish`