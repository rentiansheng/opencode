type SlashEntry = {
  display: string
  aliases?: string[]
  onSelect: () => void
}

export function matchLocalSlash(slashes: readonly SlashEntry[], token: string): (() => void) | undefined {
  const normalized = token.toLowerCase()
  return slashes.find(
    (s) => s.display.toLowerCase() === "/" + normalized || s.aliases?.some((a) => a.toLowerCase() === "/" + normalized),
  )?.onSelect
}
