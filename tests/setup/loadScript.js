import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/**
 * Loads a plain-global browser JS file into the current test context.
 *
 * Strategy: transform top-level declarations so they land on globalThis:
 *   - `const X` / `let X`   → `var X`    (var in indirect eval becomes a global property)
 *   - `class Foo`            → `var Foo = class Foo`  (class decls don't auto-global)
 *   - `function Foo()`       → already becomes global in indirect eval (no change needed)
 *
 * The transformed code is evaluated via (0, eval) which is "indirect eval": it runs
 * in the realm's global scope (the jsdom window in Vitest's jsdom environment).
 * All var-declared names then become properties of globalThis.
 */
export function loadScript(relPath) {
  const code = readFileSync(resolve(ROOT, relPath), 'utf8')

  const transformed = code
    // Top-level const → var
    .replace(/^const\s+/gm, 'var ')
    // Top-level let → var
    .replace(/^let\s+/gm, 'var ')
    // Top-level `class Foo` → `var Foo = class Foo`
    // (captures the class name so we can both name the expression and assign to var)
    .replace(/^class\s+(\w+)/gm, 'var $1 = class $1')

  // eslint-disable-next-line no-eval
  ;(0, eval)(transformed)
}
