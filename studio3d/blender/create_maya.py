"""Build the original LifeMotion Chef Maya model and export it for Three.js."""

import bpy
import math
from pathlib import Path
from mathutils import Matrix, Vector

HERE = Path(__file__).resolve().parent
ASSETS = HERE.parent / "assets"
ASSETS.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)


def material(name, color, roughness=0.55, metallic=0.0):
    value = bpy.data.materials.new(name)
    value.diffuse_color = (*color, 1.0)
    value.use_nodes = True
    shader = value.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    return value


SKIN = material("Warm skin", (0.92, 0.55, 0.36), 0.72)
SKIN_LIGHT = material("Cheek highlight", (1.0, 0.66, 0.55), 0.68)
HAIR = material("Chestnut hair", (0.16, 0.055, 0.025), 0.43)
HAIR_LIGHT = material("Hair highlights", (0.39, 0.13, 0.055), 0.38)
WHITE = material("Chef white", (0.98, 0.985, 0.96), 0.54)
APRON = material("Sage apron", (0.25, 0.58, 0.46), 0.62)
APRON_TRIM = material("Apron trim", (0.9, 0.45, 0.28), 0.58)
BROWN = material("Warm brown", (0.24, 0.09, 0.045), 0.62)
EYE = material("Teal iris", (0.035, 0.32, 0.3), 0.3)
BLACK = material("Pupil", (0.012, 0.008, 0.006), 0.25)
MOUTH = material("Smile", (0.3, 0.035, 0.025), 0.6)
PINK = material("Tongue", (0.9, 0.25, 0.28), 0.6)
GOLD = material("Buttons", (0.9, 0.62, 0.2), 0.38, 0.15)


def smooth(obj):
    if obj.type == "MESH":
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    return obj


def attach(obj, parent):
    bpy.context.view_layer.update()
    world = obj.matrix_world.copy()
    obj.parent = parent
    obj.matrix_parent_inverse = Matrix.Identity(4)
    obj.matrix_world = world
    return obj


def empty(name, location, parent=None):
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = "PLAIN_AXES"
    obj.empty_display_size = 0.16
    bpy.context.collection.objects.link(obj)
    obj.matrix_world = Matrix.Translation(Vector(location))
    if parent:
        attach(obj, parent)
    return obj


def sphere(name, location, scale, mat, parent):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=20, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    smooth(obj)
    return attach(obj, parent)


def cube(name, location, scale, mat, parent, bevel=0.08):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    modifier = obj.modifiers.new("Soft edges", "BEVEL")
    modifier.width = bevel
    modifier.segments = 3
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    return attach(obj, parent)


