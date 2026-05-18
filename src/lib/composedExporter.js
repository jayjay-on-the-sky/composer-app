import html2canvas from 'html2canvas'

function collectRootVars() {
  const vars = {}
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.selectorText === ':root') {
          const text = rule.cssText
          const matches = text.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)
          for (const [, name, value] of matches) vars[name] = value.trim()
        }
      }
    } catch {}
  }
  // Also pick up inline style overrides
  const inlineStyle = document.documentElement.style
  for (let i = 0; i < inlineStyle.length; i++) {
    const name = inlineStyle[i]
    if (name.startsWith('--')) vars[name] = inlineStyle.getPropertyValue(name).trim()
  }
  return vars
}

export async function exportAsPng(containerRef) {
  const canvas = await html2canvas(containerRef, {
    useCORS: true,
    scale: 1.5,
    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color-canvas') || '#ffffff',
  })
  const url = canvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = url
  a.download = 'composed-page.png'
  a.click()
}

export function exportAsHtml(containerRef, plan) {
  const rootVars = collectRootVars()
  const cssVarBlock = Object.entries(rootVars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${plan?.title ?? 'Composed Page'}</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
${cssVarBlock}
    }
    body { margin: 0; font-family: 'Geist', system-ui, sans-serif; }
  </style>
</head>
<body>
${containerRef.innerHTML}
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(plan?.title ?? 'composed-page').replace(/\s+/g, '-').toLowerCase()}.html`
  a.click()
  URL.revokeObjectURL(url)
}

export function copyHtml(containerRef, plan) {
  const rootVars = collectRootVars()
  const cssVarBlock = Object.entries(rootVars).map(([k, v]) => `  ${k}: ${v};`).join('\n')
  const html = `<!-- ${plan?.title ?? 'Composed Page'} -->\n<style>:root {\n${cssVarBlock}\n}</style>\n${containerRef.innerHTML}`
  navigator.clipboard.writeText(html)
}

export function exportAsJsx(plan) {
  if (!plan?.sections?.length) return ''
  const imports = [...new Set(plan.sections.map(s => s.component))]
    .map(name => `import ${name} from '@components/${name}/${name}'`)
    .join('\n')

  const body = plan.sections
    .map(({ component, props }) => {
      const propsStr = Object.entries(props ?? {})
        .map(([k, v]) => `${k}={${JSON.stringify(v)}}`)
        .join(' ')
      return `  <${component}${propsStr ? ' ' + propsStr : ''} />`
    })
    .join('\n')

  const fnName = (plan.title ?? 'ComposedPage')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, c => c.toUpperCase())

  return `${imports}\n\nexport default function ${fnName}() {\n  return (\n    <>\n${body}\n    </>\n  )\n}\n`
}
