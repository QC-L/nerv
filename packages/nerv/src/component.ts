import { isFunction, extend, clone, isArray } from 'nerv-utils'
import { enqueueRender } from './render-queue'
import { updateComponent } from './lifecycle'
import { Props, ComponentLifecycle, Refs, EMPTY_OBJ } from 'nerv-shared'

interface Component<P = {}, S = {}> extends ComponentLifecycle<P, S> {
  _rendered: any
  dom: any
}

class Component<P, S> implements ComponentLifecycle<P, S> {
  public static defaultProps: {}
  state: Readonly<S>
  props: Readonly<P> & Readonly<Props>
  context: any
  _dirty = true
  _disable = true
  _pendingStates: any[] = []
  _pendingCallbacks: Function[]
  refs: Refs
  isReactComponent: Object

  constructor (props?: P, context?: any) {
    if (!this.state) {
      this.state = {} as S
    }
    this.props = props || ({} as P)
    this.context = context || EMPTY_OBJ
    this.refs = {}
  }

  setState<K extends keyof S> (
    state:
      | ((prevState: Readonly<S>, props: P) => Pick<S, K> | S)
      | (Pick<S, K> | S),
    callback?: () => void
  ): void {
    if (state) {
      (this._pendingStates = this._pendingStates || []).push(state)
    }
    if (isFunction(callback)) {
      (this._pendingCallbacks = this._pendingCallbacks || []).push(callback)
    }
    if (!this._disable) {
      enqueueRender(this)
    }
  }

  getState () {
    // tslint:disable-next-line:no-this-assignment
    const { _pendingStates, state, props } = this
    if (!_pendingStates.length) {
      return state
    }
    const stateClone = clone(state)
    const queue = _pendingStates.concat()
    this._pendingStates.length = 0
    queue.forEach((nextState) => {
      if (isFunction(nextState)) {
        nextState = nextState.call(this, state, props)
      }
      extend(stateClone, nextState)
    })

    return stateClone
  }

  clearCallBacks () {
    if (isArray(this._pendingCallbacks)) {
      while (this._pendingCallbacks.length) {
        (this._pendingCallbacks.pop() as any).call(this)
      }
    }
  }

  forceUpdate (callback?: Function) {
    if (isFunction(callback)) {
      (this._pendingCallbacks = this._pendingCallbacks || []).push(callback)
    }
    updateComponent(this, true)
  }

  // tslint:disable-next-line
  public render(nextProps?: P, nextState?, nextContext?): any {}
}

Component.prototype.isReactComponent = EMPTY_OBJ

export default Component
