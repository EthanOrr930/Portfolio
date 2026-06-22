import trimesh
import os
import sys

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'models')

for fname in sorted(os.listdir(MODEL_DIR)):
    if not fname.endswith('.glb'):
        continue
    path = os.path.join(MODEL_DIR, fname)
    scene = trimesh.load(path)

    if isinstance(scene, trimesh.Scene):
        total_verts = sum(g.vertices.shape[0] for g in scene.geometry.values() if hasattr(g, 'vertices'))
        total_faces = sum(g.faces.shape[0] for g in scene.geometry.values() if hasattr(g, 'faces'))
    else:
        total_verts = scene.vertices.shape[0]
        total_faces = scene.faces.shape[0]

    size_kb = os.path.getsize(path) / 1024
    print(f"{fname:20s}  verts: {total_verts:6d}  faces: {total_faces:6d}  size: {size_kb:.0f}KB")
