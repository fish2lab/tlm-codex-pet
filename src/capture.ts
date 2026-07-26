import * as THREE from 'three'
import { parseBedrockGeometry } from './renderer/bedrockParser'
import { createBedrockThreeModel } from './renderer/bedrockThree'
import { AnimationController } from './renderer/animationRuntime'
import { DEFAULT_MAID_ANIMATIONS } from './tlm/defaultAnimations'

const CELL_W = 192, CELL_H = 208, COLS = 8, ROWS = 11
const VIEW_FRACTION = 0.8
const CAMERA_HALF_WIDTH = 18 * VIEW_FRACTION
const CAMERA_HALF_HEIGHT = 22 * VIEW_FRACTION
// Codex should copy the selected TLM model and texture here before export.
// See README.md and AGENTS.md for the asset/licensing boundary.
const MODEL = '/input/model.json'
const TEXTURE = '/input/texture.png'

type Pose = { t:number; yaw?:number; pitch?:number; bodyYaw?:number; walk?:number; speaking?:boolean; thinking?:boolean; jump?:number; wave?:number; fail?:number }
const seq = (n:number, fn:(i:number)=>Pose) => Array.from({length:n},(_,i)=>fn(i))
const poses: Pose[][] = [
  seq(7,i=>({t:i*12,pitch:Math.sin(i*Math.PI/3)*0.035})),
  // TLM model-forward is opposite Three.js screen travel: +Y faces screen-right.
  seq(8,i=>({t:i*4,bodyYaw:Math.PI/2,walk:0.95})),
  seq(8,i=>({t:i*4,bodyYaw:-Math.PI/2,walk:0.95})),
  seq(4,i=>({t:i*5,wave:Math.sin(i*Math.PI/3)*0.9})),
  seq(5,i=>({t:i*4,jump:Math.sin(i*Math.PI/4)*2.8})),
  seq(8,i=>({t:i*4,pitch:0.3,fail:0.22+Math.sin(i*.8)*.05})),
  seq(6,i=>({t:i*6,pitch:-0.12,thinking:true,wave:0.15+Math.sin(i)*.08})),
  seq(6,i=>({t:i*5,thinking:true,speaking:true,wave:Math.sin(i*Math.PI/2)*.3})),
  seq(6,i=>({t:i*6,pitch:-0.08,thinking:true,yaw:Math.sin(i*.7)*.12})),
  seq(8,i=>{const a=i*Math.PI/8;return {t:i,bodyYaw:Math.sin(a)*1.05,pitch:-Math.cos(a)*.34}}),
  seq(8,i=>{const a=(i+8)*Math.PI/8;return {t:i,bodyYaw:Math.sin(a)*1.05,pitch:-Math.cos(a)*.34}}),
]

