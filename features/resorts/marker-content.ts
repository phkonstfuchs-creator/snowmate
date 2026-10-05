import type { ResortStatus } from "@/lib/types";

export function createMarkerContent(
  resort: ResortStatus,
  isHot: boolean,
  size: number,
): HTMLElement {
  const marker = document.createElement("div");
  marker.style.width = `${size}px`;
  marker.style.height = `${size}px`;
  marker.style.background = isHot ? "#ff6a2b" : "#0d1117";
  marker.style.borderRadius = "9999px";
  marker.style.display = "flex";
  marker.style.flexDirection = "column";
  marker.style.alignItems = "center";
  marker.style.justifyContent = "center";
  marker.style.border = "3px solid #ffffff";
  marker.style.cursor = "pointer";
  marker.style.boxShadow = isHot ? "0 0 0 6px rgba(255,106,43,0.3), 0 4px 12px rgba(13,17,23,0.45)" : "0 4px 12px rgba(13,17,23,0.45)";

  const riderCount = document.createElement("span");
  riderCount.textContent = String(resort.ridersNow);
  riderCount.style.fontFamily = "var(--font-mono)";
  riderCount.style.fontSize = `${size < 42 ? 11 : 14}px`;
  riderCount.style.fontWeight = "800";
  riderCount.style.color = isHot ? "#0d1117" : "#ffffff";
  riderCount.style.lineHeight = "1";
  marker.append(riderCount);

  if (size >= 42) {
    const resortName = document.createElement("span");
    resortName.textContent = resort.name.split(" ")[0] ?? resort.name;
    resortName.style.fontSize = "7px";
    resortName.style.color = isHot ? "#0d1117" : "#c5ced9";
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
