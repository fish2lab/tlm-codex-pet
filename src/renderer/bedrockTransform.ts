import type { BedrockBone, BedrockCube } from '../types/tlm'

export const UNIT = 1 / 16
export const ROOT_Y_PIVOT = 24

export type Vec3 = [number, number, number]

export function pivotOf(bone: BedrockBone): Vec3 {
  return bone.pivot ?? [0, 0, 0]
}

function indexConvert(bone: number, parent: number, index: number): number {
  return index === 1 ? parent - bone : bone - parent
}

function rootConvert(value: number, index: number): number {
  return index === 1 ? ROOT_Y_PIVOT - value : value
}

export function convertBonePivot(bone: BedrockBone, bones: Map<string, BedrockBone>, index: number): number {
  const pivot = pivotOf(bone)
  if (bone.parent) {
    const parent = bones.get(bone.parent)
    if (!parent) throw new Error(`Bone "${bone.name}" references missing parent "${bone.parent}"`)
    const parentPivot = pivotOf(parent)
    return indexConvert(pivot[index], parentPivot[index], index)
  }
  return rootConvert(pivot[index], index)
}

export function convertCubePivot(parent: BedrockBone, cube: BedrockCube, index: number): number {
  if (!cube.pivot) throw new Error(`Rotated cube on bone "${parent.name}" is missing pivot`)
  const parentPivot = pivotOf(parent)
  return indexConvert(cube.pivot[index], parentPivot[index], index)
}

export function convertOriginFromBone(bone: BedrockBone, cube: BedrockCube, index: number): number {
  const bonePivot = pivotOf(bone)
  return index === 1
    ? bonePivot[index] - cube.origin[index] - cube.size[index]
    : cube.origin[index] - bonePivot[index]
}

export function convertOriginFromCube(cube: BedrockCube, index: number): number {
  if (!cube.pivot) throw new Error('Rotated cube is missing pivot')
  return index === 1
    ? cube.pivot[index] - cube.origin[index] - cube.size[index]
    : cube.origin[index] - cube.pivot[index]
}

export function convertedBonePosition(bone: BedrockBone, bones: Map<string, BedrockBone>): Vec3 {
  return [
    convertBonePivot(bone, bones, 0),
    convertBonePivot(bone, bones, 1),
    convertBonePivot(bone, bones, 2),
  ]
}

export function convertedCubePivot(parent: BedrockBone, cube: BedrockCube): Vec3 {
  return [
    convertCubePivot(parent, cube, 0),
    convertCubePivot(parent, cube, 1),
    convertCubePivot(parent, cube, 2),
  ]
}

export function convertedCubeOrigin(bone: BedrockBone, cube: BedrockCube): Vec3 {
  return [
    convertOriginFromBone(bone, cube, 0),
    convertOriginFromBone(bone, cube, 1),
    convertOriginFromBone(bone, cube, 2),
  ]
}

export function convertedRotatedCubeOrigin(cube: BedrockCube): Vec3 {
  return [
    convertOriginFromCube(cube, 0),
    convertOriginFromCube(cube, 1),
    convertOriginFromCube(cube, 2),
  ]
}
