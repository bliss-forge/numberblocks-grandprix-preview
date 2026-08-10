#!/usr/bin/env python3
"""Build a reference/output contact sheet and deterministic asset metrics."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageStat


ROOT = Path(__file__).resolve().parents[4]
OUT_DIR = Path(__file__).resolve().parent
CELL_SIZE = (760, 428)
LABEL_HEIGHT = 34

ASSETS = [
    ("night train", "assets/train-realistic/motion/srt-side-transparent.png", "assets/train-realistic/motion/srt-side-transparent-night.png"),
    ("dawn cab", "assets/train-realistic/cab-day.webp", "assets/train-realistic/cab-dawn.webp"),
    ("sunset cab", "assets/train-realistic/cab-day.webp", "assets/train-realistic/cab-sunset.webp"),
    ("sunset station", "assets/train-realistic/motion/station-platform-a.webp", "assets/train-realistic/motion/station-platform-sunset.webp"),
    ("night station", "assets/train-realistic/motion/station-platform-a.webp", "assets/train-realistic/motion/station-platform-night.webp"),
    ("dawn station", "assets/train-realistic/motion/station-platform-a.webp", "assets/train-realistic/motion/station-platform-dawn.webp"),
    ("field cab", "assets/train-realistic/cab-day.webp", "assets/train-realistic/cab-field.webp"),
    ("river cab", "assets/train-realistic/cab-day.webp", "assets/train-realistic/cab-river.webp"),
    ("sea cab", "assets/train-realistic/cab-day.webp", "assets/train-realistic/cab-sea.webp"),
    ("mountain cab", "assets/train-realistic/cab-day.webp", "assets/train-realistic/cab-mountain.webp"),
]


def checkerboard(size: tuple[int, int], square: int = 24) -> Image.Image:
    image = Image.new("RGB", size, "#d7dbe0")
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], square):
        for x in range(0, size[0], square):
            if (x // square + y // square) % 2:
                draw.rectangle((x, y, x + square - 1, y + square - 1), fill="#f2f4f6")
    return image


def fitted_plate(path: Path) -> Image.Image:
    source = Image.open(path).convert("RGBA")
    source.thumbnail(CELL_SIZE, Image.Resampling.LANCZOS)
    plate = checkerboard(CELL_SIZE) if source.getchannel("A").getextrema()[0] < 255 else Image.new("RGB", CELL_SIZE, "#151a22")
    offset = ((CELL_SIZE[0] - source.width) // 2, (CELL_SIZE[1] - source.height) // 2)
    plate.paste(source.convert("RGB"), offset, source.getchannel("A"))
    return plate


def edge_alignment(reference: Image.Image, output: Image.Image) -> float:
    reference = reference.convert("L").resize((512, 288), Image.Resampling.LANCZOS)
    output = output.convert("L").resize((512, 288), Image.Resampling.LANCZOS)
    ref_edges = reference.filter(ImageFilter.FIND_EDGES)
    out_edges = output.filter(ImageFilter.FIND_EDGES)
    mean_difference = ImageStat.Stat(ImageChops.difference(ref_edges, out_edges)).mean[0]
    return round(max(0.0, 100.0 * (1.0 - mean_difference / 255.0)), 2)


def asset_metrics(reference_path: Path, output_path: Path) -> dict[str, object]:
    reference = Image.open(reference_path)
    output = Image.open(output_path)
    alpha = output.convert("RGBA").getchannel("A")
    alpha_bbox = alpha.point(lambda value: 255 if value > 24 else 0).getbbox()
    alpha_exact = None
    reference_rgba = reference.convert("RGBA")
    if reference.size == output.size and reference_rgba.getchannel("A").getextrema()[0] < 255:
        alpha_exact = ImageChops.difference(
            reference_rgba.getchannel("A"), output.convert("RGBA").getchannel("A")
        ).getbbox() is None
    return {
        "path": str(output_path.relative_to(ROOT)),
        "dimensions": list(output.size),
        "bytes": output_path.stat().st_size,
        "mode": output.mode,
        "has_alpha": "A" in output.getbands(),
        "alpha_bbox": list(alpha_bbox) if alpha_bbox else None,
        "alpha_matches_reference": alpha_exact,
        "edge_alignment_score": edge_alignment(reference, output),
    }


def main() -> None:
    font = ImageFont.load_default(size=22)
    sheet = Image.new(
        "RGB",
        (CELL_SIZE[0] * 2, (CELL_SIZE[1] + LABEL_HEIGHT) * len(ASSETS)),
        "#0d1117",
    )
    draw = ImageDraw.Draw(sheet)
    metrics = []
    for index, (name, reference_rel, output_rel) in enumerate(ASSETS):
        reference_path = ROOT / reference_rel
        output_path = ROOT / output_rel
        y = index * (CELL_SIZE[1] + LABEL_HEIGHT)
        sheet.paste(fitted_plate(reference_path), (0, y + LABEL_HEIGHT))
        sheet.paste(fitted_plate(output_path), (CELL_SIZE[0], y + LABEL_HEIGHT))
        draw.text((12, y + 7), f"REFERENCE - {name}", fill="white", font=font)
        draw.text((CELL_SIZE[0] + 12, y + 7), f"OUTPUT - {name}", fill="#7ee787", font=font)
        metrics.append(asset_metrics(reference_path, output_path))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sheet.save(OUT_DIR / "contact-sheet.png", optimize=True)
    (OUT_DIR / "metrics.json").write_text(
        json.dumps(metrics, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(metrics, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
