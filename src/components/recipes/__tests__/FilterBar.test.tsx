import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FilterBar from "../FilterBar";
import { makeRecipeCard } from "@/test/fixtures";

// The navigation mock stores URL search params on globalThis.__navSearch
const getSearchParams = () =>
  new URLSearchParams((globalThis as Record<string, unknown>).__navSearch as string);

describe("FilterBar", () => {
  const recipes = [
    makeRecipeCard({ id: "1", title: "Pasta Carbonara", tags: [{ name: "Dinner", type: "MEAL_TYPE" }, { name: "Italian", type: "CUISINE" }], cookTime: 30 }),
    makeRecipeCard({ id: "2", title: "Chicken Tikka", tags: [{ name: "Dinner", type: "MEAL_TYPE" }, { name: "Indian", type: "CUISINE" }], cookTime: 45 }),
    makeRecipeCard({ id: "3", title: "Pancakes", tags: [{ name: "Breakfast", type: "MEAL_TYPE" }, { name: "American", type: "CUISINE" }], cookTime: 15, isFavorite: true }),
    makeRecipeCard({
      id: "4", title: "Caesar Salad", tags: [{ name: "Lunch", type: "MEAL_TYPE" }], cookTime: 10,
      nutrition: { calories: 250, protein: 30, carbs: 8, fat: 12, fiber: 3, sugar: 2, sodium: 500 },
    }),
  ];

  it("renders search input and filter button", () => {
    render(<FilterBar recipes={recipes} />);

    expect(screen.getByPlaceholderText(/search recipes/i)).toBeInTheDocument();
    expect(screen.getByText(/filters/i)).toBeInTheDocument();
  });

  it("updates URL with search query on input", async () => {
    render(<FilterBar recipes={recipes} />);

    await userEvent.type(screen.getByPlaceholderText(/search recipes/i), "Pasta");

    expect(getSearchParams().get("q")).toBe("Pasta");
  });

  it("opens filter panel and shows meal type tags", async () => {
    render(<FilterBar recipes={recipes} />);

    await userEvent.click(screen.getByText(/filters/i));

    expect(screen.getByText("Dinner")).toBeInTheDocument();
    expect(screen.getByText("Breakfast")).toBeInTheDocument();
    expect(screen.getByText("Lunch")).toBeInTheDocument();
  });

  it("updates URL with meal type when tag is clicked", async () => {
    render(<FilterBar recipes={recipes} />);

    await userEvent.click(screen.getByText(/filters/i));
    await userEvent.click(screen.getByText("Breakfast"));

    expect(getSearchParams().get("meal")).toBe("Breakfast");
  });

  it("updates URL with cuisine when tag is clicked", async () => {
    render(<FilterBar recipes={recipes} />);

    await userEvent.click(screen.getByText(/filters/i));
    await userEvent.click(screen.getByText("Italian"));

    expect(getSearchParams().get("cuisine")).toBe("Italian");
  });

  it("updates URL with favs=1 when Favorites is clicked", async () => {
    render(<FilterBar recipes={recipes} />);

    await userEvent.click(screen.getByText(/filters/i));
    await userEvent.click(screen.getByText("Favorites"));

    expect(getSearchParams().get("favs")).toBe("1");
  });

  it("shows active filter count on badge", async () => {
    render(<FilterBar recipes={recipes} />);

    await userEvent.click(screen.getByText(/filters/i));
    await userEvent.click(screen.getByText("Dinner"));

    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("clears URL params when clear all is clicked", async () => {
    render(<FilterBar recipes={recipes} />);

    await userEvent.click(screen.getByText(/filters/i));
    await userEvent.click(screen.getByText("Dinner"));
    await userEvent.click(screen.getByText(/clear all/i));

    expect(getSearchParams().get("meal")).toBeNull();
  });
});
