import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { OCResourceEnum } from "../models/oc-resource-enum";
import { SerializedMarketplace } from "../models/serialized-marketplace";
import { MARKETPLACE_ID } from "../constants";
import { ScrapedProduct } from "./types";
import { ImageRef } from "./image-downloader";
import { slugify, uniqueSlug } from "./util";

export type SeedMode = "complete" | "fragment";

export interface GenerateSeedOptions {
    catalogId?: string;                 // default "scraped-products"
    mode?: SeedMode;                    // default "complete"
    scaffoldPath?: string;              // default: bundled seeds/Simple-B2C.yml
    imageRefs?: Map<string, ImageRef>;  // sourceUrl -> hosted image (falls back to source url)
}

// OrderCloud string-length caps that the validator enforces from the OpenAPI spec.
const NAME_MAX = 100;
const DESCRIPTION_MAX = 2000;

// Scaffold collections that reference products / specs / categories. In "complete"
// mode these are cleared so the scaffold's original demo products don't leave dangling
// foreign keys once we swap in the scraped catalog.
const PRODUCT_OBJECT_KEYS: OCResourceEnum[] = [
    OCResourceEnum.Products,
    OCResourceEnum.PriceSchedules,
    OCResourceEnum.Specs,
    OCResourceEnum.SpecOptions,
    OCResourceEnum.ProductFacets,
    OCResourceEnum.Promotions,
    OCResourceEnum.Categories,
];
const PRODUCT_ASSIGNMENT_KEYS: OCResourceEnum[] = [
    OCResourceEnum.ProductCatalogAssignment,
    OCResourceEnum.CategoryProductAssignments,
    OCResourceEnum.SpecProductAssignments,
    OCResourceEnum.ProductAssignments,
    OCResourceEnum.PromotionAssignments,
    OCResourceEnum.CategoryAssignments,
];

interface BuiltResources {
    products: any[];
    priceSchedules: any[];
    catalog: any;
    categories: any[];
    productCatalogAssignments: any[];
    categoryProductAssignments: any[];
}

function clamp(value: string | undefined, max: number): string | null {
    if (!value) return null;
    return value.length > max ? value.slice(0, max) : value;
}

