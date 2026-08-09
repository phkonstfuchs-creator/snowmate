import type { ResortStatus } from "@/lib/types";

export function createMarkerContent(
  resort: ResortStatus,
  isHot: boolean,
  size: number,
): HTMLElement {
  const marker = document.createElement("div");
  marker.style.width = `${size}px`;
  marker.style.height = `${size}px`;
  marker.style.background = isHot ? "#a83f1b" : "#1c1815";
  marker.style.borderRadius = "0";
  marker.style.display = "flex";
  marker.style.flexDirection = "column";
  marker.style.alignItems = "center";
  marker.style.justifyContent = "center";
  marker.style.border = "2px solid #1c1815";
  marker.style.cursor = "pointer";

  if (isHot) {
    marker.style.boxShadow = "3px 3px 0 rgba(28,24,21,0.45)";
  }

  const riderCount = document.createElement("span");
  riderCount.textContent = String(resort.ridersNow);
  riderCount.style.fontFamily = "var(--font-mono)";
  riderCount.style.fontSize = `${size < 42 ? 11 : 14}px`;
  riderCount.style.fontWeight = "700";
  riderCount.style.color = "#f2eadb";
  riderCount.style.lineHeight = "1";
  marker.append(riderCount);

  if (size >= 42) {
    const resortName = document.createElement("span");
    resortName.textContent = resort.name.split(" ")[0] ?? resort.name;
    resortName.style.fontSize = "7px";
    resortName.style.color = "var(--paper-0)";
    resortName.style.whiteSpace = "nowrap";
    resortName.style.overflow = "hidden";
    resortName.style.maxWidth = `${size - 8}px`;
    resortName.style.textOverflow = "ellipsis";
    resortName.style.lineHeight = "1";
    resortName.style.marginTop = "1px";
    resortName.style.fontWeight = "800";
    marker.append(resortName);
  }

  return marker;
}
