import type { BedrockBone, BedrockCubeUv, BedrockFaceName, BedrockFaceUv, BedrockGeometry } from '../types/tlm'

function requiredNumber(value: unknown, label: string): number {
  const number = Number(value)
  if (!Number.isFinite(number)) throw new Error(`Bedrock geometry ${label} must be a finite number`)
  return number
}

function positiveNumber(value: unknown, label: string): number {
  const number = requiredNumber(value, label)
  if (number <= 0) throw new Error(`Bedrock geometry ${label} must be positive`)
  return number
}

function requiredTuple3(value: unknown, label: string): [number, number, number] {
  if (!Array.isArray(value) || value.length < 3) {
    throw new Error(`Bedrock geometry ${label} must be a 3-number array`)
  }
  return [requiredNumber(value[0], `${label}[0]`), requiredNumber(value[1], `${label}[1]`), requiredNumber(value[2], `${label}[2]`)]
}

function optionalTuple3(value: unknown): [number, number, number] | undefined {
  return Array.isArray(value) ? requiredTuple3(value, 'optional tuple') : undefined
}

function tuple3Or(value: unknown, defaults: [number, number, number]): [number, number, number] {
  return Array.isArray(value) ? requiredTuple3(value, 'visible_bounds_offset') : defaults
}

function requiredTuple2(value: unknown, label: string): [number, number] {
  if (!Array.isArray(value) || value.length < 2) {
    throw new Error(`Bedrock geometry ${label} must be a 2-number array`)
  }
  return [requiredNumber(value[0], `${label}[0]`), requiredNumber(value[1], `${label}[1]`)]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function normalizeFaceUv(raw: unknown): BedrockFaceUv | undefined {
  if (!isRecord(raw)) return undefined
  return {
    uv: requiredTuple2(raw.uv, 'face uv'),
    uv_size: requiredTuple2(raw.uv_size, 'face uv_size'),
    uv_rotation: raw.uv_rotation == null ? undefined : Number(raw.uv_rotation),
  }
}

function normalizeCubeUv(value: unknown): BedrockCubeUv | undefined {
  if (Array.isArray(value)) return requiredTuple2(value, 'cube uv')
  if (!isRecord(value)) return undefined
  const faces: Partial<Record<BedrockFaceName, BedrockFaceUv>> = {}
  for (const name of ['down', 'east', 'north', 'south', 'up', 'west'] as const) {
    const face = normalizeFaceUv(value[name])
    if (face) faces[name] = face
  }
  return Object.keys(faces).length > 0 ? faces : undefined
}

function normalizeBone(raw: Record<string, unknown>): BedrockBone {
  const boneMirror = Boolean(raw.mirror)
  const cubes = Array.isArray(raw.cubes)
    ? raw.cubes.map((cube) => {
        const item = cube as Record<string, unknown>
        const hasMirror = typeof item.mirror === 'boolean'
        return {
          origin: requiredTuple3(item.origin, 'cube origin'),
          size: requiredTuple3(item.size, 'cube size'),
          uv: normalizeCubeUv(item.uv),
          rotation: optionalTuple3(item.rotation),
          pivot: optionalTuple3(item.pivot),
          inflate: Number(item.inflate ?? 0),
          mirror: hasMirror ? Boolean(item.mirror) : boneMirror,
        }
      })
    : []
  return {
    name: String(raw.name || ''),
    parent: raw.parent ? String(raw.parent) : undefined,
    pivot: requiredTuple3(raw.pivot, `bone ${String(raw.name || '')} pivot`),
    rotation: optionalTuple3(raw.rotation),
    mirror: boneMirror,
    cubes,
  }
}

export function parseBedrockGeometry(jsonText: string): BedrockGeometry {
  const json = JSON.parse(jsonText) as Record<string, unknown>
  const legacy = json['geometry.model'] as Record<string, unknown> | undefined
  const modernList = json['minecraft:geometry'] as Record<string, unknown>[] | undefined
  const modern = Array.isArray(modernList) ? modernList[0] : undefined
  const source = modern ?? legacy
  if (!source) {
    throw new Error('Bedrock geometry must contain geometry.model or minecraft:geometry')
  }
  const description = (modern?.description as Record<string, unknown> | undefined) ?? source
  const bonesRaw = source.bones
  if (!Array.isArray(bonesRaw)) {
    throw new Error('Bedrock geometry has no bones array')
  }
  return {
    textureWidth: positiveNumber(description.texture_width ?? description.texturewidth, 'texture width'),
    textureHeight: positiveNumber(description.texture_height ?? description.textureheight, 'texture height'),
    visibleBoundsWidth: Number(description.visible_bounds_width ?? 0),
    visibleBoundsHeight: Number(description.visible_bounds_height ?? 0),
    visibleBoundsOffset: tuple3Or(description.visible_bounds_offset, [0, 0, 0]),
    bones: bonesRaw.map((bone) => normalizeBone(bone as Record<string, unknown>)).filter((bone) => bone.name),
  }
}
