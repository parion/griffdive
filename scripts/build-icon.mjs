import { writeFileSync } from 'node:fs'
import { brandIconSvg } from '../app/utils/brandMark.ts'

writeFileSync(new URL('../public/icon.svg', import.meta.url), brandIconSvg())
console.log('✔ public/icon.svg written from app/utils/brandMark.ts')
