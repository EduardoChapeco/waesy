import { describe, expect, it, vi } from "vitest";
import { createElement, type ReactElement, type HTMLAttributes } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button, buttonVariants, type ButtonProps } from "./button";

describe("Button interaction contract", () => {
  it("preserves the delegated link and label while loading", () => {
    const html = renderToStaticMarkup(createElement(Button, { asChild: true, isLoading: true }, createElement("a", { href: "/pedidos" }, "Pedidos")));
    expect(html).toContain('<a href="/pedidos"');
    expect(html).not.toContain("<button");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain("Pedidos");
  });

  it("blocks child handlers during disabled/loading delegated states", () => {
    for (const state of [{ disabled: true }, { isLoading: true }]) {
      const callback = vi.fn();
      // Inspect the actual cloned child's handlers, including capture before activation.
      const renderButton = (Button as unknown as { render: (props: ButtonProps, ref: null) => ReactElement<{ children: ReactElement<HTMLAttributes<HTMLElement>> }> }).render;
      const slot = renderButton({ asChild: true, ...state, children: createElement("a", { href: "/pedidos", onClick: callback }, "Pedidos") }, null);
      const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
      const capture = slot.props.children.props.onClickCapture as unknown as (activation: typeof event) => void;
      const click = slot.props.children.props.onClick as unknown as (activation: typeof event) => void;
      capture(event);
      click(event);
      expect(callback).not.toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    }
  });

  it("keeps explicit submit but prevents accidental submit for click actions", () => {
    expect(renderToStaticMarkup(createElement(Button, { onClick: vi.fn() }, "Cancelar"))).toContain('type="button"');
    expect(renderToStaticMarkup(createElement(Button, { type: "submit", onClick: vi.fn() }, "Salvar"))).toContain('type="submit"');
  });

  it("disables the native button and supports loading text", () => {
    const html = renderToStaticMarkup(createElement(Button, { isLoading: true, loadingText: "Salvando" }, "Salvar"));
    expect(html).toContain("disabled");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Salvando");
  });

  it("keeps touch dimensions for every public size", () => {
    for (const size of ["default", "sm", "lg", "icon", "iconSm"] as const) {
      const classes = buttonVariants({ size });
      expect(classes).toContain("min-h-11");
      expect(classes).toContain("min-w-11");
      expect(classes).toContain("focus-visible:ring-2");
    }
  });
});