// Map normalized products into the OrderCloud resource shapes used by Simple-B2C.yml.
function buildResources(
    products: ScrapedProduct[],
    catalogId: string,
    imageRefs?: Map<string, ImageRef>
): BuiltResources {
    var idSeen = new Set<string>();
    var built: BuiltResources = {
        products: [],
        priceSchedules: [],
        catalog: null,
        categories: [],
        productCatalogAssignments: [],
        categoryProductAssignments: [],
    };
    var categoryById = new Map<string, any>();        // OC category ID -> category object
    var ocIdBySourceId = new Map<string, string>();   // source category id -> OC category ID
    var usedCategoryIds = new Set<string>();
    var catAssignSeen = new Set<string>();            // "categoryId|productId" guard
    var categoryOrder = 0;

    // Create the category (once) for a source-site category and return its OrderCloud ID.
    // Keyed on the source id so a category shared by many products - or recurring across
    // several products' paths - collapses to a single node with a single parent.
    function ensureCategory(sourceId: string, name: string, parentOcId: string | null): string {
        var existing = ocIdBySourceId.get(sourceId);
        if (existing) return existing;
        var ocId = uniqueSlug(name || sourceId, usedCategoryIds);
        ocIdBySourceId.set(sourceId, ocId);
        categoryById.set(ocId, {
            ID: ocId,
            Name: clamp(name, NAME_MAX) || ocId,
            Description: null,
            ListOrder: ++categoryOrder,
            Active: true,
            ParentID: parentOcId,
            ChildCount: 0,
            xp: null,
            CatalogID: catalogId,
        });
        return ocId;
    }

    // Link a product to a category, de-duped.
    function assignProductToCategory(categoryOcId: string, productId: string): void {
        var key = `${categoryOcId}|${productId}`;
        if (catAssignSeen.has(key)) return;
        catAssignSeen.add(key);
        built.categoryProductAssignments.push({
            CategoryID: categoryOcId,
            ProductID: productId,
            ListOrder: null,
            CatalogID: catalogId,
        });
    }

    for (var p of products) {
        var id = uniqueSlug(p.externalId || p.name, idSeen);
        var images = (p.imageUrls || [])
            .map((u) => ({ url: imageRefs?.get(u)?.hostedUrl || u }))
            .filter((img) => !!img.url);

        built.products.push({
            OwnerID: MARKETPLACE_ID,
            DefaultPriceScheduleID: id,
            AutoForward: false,
            ID: id,
            Name: clamp(p.name, NAME_MAX) || id,
            Description: clamp(p.description, DESCRIPTION_MAX),
            QuantityMultiplier: 1,
            ShipWeight: null,
            ShipHeight: null,
            ShipWidth: null,
            ShipLength: null,
            Active: true,
            SpecCount: 0,
            VariantCount: 0,
            ShipFromAddressID: null,
            Inventory: {
                Enabled: false,
                NotificationPoint: null,
                VariantLevelTracking: false,
                OrderCanExceed: false,
                QuantityAvailable: null,
                LastUpdated: null,
            },
            DefaultSupplierID: null,
            AllSuppliersCanSell: false,
            xp: {
                Price: p.price,
                PriceCurrency: p.currency,
                Images: images,
                ...(p.sku ? { SKU: p.sku } : {}),
            },
        });

        built.priceSchedules.push({
            OwnerID: MARKETPLACE_ID,
            ID: id,
            Name: clamp(p.name, NAME_MAX) || id,
            ApplyTax: true,
            ApplyShipping: true,
            MinQuantity: 1,
            MaxQuantity: null,
            UseCumulativeQuantity: false,
            RestrictedQuantity: false,
            PriceBreaks: [{ Quantity: 1, Price: p.price }],
            xp: null,
        });

        built.productCatalogAssignments.push({ CatalogID: catalogId, ProductID: id });

        if (p.categoryPath && p.categoryPath.length) {
            // Build the parent -> child chain, then assign the product to every level so it
            // is browsable from any category in its trail (OrderCloud's categoryID filter
            // returns only directly-assigned products, not a category's descendants).
            var parentOcId: string | null = null;
            for (var level of p.categoryPath) {
                var levelOcId = ensureCategory(level.id, level.name, parentOcId);
                assignProductToCategory(levelOcId, id);
                parentOcId = levelOcId;
            }
        } else if (p.categoryName) {
            // Flat single category (e.g. a product_type field) - keyed by name so equal names merge.
            var flatOcId = ensureCategory("name:" + slugify(p.categoryName), p.categoryName, null);
            assignProductToCategory(flatOcId, id);
        }
    }

    built.categories = Array.from(categoryById.values());
    // Fill in each category's direct-child count for nicer admin / nav display.
    var childCounts = new Map<string, number>();
    for (var cat of built.categories) {
        if (cat.ParentID) childCounts.set(cat.ParentID, (childCounts.get(cat.ParentID) || 0) + 1);
    }
    for (var catNode of built.categories) catNode.ChildCount = childCounts.get(catNode.ID) || 0;
    built.catalog = {
        ID: catalogId,
        OwnerID: MARKETPLACE_ID,
        Name: clamp(catalogId, NAME_MAX),
        Description: "Catalog of scraped products",
        Active: true,
        CategoryCount: built.categories.length,
        xp: null,
    };
    return built;
}

// Locate the bundled Simple-B2C.yml scaffold across dev (ts-node, src/) and built
// (dist/) layouts and a plain "run from apps/seeding" invocation.
function defaultScaffoldPath(): string {
    var candidates = [
        path.resolve(__dirname, "../../seeds/Simple-B2C.yml"),
        path.resolve(__dirname, "../seeds/Simple-B2C.yml"),
        path.resolve(process.cwd(), "seeds/Simple-B2C.yml"),
    ];
    for (var c of candidates) {
        if (fs.existsSync(c)) return c;
    }
    return candidates[0];
}

