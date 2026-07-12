import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, resolve } from 'node:path'

const args = Object.fromEntries(process.argv.slice(2).map(value => {
  const index = value.indexOf('=')
  return index === -1 ? [value.replace(/^--/, ''), true] : [value.slice(2, index), value.slice(index + 1)]
}))

const id = String(args.id ?? 'tlm-pet')
const displayName = String(args.name ?? id)
const description = String(args.description ?? 'A native-rendered Touhou Little Maid Codex pet.')
const source = resolve(String(args.spritesheet ?? 'output/spritesheet.webp'))
const codexHome = process.env.CODEX_HOME || resolve(homedir(), '.codex')
const petDir = resolve(codexHome, 'pets', id)

if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error('id must use lowercase letters, numbers, and hyphens')
if (!existsSync(source)) throw new Error(`Missing ${source}. Run hatch-pet validation and WebP export first.`)

mkdirSync(petDir, { recursive: true })
copyFileSync(source, resolve(petDir, 'spritesheet.webp'))
writeFileSync(resolve(petDir, 'pet.json'), JSON.stringify({
  id,
  displayName,
  description,
  spriteVersionNumber: 2,
  spritesheetPath: 'spritesheet.webp',
}, null, 2) + '\n')

console.log(`Installed ${displayName} at ${petDir}`)
console.log('Open Settings > Pets, select Refresh, then choose the pet.')
