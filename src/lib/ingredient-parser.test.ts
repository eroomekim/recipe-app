import { describe, it, expect } from "vitest";
import { parseIngredient } from "./ingredient-parser";

describe("parseIngredient", () => {
  it("parses simple quantity + unit + name", () => {
    expect(parseIngredient("2 cups flour")).toEqual({
      quantity: 2,
      unit: "cups",
      name: "flour",
    });
  });

  it("parses fractions", () => {
    expect(parseIngredient("1/2 cup sugar")).toEqual({
      quantity: 0.5,
      unit: "cup",
      name: "sugar",
    });
  });

  it("parses mixed numbers", () => {
    expect(parseIngredient("1 1/2 cups all-purpose flour")).toEqual({
      quantity: 1.5,
      unit: "cups",
      name: "all-purpose flour",
    });
  });

  it("parses count items without unit", () => {
    expect(parseIngredient("3 eggs")).toEqual({
      quantity: 3,
      unit: null,
      name: "eggs",
    });
  });

  it("parses tablespoons and teaspoons", () => {
    expect(parseIngredient("2 tbsp olive oil")).toEqual({
      quantity: 2,
      unit: "tbsp",
      name: "olive oil",
    });
  });

  it("returns nulls for unparseable ingredients", () => {
    expect(parseIngredient("salt and pepper to taste")).toEqual({
      quantity: null,
      unit: null,
      name: "salt and pepper to taste",
    });
  });

  it("handles 'a pinch of' style", () => {
    expect(parseIngredient("a pinch of salt")).toEqual({
      quantity: null,
      unit: null,
      name: "a pinch of salt",
    });
  });

  it("parses decimal quantities", () => {
    expect(parseIngredient("0.5 oz cream cheese")).toEqual({
      quantity: 0.5,
      unit: "oz",
      name: "cream cheese",
    });
  });

  it("handles unicode fractions", () => {
    expect(parseIngredient("½ cup milk")).toEqual({
      quantity: 0.5,
      unit: "cup",
      name: "milk",
    });
  });

  it("parses quantity with descriptor before name", () => {
    expect(parseIngredient("4 cloves garlic, minced")).toEqual({
      quantity: 4,
      unit: null,
      name: "cloves garlic, minced",
    });
  });
});
