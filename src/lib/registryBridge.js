// Bridge to the component-library.
// When installed via GitHub (npm install), components live in node_modules.
// When developing locally with both repos side-by-side, falls back to the sibling path.

// node_modules path (GitHub install)
const metaJsNm  = import.meta.glob('/node_modules/@jayjay/component-library/src/components/**/*.meta.js',  { eager: true })
const metaJsxNm = import.meta.glob('/node_modules/@jayjay/component-library/src/components/**/*.meta.jsx', { eager: true })
const compsNm   = import.meta.glob('/node_modules/@jayjay/component-library/src/components/**/*.jsx',       { eager: true })

// Local sibling path (local dev without npm install)
const metaJsLocal  = import.meta.glob('../../component-library/src/components/**/*.meta.js',  { eager: true })
const metaJsxLocal = import.meta.glob('../../component-library/src/components/**/*.meta.jsx', { eager: true })
const compsLocal   = import.meta.glob('../../component-library/src/components/**/*.jsx',       { eager: true })

// Merge: node_modules takes priority, local fills in anything missing
const metaJs  = { ...metaJsLocal,  ...metaJsNm  }
const metaJsx = { ...metaJsxLocal, ...metaJsxNm }
const comps   = { ...compsLocal,   ...compsNm   }

let _registry = null

function buildRegistry() {
  if (_registry) return _registry

  const allMeta = { ...metaJs, ...metaJsx }
  const result = []

  for (const [metaPath, metaModule] of Object.entries(allMeta)) {
    const meta = metaModule.default
    if (!meta?.name) continue

    // Resolve component path: strip .meta.(js|jsx) → .jsx
    const compPath = metaPath.replace(/\.meta\.(js|jsx)$/, '.jsx')
    const compModule = comps[compPath]
    const Component = compModule?.default ?? null

    result.push({
      id: meta.name.toLowerCase().replace(/\s+/g, '-'),
      name: meta.name,
      category: meta.category ?? 'Misc',
      description: meta.description ?? '',
      variants: meta.variants ?? [],
      Component,
    })
  }

  _registry = result.sort((a, b) => a.name.localeCompare(b.name))
  return _registry
}

/** Returns full registry with Component objects */
export function getRegistry() {
  return buildRegistry()
}

/** Returns compact manifest for the AI agent — filtered by outputType */
export function getManifest(outputType = 'all') {
  const registry = buildRegistry()

  const filters = {
    page:      (c) => c.category === 'Sections' || c.category === 'Templates' || c.category === 'Layout',
    slides:    (c) => c.name.startsWith('Slide'),
    dashboard: (c) => ['Charts', 'Dashboard', 'Data Display'].includes(c.category),
    email:     (c) => c.category === 'Sections',
    all:       ()  => true,
  }

  const filter = filters[outputType] ?? filters.all

  return registry
    .filter(filter)
    .map(({ name, category, description }) => ({ name, category, description }))
}

/** Returns the React Component for a given component name */
export function getComponent(name) {
  const registry = buildRegistry()
  return registry.find(c => c.name === name)?.Component ?? null
}
