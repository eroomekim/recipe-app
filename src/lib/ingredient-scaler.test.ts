import { describe, it, expect } from "vitest";
import { scaleIngredient, formatQuantity } from "./ingredient-scaler";

describe("formatQuantity", () => {
  it("formats whole numbers", () => {
    expect(formatQuantity(2)).toBe("2");
  });

  it("formats common fractions", () => {
    expect(formatQuantity(0.5)).toBe("1/2");
    expect(formatQuantity(0.25)).toBe("1/4");
    expect(formatQuantity(0.75)).toBe("3/4");
    expect(formatQuantity(1/3)).toBe("1/3");
  });

  it("formats mixed numbers", () => {
    expect(formatQuantity(1.5)).toBe("1 1/2");
    expect(formatQuantity(2.25)).toBe("2 1/4");
  });

  it("rounds awkward decimals", () => {
    expect(formatQuantity(1.333)).toBe("1 1/3");
    expect(formatQuantity(0.666)).toBe("2/3");
  });

  it("rounds to reasonable precision", () => {
    expect(formatQuantity(3.7)).toBe("3 3/4");
  });
});

describe("scaleIngredient", () => {
  it("scales a simple ingredient", () => {
    const result = scaleIngredient(
      { text: "2 cups flour", quantity: 2, unit: "cups", name: "flour" },
      2
    );
    expect(result.scaledText).toBe("4 cups flour");
    expect(result.scaledQuantity).toBe(4);
  });

  it("scales with fractions", () => {
    const result = scaleIngredient(
      { text: "1/2 cup sugar", quantity: 0.5, unit: "cup", name: "sugar" },
      2
    );
    expect(result.scaledText).toBe("1 cup sugar");
  });

  it("returns original text for unscalable ingredients", () => {
    const result = scaleIngredient(
      { text: "salt to taste", quantity: null, unit: null, name: "salt to taste" },
      2
    );
    expect(result.scaledText).toBe("salt to taste");
    expect(result.scaledQuantity).toBe(null);
  });

  it("handles scale factor of 1 (no change)", () => {
    const result = scaleIngredient(
      { text: "3 eggs", quantity: 3, unit: null, name: "eggs" },
      1
    );
    expect(result.scaledText).toBe("3 eggs");
  });

  it("scales count items", () => {
    const result = scaleIngredient(
      { text: "2 eggs", quantity: 2, unit: null, name: "eggs" },
      1.5
    );
    expect(result.scaledText).toBe("3 eggs");
  });
});
