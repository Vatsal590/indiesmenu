import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// New menu items with their prices in rupees
const newMenuItems = [
  { name: 'AL FUNGI RISSOTO', price: 699 },
  { name: 'KOREAN BBQ CHICKEN', price: 499 },
  { name: 'Kids noodles veg', price: 349 },
  { name: 'CURRY WALA MOMO', price: 399 },
  { name: 'ASPARAGUS CHEESE SUSHI', price: 549 },
  { name: 'CHICKEN CUTLET', price: 299 },
  { name: 'Drums of Seven', price: 469 },
  { name: 'PRAWN KATSU SUSHI', price: 589 },
  { name: 'AVACADO CREAM CHEESE SUSHI', price: 599 },
  { name: 'PANEER MAKHANI PIZZA LARGE', price: 699 },
  { name: 'FETTUCINI IN MUSHROOM TRUFFLE SAUCE', price: 599 },
  { name: 'SPEGHETI BOLOGNESE', price: 699 },
  { name: 'ARRABIATA PENNE CHICKEN', price: 549 },
  { name: 'ARRABIATA PENNE VEG', price: 499 },
  { name: 'PENNE AL COSIO', price: 519 },
  { name: 'UDON NOODLES CHICKEN BOWL (COMBO)', price: 419 },
  { name: 'RAMEN DRY VEG', price: 449 },
  { name: 'BUCKWHEAT NOODLES (VEG)', price: 429 },
  { name: 'RAMEN DRY CHICKEN', price: 489 },
  { name: 'UDON NOODLES WITH FIVE SPICE PANEER BOWL (COMBO)', price: 389 },
  { name: 'AVACADO BURRATA OPE EYE TOAST (SANDWICH)', price: 399 }, // Estimated price
  { name: 'OPEN VEG BURGER', price: 299 },
  { name: 'SEAFOOD CHARCOAL FETTUCCINE', price: 689 },
  { name: 'CHICKEN SEEKH KABAB', price: 449 },
  { name: 'PANEER TIKKA KABAB', price: 489 },
  { name: 'CLASSIC MARGHERITA PIZZA', price: 649 },
  { name: 'ALL FUNGI PIZZA', price: 549 },
  { name: 'CORN MARGHERITA PIZZA', price: 649 },
  { name: 'SPICY COTTAGE CHEESE PIZZA', price: 549 },
  { name: 'CRAZY CHILLY CHICKEN DRY', price: 499 },
  { name: 'FISH CHILLY DRY (BASA FISH)', price: 539 },
  { name: 'BBQ CHICKEN PIZZA', price: 699 },
  { name: 'BABY CORN CHILLY DRY', price: 369 },
  { name: 'PANEER CHILLY DRY', price: 419 }
];

// Category mappings for the new menu items - using correct food category IDs
const categoryMappings = {
  'RISSOTO': 27, // VIANDES
  'CHICKEN': 27, // VIANDES
  'MOMO': 21, // FINGER FOOD
  'SUSHI': 21, // FINGER FOOD
  'PIZZA': 25, // BURGERS avec FRITES MAISON
  'PASTA': 27, // VIANDES (for pasta dishes)
  'NOODLES': 27, // VIANDES
  'BURGER': 25, // BURGERS avec FRITES MAISON
  'KABAB': 21, // FINGER FOOD
  'CHILLY': 27, // VIANDES
  'Kids': 29, // KIDS MENU
  'DEFAULT': 27 // VIANDES as default
};

function getCategoryId(itemName: string): number {
  const upperName = itemName.toUpperCase();
  
  if (upperName.includes('KIDS')) return 29; // KIDS MENU
  if (upperName.includes('PIZZA')) return 25; // BURGERS avec FRITES MAISON
  if (upperName.includes('RISSOTO')) return 27; // VIANDES
  if (upperName.includes('CHICKEN')) return 27; // VIANDES
  if (upperName.includes('MOMO')) return 21; // FINGER FOOD
  if (upperName.includes('SUSHI')) return 21; // FINGER FOOD
  if (upperName.includes('FETTUCINI') || upperName.includes('SPEGHETI') || upperName.includes('PENNE')) return 27; // VIANDES
  if (upperName.includes('NOODLES')) return 27; // VIANDES
  if (upperName.includes('BURGER')) return 25; // BURGERS avec FRITES MAISON
  if (upperName.includes('KABAB')) return 21; // FINGER FOOD
  if (upperName.includes('CHILLY')) return 27; // VIANDES
  
  return 27; // Default to VIANDES
}

async function replaceMenu() {
  try {
    console.log('Starting menu replacement...');
    
    // First, clear all existing relationships that reference dishes
    console.log('Clearing existing dish-ingredient relationships...');
    await prisma.dishes_ingredients.deleteMany({});
    
    console.log('Clearing existing dish-cuisson relationships...');
    await prisma.dishes_cuisson.deleteMany({});
    
    // Clear all existing dish-category relationships
    console.log('Clearing existing dish-category relationships...');
    await prisma.categories_dishes.deleteMany({});
    
    // Clear all existing dishes
    console.log('Clearing existing dishes...');
    await prisma.dishes.deleteMany({});
    
    // Reset the auto-increment counter for dishes
    await prisma.$executeRaw`ALTER SEQUENCE dishes_dish_id_seq RESTART WITH 1`;
    
    console.log('Inserting new menu items...');
    
    // Insert new dishes
    for (const item of newMenuItems) {
      if (item.price === 0) {
        console.log(`Skipping ${item.name} - no price provided`);
        continue;
      }
      
      // Convert rupees to EUR (assuming 1 EUR = 90 INR as approximate rate)
      const priceInEur = item.price / 90;
      
      const dish = await prisma.dishes.create({
        data: {
          name: item.name,
          price_eur: priceInEur,
          record_date: new Date(),
        }
      });
      
      // Create category relationship
      const categoryId = getCategoryId(item.name);
      await prisma.categories_dishes.create({
        data: {
          category_id: categoryId,
          dish_id: dish.dish_id
        }
      });
      
      console.log(`Added: ${item.name} - ${item.price} rupees (${priceInEur.toFixed(2)} EUR) - Category: ${categoryId}`);
    }
    
    console.log('Menu replacement completed successfully!');
    
  } catch (error) {
    console.error('Error replacing menu:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
replaceMenu(); 