function generateFragment(built: BuiltResources, catalogId: string): SerializedMarketplace {
    var objects: any = {};
    objects[OCResourceEnum.Catalogs] = [built.catalog];
    objects[OCResourceEnum.Categories] = built.categories;
    objects[OCResourceEnum.Products] = built.products;
    objects[OCResourceEnum.PriceSchedules] = built.priceSchedules;

    var assignments: any = {};
    assignments[OCResourceEnum.ProductCatalogAssignment] = built.productCatalogAssignments;
    assignments[OCResourceEnum.CategoryProductAssignments] = built.categoryProductAssignments;

    return new SerializedMarketplace({ Objects: objects, Assignments: assignments });
}

function generateComplete(built: BuiltResources, catalogId: string, scaffoldPath?: string): SerializedMarketplace {
    var raw = fs.readFileSync(scaffoldPath || defaultScaffoldPath(), "utf8");
    var scaffold = (yaml.load(raw) as any) || {};
    scaffold.Objects = scaffold.Objects || {};
    scaffold.Assignments = scaffold.Assignments || {};

    // Clear the scaffold's product-dependent collections to prevent dangling references.
    for (var ok of PRODUCT_OBJECT_KEYS) scaffold.Objects[ok] = [];
    for (var ak of PRODUCT_ASSIGNMENT_KEYS) scaffold.Assignments[ak] = [];

    // Inject the scraped product data.
    scaffold.Objects[OCResourceEnum.Products] = built.products;
    scaffold.Objects[OCResourceEnum.PriceSchedules] = built.priceSchedules;
    scaffold.Objects[OCResourceEnum.Categories] = built.categories;

    // Keep the scaffold's existing catalogs (the buyer's DefaultCatalogID still points
    // at one) and add ours alongside if it's new.
    var catalogs: any[] = Array.isArray(scaffold.Objects[OCResourceEnum.Catalogs])
        ? scaffold.Objects[OCResourceEnum.Catalogs]
        : [];
    if (!catalogs.some((c) => c && c.ID === catalogId)) catalogs.push(built.catalog);
    scaffold.Objects[OCResourceEnum.Catalogs] = catalogs;

    scaffold.Assignments[OCResourceEnum.ProductCatalogAssignment] = built.productCatalogAssignments;
    scaffold.Assignments[OCResourceEnum.CategoryProductAssignments] = built.categoryProductAssignments;

    // Make sure every buyer can see the scraped catalog.
    var buyers: any[] = Array.isArray(scaffold.Objects[OCResourceEnum.Buyers])
        ? scaffold.Objects[OCResourceEnum.Buyers]
        : [];
    var catalogAssignments: any[] = Array.isArray(scaffold.Assignments[OCResourceEnum.CatalogAssignments])
        ? scaffold.Assignments[OCResourceEnum.CatalogAssignments]
        : [];
    for (var b of buyers) {
        if (!b || !b.ID) continue;
        var exists = catalogAssignments.some((a) => a.CatalogID === catalogId && a.BuyerID === b.ID);
        if (!exists) {
            catalogAssignments.push({
                CatalogID: catalogId,
                BuyerID: b.ID,
                ViewAllCategories: true,
                ViewAllProducts: true,
            });
        }
    }
    scaffold.Assignments[OCResourceEnum.CatalogAssignments] = catalogAssignments;

    return new SerializedMarketplace(scaffold);
}

// Turn scraped products into a SerializedMarketplace ready to write as a seed YAML.
export function generateSeed(products: ScrapedProduct[], opts: GenerateSeedOptions = {}): SerializedMarketplace {
    var catalogId = slugify(opts.catalogId || "scraped-products");
    var mode: SeedMode = opts.mode || "complete";
    var built = buildResources(products, catalogId, opts.imageRefs);
    return mode === "fragment"
        ? generateFragment(built, catalogId)
        : generateComplete(built, catalogId, opts.scaffoldPath);
}
