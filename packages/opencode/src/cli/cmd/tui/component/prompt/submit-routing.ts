export type SubmitRouting =
  | { kind: "local"; token: string }
  | { kind: "server"; command: string; args: string }
  | { kind: "prompt" }

export function classifySubmitRouting(
  inputText: string,
  opts: { localTokens: readonly string[]; serverCommands: readonly string[] },
): SubmitRouting {
  if (!inputText.startsWith("/")) return { kind: "prompt" }
  const firstLine = inputText.split("\n")[0]
  const token = firstLine.split(" ")[0].slice(1)
  const tokenLower = token.toLowerCase()
  if (opts.localTokens.includes(tokenLower))
    return { kind: "local", token: tokenLower }
  if (opts.serverCommands.some((x) => x === token)) {
    const firstLineEnd = inputText.indexOf("\n")
    const fl = firstLineEnd === -1 ? inputText : inputText.slice(0, firstLineEnd)
    const [, ...firstLineArgs] = fl.split(" ")
    const restOfInput = firstLineEnd === -1 ? "" : inputText.slice(firstLineEnd + 1)
    const args = firstLineArgs.join(" ") + (restOfInput ? "\n" + restOfInput : "")
    return { kind: "server", command: token, args }
  }
  return { kind: "prompt" }
}
