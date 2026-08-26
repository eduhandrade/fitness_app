/** Seeds (upserts) the shared Food catalog — a curated set of common
 * Brazilian foods, so search works instantly and reliably without
 * depending on Open Food Facts being reachable. Idempotent by design (each
 * entry is keyed by its unique `name`), so this is safe to run on every
 * deploy — see the `build` script in package.json. Run standalone with
 * `npx tsx prisma/seed-foods.ts`.
 *
 * Nutrition values are reasonable everyday approximations (in the spirit of
 * Brazil's TACO food composition table), not laboratory-verified figures —
 * a starting catalog meant to be extended over time, the same caveat that
 * applies to any crowd-sourced food database (including MyFitnessPal's or
 * Open Food Facts'). `defaultQuantity`/`defaultUnit` is the everyday
 * serving shown in search results and used for the one-tap "+" quick-add. */
import { normalizeSearchText } from "../src/lib/nutrition/search-text";
import type { FoodUnit, NutritionBasis } from "../src/generated/prisma/enums";

// Loaded lazily (below, in main()) via a dynamic import — ../src/lib/prisma
// reads process.env.DATABASE_URL at module-evaluation time, and static
// imports are hoisted ahead of the process.loadEnvFile() call below
// regardless of source order, so a static import here would run too early
// to see .env when this script is invoked directly (`npx tsx
// prisma/seed-foods.ts`) rather than through the Prisma CLI (which loads
// .env itself before spawning `prisma db seed`). In production this isn't
// an issue — the platform injects real env vars before the build even
// starts — but local/manual runs need this.
try {
  process.loadEnvFile();
} catch {
  // no .env file present (e.g. CI, or production where env vars are injected directly)
}

type SeedFood = {
  name: string;
  brand?: string;
  basis: NutritionBasis;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  defaultQuantity: number;
  defaultUnit: FoodUnit;
};

const G = (
  name: string,
  calories: number,
  proteinG: number,
  carbsG: number,
  fatG: number,
  defaultQuantity = 100,
  brand?: string
): SeedFood => ({
  name,
  brand,
  basis: "PER_100G",
  calories,
  proteinG,
  carbsG,
  fatG,
  defaultQuantity,
  defaultUnit: "GRAM",
});

const U = (
  name: string,
  calories: number,
  proteinG: number,
  carbsG: number,
  fatG: number
): SeedFood => ({
  name,
  basis: "PER_UNIT",
  calories,
  proteinG,
  carbsG,
  fatG,
  defaultQuantity: 1,
  defaultUnit: "UNIT",
});

/** For condiments/spreads/oils normally served "by the spoonful" — still
 * PER_100G basis (so the existing gram-based math applies via the volume
 * unit's water-density approximation), just with a spoon/cup as the
 * everyday default serving instead of 100g. */
const SPOON = (
  name: string,
  calories: number,
  proteinG: number,
  carbsG: number,
  fatG: number,
  defaultUnit: Extract<FoodUnit, "TABLESPOON" | "TEASPOON" | "CUP"> = "TABLESPOON",
  defaultQuantity = 1
): SeedFood => ({
  name,
  basis: "PER_100G",
  calories,
  proteinG,
  carbsG,
  fatG,
  defaultQuantity,
  defaultUnit,
});

