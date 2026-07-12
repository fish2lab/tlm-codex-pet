import * as THREE from 'three'
import { INNER_ANIMATION_IDS } from '../tlm/defaultAnimations'
import type { AnimationDebugEntry } from '../types/tlm'

export class BoneWrapper {
  readonly group: THREE.Group
  readonly initRotation: THREE.Euler
  readonly initPosition: THREE.Vector3
  readonly rotationPoint: THREE.Vector3
  private offset = new THREE.Vector3()

  constructor(group: THREE.Group, rotationPoint = new THREE.Vector3(group.position.x, group.position.y, group.position.z)) {
    this.group = group
    this.initRotation = group.rotation.clone()
    this.initPosition = group.position.clone()
    this.rotationPoint = rotationPoint.clone()
  }

  reset(): void {
    this.offset.set(0, 0, 0)
    this.group.rotation.copy(this.initRotation)
    this.group.position.copy(this.initPosition)
    this.group.visible = true
  }

  getRotateAngleX(): number { return this.group.rotation.x }
  getRotateAngleY(): number { return this.group.rotation.y }
  getRotateAngleZ(): number { return this.group.rotation.z }
  setRotateAngleX(value: number): void { this.group.rotation.x = value }
  setRotateAngleY(value: number): void { this.group.rotation.y = value }
  setRotateAngleZ(value: number): void { this.group.rotation.z = value }
  getInitRotateAngleX(): number { return this.initRotation.x }
  getInitRotateAngleY(): number { return this.initRotation.y }
  getInitRotateAngleZ(): number { return this.initRotation.z }
  getOffsetX(): number { return this.offset.x }
  getOffsetY(): number { return this.offset.y }
  getOffsetZ(): number { return this.offset.z }
  setOffsetX(value: number): void { this.offset.x = value; this.syncOffset() }
  setOffsetY(value: number): void { this.offset.y = value; this.syncOffset() }
  setOffsetZ(value: number): void { this.offset.z = value; this.syncOffset() }
  getRotationPointX(): number { return this.rotationPoint.x }
  getRotationPointY(): number { return this.rotationPoint.y }
  getRotationPointZ(): number { return this.rotationPoint.z }
  isHidden(): boolean { return !this.group.visible }
  setHidden(hidden: boolean): void { this.group.visible = !hidden }

  private syncOffset(): void {
    this.group.position.copy(this.initPosition).add(this.offset)
  }
}

export interface AnimationContext {
  wrappers: Map<string, BoneWrapper>
  ageInTicks: number
  pointerYaw: number
  pointerPitch: number
  limbSwing: number
  limbSwingAmount: number
  speaking: boolean
  thinking: boolean
}

type CustomAnimation = {
  animation: (
    maid: Record<string, unknown>,
    limbSwing: number,
    limbSwingAmount: number,
    ageInTicks: number,
    netHeadYaw: number,
    headPitch: number,
    scale: number,
    modelMap: { get: (key: string) => BoneWrapper | undefined },
  ) => void
}

function wrapper(ctx: AnimationContext, name: string): BoneWrapper | undefined {
  return ctx.wrappers.get(name)
}

function applyInnerAnimation(id: string, ctx: AnimationContext): void {
  const time = ctx.ageInTicks
  if (id.includes('/head/default')) {
    const head = wrapper(ctx, 'head')
    if (head) {
      head.setRotateAngleY(head.getInitRotateAngleY() + ctx.pointerYaw)
      head.setRotateAngleX(head.getInitRotateAngleX() + ctx.pointerPitch)
    }
  }
  if (id.includes('/head/blink')) {
    const closed = (time % 85 > 79 && time % 85 < 84) || (ctx.speaking && time % 18 > 15)
    for (const name of ['blink', 'blink2']) {
      const part = wrapper(ctx, name)
      if (part) part.setHidden(!closed)
    }
  }
  if (id.includes('/head/beg') || id.includes('/head/music_shake')) {
    const head = wrapper(ctx, 'head')
    if (head && (ctx.thinking || ctx.speaking)) {
      head.setRotateAngleZ(head.getInitRotateAngleZ() + Math.cos(time * 0.28) * 0.045)
    }
  }
  if (id.includes('/arm/default')) {
    const left = wrapper(ctx, 'armLeft')
    const right = wrapper(ctx, 'armRight')
    if (left) {
      left.setRotateAngleZ(left.getInitRotateAngleZ() - 0.34 + Math.cos(time * 0.07) * 0.035)
      left.setRotateAngleX(left.getInitRotateAngleX() + Math.sin(time * 0.08) * 0.035)
    }
    if (right) {
      right.setRotateAngleZ(right.getInitRotateAngleZ() + 0.34 - Math.cos(time * 0.07) * 0.035)
      right.setRotateAngleX(right.getInitRotateAngleX() - Math.sin(time * 0.08) * 0.035)
    }
  }
  if (id.includes('/arm/swing')) {
    const amount = ctx.speaking ? 0.22 : 0.08
    const left = wrapper(ctx, 'armLeft')
    const right = wrapper(ctx, 'armRight')
    if (left) left.setRotateAngleX(left.getRotateAngleX() + Math.sin(time * 0.22) * amount)
    if (right) right.setRotateAngleX(right.getRotateAngleX() - Math.sin(time * 0.22) * amount)
  }
  if (id.includes('/leg/default')) {
    const left = wrapper(ctx, 'legLeft')
    const right = wrapper(ctx, 'legRight')
    const walk = Math.max(ctx.limbSwingAmount, 0.03)
    if (left) left.setRotateAngleX(left.getInitRotateAngleX() + Math.cos(ctx.limbSwing * 0.66) * 0.75 * walk)
    if (right) right.setRotateAngleX(right.getInitRotateAngleX() + Math.cos(ctx.limbSwing * 0.66 + Math.PI) * 0.75 * walk)
  }
  if (id.includes('/wing/default') || id.includes('/tail/default') || id.includes('hair_swing')) {
    for (const name of ['wingLeft', 'wingRight', 'tail', 'hairLeftSwing', 'hairRightSwing', 'hairPonytailSwing']) {
      const part = wrapper(ctx, name)
      if (part) part.setRotateAngleZ(part.getInitRotateAngleZ() + Math.sin(time * 0.11) * 0.12)
    }
  }
  if (id.includes('/sit/skirt_rotation')) {
    const skirt = wrapper(ctx, 'sittingRotationSkirt')
    if (skirt) skirt.setRotateAngleY(skirt.getInitRotateAngleY() + Math.sin(time * 0.05) * 0.025)
  }
  if (id.includes('/base/float')) {
    for (const [name, sign] of [['sinFloat', 1], ['_sinFloat', -1], ['cosFloat', 1], ['_cosFloat', -1]] as const) {
      const part = wrapper(ctx, name)
      if (part) {
        const wave = name.includes('cos') ? Math.cos(time * 0.1) : Math.sin(time * 0.1)
        part.setOffsetY(wave * 0.05 * sign)
      }
    }
  }
  if (id.includes('/rotation/')) {
    const speed = id.includes('high') ? 0.12 : id.includes('low') ? 0.025 : 0.06
    const axis = id.includes('/x_') ? 'x' : id.includes('/y_') ? 'y' : 'z'
    for (const part of ctx.wrappers.values()) {
      if (part.group.name.toLowerCase().includes('rotation')) {
        if (axis === 'x') part.setRotateAngleX(part.getInitRotateAngleX() + time * speed)
        if (axis === 'y') part.setRotateAngleY(part.getInitRotateAngleY() + time * speed)
        if (axis === 'z') part.setRotateAngleZ(part.getInitRotateAngleZ() + time * speed)
      }
    }
  }
}

