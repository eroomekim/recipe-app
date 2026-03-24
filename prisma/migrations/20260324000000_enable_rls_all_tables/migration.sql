-- Enable Row Level Security on all tables.
-- Since the app uses Prisma with the service role key (which bypasses RLS),
-- this effectively blocks direct PostgREST/anon key access without affecting
-- the application. Policies can be added later if client-side access is needed.

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recipe" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ingredient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Instruction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Substitution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecipeTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Collection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecipeCollection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SmartCollectionCache" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GroceryItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExtractionLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
