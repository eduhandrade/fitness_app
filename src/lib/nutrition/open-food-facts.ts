/** Open Food Facts' legacy free-text search endpoint. There's a newer
 * recommended full-text search service (search-a-licious, at
 * search.openfoodfacts.org) with a cleaner API, but its response shape
 * isn't concretely documented anywhere reachable, and neither host could
 * be smoke-tested from this sandbox (both are blocked by the outbound
 * network policy here) — the legacy endpoint below is used because its
 * field-level shape is well-documented, not because it's preferred
 * long-term. Once this can be verified against real network access,
 * consider migrating. Rate-limited to 10 requests/minute per IP — fine for
 * a single personal app, but don't fire a request per keystroke (the
 * caller debounces).
 */
const SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";

type OpenFoodFactsProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
};

type OpenFoodFactsSearchResponse = {
  products?: OpenFoodFactsProduct[];
};

export type FoodSearchResult = {
  code: string;
  name: string;
  brand: string | null;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

export async function searchFoods(query: string, limit = 20): Promise<FoodSearchResult[]> {
  const url = new URL(SEARCH_URL);
  url.searchParams.set("search_terms", query);
  url.searchParams.set("json", "true");
  url.searchParams.set("page_size", String(limit));

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open Food Facts search failed: ${res.status} ${await res.text()}`);
  }

  const body: OpenFoodFactsSearchResponse = await res.json();
  return normalizeSearchResults(body.products ?? []);
}

/** Drops any product missing a code, a name, or a usable calorie figure —
 * every field here is community-submitted and inconsistently populated, so
 * this is the floor of what's needed to log a meaningful entry. */
function normalizeSearchResults(products: OpenFoodFactsProduct[]): FoodSearchResult[] {
  const results: FoodSearchResult[] = [];
  for (const p of products) {
    const calories = p.nutriments?.["energy-kcal_100g"];
    if (!p.code || !p.product_name || calories == null) continue;
    results.push({
      code: p.code,
      name: p.product_name,
      brand: p.brands?.split(",")[0]?.trim() || null,
      caloriesPer100g: calories,
      proteinPer100g: p.nutriments?.proteins_100g ?? 0,
      carbsPer100g: p.nutriments?.carbohydrates_100g ?? 0,
      fatPer100g: p.nutriments?.fat_100g ?? 0,
    });
  }
  return results;
}
