import * as THREE from 'three'
import type { BedrockBone, BedrockCube, BedrockCubeUv, BedrockFaceName, BedrockFaceUv, BedrockGeometry } from '../types/tlm'
import { BoneWrapper } from './animationRuntime'
import {
  UNIT,
  convertedBonePosition,
  convertedCubeOrigin,
  convertedCubePivot,
  convertedRotatedCubeOrigin,
} from './bedrockTransform'

export interface BedrockThreeModel {
  root: THREE.Group
  skeleton: THREE.Group
  wrappers: Map<string, BoneWrapper>
  texture: THREE.Texture
}

type Vec2 = [number, number]
type Vec3 = [number, number, number]

const VERTEX_ORDER = [
  [5, 4, 0, 1],
  [2, 3, 7, 6],
  [1, 0, 3, 2],
  [4, 5, 6, 7],
  [0, 4, 7, 3],
  [5, 1, 2, 6],
] as const

const FACE_NORMALS = [
  [0, -1, 0],
  [0, 1, 0],
  [0, 0, -1],
  [0, 0, 1],
  [-1, 0, 0],
  [1, 0, 0],
] as const

const UV_ORDER_NO_MIRROR = [
  [1, 2, 6, 7],
  [2, 3, 7, 6],
  [1, 2, 7, 8],
  [4, 5, 7, 8],
  [0, 1, 7, 8],
  [2, 4, 7, 8],
] as const

const UV_ORDER_MIRRORED = [
  [2, 1, 6, 7],
  [3, 2, 7, 6],
  [2, 1, 7, 8],
  [5, 4, 7, 8],
  [4, 2, 7, 8],
  [1, 0, 7, 8],
] as const

const FACE_UV_LOOKUP: BedrockFaceName[] = ['up', 'down', 'north', 'south', 'east', 'west']

function radians(value: number): number {
  return THREE.MathUtils.degToRad(value)
}

function setRotation(group: THREE.Group, rotation?: Vec3): void {
  group.rotation.order = 'ZYX'
  group.rotation.set(radians(rotation?.[0] ?? 0), radians(rotation?.[1] ?? 0), radians(rotation?.[2] ?? 0), 'ZYX')
}

function isBoxUv(uv: BedrockCubeUv | undefined): uv is Vec2 {
  return Array.isArray(uv)
}

function makeVertices(origin: Vec3, size: Vec3, inflate: number): Vec3[] {
  const x = (origin[0] - inflate) * UNIT
  const y = (origin[1] - inflate) * UNIT
  const z = (origin[2] - inflate) * UNIT
  const width = (size[0] + inflate * 2) * UNIT
  const height = (size[1] + inflate * 2) * UNIT
  const depth = (size[2] + inflate * 2) * UNIT
  return [
    [x, y, z],
    [x + width, y, z],
    [x + width, y + height, z],
    [x, y + height, z],
    [x, y, z + depth],
    [x + width, y, z + depth],
    [x + width, y + height, z + depth],
    [x, y + height, z + depth],
  ]
}

function rotatedFaceUvs(face: BedrockFaceUv, texWidth: number, texHeight: number): Vec2[] {
  const uvSize = face.uv_size ?? [0, 0]
  const u1 = face.uv[0] / texWidth
  const v1 = face.uv[1] / texHeight
  const u2 = (face.uv[0] + uvSize[0]) / texWidth
  const v2 = (face.uv[1] + uvSize[1]) / texHeight
  switch (face.uv_rotation ?? 0) {
    case 90:
      return [[u1, v1], [u1, v2], [u2, v2], [u2, v1]]
    case 180:
      return [[u1, v2], [u2, v2], [u2, v1], [u1, v1]]
    case 270:
      return [[u2, v2], [u2, v1], [u1, v1], [u1, v2]]
    default:
      return [[u2, v1], [u1, v1], [u1, v2], [u2, v2]]
  }
}

function pushQuad(
  faceIndex: number,
  vertices: Vec3[],
  quadUvs: Vec2[],
  positions: number[],
  normals: number[],
  uvs: number[],
): void {
  const order = VERTEX_ORDER[faceIndex]
  const normal = FACE_NORMALS[faceIndex]
  const quad = [
    { vertex: vertices[order[0]], uv: quadUvs[0] },
    { vertex: vertices[order[1]], uv: quadUvs[1] },
    { vertex: vertices[order[2]], uv: quadUvs[2] },
    { vertex: vertices[order[3]], uv: quadUvs[3] },
  ]
  for (const index of [0, 1, 2, 0, 2, 3]) {
    const { vertex, uv } = quad[index]
    positions.push(vertex[0], vertex[1], vertex[2])
    normals.push(normal[0], normal[1], normal[2])
    uvs.push(uv[0], uv[1])
  }
}

