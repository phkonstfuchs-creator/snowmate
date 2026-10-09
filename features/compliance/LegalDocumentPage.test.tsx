import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LegalDocumentPage from "./LegalDocumentPage";
import LegalOverview from "./LegalOverview";
import LegalShell from "./LegalShell";
import { getLegalDocument } from "./legal-content";

describe("LegalDocumentPage", () => {
  it("renders a semantic document with a visible draft warning", () => {
    render(<LegalDocumentPage document={getLegalDocument("privacy")} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Datenschutzerklärung" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("note", { name: "Vor Veröffentlichung lösen" }))
      .toHaveTextContent("keine rechtliche Freigabe");

    const article = screen.getByRole("article");
    expect(within(article).getAllByRole("heading", { level: 2 }).length).toBeGreaterThan(
      5,
    );
  });

  it("renders source links with safe external-link attributes", () => {
    render(<LegalDocumentPage document={getLegalDocument("reporting")} />);

    const externalLink = screen.getByRole("link", {
      name: /Digital Services Act/i,
    });
    expect(externalLink).toHaveAttribute("target", "_blank");
    expect(externalLink).toHaveAttribute("rel", "noreferrer");
  });
});

describe("LegalOverview", () => {
  it("links to all legal documents and states the beta boundary", () => {
    render(<LegalOverview />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Rechtliches & Sicherheit" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Closed Beta/)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Öffnen/ })).toHaveLength(5);
  });
});

describe("LegalShell", () => {
  it("provides skip navigation and every legal destination", () => {
    render(
      <LegalShell>
        <p>Legal content</p>
      </LegalShell>,
    );

    expect(screen.getByRole("link", { name: "Zum Inhalt" })).toHaveAttribute(
      "href",
      "#legal-content",
    );
    expect(screen.getByRole("navigation", { name: "Rechtliche Dokumente" }))
      .toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("Legal content");
    expect(screen.getAllByRole("link", { name: "Datenschutz" })).toHaveLength(
      1,
    );
  });
});
