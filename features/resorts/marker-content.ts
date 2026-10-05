import type { ResortStatus } from "@/lib/types";

export function createMarkerContent(
  resort: ResortStatus,
  isHot: boolean,
  size: number,
): HTMLElement {
  const marker = document.createElement("div");
  marker.style.width = `${size}px`;
  marker.style.height = `${size}px`;
  marker.style.background = isHot ? "#315842" : "#ffffff";
  marker.style.borderRadius = "9999px";
  marker.style.display = "flex";
  marker.style.flexDirection = "column";
  marker.style.alignItems = "center";
  marker.style.justifyContent = "center";
  marker.style.border = isHot ? "2px solid #ffffff" : "1px solid #d4dbd3";
  marker.style.cursor = "pointer";
  marker.style.boxShadow = "0 2px 6px rgba(32,45,39,0.18)";

  const riderCount = document.createElement("span");
  riderCount.textContent = String(resort.ridersNow);
  riderCount.style.fontFamily = "var(--font-mono)";
  riderCount.style.fontSize = `${size < 42 ? 11 : 14}px`;
  riderCount.style.fontWeight = "700";
  riderCount.style.color = isHot ? "#ffffff" : "#202d27";
  riderCount.style.lineHeight = "1";
  marker.append(riderCount);

  if (size >= 42) {
    const resortName = document.createElement("span");
    resortName.textContent = resort.name.split(" ")[0] ?? resort.name;
    resortName.style.fontSize = "7px";
    resortName.style.color = isHot ? "#e4ebdf" : "#59645e";
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
