import path from "path"
import { writeFile, rename, mkdir } from "fs/promises"
import { dirname } from "path"
import { Global } from "../../../global"

export function baseDir() {
  return path.join(Global.Path.home, ".opencode", "tree-plan")
}

export function planDir(name: string) {
  return path.join(baseDir(), name)
}

export function planPath(name: string) {
  return path.join(planDir(name), "plan.json")
}

export function branchPath(name: string, branch: string) {
  return path.join(planDir(name), branch + ".json")
}

export function exportPath(name: string) {
  return path.join(baseDir(), name + ".md")
}

export function currentPlanPath() {
  return path.join(baseDir(), "current-plan")
}

export async function ensureDir(p: string) {
  await mkdir(p, { recursive: true })
}

export async function atomicWriteJson(p: string, data: unknown) {
  const tmp = p + ".tmp"
  const content = JSON.stringify(data, null, 2)
  try {
    await writeFile(tmp, content, "utf-8")
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      await mkdir(dirname(tmp), { recursive: true })
      await writeFile(tmp, content, "utf-8")
    } else throw e
  }
  await rename(tmp, p)
}

export async function atomicWriteText(p: string, text: string) {
  const tmp = p + ".tmp"
  try {
    await writeFile(tmp, text, "utf-8")
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      await mkdir(dirname(tmp), { recursive: true })
      await writeFile(tmp, text, "utf-8")
    } else throw e
  }
  await rename(tmp, p)
}
