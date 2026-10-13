// Turn an arbitrary string into a value that is safe as an OrderCloud ID and as a
// file name. OrderCloud IDs only allow A-Za-z0-9_- (see Validator.validateIDChars),
// so we map everything else to a single hyphen.
export function slugify(input: string, maxLength = 90): string {
    var slug = (input || "")
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-") // collapse runs of invalid chars to one hyphen
        .replace(/^-+|-+$/g, "");    // trim leading/trailing hyphens

    if (slug.length > maxLength) {
        slug = slug.slice(0, maxLength).replace(/-+$/g, "");
    }
    return slug || "item";
}

// Ensure a slug is unique within a run by suffixing -2, -3, ... on collision.
// `seen` is mutated so callers can share one set across many items.
export function uniqueSlug(input: string, seen: Set<string>, maxLength = 90): string {
    var base = slugify(input, maxLength);
    var candidate = base;
    var counter = 2;
    while (seen.has(candidate)) {
        candidate = `${base}-${counter++}`;
    }
    seen.add(candidate);
    return candidate;
}
