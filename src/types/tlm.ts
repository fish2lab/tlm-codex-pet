export interface BedrockFaceUv {
  uv: [number, number]
  uv_size?: [number, number]
  uv_rotation?: number
}

export type BedrockFaceName = 'down' | 'east' | 'north' | 'south' | 'up' | 'west'
export type BedrockCubeUv = [number, number] | Partial<Record<BedrockFaceName, BedrockFaceUv>>

export interface BedrockCube {
  origin: [number, number, number]
  size: [number, number, number]
  uv?: BedrockCubeUv
  rotation?: [number, number, number]
  pivot?: [number, number, number]
  inflate?: number
  mirror?: boolean
}

export interface BedrockBone {
  name: string
  parent?: string
  pivot?: [number, number, number]
  rotation?: [number, number, number]
  mirror?: boolean
  cubes?: BedrockCube[]
}

export interface BedrockGeometry {
  textureWidth: number
  textureHeight: number
  visibleBoundsWidth?: number
  visibleBoundsHeight?: number
  visibleBoundsOffset?: [number, number, number]
  bones: BedrockBone[]
}

export interface AnimationDebugEntry {
  id: string
  kind: 'inner-shim' | 'custom-js' | 'gecko-json' | 'missing' | 'error'
  ok: boolean
  message: string
}