const FOODS: SeedFood[] = [
  // --- Grãos, massas e tubérculos (per 100g, cooked) ---
  G("Arroz branco cozido", 128, 2.5, 28, 0.2, 100),
  G("Arroz integral cozido", 124, 2.6, 25.8, 1, 100),
  G("Feijão carioca cozido", 76, 4.8, 13.6, 0.5, 90),
  G("Feijão preto cozido", 77, 4.5, 14, 0.5, 90),
  G("Lentilha cozida", 93, 6.3, 16.3, 0.4, 100),
  G("Grão de bico cozido", 121, 7, 20, 2, 100),
  G("Macarrão cozido", 111, 3.9, 22.7, 0.7, 120),
  G("Aveia em flocos", 394, 13.9, 67, 8.5, 30),
  G("Quinoa cozida", 120, 4.4, 21.3, 1.9, 100),
  G("Batata cozida", 87, 1.9, 20.1, 0.1, 150),
  G("Batata doce cozida", 92, 1.6, 21.5, 0.1, 150),
  G("Mandioca cozida", 125, 0.6, 30, 0.3, 100),
  G("Polenta cozida", 88, 1.9, 18.6, 0.6, 100),
  G("Farofa pronta", 411, 2.6, 65.9, 15, 30),
  G("Purê de batata", 96, 1.9, 15.6, 3, 120),

  // --- Carnes, aves e peixes (per 100g, cooked) ---
  G("Frango grelhado (peito)", 165, 31, 0, 3.6, 120),
  G("Frango desfiado cozido", 159, 28.9, 0, 4.3, 100),
  G("Coxa de frango assada", 209, 26.3, 0, 10.9, 100),
  G("Carne bovina moída refogada", 215, 26, 0, 12, 100),
  G("Filé mignon grelhado", 201, 30, 0, 8.4, 120),
  G("Carne de panela", 219, 27, 1, 11.5, 120),
  G("Picanha grelhada", 289, 25, 0, 20.6, 120),
  G("Tilápia grelhada", 129, 26.1, 0, 2.7, 120),
  G("Salmão grelhado", 208, 22.1, 0, 12.4, 120),
  G("Camarão cozido", 99, 20.9, 0.2, 1.1, 100),
  G("Linguiça toscana grelhada", 279, 15.1, 1.5, 23.5, 80),
  G("Bacon frito", 541, 37, 1.4, 42, 20),
  G("Peito de peru fatiado", 90, 17, 2.5, 1, 30),
  G("Presunto fatiado", 130, 17, 1.5, 5.5, 20),

  // --- Ovos ---
  U("Ovo cozido", 78, 6.3, 0.6, 5.3),
  U("Ovo frito", 92, 6.8, 0.5, 7),
  U("Ovo mexido", 90, 6.5, 1, 6.8),
  U("Omelete simples (2 ovos)", 182, 13, 1.5, 13.6),

  // --- Laticínios ---
  G("Leite integral", 61, 3.2, 4.5, 3.3, 200),
  G("Leite desnatado", 35, 3.4, 5, 0.2, 200),
  G("Iogurte natural", 61, 3.5, 4.7, 3.3, 170),
  G("Iogurte natural desnatado (Itambé, pote 170g)", 39, 4.1, 5.8, 0.1, 170, "Itambé"),
  G("Iogurte grego", 97, 9, 3.6, 5, 100),
  U("Fatia de queijo mussarela", 85, 6.2, 0.6, 6.5),
  U("Fatia de queijo prato", 85, 5.6, 0.5, 6.9),
  G("Queijo minas frescal", 264, 17.4, 3.2, 20.2, 40),
  U("Requeijão (colher de sopa)", 45, 1.1, 0.6, 4.2),
  U("Manteiga (colher de sopa)", 102, 0.1, 0, 11.5),
  U("Cream cheese (colher de sopa)", 51, 1, 0.8, 5),

  // --- Pães e frios ---
  U("Pão francês", 150, 4.7, 28.5, 1.5),
  U("Fatia de pão de forma", 70, 2.3, 12.8, 1),
  U("Fatia de pão integral", 69, 2.9, 12, 1),
  U("Pão de queijo", 130, 3, 12.5, 7.5),
  U("Tapioca simples", 130, 0.1, 32, 0.1),
  U("Torrada", 30, 0.8, 5.8, 0.4),
  U("Fatia de mortadela", 88, 3.4, 1, 7.8),

  // --- Frutas ---
  U("Banana", 89, 1.1, 22.8, 0.3),
  U("Maçã", 78, 0.4, 20.6, 0.3),
  U("Laranja", 62, 1.2, 15.4, 0.2),
  U("Manga", 99, 0.8, 25, 0.4),
  U("Pera", 96, 0.6, 25.7, 0.2),
  U("Mamão papaia (fatia)", 43, 0.5, 11, 0.1),
  U("Abacaxi (fatia)", 41, 0.4, 10.9, 0.1),
  G("Melancia", 33, 0.6, 8.3, 0.2, 150),
  G("Uva", 69, 0.6, 18.1, 0.2, 100),
  G("Morango", 32, 0.7, 7.7, 0.3, 100),
  G("Abacate", 160, 2, 8.5, 14.7, 100),

  // --- Vegetais e legumes ---
  G("Brócolis cozido", 35, 2.4, 7.2, 0.4, 100),
  G("Couve refogada", 92, 2.4, 6, 7, 80),
  G("Cenoura cozida", 35, 0.8, 8.2, 0.2, 80),
  G("Abobrinha refogada", 53, 1.4, 8.6, 1.6, 100),
  G("Berinjela grelhada", 40, 1, 8.7, 0.5, 100),
  G("Vagem cozida", 35, 1.9, 7.6, 0.2, 80),
  G("Alface", 15, 1.4, 2.9, 0.2, 50),
  U("Tomate", 22, 1.1, 4.8, 0.2),
  G("Cebola", 40, 1.1, 9.3, 0.1, 50),
  G("Pepino", 15, 0.7, 3.6, 0.1, 100),
  G("Milho verde cozido", 98, 3.4, 21, 1.5, 80),

  // --- Lanches e doces ---
  U("Fatia de bolo de chocolate", 260, 3.5, 34, 12.5),
  U("Brigadeiro", 65, 0.6, 8.5, 3),
  U("Pão de mel", 140, 1.8, 25, 3.5),
  U("Biscoito de água e sal (unidade)", 17, 0.4, 3, 0.4),
  U("Bolacha recheada (unidade)", 70, 0.7, 10, 3),
  G("Chocolate ao leite", 545, 7.6, 59.4, 31, 25),
  U("Barra de cereal", 95, 1.3, 18, 2.3),
  G("Amendoim torrado", 567, 25.8, 16.1, 49.2, 30),
  G("Castanha de caju", 553, 18.2, 30.2, 43.9, 30),
  G("Pipoca (sem manteiga)", 375, 11, 74, 4.5, 30),

  // --- Bebidas ---
  U("Copo de suco de laranja natural (200ml)", 90, 1.4, 20.8, 0.4),
  U("Lata de refrigerante (350ml)", 140, 0, 36, 0),
  U("Xícara de café sem açúcar", 2, 0.3, 0, 0),
  U("Lata de cerveja (350ml)", 152, 1.4, 12.7, 0),
  U("Água de coco (copo 200ml)", 38, 0.4, 8.8, 0),

  // --- Pratos prontos e fast food ---
  U("Fatia de pizza de mussarela", 272, 12, 33.6, 10.4),
  U("Coxinha de frango", 210, 7.5, 20, 11.5),
  U("Pastel de carne (unidade)", 290, 8, 27, 17),
  U("Esfiha de carne aberta", 170, 7, 18, 7.5),
  U("Hambúrguer artesanal (unidade)", 450, 25, 30, 24),
  U("X-burguer (unidade)", 400, 20, 32, 20),
  G("Feijoada", 145, 9.5, 12, 7, 200),
  G("Strogonoff de frango", 165, 12, 8, 9.5, 150),
  U("Fatia de lasanha à bolonhesa", 320, 16, 28, 15.5),
  G("Yakisoba de frango", 120, 7, 15, 3.5, 200),

  // --- Grãos e massas (extra) ---
  G("Nhoque cozido", 156, 3.7, 31, 1.5, 150),
  G("Cuscuz paulista", 112, 2.1, 24, 0.6, 100),
  G("Cuscuz de milho (nordestino)", 105, 2.4, 22.3, 0.7, 100),
  G("Feijão branco cozido", 130, 8.5, 24, 0.5, 90),
  G("Feijão fradinho cozido", 116, 7.7, 20.8, 0.6, 90),
  G("Ervilha cozida", 81, 5.4, 14.5, 0.4, 80),
  G("Granola", 471, 10, 64, 20, 30),
  G("Muesli", 360, 9, 66, 6, 40),
  G("Risoto de camarão", 155, 8, 20, 4.5, 200),

  // --- Carnes, aves e peixes (extra) ---
  G("Costela bovina assada", 235, 24, 0, 15, 120),
  G("Cupim assado", 258, 23, 0, 18, 120),
  G("Maminha grelhada", 187, 29, 0, 7.5, 120),
  G("Fraldinha grelhada", 205, 27, 0, 10.5, 120),
  G("Alcatra grelhada", 179, 30, 0, 6, 120),
  G("Contrafilé grelhado", 195, 29, 0, 8, 120),
  G("Lombo suíno assado", 210, 27, 0, 11, 120),
  G("Costelinha suína assada", 280, 22, 0, 21, 120),
  G("Costela de porco sem gordura", 178, 26, 0, 7.5, 120),
  G("Coração de frango grelhado", 219, 21, 0.1, 14.5, 80),
  G("Fígado bovino grelhado", 175, 26, 3.9, 4.9, 100),
  G("Carne seca (charque) cozida", 240, 33, 0, 11, 80),
  G("Peixe frito (posta)", 195, 22, 6, 9, 120),
  G("Bacalhau cozido", 105, 23, 0, 0.9, 120),
  G("Sardinha grelhada", 208, 24.6, 0, 11.5, 100),
  U("Atum em lata (água)", 100, 22, 0, 1),
  U("Atum em lata (óleo)", 180, 21, 0, 10),
  G("Polvo cozido", 82, 15, 2.2, 1, 100),
  G("Lula grelhada", 92, 15.6, 3.1, 1.4, 100),

  // --- Laticínios (extra) ---
  U("Leite condensado (colher de sopa)", 61, 1.5, 10.4, 1.6),
  U("Creme de leite (colher de sopa)", 30, 0.4, 0.6, 3),
  U("Dose de whey protein (scoop)", 120, 24, 3, 1.5),
  U("Leite fermentado (Yakult)", 51, 0.7, 11.6, 0.1),
  U("Petit suisse", 60, 2.2, 8.5, 1.8),
  U("Queijo parmesão ralado (colher de sopa)", 22, 2, 0.2, 1.5),
  U("Queijo coalho grelhado", 280, 20, 1.5, 21),
  G("Ricota", 140, 11, 3.4, 8, 50),

  // --- Pães e frios (extra) ---
  U("Croissant", 231, 4.7, 26.1, 12),
  U("Pão sírio", 105, 3.5, 20.8, 1),
  U("Pão careca (hambúrguer)", 130, 4.2, 22, 2.5),
  U("Fatia de rosca doce", 95, 2.3, 17, 2),
  U("Sanduíche natural", 210, 9, 26, 7.5),

  // --- Frutas (extra) ---
  U("Kiwi", 42, 0.8, 10.1, 0.4),
  U("Ameixa", 30, 0.5, 7.5, 0.2),
  U("Pêssego", 39, 0.9, 9.5, 0.3),
  U("Goiaba", 68, 2.6, 14.3, 0.6),
  U("Caqui", 70, 0.6, 18.6, 0.2),
  G("Coco (polpa)", 354, 3.3, 15.2, 33.5, 50),
  U("Tangerina/mexerica", 53, 0.8, 13.3, 0.3),
  G("Melão (fatia)", 34, 0.8, 8.2, 0.2, 150),
  G("Maracujá (polpa)", 68, 2, 13.4, 2.4, 60),
  G("Açaí (polpa, sem açúcar)", 58, 0.8, 6.2, 3.9, 100),
  G("Frutas secas (mix)", 340, 4, 65, 9, 30),
  G("Damasco seco", 241, 3.4, 62.6, 0.5, 30),
  G("Uva passa", 299, 3.1, 79.2, 0.5, 30),

  // --- Vegetais e legumes (extra) ---
  G("Repolho cru", 25, 1.3, 5.8, 0.1, 80),
  G("Pimentão cru", 31, 1, 7.3, 0.3, 60),
  G("Chuchu cozido", 24, 0.6, 5.5, 0.1, 100),
  G("Beterraba cozida", 44, 1.7, 10, 0.2, 80),
  G("Quiabo refogado", 45, 2.4, 8.9, 0.6, 80),
  G("Espinafre refogado", 45, 3.4, 4.9, 1.9, 80),
  G("Rúcula", 25, 2.6, 3.7, 0.7, 30),
  G("Agrião", 15, 1.7, 2.3, 0.2, 30),
  G("Palmito", 26, 2.2, 4.2, 0.3, 60),
  U("Azeitona (10 unidades)", 45, 0.3, 1.2, 4.5),
  G("Aspargos grelhados", 25, 2.5, 3.9, 0.2, 80),
  G("Cogumelo (champignon) refogado", 28, 2.9, 3.7, 0.6, 60),

  // --- Lanches e doces (extra) ---
  G("Sorvete (bola)", 207, 3.5, 23.6, 11, 60),
  U("Picolé de fruta", 65, 0.5, 16, 0.1),
  U("Fatia de pudim", 180, 4.5, 26, 6.5),
  U("Mousse de maracujá (porção)", 150, 2.5, 20, 6.5),
  U("Fatia de torta de limão", 290, 4, 34, 15),
  U("Paçoca", 96, 2.3, 9.4, 5.8),
  U("Rapadura (pedaço)", 108, 0.1, 27.9, 0),
  U("Fatia de goiabada", 96, 0.1, 23.6, 0),
  U("Doce de leite (colher de sopa)", 65, 0.8, 12.5, 1.4),
  U("Bala de goma (unidade)", 11, 0, 2.8, 0),
  U("Wafer recheado", 60, 0.6, 8.5, 2.8),
  U("Cookie (unidade)", 120, 1.5, 17, 5.5),
  U("Panqueca americana (unidade)", 90, 2.4, 14, 2.6),
  U("Waffle (unidade)", 220, 5.5, 25, 10.5),

  // --- Bebidas (extra) ---
  G("Suco de uva integral (copo 200ml)", 60, 0.3, 15, 0, 200),
  G("Vitamina de banana (copo 250ml)", 110, 4, 18, 2.5, 250),
  U("Chá sem açúcar (xícara)", 1, 0, 0.2, 0),
  G("Achocolatado pronto (copo 200ml)", 85, 3, 13, 2.5, 200),
  U("Lata de energético (250ml)", 115, 0, 28, 0),
  G("Isotônico (garrafa 500ml)", 24, 0, 6, 0, 500),
  G("Leite de amêndoas (copo 200ml)", 30, 1, 1, 2.4, 200),
  U("Xícara de café com leite", 40, 1.6, 3.8, 2),
  U("Xícara de cappuccino", 70, 3, 6, 3.5),
  U("Taça de vinho tinto (150ml)", 125, 0.1, 3.8, 0),

  // --- Pratos prontos e fast food (extra) ---
  G("Nhoque ao sugo (porção)", 130, 3, 24, 2.5, 200),
  G("Moqueca de peixe (porção)", 140, 14, 5, 7.5, 250),
  G("Baião de dois (porção)", 160, 6.5, 24, 4, 200),
  G("Vatapá (porção)", 210, 6, 15, 14, 150),
  U("Acarajé", 250, 7, 20, 16),
  U("Tapioca recheada (queijo e presunto)", 220, 8, 34, 6),
  U("Wrap de frango", 280, 18, 30, 9.5),
  G("Salada Caesar com frango (porção)", 145, 12, 5, 9, 200),
  U("Peça de sushi (nigiri)", 48, 2.5, 7.5, 0.7),
  U("Temaki", 320, 12, 45, 9),
  U("Nugget de frango (unidade)", 55, 3, 3.5, 3.2),
  G("Batata frita (porção pequena)", 312, 3.4, 41, 15, 100),
  G("Anéis de cebola (porção)", 280, 3.5, 32, 15, 100),
  U("Espetinho de churrasco", 180, 20, 0, 10.5),
  U("Kibe frito", 205, 9, 15, 12),
  U("Risole (unidade)", 150, 4, 16, 8),
  U("Empada (unidade)", 230, 5, 22, 13.5),
  U("Fatia de torta salgada", 210, 6, 20, 12),
  G("Sopa de legumes (porção)", 45, 1.5, 8, 0.8, 250),
  G("Caldo verde (porção)", 95, 3, 11, 4.5, 250),
  G("Canja de galinha (porção)", 70, 6, 8, 1.5, 250),

  // --- Condimentos, óleos e adoçantes ---
  SPOON("Azeite de oliva (colher de sopa)", 884, 0, 0, 100),
  SPOON("Óleo de soja (colher de sopa)", 884, 0, 0, 100),
  SPOON("Molho de tomate (colher de sopa)", 29, 1.2, 5.4, 0.4),
  SPOON("Maionese (colher de sopa)", 680, 1, 2, 75),
  SPOON("Ketchup (colher de sopa)", 101, 1.2, 25.8, 0.1),
  SPOON("Mostarda (colher de sopa)", 66, 4.4, 5.8, 3.3),
  SPOON("Molho shoyu (colher de sopa)", 60, 6, 6, 0),
  G("Vinagrete (porção)", 30, 0.7, 5, 1, 60),
  SPOON("Açúcar (colher de sopa)", 387, 0, 100, 0),
  U("Adoçante (gotas)", 0, 0, 0, 0),
  SPOON("Mel (colher de sopa)", 304, 0.3, 82.4, 0),
  SPOON("Geleia de fruta (colher de sopa)", 250, 0.4, 62, 0.1),
];

async function main() {
  const { prisma } = await import("../src/lib/prisma");

  try {
    for (const food of FOODS) {
      const searchName = normalizeSearchText(food.name);
      await prisma.food.upsert({
        where: { name: food.name },
        update: {
          searchName,
          brand: food.brand ?? null,
          basis: food.basis,
          calories: food.calories,
          proteinG: food.proteinG,
          carbsG: food.carbsG,
          fatG: food.fatG,
          defaultQuantity: food.defaultQuantity,
          defaultUnit: food.defaultUnit,
        },
        create: {
          name: food.name,
          searchName,
          brand: food.brand ?? null,
          basis: food.basis,
          calories: food.calories,
          proteinG: food.proteinG,
          carbsG: food.carbsG,
          fatG: food.fatG,
          defaultQuantity: food.defaultQuantity,
          defaultUnit: food.defaultUnit,
        },
      });
    }

    console.log(`Seeded ${FOODS.length} foods into the catalog.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
