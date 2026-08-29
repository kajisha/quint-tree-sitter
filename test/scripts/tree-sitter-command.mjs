import path from 'node:path'

export function resolveTreeSitterCommand(projectRoot, pathApi = path) {
  return {
    command: process.execPath,
    args: [pathApi.join(projectRoot, 'node_modules', 'tree-sitter-cli', 'cli.js')],
  }
}
