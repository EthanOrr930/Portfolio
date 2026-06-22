"""
Convert a positions .bin file to an EXR position+scale texture.

Supports two formats:
  - XYZS (4 floats per point): R=X, G=Y, B=Z, A=Scale
  - XYZ  (3 floats per point): R=X, G=Y, B=Z, A=1.0

The texture is square, padded with zeros if needed.

Usage:
    python scripts/bin_to_exr.py <input.bin> [output.exr]

Example:
    python scripts/bin_to_exr.py ~/Downloads/positions_9500.bin public/textures/positions.exr
"""
import sys
import math
import numpy as np

try:
    import OpenEXR
    import Imath
except ImportError:
    print("Missing OpenEXR. Install with:")
    print("  scripts/.venv/bin/pip install OpenEXR")
    sys.exit(1)


def load_data(path: str):
    """Load float32 data from a .bin file. Returns (N, 4) array (XYZS)."""
    data = np.fromfile(path, dtype=np.float32)

    if data.size % 4 == 0:
        # XYZS format (4 floats per point)
        points = data.reshape(-1, 4)
        print(f"  Detected XYZS format ({len(points)} points with scale)")
        return points
    elif data.size % 3 == 0:
        # XYZ format (3 floats per point), default scale = 1.0
        xyz = data.reshape(-1, 3)
        ones = np.ones((len(xyz), 1), dtype=np.float32)
        points = np.hstack([xyz, ones])
        print(f"  Detected XYZ format ({len(points)} points, scale=1.0)")
        return points
    else:
        raise ValueError(f"File size {data.size} is not divisible by 3 or 4")


def data_to_exr(points: np.ndarray, output_path: str):
    """Pack XYZS data into a square RGBA EXR texture and write to disk."""
    n = len(points)
    side = int(math.ceil(math.sqrt(n)))
    print(f"  {n} points -> {side}x{side} texture ({side*side} pixels, {side*side - n} padding)")

    # Pad to fill the square
    padded = np.zeros((side * side, 4), dtype=np.float32)
    padded[:n] = points

    # Reshape to image
    img = padded.reshape(side, side, 4)

    # Write EXR with float32 RGBA channels
    header = OpenEXR.Header(side, side)
    pt = Imath.PixelType(Imath.PixelType.FLOAT)
    header["channels"] = {
        "R": Imath.Channel(pt),
        "G": Imath.Channel(pt),
        "B": Imath.Channel(pt),
        "A": Imath.Channel(pt),
    }

    r = img[:, :, 0].tobytes()
    g = img[:, :, 1].tobytes()
    b = img[:, :, 2].tobytes()
    a = img[:, :, 3].tobytes()

    out = OpenEXR.OutputFile(output_path, header)
    out.writePixels({"R": r, "G": g, "B": b, "A": a})
    out.close()

    # Print scale stats
    scales = points[:, 3]
    print(f"  Scale range: [{scales.min():.3f}, {scales.max():.3f}], mean: {scales.mean():.3f}")
    print(f"  Wrote {output_path}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else input_path.replace(".bin", ".exr")

    print(f"Loading {input_path}...")
    points = load_data(input_path)
    print(f"  Position range: [{points[:,:3].min():.3f}, {points[:,:3].max():.3f}]")

    data_to_exr(points, output_path)
    print("Done!")
