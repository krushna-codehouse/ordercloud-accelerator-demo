import fs from "fs";
import path from "path";
import yaml, { YAMLException } from "js-yaml";
import { Auth, Configuration, Products, Suppliers, Tokens } from "ordercloud-javascript-sdk";
import Bottleneck from "bottleneck";
import { defaultLogger, getElapsedTime, LogCallBackFunc, MessageType } from "../services/logger";
import { loadEnv } from "../services/config";
import { BuildResourceDirectory } from "../models/oc-resource-directory";
import { OCResourceEnum } from "../models/oc-resource-enum";
import { OCResource } from "../models/oc-resources";
import { JobActionType, JobGroupMetaData } from "../models/job-metadata";
import { MARKETPLACE_ID } from "../constants";
import { SerializedMarketplace } from "../models/serialized-marketplace";
import OrderCloudBulk from "../services/ordercloud-bulk";

// Roles the API client must have configured in OrderCloud to run an upload:
// ProductAdmin, PriceScheduleAdmin, CatalogAdmin, CategoryAdmin, SupplierAdmin.
// We don't pass these to Auth.ClientCredentials — requesting individual roles when
// the client is configured as FullAccess (or lacks buyer/supplier assignment) causes
// a 401 "not assigned" error. Passing no scope grants whatever the client has.

// Only these resource types are safe to upload into an existing marketplace.
// Scaffold resources (buyers, security profiles, API clients, etc.) are excluded
// because they already exist and would conflict.
const PRODUCT_RESOURCE_ALLOWLIST = new Set<string>([
    OCResourceEnum.Catalogs,
    OCResourceEnum.Categories,
    OCResourceEnum.Products,
    OCResourceEnum.PriceSchedules,
    OCResourceEnum.ProductCatalogAssignment,
    OCResourceEnum.CategoryProductAssignments,
    OCResourceEnum.CatalogAssignments,
]);

export interface UploadArgs {
    filePath: string;
    clientId?: string;
    clientSecret?: string;
    apiUrl?: string;
    marketplaceId?: string;
    supplierId?: string;
    logger?: LogCallBackFunc;
}

export interface UploadResult {
    resourcesCreated: number;
    resourcesUpdated: number;
    resourcesSkipped: number;
}

// Resource types that should be refreshed (not skipped) when they already exist, so a
// re-scrape/re-upload updates the live record - e.g. a product picking up its category,
// a better description, or a changed price.
const UPSERT_RESOURCES = new Set<string>([
    OCResourceEnum.Products,
    OCResourceEnum.PriceSchedules,
]);

// Derive the scrape source name from the YAML filename.
// "output/products/my-site-products.yml" -> "my-site"
function sourceFromFilePath(filePath: string): string {
    var base = path.basename(filePath).replace(/\.ya?ml$/i, "");
    var match = base.match(/^(.+)-products$/);
    return match ? match[1] : base;
}

// Create the supplier if it doesn't already exist.
async function ensureSupplier(supplierId: string, logger: LogCallBackFunc): Promise<void> {
    try {
        await Suppliers.Get(supplierId);
        logger(`Using existing supplier "${supplierId}".`, MessageType.Info);
    } catch (e) {
        if ((e as any)?.response?.status === 404) {
            await Suppliers.Create({ ID: supplierId, Name: supplierId, Active: true });
            logger(`Created supplier "${supplierId}".`, MessageType.Success);
        } else {
            throw e;
        }
    }
}

// For object resources (non-assignments), check if the record exists before creating it.
// Assignments use Save* (PUT) which is already idempotent — they don't need this wrapper.
async function createIfNotExists(resource: OCResource, record: any): Promise<"created" | "skipped"> {
    var getFunc = resource.sdkObject["Get"] as Function;
    var createFunc = resource.sdkObject[resource.createMethodName!] as Function;

    try {
        if (resource.parentRefField) {
            await getFunc(record[resource.parentRefField], record.ID);
        } else {
            await getFunc(record.ID);
        }
        return "skipped"; // already exists
    } catch (e) {
        if ((e as any)?.response?.status !== 404) throw e;
    }

    // 404 — safe to create
    if (resource.parentRefField) {
        await createFunc(record[resource.parentRefField], record);
    } else {
        await createFunc(record);
    }
    return "created";
}

// Run createIfNotExists for all records using the Bottleneck limiter.
async function createAllIfNotExists(
    resource: OCResource,
    records: any[],
    bulk: OrderCloudBulk
): Promise<{ created: number; skipped: number }> {
    var meta: JobGroupMetaData = {
        actionType: JobActionType.CREATE,
        resourceName: resource.name,
    };
    var results = await bulk.RunMany(meta, records, (record: any) =>
        createIfNotExists(resource, record)
    );
    var created = results.filter(r => r === "created").length;
    var skipped = results.filter(r => r === "skipped").length;
    return { created, skipped };
}