def cylinder(name, location, radius, depth, mat, parent, rotation=(0, 0, 0), vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    smooth(obj)
    bevel = obj.modifiers.new("Rounded ends", "BEVEL")
    bevel.width = min(radius * 0.35, 0.06)
    bevel.segments = 3
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    return attach(obj, parent)


def curve(name, points, mat, parent, thickness=0.018):
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.bevel_depth = thickness
    data.bevel_resolution = 3
    spline = data.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    data.materials.append(mat)
    return attach(obj, parent)


root = empty("MayaRoot", (0, 0, 0))
root["character"] = "Chef Maya"
root["license"] = "Original LifeMotion project asset"
body = empty("MayaBody", (0, 0, 1.75), root)
head = empty("MayaHead", (0, 0, 2.83), root)
left_arm = empty("MayaArmL", (-0.48, 0, 2.25), root)
right_arm = empty("MayaArmR", (0.48, 0, 2.25), root)
left_forearm = empty("MayaForearmL", (-0.67, -0.01, 1.73), left_arm)
right_forearm = empty("MayaForearmR", (0.67, -0.01, 1.73), right_arm)

# Body, coat, apron, legs and shoes.
sphere("Coat", (0, 0.01, 1.75), (0.5, 0.31, 0.68), WHITE, body)
cube("Apron", (0, -0.305, 1.62), (0.37, 0.035, 0.52), APRON, body, 0.06)
cube("ApronPocket", (0, -0.35, 1.48), (0.22, 0.022, 0.16), APRON_TRIM, body, 0.04)
for x in (-0.13, 0.13):
    sphere("CoatButton", (x, -0.325, 1.93), (0.035, 0.022, 0.035), GOLD, body)
for x in (-0.2, 0.2):
    cylinder("Leg", (x, 0.01, 0.76), 0.12, 0.82, WHITE, root)
    sphere("Shoe", (x, -0.12, 0.29), (0.2, 0.31, 0.13), BROWN, root)

# Articulated arms. The named pivots are animated deterministically by Three.js.
for side, arm, forearm in ((-1, left_arm, left_forearm), (1, right_arm, right_forearm)):
    cylinder("Sleeve", (side * 0.58, 0, 1.98), 0.15, 0.58, WHITE, arm, rotation=(0, side * 0.23, 0))
    sphere("Elbow", (side * 0.69, -0.01, 1.72), (0.14, 0.14, 0.14), WHITE, forearm)
    cylinder("Forearm", (side * 0.76, -0.025, 1.48), 0.105, 0.52, SKIN, forearm, rotation=(0, side * 0.18, 0))
    sphere("Hand", (side * 0.82, -0.055, 1.2), (0.14, 0.12, 0.16), SKIN, forearm)

# Hair volume sits behind the face.
sphere("HairBack", (0, 0.08, 2.86), (0.66, 0.48, 0.7), HAIR, head)
sphere("Face", (0, -0.16, 2.84), (0.58, 0.48, 0.59), SKIN, head)
for side in (-1, 1):
    sphere("Ear", (side * 0.56, -0.14, 2.82), (0.11, 0.07, 0.15), SKIN, head)
    sphere("Pigtail", (side * 0.68, 0.04, 2.62), (0.28, 0.25, 0.36), HAIR, head)
    sphere("PigtailTip", (side * 0.82, 0.04, 2.42), (0.19, 0.18, 0.24), HAIR_LIGHT, head)

# Soft fringe locks.
for index, x in enumerate((-0.43, -0.23, 0, 0.23, 0.43)):
    lock = sphere("HairLock", (x, -0.48, 3.22 + 0.04 * math.cos(index)), (0.19, 0.09, 0.27), HAIR if index % 2 else HAIR_LIGHT, head)
    lock.rotation_euler.y = x * 0.5

# Large expressive eyes with highlights, brows, cheeks and smile.
for side in (-1, 1):
    x = side * 0.22
    sphere("EyeWhite", (x, -0.585, 2.92), (0.145, 0.055, 0.185), WHITE, head)
    cylinder("Iris", (x - side * 0.008, -0.655, 2.91), 0.105, 0.025, EYE, head, rotation=(math.pi / 2, 0, 0), vertices=32)
    cylinder("Pupil", (x - side * 0.008, -0.674, 2.91), 0.055, 0.018, BLACK, head, rotation=(math.pi / 2, 0, 0), vertices=32)
    sphere("EyeHighlight", (x - 0.034, -0.696, 2.97), (0.028, 0.012, 0.038), WHITE, head)
    sphere("Cheek", (side * 0.36, -0.61, 2.68), (0.12, 0.018, 0.055), SKIN_LIGHT, head)
    curve("Brow", [(x - 0.11, -0.625, 3.14), (x, -0.65, 3.17), (x + 0.11, -0.625, 3.14)], HAIR, head, 0.022)
sphere("Nose", (0, -0.65, 2.79), (0.055, 0.035, 0.06), SKIN_LIGHT, head)
curve("Smile", [(-0.13, -0.666, 2.62), (0, -0.69, 2.56), (0.13, -0.666, 2.62)], MOUTH, head, 0.025)
sphere("Tongue", (0, -0.672, 2.575), (0.075, 0.018, 0.03), PINK, head)

# Puffy chef hat and neck scarf.
cylinder("HatBand", (0, 0, 3.4), 0.48, 0.2, WHITE, head)
for x, y, z, scale in ((0, 0, 3.75, 0.36), (-0.28, 0, 3.68, 0.3), (0.28, 0, 3.68, 0.3), (-0.12, 0.04, 3.9, 0.29), (0.15, 0.04, 3.89, 0.29)):
    sphere("HatPuff", (x, y, z), (scale, scale * 0.78, scale), WHITE, head)
cube("Neckerchief", (0, -0.33, 2.2), (0.25, 0.04, 0.09), APRON_TRIM, body, 0.05)

# Small hand grip markers let Three.js coordinate utensils with Maya.
empty("MayaHandL", (-0.82, -0.055, 1.2), left_forearm)
empty("MayaHandR", (0.82, -0.055, 1.2), right_forearm)

# Make the mesh render cleanly in the Three.js kitchen.
for obj in bpy.context.scene.objects:
    if obj.type == "MESH":
        obj["gltf_cast_shadows"] = True
        obj["gltf_receive_shadows"] = True

bpy.context.scene["generator"] = "LifeMotion Blender character pipeline"
bpy.context.scene.render.engine = "BLENDER_EEVEE_NEXT"
bpy.ops.wm.save_as_mainfile(filepath=str(HERE / "maya-chef.blend"))
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(
    filepath=str(ASSETS / "maya-chef.glb"),
    export_format="GLB",
    use_selection=True,
    export_cameras=False,
    export_lights=False,
    export_yup=True,
    export_apply=True,
    export_animations=False,
)
print(f"Exported {ASSETS / 'maya-chef.glb'}")
