-- Revert RLS: the postgres user connecting through the Supabase pooler
-- is subject to RLS, and with no policies all queries were blocked.
-- Since this app only accesses the database server-side via Prisma,
-- RLS is not needed.

ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "UserSettings" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Recipe" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Ingredient" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Instruction" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Substitution" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Tag" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "RecipeTag" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Collection" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "RecipeCollection" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SmartCollectionCache" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "GroceryItem" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ExtractionLog" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" DISABLE ROW LEVEL SECURITY;
