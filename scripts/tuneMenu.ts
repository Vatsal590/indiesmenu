import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting category tuning...');

    // 1) Rename category 25 to "Burgers and Pizzas"
    const burgersPizzas = await prisma.categories.updateMany({
      where: { category_id: 25, type: 'dish' },
      data: { name: 'Burgers and Pizzas' },
    });
    console.log('Renamed category 25 to Burgers and Pizzas:', burgersPizzas.count);

    // 2) Ensure new category "Pasta/Sandwiches" exists (dish)
    const pastaSandwichesName = 'Pasta/Sandwiches';
    let pastaSandwiches = await prisma.categories.findFirst({ where: { name: pastaSandwichesName, type: 'dish' } });
    if (!pastaSandwiches) {
      pastaSandwiches = await prisma.categories.create({ data: { name: pastaSandwichesName, type: 'dish' } });
      console.log('Created new category:', pastaSandwiches);
    } else {
      console.log('Found existing category:', pastaSandwiches);
    }

    // Category IDs we need
    const VIANDES_ID = 27;
    const KIDS_ID = 29;
    const PASTA_SANDWICHES_ID = pastaSandwiches.category_id;

    // 3) Build map of dish names to ids
    const dishes = await prisma.dishes.findMany();
    const nameToDishId = new Map<string, number>();
    dishes.forEach(d => nameToDishId.set(d.name.toUpperCase(), d.dish_id));

    // Helper to get dish id by name safely
    const id = (n: string) => {
      const did = nameToDishId.get(n.toUpperCase());
      if (!did) console.warn('Dish not found:', n);
      return did;
    };

    // 4) Define which dishes must remain in VIANDES
    const viandesKeepNames = [
      'KOREAN BBQ CHICKEN',
      'CHICKEN CUTLET',
      'DRUMS OF SEVEN',
      'CHICKEN SEEKH KABAB',
      'FISH CHILLY DRY (BASA FISH)',
      'CRAZY CHILLY CHICKEN DRY',
    ];
    const viandesKeepIds = viandesKeepNames.map(id).filter(Boolean) as number[];

    // 5) Move BABY CORN CHILLY DRY and PANEER CHILLY DRY to KIDS
    const kidsMoveNames = [
      'BABY CORN CHILLY DRY',
      'PANEER CHILLY DRY',
    ];
    const kidsMoveIds = kidsMoveNames.map(id).filter(Boolean) as number[];

    // 6) Current VIANDES assignments
    const viandesLinks = await prisma.categories_dishes.findMany({ where: { category_id: VIANDES_ID } });
    const viandesCurrentIds = new Set(viandesLinks.map(l => l.dish_id));

    // Determine which to remove from VIANDES
    const viandesRemoveIds: number[] = [];
    viandesCurrentIds.forEach(did => {
      if (!viandesKeepIds.includes(did) && !kidsMoveIds.includes(did)) {
        viandesRemoveIds.push(did);
      }
    });

    // 7) Reassign removed-from-VIANDES dishes to Pasta/Sandwiches
    for (const dishId of viandesRemoveIds) {
      await prisma.categories_dishes.deleteMany({ where: { category_id: VIANDES_ID, dish_id: dishId } });
      const exists = await prisma.categories_dishes.findFirst({ where: { category_id: PASTA_SANDWICHES_ID, dish_id: dishId } });
      if (!exists) {
        await prisma.categories_dishes.create({ data: { category_id: PASTA_SANDWICHES_ID, dish_id: dishId } });
      }
    }
    console.log('Moved from VIANDES to Pasta/Sandwiches:', viandesRemoveIds.length);

    // 8) Ensure keepIds are linked to VIANDES (idempotent)
    for (const dishId of viandesKeepIds) {
      const exists = await prisma.categories_dishes.findFirst({ where: { category_id: VIANDES_ID, dish_id: dishId } });
      if (!exists) await prisma.categories_dishes.create({ data: { category_id: VIANDES_ID, dish_id: dishId } });
    }

    // 9) Move baby/paneer chilly to KIDS
    for (const dishId of kidsMoveIds) {
      // Remove from any other categories where needed (specifically VIANDES)
      await prisma.categories_dishes.deleteMany({ where: { category_id: VIANDES_ID, dish_id: dishId } });
      const exists = await prisma.categories_dishes.findFirst({ where: { category_id: KIDS_ID, dish_id: dishId } });
      if (!exists) await prisma.categories_dishes.create({ data: { category_id: KIDS_ID, dish_id: dishId } });
    }
    console.log('Moved to KIDS:', kidsMoveNames);

    console.log('Category tuning complete.');
  } catch (e) {
    console.error('Error tuning categories:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 