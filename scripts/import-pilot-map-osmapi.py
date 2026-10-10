#!/usr/bin/env python3
"""Convert saved OSM XML with the shared converter; this tool does not fetch the editing API."""

from __future__ import annotations

import argparse
import json
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--from", dest="source_file", type=Path, required=True, help="Convert a previously saved OSM XML extract")
    args = parser.parse_args()
    root = ET.parse(args.source_file).getroot()

    nodes = {
        node.attrib["id"]: {"lat": float(node.attrib["lat"]), "lon": float(node.attrib["lon"])}
        for node in root.findall("node")
    }
    elements = []
    missing_refs = 0
    for way in root.findall("way"):
        tags = {tag.attrib["k"]: tag.attrib["v"] for tag in way.findall("tag")}
        if not ("aerialway" in tags or tags.get("railway") == "funicular" or "piste:type" in tags or "piste:difficulty" in tags):
            continue
        refs = [node.attrib["ref"] for node in way.findall("nd")]
        missing_refs += sum(ref not in nodes for ref in refs)
        elements.append({
            "type": "way",
            "id": int(way.attrib["id"]),
            "version": int(way.attrib["version"]),
            "timestamp": way.attrib["timestamp"],
            "tags": tags,
            "geometry": [nodes.get(ref, {}) for ref in refs],
        })

    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", encoding="utf-8") as snapshot:
        json.dump({"elements": elements}, snapshot)
        snapshot.flush()
        subprocess.run(["node", str(ROOT / "scripts/import-pilot-map.mjs"), "--from", snapshot.name], cwd=ROOT, check=True)
    source = str(args.source_file)
    print(f"Source: {source}; candidate ways={len(elements)}, missing node references={missing_refs}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
