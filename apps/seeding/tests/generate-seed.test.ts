import { generateSeed } from "../src/scraping/generate-seed";
import { ScrapedProduct } from "../src/scraping/types";
import { ImageRef } from "../src/scraping/image-downloader";

const products: ScrapedProduct[] = [
    {
        externalId: "sony-xm5",
        name: "Sony WH-1000XM5",
        description: "NC headphones",
        price: 449,
        currency: "AUD",
        imageUrls: ["https://src.example/a.jpg"],
        categoryName: "Headphones",
        sku: "X",
    },
    {
        externalId: "ipad-air",
        name: "iPad Air",
        price: 999,
        currency: "AUD",
        imageUrls: [],
    },
];

const imageRefs = new Map<string, ImageRef>([
    [
        "https://src.example/a.jpg",
        { sourceUrl: "https://src.example/a.jpg", fileName: "a.jpg", hostedUrl: "https://cdn.example.com/a.jpg" },
    ],
]);

test("fragment mode emits product resources only", () => {
    const mp: any = generateSeed(products, { mode: "fragment", catalogId: "scraped-products", imageRefs });

    expect(mp.Objects.Products.length).toBe(2);
    expect(mp.Objects.PriceSchedules.length).toBe(2);
    expect(mp.Objects.Catalogs.length).toBe(1);
    expect(mp.Objects.Catalogs[0].ID).toBe("scraped-products");
    expect(mp.Objects.Categories.length).toBe(1); // only the first product has a category

    // images mapped to their hosted URLs; ownerID uses the seeding placeholder
    expect(mp.Objects.Products[0].xp.Images[0].url).toBe("https://cdn.example.com/a.jpg");
    expect(mp.Objects.Products[0].OwnerID).toBe("<MarketplaceID placeholder>");

    // each product points at its own price schedule
    expect(mp.Objects.Products[0].DefaultPriceScheduleID).toBe(mp.Objects.PriceSchedules[0].ID);
    expect(mp.Objects.PriceSchedules[0].PriceBreaks[0].Price).toBe(449);

    // assignments wire products to the catalog + category
    expect(mp.Assignments.ProductCatalogAssignment.length).toBe(2);
    expect(mp.Assignments.CategoryProductAssignments.length).toBe(1);

    // no marketplace scaffolding in fragment mode
    expect(mp.Objects.SecurityProfiles).toBeUndefined();
});

test("complete mode overlays products on the Simple-B2C scaffold", () => {
    const mp: any = generateSeed(products, { mode: "complete", catalogId: "scraped-products", imageRefs });

    // scaffold infrastructure is preserved
    expect(mp.Objects.SecurityProfiles.length).toBeGreaterThan(0);
    expect(mp.Objects.Buyers.length).toBeGreaterThan(0);

    // scraped products swapped in; product-dependent scaffold collections cleared
    expect(mp.Objects.Products.length).toBe(2);
    expect(mp.Objects.Specs).toEqual([]);
    expect(mp.Assignments.SpecProductAssignments).toEqual([]);

    // our catalog is added and assigned to every buyer so products are visible
    expect(mp.Objects.Catalogs.some((c: any) => c.ID === "scraped-products")).toBe(true);
    const buyerId = mp.Objects.Buyers[0].ID;
    expect(
        mp.Assignments.CatalogAssignments.some(
            (a: any) => a.CatalogID === "scraped-products" && a.BuyerID === buyerId
        )
    ).toBe(true);
});

test("product IDs are slugified and de-duplicated", () => {
    const dupes: ScrapedProduct[] = [
        { externalId: "My Product!", name: "A", price: 1, currency: "AUD", imageUrls: [] },
        { externalId: "My Product!", name: "B", price: 2, currency: "AUD", imageUrls: [] },
    ];
    const mp: any = generateSeed(dupes, { mode: "fragment" });
    const ids = mp.Objects.Products.map((p: any) => p.ID);
    expect(ids[0]).toBe("my-product");
    expect(ids[1]).toBe("my-product-2");
});