function makeBoxGeometry(cube: BedrockCube, origin: Vec3, texWidth: number, texHeight: number): THREE.BufferGeometry {
  if (!isBoxUv(cube.uv)) throw new Error('Box cube is missing array uv')
  const inflate = cube.inflate ?? 0
  const vertices = makeVertices(origin, cube.size, inflate)
  const width = Math.floor(cube.size[0])
  const height = Math.floor(cube.size[1])
  const depth = Math.floor(cube.size[2])
  const [texOffX, texOffY] = cube.uv
  const sourceUvs = [
    texOffX / texWidth,
    (texOffX + depth) / texWidth,
    (texOffX + depth + width) / texWidth,
    (texOffX + depth + width + width) / texWidth,
    (texOffX + depth + width + depth) / texWidth,
    (texOffX + depth + width + depth + width) / texWidth,
    texOffY / texHeight,
    (texOffY + depth) / texHeight,
    (texOffY + depth + height) / texHeight,
  ]
  const uvOrder = cube.mirror ? UV_ORDER_MIRRORED : UV_ORDER_NO_MIRROR
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  for (let face = 0; face < VERTEX_ORDER.length; face += 1) {
    const order = uvOrder[face]
    pushQuad(
      face,
      vertices,
      [
        [sourceUvs[order[1]], sourceUvs[order[2]]],
        [sourceUvs[order[0]], sourceUvs[order[2]]],
        [sourceUvs[order[0]], sourceUvs[order[3]]],
        [sourceUvs[order[1]], sourceUvs[order[3]]],
      ],
      positions,
      normals,
      uvs,
    )
  }
  return buildGeometry(positions, normals, uvs)
}

function makePerFaceGeometry(cube: BedrockCube, origin: Vec3, texWidth: number, texHeight: number): THREE.BufferGeometry {
  if (!cube.uv || isBoxUv(cube.uv)) throw new Error('Per-face cube is missing face uv')
  const inflate = cube.inflate ?? 0
  const vertices = makeVertices(origin, cube.size, inflate)
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  for (let faceIndex = 0; faceIndex < VERTEX_ORDER.length; faceIndex += 1) {
    const face = cube.uv[FACE_UV_LOOKUP[faceIndex]]
    if (!face) continue
    const uvSize = face.uv_size ?? [0, 0]
    if (Math.abs(uvSize[0]) < 1e-9 && Math.abs(uvSize[1]) < 1e-9) continue
    pushQuad(faceIndex, vertices, rotatedFaceUvs(face, texWidth, texHeight), positions, normals, uvs)
  }
  return buildGeometry(positions, normals, uvs)
}

function buildGeometry(positions: number[], normals: number[], uvs: number[]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function makeCubeMesh(
  bone: BedrockBone,
  cube: BedrockCube,
  origin: Vec3,
  material: THREE.Material,
  texWidth: number,
  texHeight: number,
): THREE.Mesh {
  const geometry = isBoxUv(cube.uv)
    ? makeBoxGeometry(cube, origin, texWidth, texHeight)
    : makePerFaceGeometry(cube, origin, texWidth, texHeight)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = `${bone.name}.cube`
  return mesh
}

export async function createBedrockThreeModel(geometry: BedrockGeometry, textureUrl: string): Promise<BedrockThreeModel> {
  const texture = await new THREE.TextureLoader().loadAsync(textureUrl)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.generateMipmaps = false
  texture.flipY = false
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.needsUpdate = true

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    alphaTest: 0.08,
    side: THREE.DoubleSide,
    roughness: 0.68,
    metalness: 0.02,
  })

  const root = new THREE.Group()
  root.name = 'bedrock-root'
  const display = new THREE.Group()
  display.name = 'bedrock-display'
  display.rotation.y = Math.PI
  display.scale.set(-1, -1, 1)
  root.add(display)

  const skeleton = new THREE.Group()
  skeleton.name = 'bedrock-skeleton'
  display.add(skeleton)

  const bonesByName = new Map<string, BedrockBone>()
  const groups = new Map<string, THREE.Group>()
  const rawPositions = new Map<string, Vec3>()

  for (const bone of geometry.bones) {
    bonesByName.set(bone.name, bone)
    const group = new THREE.Group()
    group.name = bone.name
    setRotation(group, bone.rotation)
    groups.set(bone.name, group)
  }

  for (const bone of geometry.bones) {
    const group = groups.get(bone.name)!
    const rawPosition = convertedBonePosition(bone, bonesByName)
    rawPositions.set(bone.name, rawPosition)
    group.position.set(rawPosition[0] * UNIT, rawPosition[1] * UNIT, rawPosition[2] * UNIT)

    if (bone.parent) {
      const parentGroup = groups.get(bone.parent)
      if (!parentGroup) throw new Error(`Bone "${bone.name}" references missing parent "${bone.parent}"`)
      parentGroup.add(group)
    } else {
      skeleton.add(group)
    }

    for (const cube of bone.cubes ?? []) {
      if (cube.rotation) {
        const cubeGroup = new THREE.Group()
        cubeGroup.name = `${bone.name}.cubePivot`
        const cubePivot = convertedCubePivot(bone, cube)
        cubeGroup.position.set(cubePivot[0] * UNIT, cubePivot[1] * UNIT, cubePivot[2] * UNIT)
        setRotation(cubeGroup, cube.rotation)
        cubeGroup.add(makeCubeMesh(bone, cube, convertedRotatedCubeOrigin(cube), material, geometry.textureWidth, geometry.textureHeight))
        group.add(cubeGroup)
      } else {
        group.add(makeCubeMesh(bone, cube, convertedCubeOrigin(bone, cube), material, geometry.textureWidth, geometry.textureHeight))
      }
    }
  }

  const wrappers = new Map<string, BoneWrapper>()
  for (const [name, group] of groups) {
    const rawPosition = rawPositions.get(name) ?? [0, 0, 0]
    wrappers.set(name, new BoneWrapper(group, new THREE.Vector3(rawPosition[0], rawPosition[1], rawPosition[2])))
  }

  return { root, skeleton, wrappers, texture }
}
