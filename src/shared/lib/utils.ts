/**
 * `cn('p-2', cond && 'p-4')` → `p-4`: joins class names and resolves Tailwind conflicts. shadcn components import it
 * from the `cn` package (shadcn's own, pinned to an exact version in package.json); code imported as `@/lib/utils`
 * by older Watermelon/shadcn items is rewritten to this file (components.json "utils").
 */
export { cn } from 'cn'
