import { createContext, useContext, useReducer } from 'react'

const ComposerContext = createContext(null)

const initialState = {
  messages: [],
  plan: null,
  outputType: 'page',
  isComposing: false,
  error: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.message] }
    case 'SET_PLAN':
      return { ...state, plan: action.plan }
    case 'SET_OUTPUT_TYPE':
      return { ...state, outputType: action.outputType }
    case 'SET_COMPOSING':
      return { ...state, isComposing: action.value }
    case 'SET_ERROR':
      return { ...state, error: action.error }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    default:
      return state
  }
}

export function ComposerProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <ComposerContext.Provider value={{ state, dispatch }}>
      {children}
    </ComposerContext.Provider>
  )
}

export function useComposer() {
  const ctx = useContext(ComposerContext)
  if (!ctx) throw new Error('useComposer must be used inside ComposerProvider')
  return ctx
}
