import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RESORT_STATUS } from "@/lib/data";
import ResortExplorer from "./ResortExplorer";
import type { ResortConditions } from "@/features/conditions/conditions";

const resorts = RESORT_STATUS.filter((resort) => resort.city === "innsbruck");
const conditions: ResortConditions = {
  topTempC: -7, baseTempC: -1, windKmh: 18, kind: "snow", snowDepthCm: 123,
  newSnowCm: 25, forecastSnowCm: 13, updatedAt: "2026-12-20T10:00", days: [],
};

describe("ResortExplorer", () => {
  it("offers every resort as a named button and selects its referenced resort", () => {
    const onSelect = vi.fn();
    render(<ResortExplorer resorts={resorts} onSelect={onSelect} isLive />);
    for (const resort of resorts) expect(screen.getByRole("button", { name: resort.name })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: resorts[resorts.length - 1]!.name }));
    expect(onSelect).toHaveBeenCalledWith(resorts[resorts.length - 1]);
  });

  it("shows only available real conditions and real rider counts in live mode", () => {
    const resort = { ...resorts[0]!, ridersNow: 0 };
    const { rerender } = render(<ResortExplorer resorts={[resort]} onSelect={vi.fn()} isLive conditions={null} />);
    expect(screen.getByText("0 riding today")).toBeInTheDocument();
    expect(screen.queryByText(/cm/)).not.toBeInTheDocument();
    rerender(<ResortExplorer resorts={[resort]} onSelect={vi.fn()} isLive conditions={{ [resort.name]: conditions }} />);
    expect(screen.getByText("25 cm new · -7° top")).toBeInTheDocument();
  });

  it("keeps sample snow and lift counts restricted to the demo", () => {
    const resort = resorts[0]!;
    render(<ResortExplorer resorts={[resort]} onSelect={vi.fn()} isLive={false} />);
    expect(screen.getByText(`${resort.snowDepth} cm`)).toBeInTheDocument();
    expect(screen.getByText(`${resort.liftsOpen}/${resort.totalLifts} lifts`)).toBeInTheDocument();
  });

  it("shows licensed photo attribution outside the selection button and a decorative fallback", () => {
    const resort = resorts[0]!;
    const photo = { src: "https://upload.wikimedia.org/wikipedia/commons/example.jpg", width: 1200, height: 800, author: "Anna", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:example.jpg" };
    const { rerender } = render(<ResortExplorer resorts={[resort]} onSelect={vi.fn()} isLive photos={{ [resort.name]: photo }} />);
    expect(screen.getByRole("img", { name: resort.name })).toBeInTheDocument();
    expect(screen.getByText(/Photo: Anna/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: photo.license })).toHaveAttribute("href", photo.licenseUrl);
    expect(within(screen.getByRole("button", { name: resort.name })).queryByRole("link")).not.toBeInTheDocument();
    rerender(<ResortExplorer resorts={[resort]} onSelect={vi.fn()} isLive />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: resort.name }).querySelector('[aria-hidden="true"] svg')).toBeTruthy();
  });
});
