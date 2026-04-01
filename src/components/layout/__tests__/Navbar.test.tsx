import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Navbar from "../Navbar";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signOut: vi.fn().mockResolvedValue({}),
    },
  }),
}));

describe("Navbar", () => {
  it("shows Sign In link when no user", () => {
    render(<Navbar user={null} />);

    expect(screen.getByText("Sign In")).toBeInTheDocument();
    expect(screen.queryByText("Recipes")).not.toBeInTheDocument();
  });

  it("shows navigation links when user is logged in", () => {
    render(<Navbar user={{ email: "test@example.com" }} />);

    expect(screen.getByText("Recipes")).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Pantry")).toBeInTheDocument();
    expect(screen.getByText("Import")).toBeInTheDocument();
  });

  it("shows app name/logo", () => {
    render(<Navbar user={null} />);
    expect(screen.getByText("Recipe Book")).toBeInTheDocument();
  });

  it("shows user initial in avatar button", () => {
    render(<Navbar user={{ email: "test@example.com" }} />);
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("opens dropdown menu on avatar click", async () => {
    render(<Navbar user={{ email: "test@example.com" }} />);

    await userEvent.click(screen.getByLabelText("User menu"));

    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Log out")).toBeInTheDocument();
  });

  it("links logo to /recipes when logged in", () => {
    render(<Navbar user={{ email: "test@example.com" }} />);

    const logo = screen.getByText("Recipe Book");
    expect(logo.closest("a")).toHaveAttribute("href", "/recipes");
  });

  it("links logo to / when not logged in", () => {
    render(<Navbar user={null} />);

    const logo = screen.getByText("Recipe Book");
    expect(logo.closest("a")).toHaveAttribute("href", "/");
  });
});
