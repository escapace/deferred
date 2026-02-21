/* eslint-disable typescript/no-explicit-any */
/**
 * Externally-resolvable promise wrapper following the promises specification
 * two-axis model.
 *
 * @remarks
 * The two axes are **states** and **fates**, drawn from the promises
 * specification:
 *
 * - **States** (pending / fulfilled / rejected) track the promise's current
 *   settlement. State updates asynchronously via microtask, so a brief window
 *   exists after calling {@link Deferred.resolve} or {@link Deferred.reject}
 *   where {@link Deferred.fate} is `"resolved"` but {@link Deferred.state} is
 *   still `"pending"`.
 *
 * - **Fates** (unresolved / resolved) track whether the deferred has been
 *   locked in. Both {@link Deferred.resolve} and {@link Deferred.reject} set
 *   fate to `"resolved"` — "resolved" means the outcome is determined, not
 *   that the promise was fulfilled.
 *
 * @typeParam T - Fulfillment value type of the underlying promise.
 *
 * @see {@link https://github.com/domenic/promises-unwrapping/blob/master/docs/states-and-fates.md | States and Fates}
 *
 * @packageDocumentation
 */

/** Fate value indicating the deferred outcome has been determined. */
export const DEFERRED_FATE_RESOLVED = 'resolved' as const

/** Fate value indicating the deferred outcome has not yet been determined. */
export const DEFERRED_FATE_UNRESOLVED = 'unresolved' as const

/** State value indicating the promise completed successfully. */
export const DEFERRED_STATE_FULFILLED = 'fulfilled' as const

/** State value indicating the promise has not yet settled. */
export const DEFERRED_STATE_PENDING = 'pending' as const

/** State value indicating the promise failed. */
export const DEFERRED_STATE_REJECTED = 'rejected' as const

/** Error message thrown when attempting to resolve or reject an already-resolved deferred. */
export const DEFERRED_ERROR_ALREADY_RESOLVED = 'Deferred fate is already resolved'

/** Possible fates of a {@link Deferred}: `"resolved"` or `"unresolved"`. */
export type DeferredFate = typeof DEFERRED_FATE_RESOLVED | typeof DEFERRED_FATE_UNRESOLVED

/** Possible states of a {@link Deferred}: `"fulfilled"`, `"pending"`, or `"rejected"`. */
export type DeferredState =
  | typeof DEFERRED_STATE_FULFILLED
  | typeof DEFERRED_STATE_PENDING
  | typeof DEFERRED_STATE_REJECTED

/**
 * Promise whose outcome can be determined externally.
 *
 * @remarks
 * Wraps a standard `Promise` and exposes its `resolve` and `reject` callbacks
 * as instance methods. The {@link Deferred.fate} and {@link Deferred.state}
 * fields provide synchronous introspection into the promise lifecycle.
 *
 * @typeParam T - Fulfillment value type of the underlying promise.
 */
export class Deferred<T> {
  private _reject: ((reason?: any) => void) | undefined
  private _resolve: ((value?: PromiseLike<T> | T) => void) | undefined

  /**
   * Whether the deferred has been locked in.
   *
   * @remarks
   * Set to `"resolved"` by either {@link Deferred.resolve} or
   * {@link Deferred.reject}. A resolved fate means the outcome is determined;
   * it does not imply fulfillment.
   */
  public fate: DeferredFate

  /**
   * Current settlement state of the underlying promise.
   *
   * @remarks
   * Mirrors the internal `[[PromiseState]]` slot. Updated asynchronously via
   * microtask after {@link Deferred.resolve} or {@link Deferred.reject} is
   * called, so a brief window exists where {@link Deferred.fate} is
   * `"resolved"` but this field is still `"pending"`.
   */
  public state: DeferredState

  /**
   * Underlying promise whose outcome is controlled by this deferred.
   */
  public promise: Promise<T>

  constructor() {
    this.state = DEFERRED_STATE_PENDING
    this.fate = DEFERRED_FATE_UNRESOLVED

    this.promise = new Promise((resolve, reject) => {
      this._resolve = resolve as typeof this._resolve
      this._reject = reject
    })

    this.promise.then(
      () => (this.state = DEFERRED_STATE_FULFILLED),
      () => (this.state = DEFERRED_STATE_REJECTED),
    )
  }

  /**
   * Indicates whether the promise has fulfilled.
   *
   * @returns `true` when {@link Deferred.state} is `"fulfilled"`.
   */
  public isFulfilled() {
    return this.state === DEFERRED_STATE_FULFILLED
  }

  /**
   * Indicates whether the promise is still pending.
   *
   * @returns `true` when {@link Deferred.state} is `"pending"`.
   */
  public isPending() {
    return this.state === DEFERRED_STATE_PENDING
  }

  /**
   * Indicates whether the promise has rejected.
   *
   * @returns `true` when {@link Deferred.state} is `"rejected"`.
   */
  public isRejected() {
    return this.state === DEFERRED_STATE_REJECTED
  }

  /**
   * Indicates whether the deferred fate has been locked in.
   *
   * @remarks
   * Returns `true` after either {@link Deferred.resolve} or
   * {@link Deferred.reject} has been called. A resolved fate does not imply
   * fulfillment — rejected deferreds are also resolved.
   *
   * @returns `true` when {@link Deferred.fate} is `"resolved"`.
   */
  public isResolved() {
    return this.fate === DEFERRED_FATE_RESOLVED
  }

  /**
   * Indicates whether the promise has settled (fulfilled or rejected).
   *
   * @returns `true` when {@link Deferred.state} is not `"pending"`.
   */
  public isSettled() {
    return this.state !== DEFERRED_STATE_PENDING
  }

  /**
   * Rejects the underlying promise.
   *
   * @remarks
   * Sets {@link Deferred.fate} to `"resolved"` synchronously.
   * {@link Deferred.state} transitions to `"rejected"` asynchronously on the
   * next microtask.
   *
   * @param reason - Rejection reason forwarded to the underlying promise.
   *
   * @throws When the deferred fate is already resolved.
   */
  public reject(reason?: any) {
    if (this.fate === DEFERRED_FATE_RESOLVED) {
      throw new Error(DEFERRED_ERROR_ALREADY_RESOLVED)
    }

    this.fate = DEFERRED_FATE_RESOLVED

    if (this._reject !== undefined) {
      this._reject(reason)
    }
  }

  /**
   * Resolves the underlying promise.
   *
   * @remarks
   * Sets {@link Deferred.fate} to `"resolved"` synchronously.
   * {@link Deferred.state} transitions to `"fulfilled"` asynchronously on the
   * next microtask. When `value` is a `PromiseLike`, the state remains
   * `"pending"` until that thenable settles.
   *
   * @param value - Fulfillment value or thenable forwarded to the underlying
   *   promise.
   *
   * @throws When the deferred fate is already resolved.
   */
  public resolve(value?: PromiseLike<T> | T) {
    if (this.fate === DEFERRED_FATE_RESOLVED) {
      throw new Error(DEFERRED_ERROR_ALREADY_RESOLVED)
    }

    this.fate = DEFERRED_FATE_RESOLVED

    if (this._resolve !== undefined) {
      this._resolve(value)
    }
  }
}
