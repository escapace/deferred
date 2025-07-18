/**
 * A deferred represents a promise which can be either resolved via
 * deferred.resolve or rejected via deferred.reject.The promise can be acessed
 * via the promise property on the deferred.
 */

export class Deferred<T> {
  // eslint-disable-next-line typescript/no-explicit-any
  private _reject: ((reason?: any) => void) | undefined

  private _resolve: ((value?: PromiseLike<T> | T) => void) | undefined
  private fate: 'resolved' | 'unresolved'

  private state: 'fulfilled' | 'pending' | 'rejected'

  public promise: Promise<T>

  constructor() {
    this.state = 'pending'
    this.fate = 'unresolved'

    this.promise = new Promise((resolve, reject) => {
      this._resolve = resolve as typeof this._resolve
      this._reject = reject
    })

    this.promise.then(
      () => (this.state = 'fulfilled'),
      () => (this.state = 'rejected'),
    )
  }

  public isFulfilled() {
    return this.state === 'fulfilled'
  }

  public isPending() {
    return this.state === 'pending'
  }

  public isRejected() {
    return this.state === 'rejected'
  }

  public isResolved() {
    return this.fate === 'resolved'
  }

  // eslint-disable-next-line typescript/no-explicit-any
  public reject(reason?: any) {
    if (this.fate === 'resolved') {
      throw new Error('Deferred cannot be resolved twice')
    }

    this.fate = 'resolved'

    if (this._reject !== undefined) {
      this._reject(reason)
    }
  }

  public resolve(value?: PromiseLike<T> | T) {
    if (this.fate === 'resolved') {
      throw new Error('Deferred cannot be resolved twice')
    }

    this.fate = 'resolved'

    if (this._resolve !== undefined) {
      this._resolve(value)
    }
  }
}
