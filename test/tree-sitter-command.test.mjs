import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

import { resolveTreeSitterCommand } from './scripts/tree-sitter-command.mjs'

test('resolves the Tree-sitter JavaScript entrypoint with POSIX paths', () => {
  assert.deepEqual(resolveTreeSitterCommand('/workspace/parser', path.posix), {
    command: process.execPath,
    args: ['/workspace/parser/node_modules/tree-sitter-cli/cli.js'],
  })
})

test('resolves the Tree-sitter JavaScript entrypoint with Windows paths', () => {
  assert.deepEqual(resolveTreeSitterCommand('C:\\workspace\\parser', path.win32), {
    command: process.execPath,
    args: ['C:\\workspace\\parser\\node_modules\\tree-sitter-cli\\cli.js'],
  })
})
