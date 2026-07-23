import type { ResortStatus } from "@/lib/types";

export function createMarkerContent(
  resort: ResortStatus,
  isHot: boolean,
  size: number,
): HTMLElement {
  const marker = document.createElement("div");
  marker.style.width = `${size}px`;
  marker.style.height = `${size}px`;
  marker.style.background = isHot ? "#4FC3F0" : "#202A34";
  marker.style.borderRadius = "50%";
  marker.style.display = "flex";
  marker.style.flexDirection = "column";
  marker.style.alignItems = "center";
  marker.style.justifyContent = "center";
  marker.style.border = "2px solid rgba(255,255,255,0.18)";
  marker.style.cursor = "pointer";

  if (isHot) {
    marker.style.boxShadow = "0 0 0 3px rgba(79,195,240,0.35)";
  }

  const riderCount = document.createElement("span");
  riderCount.textContent = String(resort.ridersNow);
  riderCount.style.fontFamily = "var(--font-mono)";
  riderCount.style.fontSize = `${size < 42 ? 11 : 14}px`;
  riderCount.style.fontWeight = "700";
  riderCount.style.color = isHot ? "#0A0E12" : "#F5F9FB";
  riderCount.style.lineHeight = "1";
  marker.append(riderCount);

  if (size >= 42) {
    const resortName = document.createElement("span");
    resortName.textContent = resort.name.split(" ")[0] ?? resort.name;
    resortName.style.fontSize = "7px";
    resortName.style.color = isHot ? "rgba(10,14,18,0.75)" : "#8A97A3";
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
