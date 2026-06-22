"""
Extract vertex positions, edges (from face topology), and per-vertex colors
from 3D models. Uses mesh decimation to preserve topology.
Output: public/models/vertices.json
"""
import trimesh
import numpy as np
import json
import os
from fast_simplification import simplify

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'models')
TARGET_VERTS = 800


def get_material_color(geo):
    """Extract RGB float color from a geometry's material."""
    if hasattr(geo, 'visual'):
        if hasattr(geo.visual, 'material'):
            mat = geo.visual.material
            if hasattr(mat, 'diffuse'):
                return (np.array(mat.diffuse[:3], dtype=float) / 255.0).tolist()
            if hasattr(mat, 'main_color'):
                return (np.array(mat.main_color[:3], dtype=float) / 255.0).tolist()
    return [0.7, 0.7, 0.7]


def extract_edges_from_faces(faces):
    """Extract unique edges from face array — real topology."""
    edges = set()
    for face in faces:
        for i in range(len(face)):
            a, b = int(face[i]), int(face[(i + 1) % len(face)])
            edges.add((min(a, b), max(a, b)))
    return [[a, b] for a, b in edges]


def decimate_mesh(vertices, faces, target_verts):
    """Decimate a mesh to approximately target_verts using quadric decimation."""
    if len(vertices) <= target_verts:
        return vertices, faces

    reduction = 1 - (target_verts / len(vertices))
    reduction = max(0.01, min(0.999, reduction))

    verts_out, faces_out = simplify(
        points=vertices.astype(np.float32),
        triangles=faces.astype(np.int32),
        target_reduction=reduction,
    )
    return verts_out, faces_out


def process_model(path, name):
    """Process a model file, returning vertices, edges, and colors."""
    scene = trimesh.load(path, process=False)

    if isinstance(scene, trimesh.Scene):
        geos = [(n, g) for n, g in scene.geometry.items() if hasattr(g, 'vertices')]

        # Filter outlier sub-meshes
        extents = [np.abs(g.vertices).max() for _, g in geos]
        median_extent = np.median(extents) if extents else 1
        filtered = [(n, g) for (n, g), e in zip(geos, extents) if e < median_extent * 10]
        if len(filtered) < len(geos):
            print(f"  filtered out {len(geos) - len(filtered)} outlier sub-mesh(es)")
        if not filtered:
            filtered = geos

        total_verts = sum(g.vertices.shape[0] for _, g in filtered)

        all_verts = []
        all_faces = []
        all_colors = []
        offset = 0

        for gname, geo in filtered:
            # Proportional target for this sub-mesh
            ratio = geo.vertices.shape[0] / total_verts
            sub_target = max(30, int(TARGET_VERTS * ratio))

            verts, faces = decimate_mesh(geo.vertices, geo.faces, sub_target)
            color = get_material_color(geo)

            print(f"  {gname}: {geo.vertices.shape[0]} -> {len(verts)} verts, color=rgb({int(color[0]*255)},{int(color[1]*255)},{int(color[2]*255)})")

            all_verts.append(verts)
            all_faces.append(faces + offset)
            all_colors.append(np.tile(color, (len(verts), 1)))
            offset += len(verts)

        vertices = np.vstack(all_verts)
        faces = np.vstack(all_faces)
        colors = np.vstack(all_colors)
    else:
        color = [0.7, 0.7, 0.7]
        if hasattr(scene.visual, 'material') and hasattr(scene.visual.material, 'diffuse'):
            color = (np.array(scene.visual.material.diffuse[:3], dtype=float) / 255.0).tolist()

        vertices, faces = decimate_mesh(scene.vertices, scene.faces, TARGET_VERTS)
        colors = np.tile(color, (len(vertices), 1))

    edges = extract_edges_from_faces(faces)
    return vertices, edges, colors


def normalize(vertices):
    """Center and scale to fit in a unit sphere."""
    center = vertices.mean(axis=0)
    vertices = vertices - center
    scale = np.abs(vertices).max()
    if scale > 0:
        vertices = vertices / scale
    return vertices


results = {}
np.random.seed(42)

VALID_EXTS = {'.glb', '.gltf', '.obj', '.fbx', '.stl'}

for fname in sorted(os.listdir(MODEL_DIR)):
    ext = os.path.splitext(fname)[1].lower()
    if ext not in VALID_EXTS:
        continue

    name = os.path.splitext(fname)[0]
    # Clean up names
    name = name.replace('Brain_low_poly_obj', 'brain')

    path = os.path.join(MODEL_DIR, fname)
    print(f"Processing {fname} -> {name}...")

    vertices, edges, colors = process_model(path, name)
    vertices = normalize(vertices)

    # Pad smaller models
    if len(vertices) < TARGET_VERTS:
        deficit = TARGET_VERTS - len(vertices)
        pad_indices = np.random.choice(len(vertices), deficit, replace=True)
        vertices = np.vstack([vertices, vertices[pad_indices]])
        colors = np.vstack([colors, colors[pad_indices]])
        print(f"  padded to {len(vertices)} verts")

    # Colors to hex
    hex_colors = []
    for c in colors:
        r, g, b = int(c[0] * 255), int(c[1] * 255), int(c[2] * 255)
        hex_colors.append(f"#{r:02x}{g:02x}{b:02x}")

    results[name] = {
        "vertices": [[round(float(v), 4) for v in vert] for vert in vertices],
        "edges": edges,
        "colors": hex_colors,
    }
    print(f"  -> {len(results[name]['vertices'])} vertices, {len(results[name]['edges'])} edges, {len(set(hex_colors))} unique colors\n")

out_path = os.path.join(MODEL_DIR, 'vertices.json')
with open(out_path, 'w') as f:
    json.dump(results, f)

size_kb = os.path.getsize(out_path) / 1024
print(f"Wrote {out_path} ({size_kb:.1f}KB)")
