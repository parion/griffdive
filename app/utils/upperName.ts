// Diver names always display in caps, like callsigns on the in-game roster.
// Names stay as typed in state; only the display shouts them.
export function upperName(name: string): string
export function upperName(name: string | undefined): string | undefined
export function upperName(name: string | undefined): string | undefined {
  return name?.toLocaleUpperCase()
}
