/**
 * A deferred represents a promise which can be either resolved via
 * deferred.resolve or rejected via deferred.reject.The promise can be acessed
 * via the promise property on the deferred.
 */

const FATE_RESOLVED = 'resolved' as const
const FATE_UNRESOLVED = 'unresolved' as const

const STATE_FULFILLED = 'fulfilled' as const
const STATE_PENDING = 'pending' as const
const STATE_REJECTED = 'rejected' as const

const ERROR_DOUBLE_RESOLUTION = 'Deferred cannot be resolved twice'

export class Deferred<T> {
  // eslint-disable-next-line typescript/no-explicit-any
  private _reject: ((reason?: any) => void) | undefined

  private _resolve: ((value?: PromiseLike<T> | T) => void) | undefined
  private fate: typeof FATE_RESOLVED | typeof FATE_UNRESOLVED

  private state: typeof STATE_FULFILLED | typeof STATE_PENDING | typeof STATE_REJECTED

  public promise: Promise<T>

  constructor() {
    this.state = STATE_PENDING
    this.fate = FATE_UNRESOLVED

    this.promise = new Promise((resolve, reject) => {
      this._resolve = resolve as typeof this._resolve
      this._reject = reject
    })

    this.promise.then(
      () => (this.state = STATE_FULFILLED),
      () => (this.state = STATE_REJECTED),
    )
  }

  public isFulfilled() {
    return this.state === STATE_FULFILLED
  }

  public isPending() {
    return this.state === STATE_PENDING
  }

  public isRejected() {
    return this.state === STATE_REJECTED
  }

  public isResolved() {
    return this.fate === FATE_RESOLVED
  }

  // eslint-disable-next-line typescript/no-explicit-any
  public reject(reason?: any) {
    if (this.fate === FATE_RESOLVED) {
      throw new Error(ERROR_DOUBLE_RESOLUTION)
    }

    this.fate = FATE_RESOLVED

    if (this._reject !== undefined) {
      this._reject(reason)
    }
  }

  public resolve(value?: PromiseLike<T> | T) {
    if (this.fate === FATE_RESOLVED) {
      throw new Error(ERROR_DOUBLE_RESOLUTION)
    }

    this.fate = FATE_RESOLVED

    if (this._resolve !== undefined) {
      this._resolve(value)
    }
  }
}
