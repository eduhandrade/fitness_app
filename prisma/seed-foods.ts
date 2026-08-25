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
  defaultQuantity = 100
): SeedFood => ({
  name,
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
