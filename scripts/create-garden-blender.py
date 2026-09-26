import bpy, math, random
from mathutils import Vector
random.seed(24)
def material(name,h,rough=.7,metal=0,alpha=1):
    rgb=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    m=bpy.data.materials.new(name); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*rgb,alpha)
    p.inputs['Roughness'].default_value=rough
    p.inputs['Metallic'].default_value=metal
    p.inputs['Alpha'].default_value=alpha
    m.diffuse_color=(*rgb,alpha)
    if alpha<1: m.surface_render_method='DITHERED'
    return m
mats={k:material(k,h) for k,h in {
'soil':'77533C','bark':'926447','wood':'BC9368','ring':'A78059','moss':'719452','moss_light':'94B16B','moss_deep':'476C3A','leaf':'579C62','leaf_light':'94C472','stem':'437647','stone':'A8B2A0','stone_dark':'7D8E80','strawberry':'E85857','seed':'FFE3A5','mushroom':'DD8059','cream':'F4E9C9','flower':'FFF3CE','pink':'EFB7BC','gold':'E5B65D','body':'675346','head':'806047','eyes':'221D1C','iris':'B6783E','glint':'FFFFFF','leg':'624C3C','pond_edge':'90AB97','crystal':'89CFC2'}.items()}
mats['water']=material('water','76BCC1',.16,.12)
mats['wing']=material('wing','CEE7DB',.22,.15,.58)
mats['vein']=material('vein','A9CDB8',.4,0,.72)
def group(name,parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;return o
env=group('Garden_Environment')
def uv(name,loc,scale,mat,parent=env,segments=20,rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc)
    o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(mats[mat]);o.parent=parent
    for f in o.data.polygons:f.use_smooth=True
    return o
def cyl(name,loc,radius,depth,mat,parent=env,vertices=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc)
    o=bpy.context.object;o.name=name;o.data.materials.append(mats[mat]);o.parent=parent
    bevel=o.modifiers.new('Soft crafted edges','BEVEL');bevel.width=.07;bevel.segments=2
    o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o
def branch(name,a,b,r,mat='stem',parent=env):
    a,b=Vector(a),Vector(b);d=b-a
    o=cyl(name,(a+b)/2,r,d.length,mat,parent,10);o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return o
def leaf(name,loc,scale,angle=0,mat='leaf',parent=env):
    o=uv(name,loc,scale,mat,parent,12,8);o.rotation_euler=(0,.3,angle);return o
base=cyl('Island_log',(0,0,-.4),4.45,.8,'bark',vertices=80)
cyl('Cut_wood_rim',(0,0,.01),4.47,.11,'wood',vertices=80)
cyl('Living_moss_ground',(0,0,.09),4.25,.16,'moss',vertices=80)
for i in range(42):
    a=i*math.tau/42
    uv('Bark_ridge_%02d'%i,(4.36*math.cos(a),4.36*math.sin(a),-.42),(.17,.17,.37),'soil',segments=10,rings=8)
for i in range(32):
    a=i*math.tau/32;r=4.04+random.uniform(-.2,.1)
    uv('Moss_cushion_%02d'%i,(r*math.cos(a),r*math.sin(a),.16),(.5,.38,.17),random.choice(['moss','moss_light','moss_deep']),segments=12,rings=8)
# Two expressive miniature trees, their canopies frame the center.
for ti,(x,y,s) in enumerate([(-2.5,1.7,1),(2.7,1.8,.72)]):
    branch('Tree_%d_trunk'%ti,(x,y,.1),(x-.2*s,y,2.5*s),.15*s,'bark')
    for j in range(4):
        a=j*1.8;end=(x+math.cos(a)*.7*s,y+math.sin(a)*.65*s,(2+j*.12)*s)
        branch('Tree_branch',(x-.1,y,1.5*s),end,.065*s,'bark')
        uv('Tree_canopy',end,(.88*s,.72*s,.72*s),['leaf','leaf_light','moss_light'][j%3],segments=16,rings=10)
# Smooth stone pond and a lily pad, with a tiny blossom.
pond=(-2.1,-1.45)
uv('Pond_rim',(pond[0],pond[1],.17),(1,.68,.16),'pond_edge')
uv('Pond_water',(pond[0],pond[1],.26),(.86,.55,.045),'water',segments=40,rings=12)
leaf('Lily_pad',(-2.3,-1.35,.33),(.28,.24,.025),.4,'leaf')
for i in range(5):
    a=i*math.tau/5;uv('Lily_flower',(-2.3+math.cos(a)*.10,-1.35+math.sin(a)*.10,.38),(.09,.09,.07),'pink',segments=12,rings=8)
# Strawberry fruit with real mesh seeds and calyx.
straw=group('Strawberry_patch',env)
for idx,(x,y,s) in enumerate([(2.1,-1.55,.7),(2.65,-1.05,.45)]):
    uv('Strawberry_%d'%idx,(x,y,.3+s*.3),(.42*s,.42*s,.58*s),'strawberry',straw,24,16)
    for j in range(22):
        a=j*2.399;z=-.65+1.3*j/21;r=math.sqrt(1-z*z)
        uv('Strawberry_seed',(x+.427*s*r*math.cos(a),y+.427*s*r*math.sin(a),.3+s*.3+.58*s*z),(.025*s,.025*s,.045*s),'seed',straw,8,6)
    for j in range(5):
        a=j*math.tau/5;leaf('Strawberry_calyx',(x+.16*s*math.cos(a),y+.16*s*math.sin(a),.3+.85*s),(.22*s,.08*s,.035*s),a,'leaf',straw)
# Mushroom grove.
for i,(x,y,s) in enumerate([(-3.25,.1,.75),(-3.6,.6,.5),(-2.9,.5,.4),(2.9,.65,.6),(3.3,.2,.42)]):
    cyl('Mushroom_stem_%d'%i,(x,y,.17+.25*s),.10*s,.5*s,'cream')
    uv('Mushroom_cap_%d'%i,(x,y,.17+.55*s),(.4*s,.4*s,.23*s),'mushroom')
    for j in range(6):
        a=j*2.4;r=.23*s
        uv('Mushroom_dot',(x+r*math.cos(a),y+r*math.sin(a),.17+.72*s),(.055*s,.055*s,.025*s),'cream',segments=8,rings=6)
# Ferns: stems and paired leaflets.
for fi,(x,y,a) in enumerate([(-1,2.8,0),(1.35,2.65,1),(-3,-1,-.5),(3,-.25,.8),(0,3.5,0)]):
    for f in range(3):
        heading=a+(f-1)*.75
        for j in range(5):
            t=j/5;cx=x+math.cos(heading)*t*.75;cy=y+math.sin(heading)*t*.75;cz=.2+math.sin(t*2)*.6
            if j:branch('Fern_spine',(x+math.cos(heading)*(j-1)/5*.75,y+math.sin(heading)*(j-1)/5*.75,.2+math.sin((j-1)/5*2)*.6),(cx,cy,cz),.012)
            for side in [-1,1]:
                la=heading+side*1.05
                leaf('Fern_leaflet',(cx+math.cos(la)*.13,cy+math.sin(la)*.13,cz),(.18*(1-t*.55),.065,.025),la)
# Flowers and stones around the border; front center remains open for the pet.
for i in range(17):
    a=random.uniform(0,math.tau);r=random.uniform(2.6,3.95);x,y=r*math.cos(a),r*math.sin(a)
    uv('River_stone_%02d'%i,(x,y,.2),(.17+random.random()*.19,.16+random.random()*.15,.13+random.random()*.13),random.choice(['stone','stone_dark']),segments=12,rings=8)
for i in range(20):
    a=random.uniform(0,math.tau);r=random.uniform(2.8,3.85);x,y=r*math.cos(a),r*math.sin(a);height=random.uniform(.3,.55)
    branch('Daisy_stem',(x,y,.15),(x,y,height),.015)
    for j in range(5):
        a=j*math.tau/5;leaf('Daisy_petal',(x+.095*math.cos(a),y+.095*math.sin(a),height),(.1,.06,.03),a, 'flower' if i%3 else 'pink')
    uv('Daisy_pollen',(x,y,height+.02),(.055,.055,.04),'gold',segments=10,rings=6)
# Grass uses shared geometry. Dense ground detail without large geometry files.
prototype=leaf('Grass_000',(0,0,-2),(.09,.02,.22),0,'moss_light')
for i in range(230):
    a=random.uniform(0,math.tau);r=random.uniform(1.5,4);x,y=r*math.cos(a),r*math.sin(a)
    if (x+2.1)**2+(y+1.45)**2<.9:continue
    o=prototype.copy();o.data=prototype.data;bpy.context.collection.objects.link(o)
    o.name='Grass_%03d'%i;o.location=(x,y,.27);o.rotation_euler=(random.uniform(-.4,.4),random.uniform(-.4,.4),a);o.scale=tuple(v*random.uniform(.65,1.2) for v in prototype.scale)
bpy.data.objects.remove(prototype,do_unlink=True)
# Leaf bed and fallen twig.
leaf('Leaf_bed',(1.1,1,.3),(.85,.4,.11),-.5,'leaf_light')
branch('Fallen_twig',(.2,2.45,.25),(1.5,2.75,.3),.11,'wood')
for side in [-1,1]:branch('Twig_branch',(.7,2.6,.3),(.8,2.6+side*.4,.37),.05,'wood')
for i in range(3):
    bpy.ops.mesh.primitive_cone_add(vertices=6,radius1=.16,radius2=0,depth=.5+i*.1,location=(-.9+i*.25,-2.8,.35))
    o=bpy.context.object;o.name='Dew_crystal';o.data.materials.append(mats['crystal']);o.parent=env
# Momo is a separate rig-friendly hierarchy. Blender -Y is the face direction.
momo=group('Momo');momo.location=(0,-.4,.8)
uv('Abdomen',(0,.28,.12),(.38,.5,.36),'body',momo,28,18)
uv('Thorax',(0,-.12,.23),(.33,.34,.34),'body',momo,28,18)
uv('Head',(0,-.42,.39),(.42,.34,.38),'head',momo,28,18)
for side in [-1,1]:
    uv('Amber_eye',(side*.255,-.665,.45),(.225,.12,.25),'iris',momo,24,16)
    uv('Dark_eye',(side*.255,-.752,.46),(.15,.057,.18),'eyes',momo,24,16)
    uv('Eye_glint',(side*.255-.038,-.798,.54),(.046,.023,.056),'glint',momo,16,10)
    branch('Antenna',(side*.18,-.4,.68),(side*.29,-.4,.98),.023,'body',momo)
    uv('Antenna_tip',(side*.29,-.4,.98),(.041,.041,.048),'body',momo,12,8)
    for j in range(3):
        x=side*(.22+j*.015);y=-.23+j*.24
        knee=(side*.52,y-.07,-.1)
        branch('Leg_%d_%d_upper'%(side,j),(x,y,.13),knee,.025,'leg',momo)
        branch('Leg_%d_%d_lower'%(side,j),knee,(side*.58,y-.24,-.34),.020,'leg',momo)
    wing=group('Wing_L' if side<0 else 'Wing_R',momo)
    wing.location=(side*.16,.03,.47)
    o=uv('Wing_membrane',(side*.40,.38,.08),(.34,.69,.034),'wing',wing,24,16)
    o.rotation_euler=(.18,side*.2,-side*.6)
    for j in range(3):
        branch('Wing_vein',(0,0,0),(side*(.22+j*.12),.35+j*.14,.10),.008,'vein',wing)
uv('Smile_muzzle',(0,-.756,.24),(.11,.034,.055),'body',momo,16,10)
# Camera and portable lighting.
bpy.ops.object.camera_add(location=(9,-13,10))
camera=bpy.context.object;camera.name='Delivery_camera'
camera.rotation_euler=(Vector((0,0,.55))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=12.7;bpy.context.scene.camera=camera
for name,loc,power,color in [('Sun_key',(-3,-4,9),2.5,(1,.89,.72)),('Fill',(5,0,6),.9,(.7,.85,1))]:
    bpy.ops.object.light_add(type='SUN',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.color=color;o.data.angle=.3;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
scene=bpy.context.scene
scene.world=bpy.data.worlds.new('Mint studio world')
scene.world.color=(.45,.55,.48)
scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=960;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.render.film_transparent=False
scene.view_settings.view_transform='AgX'
scene.render.image_settings.media_type='IMAGE'
scene.render.image_settings.file_format='PNG'
target=artifacts.file(name='makecho-3d-preview.png',media_type='image/png')
scene.render.filepath=target.path
bpy.ops.render.render(write_still=True)
target.publish()
result={'objects':len(bpy.data.objects),'mesh_objects':sum(o.type=='MESH' for o in bpy.data.objects),'semantic_assets':['Momo','log island','moss','trees','ferns','grass','river stones','daisies','mushrooms','strawberries','pond','lily pad','leaf bed','fallen twig','dew crystals'],'momo_origin':list(momo.location)}
