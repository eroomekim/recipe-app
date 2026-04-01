import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FilterBar from "../FilterBar";
import { makeRecipeCard } from "@/test/fixtures";

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
    render(<FilterBar recipes={recipes} onFilter={vi.fn()} />);

    expect(screen.getByPlaceholderText(/search recipes/i)).toBeInTheDocument();
    expect(screen.getByText(/filters/i)).toBeInTheDocument();
  });

  it("filters recipes by search text", async () => {
    const onFilter = vi.fn();
    render(<FilterBar recipes={recipes} onFilter={onFilter} />);

    await userEvent.type(screen.getByPlaceholderText(/search recipes/i), "Pasta");

    expect(onFilter).toHaveBeenCalled();
    const lastCall = onFilter.mock.calls[onFilter.mock.calls.length - 1][0];
    expect(lastCall).toHaveLength(1);
    expect(lastCall[0].title).toBe("Pasta Carbonara");
  });

  it("opens filter panel and shows meal type tags", async () => {
    render(<FilterBar recipes={recipes} onFilter={vi.fn()} />);

    await userEvent.click(screen.getByText(/filters/i));

    expect(screen.getByText("Dinner")).toBeInTheDocument();
    expect(screen.getByText("Breakfast")).toBeInTheDocument();
    expect(screen.getByText("Lunch")).toBeInTheDocument();
  });

  it("filters by meal type when tag is clicked", async () => {
    const onFilter = vi.fn();
    render(<FilterBar recipes={recipes} onFilter={onFilter} />);

    await userEvent.click(screen.getByText(/filters/i));
    await userEvent.click(screen.getByText("Breakfast"));

    const lastCall = onFilter.mock.calls[onFilter.mock.calls.length - 1][0];
    expect(lastCall).toHaveLength(1);
    expect(lastCall[0].title).toBe("Pancakes");
  });

  it("filters by cuisine", async () => {
    const onFilter = vi.fn();
    render(<FilterBar recipes={recipes} onFilter={onFilter} />);

    await userEvent.click(screen.getByText(/filters/i));
    await userEvent.click(screen.getByText("Italian"));

    const lastCall = onFilter.mock.calls[onFilter.mock.calls.length - 1][0];
    expect(lastCall).toHaveLength(1);
    expect(lastCall[0].title).toBe("Pasta Carbonara");
  });

  it("filters by favorites", async () => {
    const onFilter = vi.fn();
    render(<FilterBar recipes={recipes} onFilter={onFilter} />);

    await userEvent.click(screen.getByText(/filters/i));
    await userEvent.click(screen.getByText("Favorites"));

    const lastCall = onFilter.mock.calls[onFilter.mock.calls.length - 1][0];
    expect(lastCall).toHaveLength(1);
    expect(lastCall[0].title).toBe("Pancakes");
  });

  it("shows active filter count on badge", async () => {
    render(<FilterBar recipes={recipes} onFilter={vi.fn()} />);

    await userEvent.click(screen.getByText(/filters/i));
    await userEvent.click(screen.getByText("Dinner"));

    // Badge with count "1" should appear
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("clears all filters", async () => {
    const onFilter = vi.fn();
    render(<FilterBar recipes={recipes} onFilter={onFilter} />);

    // Apply a filter
    await userEvent.click(screen.getByText(/filters/i));
    await userEvent.click(screen.getByText("Dinner"));

    // Clear
    await userEvent.click(screen.getByText(/clear all/i));

    const lastCall = onFilter.mock.calls[onFilter.mock.calls.length - 1][0];
    expect(lastCall).toHaveLength(4); // all recipes returned
  });
});