// Create the record if missing, otherwise update (PUT) the existing one so a re-upload
// refreshes its fields. Returns which action was taken.
async function createOrUpdate(resource: OCResource, record: any): Promise<"created" | "updated"> {
    var getFunc = resource.sdkObject["Get"] as Function;
    var createFunc = resource.sdkObject[resource.createMethodName!] as Function;
    var saveFunc = resource.sdkObject["Save"] as Function;

    var exists = false;
    try {
        if (resource.parentRefField) {
            await getFunc(record[resource.parentRefField], record.ID);
        } else {
            await getFunc(record.ID);
        }
        exists = true;
    } catch (e) {
        if ((e as any)?.response?.status !== 404) throw e;
    }

    if (exists) {
        // Save = PUT to the record's ID: replaces it with our latest data.
        if (resource.parentRefField) {
            await saveFunc(record[resource.parentRefField], record.ID, record);
        } else {
            await saveFunc(record.ID, record);
        }
        return "updated";
    }

    if (resource.parentRefField) {
        await createFunc(record[resource.parentRefField], record);
    } else {
        await createFunc(record);
    }
    return "created";
}

// Run createOrUpdate for all records using the Bottleneck limiter.
async function createAllOrUpdate(
    resource: OCResource,
    records: any[],
    bulk: OrderCloudBulk
): Promise<{ created: number; updated: number }> {
    var meta: JobGroupMetaData = {
        actionType: JobActionType.CREATE,
        resourceName: resource.name,
    };
    var results = await bulk.RunMany(meta, records, (record: any) =>
        createOrUpdate(resource, record)
    );
    var created = results.filter(r => r === "created").length;
    var updated = results.filter(r => r === "updated").length;
    return { created, updated };
}

// Categories must be created parents-first. Walk them depth by depth (shallowest first),
// creating any that don't yet exist at each level. Unlike a "descend only under newly
// created parents" approach, this also adds brand-new subcategories beneath categories
// that already existed from a previous upload.
async function uploadCategoriesIfNotExists(
    resource: OCResource,
    records: any[],
    bulk: OrderCloudBulk
): Promise<{ created: number; skipped: number }> {
    var byId = new Map<string, any>(records.map(r => [r.ID, r]));
    // Depth = number of ancestors that are also part of this upload.
    function depthOf(record: any): number {
        var depth = 0;
        var current = record;
        var guard = 0;
        while (current && current.ParentID && byId.has(current.ParentID) && guard++ < 1000) {
            depth++;
            current = byId.get(current.ParentID);
        }
        return depth;
    }

    var depthByrecord = new Map<any, number>();
    var maxDepth = 0;
    for (var r of records) {
        var d = depthOf(r);
        depthByrecord.set(r, d);
        if (d > maxDepth) maxDepth = d;
    }

    var totalCreated = 0;
    var totalSkipped = 0;
    for (var depth = 0; depth <= maxDepth; depth++) {
        var cohort = records.filter(rec => depthByrecord.get(rec) === depth);
        if (!cohort.length) continue;
        var meta: JobGroupMetaData = {
            actionType: JobActionType.CREATE,
            resourceName: resource.name,
        };
        var results = await bulk.RunMany(meta, cohort, (record: any) =>
            createIfNotExists(resource, record)
        );
        totalCreated += results.filter(r => r === "created").length;
        totalSkipped += results.filter(r => r === "skipped").length;
    }
    return { created: totalCreated, skipped: totalSkipped };
}

