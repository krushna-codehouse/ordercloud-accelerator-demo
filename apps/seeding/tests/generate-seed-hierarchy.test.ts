import { generateSeed } from "../src/scraping/generate-seed";
import { OCResourceEnum } from "../src/models/oc-resource-enum";
import { ScrapedProduct } from "../src/scraping/types";

function product(over: Partial<ScrapedProduct>): ScrapedProduct {
    return {
        externalId: "x",
        name: "Product",
        price: 10,
        currency: "AUD",
        imageUrls: [],
        ...over,
    };
}

// Two products that share the top of their category trail but diverge at the leaf.
const products: ScrapedProduct[] = [
    product({
        externalId: "132426",
        name: "Creeper",
        categoryPath: [
            { id: "442", name: "Tools & Garage" },
            { id: "608", name: "Workshop Equipment" },
            { id: "630", name: "Work Station & Associated" },
        ],
    }),
    product({
        externalId: "TO33076",
        name: "Socket Rails",
        categoryPath: [
            { id: "442", name: "Tools & Garage" }, // shared root - must NOT be duplicated
            { id: "611", name: "Hand Tools" },
        ],
    }),
];

test("builds a deduped category hierarchy and assigns products to every level", () => {
    const mp = generateSeed(products, { mode: "fragment", catalogId: "demo-catalog" });
    const categories = (mp.Objects as any)[OCResourceEnum.Categories] as any[];
    const assignments = (mp.Assignments as any)[OCResourceEnum.CategoryProductAssignments] as any[];

    // 4 distinct categories: Tools & Garage (shared), Workshop Equipment, Work Station, Hand Tools
    expect(categories.length).toBe(4);

    const byId = new Map(categories.map((c) => [c.ID, c]));
    const root = categories.find((c) => c.Name === "Tools & Garage");
    const workshop = categories.find((c) => c.Name === "Workshop Equipment");
    const workStation = categories.find((c) => c.Name === "Work Station & Associated");
    const handTools = categories.find((c) => c.Name === "Hand Tools");

    // Parent chain is wired correctly.
    expect(root.ParentID).toBeNull();
    expect(workshop.ParentID).toBe(root.ID);
    expect(workStation.ParentID).toBe(workshop.ID);
    expect(handTools.ParentID).toBe(root.ID);

    // Direct-child counts are filled in (root has Workshop + Hand Tools).
    expect(root.ChildCount).toBe(2);
    expect(workshop.ChildCount).toBe(1);
    expect(workStation.ChildCount).toBe(0);

    // Each product is assigned to every level of its path (browsable at any depth).
    const creeperCats = assignments.filter((a) => a.ProductID === "132426").map((a) => a.CategoryID);
    expect(creeperCats.sort()).toEqual([root.ID, workshop.ID, workStation.ID].sort());

    const socketCats = assignments.filter((a) => a.ProductID === "to33076").map((a) => a.CategoryID);
    expect(socketCats.sort()).toEqual([root.ID, handTools.ID].sort());

    // Every assignment points at a real category in the same catalog.
    for (const a of assignments) {
        expect(byId.has(a.CategoryID)).toBe(true);
        expect(a.CatalogID).toBe("demo-catalog");
    }
});

test("falls back to a flat category when only categoryName is present", () => {
    const mp = generateSeed([product({ externalId: "p1", categoryName: "Headphones" })], {
        mode: "fragment",
        catalogId: "jb",
    });
    const categories = (mp.Objects as any)[OCResourceEnum.Categories] as any[];
    expect(categories.length).toBe(1);
    expect(categories[0].Name).toBe("Headphones");
    expect(categories[0].ParentID).toBeNull();
});
