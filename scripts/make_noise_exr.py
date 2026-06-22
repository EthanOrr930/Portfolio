"""
Generate a noise-cloud keyframe EXR — particles scattered randomly around
the origin so the scroll experience can transition into/out of a "dissolved"
state that's the same format as the baked model keyframes.

Layout matches the other keyframe EXRs:
  - Square RGBA float32 texture
  - R,G,B = particle XYZ
  - A     = per-particle scale

Usage:
    scripts/.venv/bin/python scripts/make_noise_exr.py [output_path] [count]

Defaults:
    output_path = ~/Desktop/noise.exr
    count       = 5000
"""
import math
import os
import sys

import numpy as np

import OpenEXR
import Imath


def generate_noise(count: int, seed: int = 1337) -> np.ndarray:
    """Return an (N, 4) float32 array of (x, y, z, scale) values.

    Positions are uniformly distributed inside a box centred on the origin
    — much more spread out than the models the scroll experience is used
    to, so a transition into/out of this keyframe reads as the particle
    cloud dissolving into ambient space.
    """
    rng = np.random.default_rng(seed)

    extent = 2.5  # half-side of the box (so particles span [-2.5, 2.5] on each axis)
    positions = rng.uniform(-extent, extent, size=(count, 3)).astype(np.float32)

    # Vary scales a little so the cloud has some visual texture
    scales = rng.uniform(0.55, 1.0, size=count).astype(np.float32)

    return np.concatenate([positions, scales[:, None]], axis=1).astype(np.float32)


def write_exr(points: np.ndarray, path: str) -> None:
    n = len(points)
    side = int(math.ceil(math.sqrt(n)))
    padded = np.zeros((side * side, 4), dtype=np.float32)
    padded[:n] = points
    # Padding slots get scale = -1 so the particle shader discards them
    # instead of rendering a phantom cluster at the origin.
    if n < side * side:
        padded[n:, 3] = -1.0
    img = padded.reshape(side, side, 4)

    header = OpenEXR.Header(side, side)
    pt = Imath.PixelType(Imath.PixelType.FLOAT)
    header["channels"] = {
        "R": Imath.Channel(pt),
        "G": Imath.Channel(pt),
        "B": Imath.Channel(pt),
        "A": Imath.Channel(pt),
    }

    out = OpenEXR.OutputFile(path, header)
    out.writePixels({
        "R": img[:, :, 0].tobytes(),
        "G": img[:, :, 1].tobytes(),
        "B": img[:, :, 2].tobytes(),
        "A": img[:, :, 3].tobytes(),
    })
    out.close()

    print(f"  {n} points -> {side}x{side} texture ({side*side - n} padding)")
    print(f"  XYZ range: [{points[:, :3].min():.3f}, {points[:, :3].max():.3f}]")
    print(f"  Scale range: [{points[:, 3].min():.3f}, {points[:, 3].max():.3f}]")
    print(f"  Wrote {path}")


if __name__ == "__main__":
    output = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Desktop/noise.exr")
    count = int(sys.argv[2]) if len(sys.argv) > 2 else 5000

    points = generate_noise(count)
    write_exr(points, output)
    print("Done!")