export async function upload(args: UploadArgs): Promise<UploadResult | void> {
    var {
        filePath,
        clientId,
        clientSecret,
        apiUrl,
        marketplaceId,
        supplierId,
        logger = defaultLogger,
    } = args;

    loadEnv();

    var resolvedClientId = clientId || process.env.OC_CLIENT_ID || process.env.OC_MIDDLEWARE_CLIENT_ID;
    var resolvedSecret = clientSecret || process.env.OC_CLIENT_SECRET || process.env.OC_MIDDLEWARE_CLIENT_SECRET;
    var resolvedApiUrl = apiUrl || process.env.OC_API_URL;
    var resolvedMarketplaceId = marketplaceId || process.env.OC_MARKETPLACE_ID;
    var resolvedSupplierId = supplierId || process.env.OC_SUPPLIER_ID || `${sourceFromFilePath(filePath)}-supplier`;

    if (!resolvedClientId) {
        return logger("Missing: --client-id, or set OC_CLIENT_ID / OC_MIDDLEWARE_CLIENT_ID in .env.local", MessageType.Error);
    }
    if (!resolvedSecret) {
        return logger("Missing: --client-secret, or set OC_CLIENT_SECRET / OC_MIDDLEWARE_CLIENT_SECRET in .env.local", MessageType.Error);
    }
    if (!resolvedApiUrl) {
        return logger("Missing: --api-url, or set OC_API_URL in .env.local", MessageType.Error);
    }
    if (!resolvedMarketplaceId) {
        return logger("Missing: --marketplace-id, or set OC_MARKETPLACE_ID in .env.local", MessageType.Error);
    }

    resolvedApiUrl = resolvedApiUrl.replace(/\/v1\/?$/, "");

    var stringData: string;
    try {
        stringData = fs.readFileSync(filePath, "utf8");
        logger(`Found file "${filePath}".`, MessageType.Success);
    } catch {
        return logger(`No such file "${filePath}" found.`, MessageType.Error);
    }

    var rawData: SerializedMarketplace;
    try {
        rawData = yaml.load(stringData) as SerializedMarketplace;
    } catch (e) {
        return logger(`YAML parse error in "${filePath}": ${(e as YAMLException).message}`, MessageType.Error);
    }

    Configuration.Set({ baseApiUrl: resolvedApiUrl });
    try {
        var authResponse = await Auth.ClientCredentials(resolvedSecret, resolvedClientId, [] as any);
        Tokens.SetAccessToken(authResponse.access_token);
        logger(`Authenticated to ${resolvedApiUrl} as client "${resolvedClientId}".`, MessageType.Success);
    } catch (e) {
        var errMsg = (e as any)?.response?.data?.error_description ?? (e as Error).message;
        return logger(`Authentication failed: ${errMsg}`, MessageType.Error);
    }

    try {
        await ensureSupplier(resolvedSupplierId, logger);
    } catch (e) {
        return logger(`Failed to ensure supplier "${resolvedSupplierId}": ${(e as Error).message}`, MessageType.Error);
    }

    logger(`Uploading product resources to marketplace "${resolvedMarketplaceId}" with supplier "${resolvedSupplierId}".`, MessageType.Info);

    var startTime = Date.now();
    var marketplaceData = new SerializedMarketplace(rawData);
    var bulk = new OrderCloudBulk(new Bottleneck({ minTime: 100, maxConcurrent: 8 }), logger);
    var directory = await BuildResourceDirectory();
    var totalCreated = 0;
    var totalUpdated = 0;
    var totalSkipped = 0;
    var uploadedProducts: any[] = [];

    for (var resource of directory.sort((a, b) => a.createPriority - b.createPriority)) {
        if (!PRODUCT_RESOURCE_ALLOWLIST.has(resource.name)) continue;

        var records = marketplaceData.GetRecords(resource);
        if (!records.length) continue;

        // Replace the marketplace ID placeholder.
        if (resource.hasOwnerIDField) {
            for (var rec of records) {
                if (rec[resource.hasOwnerIDField] === MARKETPLACE_ID) {
                    rec[resource.hasOwnerIDField] = resolvedMarketplaceId;
                }
            }
        }

        // Stamp DefaultSupplierID onto every product before creating it.
        if (resource.name === OCResourceEnum.Products) {
            for (var prod of records) {
                prod.DefaultSupplierID = resolvedSupplierId;
            }
            uploadedProducts = records;
        }

        var counts = { created: 0, updated: 0, skipped: 0 };

        if (resource.isAssignment) {
            // Assignments use Save* (PUT) — idempotent, no existence check needed.
            await bulk.CreateAll(resource, records);
            counts.created = records.length;
        } else if (resource.name === OCResourceEnum.Categories) {
            Object.assign(counts, await uploadCategoriesIfNotExists(resource, records, bulk));
        } else if (UPSERT_RESOURCES.has(resource.name)) {
            // Products / PriceSchedules: refresh the live record if it already exists.
            Object.assign(counts, await createAllOrUpdate(resource, records, bulk));
        } else {
            Object.assign(counts, await createAllIfNotExists(resource, records, bulk));
        }

        if (counts.created) logger(`Created ${counts.created} ${resource.name}.`, MessageType.Info);
        if (counts.updated) logger(`Updated ${counts.updated} existing ${resource.name}.`, MessageType.Info);
        if (counts.skipped) logger(`Skipped ${counts.skipped} existing ${resource.name}.`, MessageType.Info);
        totalCreated += counts.created;
        totalUpdated += counts.updated;
        totalSkipped += counts.skipped;
    }

    // ProductSupplierAssignments — SaveSupplier is a PUT, already idempotent.
    if (uploadedProducts.length) {
        var meta: JobGroupMetaData = {
            actionType: JobActionType.CREATE,
            resourceName: OCResourceEnum.ProductSupplierAssignments,
        };
        await bulk.RunMany(meta, uploadedProducts, (p: any) =>
            Products.SaveSupplier(p.ID, resolvedSupplierId, {
                defaultPriceScheduleID: p.DefaultPriceScheduleID,
            })
        );
        logger(`Saved ${uploadedProducts.length} ProductSupplierAssignments.`, MessageType.Info);
        totalCreated += uploadedProducts.length;
    }

    logger(
        `Done! Created ${totalCreated}, updated ${totalUpdated}, skipped ${totalSkipped} existing. Total elapsed time: ${getElapsedTime(startTime, Date.now())}`,
        MessageType.Done
    );
    return { resourcesCreated: totalCreated, resourcesUpdated: totalUpdated, resourcesSkipped: totalSkipped };
}
