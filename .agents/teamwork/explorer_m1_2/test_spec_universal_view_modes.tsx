import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UniversalViewManager } from "@/components/workspace/view-modes/universal-view-manager";
import { ViewModeSwitcher } from "@/components/workspace/view-modes/view-mode-switcher";

describe("UniversalViewManager", () => {
  const mockData = [
    { id: "1", name: "Alpha Item" },
    { id: "2", name: "Beta Item" },
  ];

  it("renders table view when currentView is table", () => {
    render(
      <UniversalViewManager
        currentView="table"
        data={mockData}
        renderTable={(items) => <div data-testid="table-view">Table: {items.length}</div>}
        renderKanban={() => <div data-testid="kanban-view">Kanban</div>}
        renderCards={() => <div data-testid="cards-view">Cards</div>}
      />
    );

    expect(screen.getByTestId("table-view")).toBeInTheDocument();
    expect(screen.queryByTestId("kanban-view")).not.toBeInTheDocument();
    expect(screen.queryByTestId("cards-view")).not.toBeInTheDocument();
  });

  it("renders kanban view when currentView is kanban", () => {
    render(
      <UniversalViewManager
        currentView="kanban"
        data={mockData}
        renderTable={() => <div data-testid="table-view">Table</div>}
        renderKanban={(items) => <div data-testid="kanban-view">Kanban: {items.length}</div>}
        renderCards={() => <div data-testid="cards-view">Cards</div>}
      />
    );

    expect(screen.getByTestId("kanban-view")).toBeInTheDocument();
    expect(screen.queryByTestId("table-view")).not.toBeInTheDocument();
  });

  it("renders cards view when currentView is cards", () => {
    render(
      <UniversalViewManager
        currentView="cards"
        data={mockData}
        renderTable={() => <div data-testid="table-view">Table</div>}
        renderKanban={() => <div data-testid="kanban-view">Kanban</div>}
        renderCards={(items) => <div data-testid="cards-view">Cards: {items.length}</div>}
      />
    );

    expect(screen.getByTestId("cards-view")).toBeInTheDocument();
    expect(screen.queryByTestId("table-view")).not.toBeInTheDocument();
  });

  it("renders loading skeleton when isLoading is true", () => {
    render(
      <UniversalViewManager
        currentView="table"
        isLoading={true}
        data={mockData}
        renderTable={() => <div data-testid="table-view">Table</div>}
        renderKanban={() => <div data-testid="kanban-view">Kanban</div>}
        renderCards={() => <div data-testid="cards-view">Cards</div>}
      />
    );

    expect(screen.queryByTestId("table-view")).not.toBeInTheDocument();
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders empty state when data is empty and not loading", () => {
    render(
      <UniversalViewManager
        currentView="table"
        isLoading={false}
        data={[]}
        emptyTitle="Sem pedidos cadastrados"
        renderTable={() => <div data-testid="table-view">Table</div>}
        renderKanban={() => <div data-testid="kanban-view">Kanban</div>}
        renderCards={() => <div data-testid="cards-view">Cards</div>}
      />
    );

    expect(screen.getByText("Sem pedidos cadastrados")).toBeInTheDocument();
    expect(screen.queryByTestId("table-view")).not.toBeInTheDocument();
  });

  it("renders error state with retry button when isError is true", () => {
    const onRetry = vi.fn();
    render(
      <UniversalViewManager
        currentView="table"
        isError={true}
        error={new Error("Falha de conexão com a API")}
        onRetry={onRetry}
        data={mockData}
        renderTable={() => <div data-testid="table-view">Table</div>}
        renderKanban={() => <div data-testid="kanban-view">Kanban</div>}
        renderCards={() => <div data-testid="cards-view">Cards</div>}
      />
    );

    expect(screen.getByText("Erro ao carregar dados")).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /Tentar novamente/i });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe("ViewModeSwitcher", () => {
  it("renders all 3 modes with accessible radio roles", () => {
    const onChange = vi.fn();
    render(<ViewModeSwitcher value="table" onChange={onChange} />);

    expect(screen.getByRole("radiogroup", { name: "Modo de visualização" })).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(radios[0]).toHaveAttribute("aria-checked", "true");
    expect(radios[1]).toHaveAttribute("aria-checked", "false");
    expect(radios[2]).toHaveAttribute("aria-checked", "false");
  });

  it("calls onChange when a radio item is clicked", async () => {
    const onChange = vi.fn();
    render(<ViewModeSwitcher value="table" onChange={onChange} />);

    const kanbanBtn = screen.getByRole("radio", { name: /Visualização em Kanban/i });
    await userEvent.click(kanbanBtn);

    expect(onChange).toHaveBeenCalledWith("kanban");
  });

  it("switches mode on keyboard shortcut 1, 2, 3", () => {
    const onChange = vi.fn();
    render(<ViewModeSwitcher value="table" onChange={onChange} />);

    fireEvent.keyDown(window, { key: "2" });
    expect(onChange).toHaveBeenCalledWith("kanban");

    fireEvent.keyDown(window, { key: "3" });
    expect(onChange).toHaveBeenCalledWith("cards");
  });

  it("does not trigger keyboard shortcuts when typing in an input element", () => {
    const onChange = vi.fn();
    render(
      <div>
        <input data-testid="test-input" />
        <ViewModeSwitcher value="table" onChange={onChange} />
      </div>
    );

    const input = screen.getByTestId("test-input");
    input.focus();

    fireEvent.keyDown(input, { key: "2" });
    expect(onChange).not.toHaveBeenCalled();
  });
});