function makeMaidShim(ctx: AnimationContext): Record<string, unknown> {
  return {
    isSitting: () => false,
    isSleep: () => false,
    isSleeping: () => false,
    isBegging: () => ctx.thinking,
    isHoldTrolley: () => false,
    isHoldVehicle: () => false,
    getSwingProgress: () => (ctx.speaking ? (Math.sin(ctx.ageInTicks * 0.2) + 1) / 2 : 0),
    isSwingLeftHand: () => Math.sin(ctx.ageInTicks * 0.14) > 0,
    getLeftHandRotation: () => [0, 0, 0],
    getRightHandRotation: () => [0, 0, 0],
  }
}

export function compileCustomAnimation(source: string): CustomAnimation {
  let last: CustomAnimation | undefined
  const glWrapper = {
    translate: () => undefined,
    rotate: () => undefined,
    scale: () => undefined,
  }
  const java = {
    asJSONCompatible: (value: CustomAnimation) => {
      last = value
      return value
    },
    type: () => glWrapper,
  }
  const factory = new Function('Java', 'GlWrapper', 'Math', `
    "use strict";
    const window = undefined;
    const document = undefined;
    const fetch = undefined;
    const XMLHttpRequest = undefined;
    ${source}
    return arguments[3] || null;
  `)
  factory(java, glWrapper, Math, last)
  if (!last || typeof last.animation !== 'function') {
    throw new Error('custom animation did not return Java.asJSONCompatible({ animation })')
  }
  return last
}

export class AnimationController {
  readonly wrappers: Map<string, BoneWrapper>
  private custom = new Map<string, CustomAnimation>()
  debug: AnimationDebugEntry[] = []

  constructor(wrappers: Map<string, BoneWrapper>) {
    this.wrappers = wrappers
  }

  setCustomScript(id: string, source: string): void {
    this.custom.set(id, compileCustomAnimation(source))
  }

  apply(animationIds: string[], ctxBase: Omit<AnimationContext, 'wrappers'>, collectDebug = false): AnimationDebugEntry[] {
    for (const item of this.wrappers.values()) item.reset()
    const ctx = { ...ctxBase, wrappers: this.wrappers }
    const debug: AnimationDebugEntry[] | null = collectDebug ? [] : null
    for (const id of animationIds) {
      try {
        const custom = this.custom.get(id)
        if (custom) {
          custom.animation(
            makeMaidShim(ctx),
            ctx.limbSwing,
            ctx.limbSwingAmount,
            ctx.ageInTicks,
            THREE.MathUtils.radToDeg(ctx.pointerYaw),
            THREE.MathUtils.radToDeg(ctx.pointerPitch),
            0.0625,
            { get: (key: string) => ctx.wrappers.get(key) },
          )
          debug?.push({ id, kind: 'custom-js', ok: true, message: 'custom JS animation applied' })
        } else if (INNER_ANIMATION_IDS.has(id)) {
          applyInnerAnimation(id, ctx)
          debug?.push({ id, kind: 'inner-shim', ok: true, message: 'TLM inner animation shim applied' })
        } else if (id.endsWith('.json')) {
          debug?.push({ id, kind: 'gecko-json', ok: false, message: 'Gecko animation recognized; renderer marks it unsupported in this demo' })
        } else {
          debug?.push({ id, kind: 'missing', ok: false, message: 'animation file not loaded and no inner shim matched' })
        }
      } catch (error) {
        debug?.push({ id, kind: 'error', ok: false, message: String(error) })
      }
    }
    if (debug) {
      this.debug = debug
      return debug
    }
    return this.debug
  }
}
