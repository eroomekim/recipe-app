import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GroceryList from "../GroceryList";
import { makeGroceryItem, mockFetch } from "@/test/fixtures";

describe("GroceryList", () => {
  let cleanupFetch: () => void;

  afterEach(() => {
    cleanupFetch?.();
  });

  it("shows empty state when no items", async () => {
    cleanupFetch = mockFetch({ "/api/grocery": [] });
    render(<GroceryList />);

    await waitFor(() => {
      expect(screen.getByText(/your grocery list is empty/i)).toBeInTheDocument();
    });
  });

  it("renders grocery items from API", async () => {
    const items = [
      makeGroceryItem({ id: "1", text: "3 lbs short ribs" }),
      makeGroceryItem({ id: "2", text: "2 onions" }),
    ];
    cleanupFetch = mockFetch({ "/api/grocery": items });
    render(<GroceryList />);

    await waitFor(() => {
      expect(screen.getByText("3 lbs short ribs")).toBeInTheDocument();
      expect(screen.getByText("2 onions")).toBeInTheDocument();
    });
  });

  it("groups items by recipe title", async () => {
    const items = [
      makeGroceryItem({ id: "1", text: "3 lbs short ribs", recipeTitle: "Braised Short Ribs" }),
      makeGroceryItem({ id: "2", text: "2 cups wine", recipeTitle: "Braised Short Ribs" }),
      makeGroceryItem({ id: "3", text: "1 loaf bread", recipeTitle: null }),
    ];
    cleanupFetch = mockFetch({ "/api/grocery": items });
    render(<GroceryList />);

    await waitFor(() => {
      expect(screen.getByText("Braised Short Ribs")).toBeInTheDocument();
      expect(screen.getByText("3 lbs short ribs")).toBeInTheDocument();
      expect(screen.getByText("1 loaf bread")).toBeInTheDocument();
    });
  });

  it("adds a new item via input", async () => {
    const newItem = makeGroceryItem({ id: "new-1", text: "Eggs" });
    cleanupFetch = mockFetch({
      "/api/grocery": [],
      "POST /api/grocery": newItem,
    });
    render(<GroceryList />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/add an item/i)).toBeInTheDocument();
    });

    await userEvent.type(screen.getByPlaceholderText(/add an item/i), "Eggs");
    await userEvent.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Eggs")).toBeInTheDocument();
    });
  });

  it("separates checked items into done section", async () => {
    const items = [
      makeGroceryItem({ id: "1", text: "Milk", checked: false }),
      makeGroceryItem({ id: "2", text: "Butter", checked: true }),
    ];
    cleanupFetch = mockFetch({ "/api/grocery": items });
    render(<GroceryList />);

    await waitFor(() => {
      expect(screen.getByText("Milk")).toBeInTheDocument();
      expect(screen.getByText("Butter")).toBeInTheDocument();
      expect(screen.getByText(/^done \(/i)).toBeInTheDocument();
      expect(screen.getByText(/clear done/i)).toBeInTheDocument();
    });
  });
});
