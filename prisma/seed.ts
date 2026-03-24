import { PrismaClient, TagType } from "@prisma/client";

const prisma = new PrismaClient();

const mealTypes = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snack",
  "Dessert",
  "Appetizer",
  "Sandwich",
  "Salad",
  "Sauce",
  "Dressing",
];

const cuisines = [
  "Italian",
  "Mexican",
  "Thai",
  "Japanese",
  "Indian",
  "French",
  "American",
  "Mediterranean",
  "Chinese",
  "Korean",
  "Vietnamese",
  "Middle Eastern",
  "Greek",
  "Other",
];

const dietary = [
  "Vegan",
  "Vegetarian",
  "Gluten-Free",
  "Dairy-Free",
  "Keto",
  "Paleo",
  "Nut-Free",
  "Low-Carb",
];

async function main() {
  const tags = [
    ...mealTypes.map((name) => ({ name, type: TagType.MEAL_TYPE })),
    ...cuisines.map((name) => ({ name, type: TagType.CUISINE })),
    ...dietary.map((name) => ({ name, type: TagType.DIETARY })),
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { name_type: { name: tag.name, type: tag.type } },
      update: {},
      create: tag,
    });
  }

  console.log(`Seeded ${tags.length} tags`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
