import { describe, expect, test } from "bun:test"
import { classifySubmitRouting } from "../../../../src/cli/cmd/tui/component/prompt/submit-routing"

const LOCAL_TOKENS = ["end", "follow"] as const
const SERVER_CMDS = ["help", "servercmd"] as const

describe("classifySubmitRouting", () => {
  test("/end routes local", () => {
    expect(classifySubmitRouting("/end", { localTokens: LOCAL_TOKENS, serverCommands: SERVER_CMDS })).toEqual({
      kind: "local",
      token: "end",
    })
  })

  test("/follow routes local", () => {
    expect(classifySubmitRouting("/follow", { localTokens: LOCAL_TOKENS, serverCommands: SERVER_CMDS })).toEqual({
      kind: "local",
      token: "follow",
    })
  })

  test("/END routes local (case-insensitive)", () => {
    expect(classifySubmitRouting("/END", { localTokens: LOCAL_TOKENS, serverCommands: SERVER_CMDS })).toEqual({
      kind: "local",
      token: "end",
    })
  })

  test("/help routes server when in serverCommands (not local)", () => {
    expect(classifySubmitRouting("/help", { localTokens: LOCAL_TOKENS, serverCommands: SERVER_CMDS })).toEqual({
      kind: "server",
      command: "help",
      args: "",
    })
  })

  test("/servercmd with multiline args routes server with correct args", () => {
    expect(
      classifySubmitRouting("/servercmd a b\nmore", { localTokens: LOCAL_TOKENS, serverCommands: SERVER_CMDS }),
    ).toEqual({
      kind: "server",
      command: "servercmd",
      args: "a b\nmore",
    })
  })

  test("/unknown routes prompt", () => {
    expect(classifySubmitRouting("/unknown", { localTokens: LOCAL_TOKENS, serverCommands: SERVER_CMDS })).toEqual({
      kind: "prompt",
    })
  })

  test("plain text routes prompt", () => {
    expect(classifySubmitRouting("hello world", { localTokens: LOCAL_TOKENS, serverCommands: SERVER_CMDS })).toEqual({
      kind: "prompt",
    })
  })
})
