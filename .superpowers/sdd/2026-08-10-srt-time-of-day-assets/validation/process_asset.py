#!/usr/bin/env python3
"""Geometry-lock generated SRT lighting edits to their repository references."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


TARGET_SIZE = (1672, 941)


def alpha_bbox(image: Image.Image, threshold: int = 24) -> tuple[int, int, int, int]:
    alpha = image.convert("RGBA").getchannel("A")
    return alpha.point(lambda value: 255 if value > threshold else 0).getbbox()


def geometry_locked_train(reference_path: Path, generated_path: Path, output_path: Path) -> None:
    reference = Image.open(reference_path).convert("RGBA")
    generated = Image.open(generated_path).convert("RGBA")
    reference_bbox = alpha_bbox(reference)
    generated_bbox = alpha_bbox(generated)
    if not reference_bbox or not generated_bbox:
        raise ValueError("train reference and generated edit must both have visible pixels")

    ref_width = reference_bbox[2] - reference_bbox[0]
    ref_height = reference_bbox[3] - reference_bbox[1]
    generated_crop = generated.crop(generated_bbox).resize(
        (ref_width, ref_height), Image.Resampling.LANCZOS
    )
    aligned = reference.copy()
    aligned.alpha_composite(generated_crop, (reference_bbox[0], reference_bbox[1]))

    original_rgb = reference.convert("RGB")
    generated_rgb = aligned.convert("RGB")
    generated_alpha = aligned.getchannel("A")
    relit = Image.blend(original_rgb, generated_rgb, 0.72)
    relit = Image.composite(relit, original_rgb, generated_alpha)
    final = relit.convert("RGBA")
    final.putalpha(reference.getchannel("A"))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    final.save(output_path, optimize=True)

    if ImageChops.difference(final.getchannel("A"), reference.getchannel("A")).getbbox():
        raise ValueError("final train alpha differs from the reference")
    if final.size != (2400, 640):
        raise ValueError(f"unexpected final train size: {final.size}")
    print(f"train reference bbox={reference_bbox} generated bbox={generated_bbox}")
    print(f"wrote {output_path} ({output_path.stat().st_size} bytes)")


def low_frequency_relight(reference: Image.Image, generated: Image.Image) -> Image.Image:
    reference = reference.convert("RGB").resize(TARGET_SIZE, Image.Resampling.LANCZOS)
    generated = generated.convert("RGB").resize(TARGET_SIZE, Image.Resampling.LANCZOS)
    reference_light = reference.filter(ImageFilter.GaussianBlur(28))
    generated_light = generated.filter(ImageFilter.GaussianBlur(28))
    lighting_delta = ImageChops.subtract(
        generated_light, reference_light, scale=1.0, offset=128
    )
    relit = ImageChops.add(reference, lighting_delta, scale=1.0, offset=-128)
    return Image.blend(reference, relit, 0.9)


def relight_background(reference_path: Path, generated_path: Path, output_path: Path) -> None:
    reference = Image.open(reference_path)
    generated = Image.open(generated_path)
    final = low_frequency_relight(reference, generated)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    final.save(output_path, format="PNG", optimize=True)
    print(f"wrote {output_path} ({final.width}x{final.height})")


def geometry_locked_station(reference_path: Path, generated_path: Path, output_path: Path) -> None:
    reference = Image.open(reference_path).convert("RGB").resize(
        TARGET_SIZE, Image.Resampling.LANCZOS
    )
    generated = Image.open(generated_path).convert("RGB").resize(
        TARGET_SIZE, Image.Resampling.LANCZOS
    )
    # The station edits were generated from the exact source frame and preserve
    # its fixed roof, column, bench, platform, and rail layout. A small reference
    # blend keeps original edge detail while retaining practical lights, city
    # illumination, and floor reflections that a low-frequency transfer loses.
    final = Image.blend(reference, generated, 0.94)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    final.save(output_path, format="PNG", optimize=True)
    print(f"wrote {output_path} ({final.width}x{final.height})")


def terrain_background(reference_path: Path, generated_path: Path, output_path: Path) -> None:
    reference = Image.open(reference_path).convert("RGB").resize(TARGET_SIZE, Image.Resampling.LANCZOS)
    generated = Image.open(generated_path).convert("RGB").resize(TARGET_SIZE, Image.Resampling.LANCZOS)
    mask = Image.new("L", TARGET_SIZE, 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon([(0, 0), (1671, 0), (1340, 440), (332, 440)], fill=255)
    # Include both small side windows so the old city route does not remain at
    # the edges when the forward scene changes to fields, water, or mountains.
    draw.polygon([(0, 0), (168, 0), (365, 352), (300, 414), (0, 432)], fill=255)
    draw.polygon([(1504, 0), (1671, 0), (1671, 432), (1372, 414), (1307, 352)], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(4))
    # The original cockpit stays untouched outside this mask. Inside the glass,
    # use the generated route at full strength so the old city skyline cannot
    # ghost through rice fields, water, or mountain slopes.
    final = Image.composite(generated, reference, mask)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    final.save(output_path, format="PNG", optimize=True)
    print(f"wrote {output_path} ({final.width}x{final.height})")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("train", "relight", "station", "terrain"))
    parser.add_argument("reference", type=Path)
    parser.add_argument("generated", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    if args.mode == "train":
        geometry_locked_train(args.reference, args.generated, args.output)
    elif args.mode == "relight":
        relight_background(args.reference, args.generated, args.output)
    elif args.mode == "station":
        geometry_locked_station(args.reference, args.generated, args.output)
    else:
        terrain_background(args.reference, args.generated, args.output)


if __name__ == "__main__":
    main()
