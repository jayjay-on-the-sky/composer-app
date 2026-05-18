import { Component } from 'react'
import { motion } from 'framer-motion'
import { getComponent } from '../lib/registryBridge'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="p-4 border border-error/30 bg-error/5 rounded-lg text-error text-sm font-mono">
          ⚠ {this.props.name}: {this.state.error.message}
        </div>
      )
    }
    return this.props.children
  }
}

export default function ComposedPagePreview({ plan, outputType }) {
  if (!plan?.sections?.length) return null

  const isSlides = outputType === 'slides'

  return (
    <div className={isSlides ? 'flex flex-col gap-6 p-6' : 'w-full'}>
      {plan.sections.map((section, i) => {
        const Comp = getComponent(section.component)

        if (!Comp) {
          return (
            <div
              key={i}
              className="p-4 border border-shell-border rounded-lg text-shell-text-muted text-sm font-mono"
            >
              Component not found: <span className="text-error">{section.component}</span>
            </div>
          )
        }

        const props = section.props ?? {}

        return (
          <motion.div
            key={`${section.component}-${i}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3, ease: 'easeOut' }}
            className={isSlides ? 'relative w-full overflow-hidden rounded-xl shadow-lg' : 'w-full'}
            style={isSlides ? { aspectRatio: '16/9' } : {}}
          >
            <ErrorBoundary name={section.component}>
              <Comp {...props} />
            </ErrorBoundary>
          </motion.div>
        )
      })}
    </div>
  )
}