async function main() {
  document.body.style.margin='0'; document.body.style.background='#222'
  const [modelJson, textureBlob] = await Promise.all([fetch(MODEL).then(r=>r.text()),fetch(TEXTURE).then(r=>r.blob())])
  const textureUrl=URL.createObjectURL(textureBlob)
  const geometry=parseBedrockGeometry(modelJson)
  const model=await createBedrockThreeModel(geometry,textureUrl)
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,preserveDrawingBuffer:true})
  renderer.setPixelRatio(1); renderer.setSize(CELL_W,CELL_H,false); renderer.setClearColor(0,0)
  renderer.outputColorSpace=THREE.SRGBColorSpace
  // Reframe to the centered 80% view on both axes so the model is enlarged
  // uniformly, preserving its proportions in the standard 192×208 cell.
  const scene=new THREE.Scene(); const camera=new THREE.OrthographicCamera(-CAMERA_HALF_WIDTH,CAMERA_HALF_WIDTH,CAMERA_HALF_HEIGHT,-CAMERA_HALF_HEIGHT,.1,200)
  camera.position.set(0,0,80); camera.lookAt(0,0,0)
  scene.add(new THREE.HemisphereLight(0xffffff,0x534437,2.2))
  const key=new THREE.DirectionalLight(0xfff0d0,2.4); key.position.set(20,30,30); scene.add(key)
  const rim=new THREE.DirectionalLight(0x8ee9ff,1.2); rim.position.set(-30,18,-12); scene.add(rim)
  const holder=new THREE.Group(); scene.add(holder)
  const box=new THREE.Box3().setFromObject(model.root), size=new THREE.Vector3(), center=new THREE.Vector3(); box.getSize(size); box.getCenter(center)
  const fit=Math.min(24/Math.max(size.x,1),34/Math.max(size.y,1),24/Math.max(size.z,1))*1.35
  model.root.scale.setScalar(fit); model.root.position.set(-center.x*fit,-center.y*fit,-center.z*fit); holder.add(model.root)
  const controller=new AnimationController(model.wrappers)
  const atlas=document.createElement('canvas'); atlas.width=CELL_W*COLS; atlas.height=CELL_H*ROWS
  const ctx=atlas.getContext('2d')!; ctx.imageSmoothingEnabled=false
  for(let row=0;row<ROWS;row++) for(let col=0;col<poses[row].length;col++) {
    const p=poses[row][col]; holder.rotation.set(0,p.bodyYaw??0,0); holder.position.set(0,p.jump??0,0)
    controller.apply(DEFAULT_MAID_ANIMATIONS,{ageInTicks:p.t,pointerYaw:p.yaw??0,pointerPitch:p.pitch??0,limbSwing:p.t,limbSwingAmount:p.walk??.035,speaking:!!p.speaking,thinking:!!p.thinking})
    const left=model.wrappers.get('armLeft'), right=model.wrappers.get('armRight')
    const head=model.wrappers.get('head')
    if(row===0) {
      const phase=col*Math.PI*2/7
      holder.position.y=Math.sin(phase)*0.75
      if(head) head.setRotateAngleZ(head.getInitRotateAngleZ()+Math.sin(phase)*0.07)
    }
    if(row===3 && right) {
      const wave=[0.65,1.15,1.65,1.05][col]
      right.setRotateAngleZ(right.getInitRotateAngleZ()+wave)
      right.setRotateAngleX(right.getInitRotateAngleX()-0.35)
      if(head) head.setRotateAngleZ(head.getInitRotateAngleZ()-(wave-1.05)*0.10)
    }
    if(row===5) {
      const slump=[0,0.10,0.20,0.30,0.22,0.14,0.06,0][col]
      holder.rotation.z=slump
      holder.position.y=-Math.sin(col*Math.PI/7)*1.1
      if(head) head.setRotateAngleX(head.getInitRotateAngleX()+0.32)
    }
    if(row===6) {
      const ask=[-0.16,-0.08,0.05,0.16,0.08,-0.05][col]
      if(left) left.setRotateAngleZ(left.getInitRotateAngleZ()-0.55-ask)
      if(right) right.setRotateAngleZ(right.getInitRotateAngleZ()+0.55-ask)
      if(head) head.setRotateAngleZ(head.getInitRotateAngleZ()+ask)
    }
    if(row===7) {
      const work=Math.sin(col*Math.PI*2/6)
      if(left) left.setRotateAngleX(left.getInitRotateAngleX()+work*0.65)
      if(right) right.setRotateAngleX(right.getInitRotateAngleX()-work*0.65)
      if(head) head.setRotateAngleY(head.getInitRotateAngleY()+work*0.16)
      holder.position.y=Math.abs(work)*0.35
    }
    if(row===8 && head) {
      const scan=[-0.24,-0.14,-0.04,0.08,0.18,0.06][col]
      head.setRotateAngleY(head.getInitRotateAngleY()+scan)
      head.setRotateAngleX(head.getInitRotateAngleX()-0.14-Math.abs(scan)*0.25)
      holder.rotation.z=-scan*0.12
    }
    renderer.render(scene,camera); ctx.drawImage(renderer.domElement,col*CELL_W,row*CELL_H)
  }
  atlas.id='atlas'; atlas.style.width='768px'; atlas.style.height='1144px'; atlas.style.display='block'; document.body.appendChild(atlas)
  const image=document.createElement('img'); image.id='atlas-image'; image.src=atlas.toDataURL('image/png'); image.alt='Yukari native v2 atlas'; image.style.display='none'; document.body.appendChild(image)
  ;(window as unknown as {__atlasReady:boolean;__atlasDataUrl:string}).__atlasReady=true
  ;(window as unknown as {__atlasReady:boolean;__atlasDataUrl:string}).__atlasDataUrl=atlas.toDataURL('image/png')
  const result=await fetch('/__save-atlas',{method:'POST',headers:{'content-type':'text/plain'},body:atlas.toDataURL('image/png')})
  ;(window as unknown as {__saveResult:string}).__saveResult=await result.text()
}
void main()
