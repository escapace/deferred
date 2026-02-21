# @escapace/deferred

Deferred promise that exposes `resolve()` and `reject()` as methods, with synchronous access to the promise's settlement status.

## Installation

```bash
pnpm add @escapace/deferred
```

## Usage

Each deferred tracks two axes from the promises specification — [state and fate](https://github.com/domenic/promises-unwrapping/blob/master/docs/states-and-fates.md). `fate` locks synchronously when `resolve()` or `reject()` is called. `state` updates asynchronously via microtask.

```typescript
import { Deferred } from '@escapace/deferred'

const deferred = new Deferred<string>()

// fate is locked synchronously; state updates on the next microtask
deferred.resolve('hello')

deferred.fate // 'resolved' — outcome is determined
deferred.state // 'pending'  — settlement has not propagated yet

await deferred.promise

deferred.state // 'fulfilled' — settlement has propagated
```

Rejection works the same way — both `resolve()` and `reject()` lock the fate:

```typescript
const deferred = new Deferred<string>()

deferred.reject(new Error('timeout'))

deferred.fate // 'resolved'
deferred.state // 'pending'

await deferred.promise.catch(() => {})

deferred.state // 'rejected'
```

Calling `resolve()` or `reject()` a second time throws:

```typescript
const deferred = new Deferred<string>()

deferred.resolve('first')
deferred.resolve('second') // throws "Deferred fate is already resolved"
```

### Introspection helpers

```typescript
const deferred = new Deferred<number>()

deferred.isPending() // true
deferred.isSettled() // false — not yet fulfilled or rejected
deferred.isResolved() // false — fate is still unresolved

deferred.resolve(42)
await deferred.promise

deferred.isFulfilled() // true
deferred.isSettled() // true
deferred.isResolved() // true
deferred.isRejected() // false
```

# API

## class Deferred [↗](src/index.ts#L65-L209 'Deferred')

Promise whose outcome can be determined externally.

```typescript
export declare class Deferred<T>
```

### Type Parameters

| Parameter | Description                                       |
| --------- | ------------------------------------------------- |
| `T`       | Fulfillment value type of the underlying promise. |

### Remarks

Wraps a standard `Promise` and exposes its `resolve` and `reject` callbacks as instance methods. The [Deferred.fate](#deferredfate) and [Deferred.state](#deferredstate) fields provide synchronous introspection into the promise lifecycle.

### new Deferred

Constructs a new instance of the `Deferred` class

```typescript
constructor()
```

### Deferred.isFulfilled

Indicates whether the promise has fulfilled.

```typescript
isFulfilled(): boolean;
```

#### Returns

`true` when [Deferred.state](#deferredstate) is `"fulfilled"`.

### Deferred.isPending

Indicates whether the promise is still pending.

```typescript
isPending(): boolean;
```

#### Returns

`true` when [Deferred.state](#deferredstate) is `"pending"`.

### Deferred.isRejected

Indicates whether the promise has rejected.

```typescript
isRejected(): boolean;
```

#### Returns

`true` when [Deferred.state](#deferredstate) is `"rejected"`.

### Deferred.isResolved

Indicates whether the deferred fate has been locked in.

```typescript
isResolved(): boolean;
```

#### Returns

`true` when [Deferred.fate](#deferredfate) is `"resolved"`.

#### Remarks

Returns `true` after either [Deferred.resolve](#deferredresolve) or [Deferred.reject](#deferredreject) has been called. A resolved fate does not imply fulfillment — rejected deferreds are also resolved.

### Deferred.isSettled

Indicates whether the promise has settled (fulfilled or rejected).

```typescript
isSettled(): boolean;
```

#### Returns

`true` when [Deferred.state](#deferredstate) is not `"pending"`.

### Deferred.reject

Rejects the underlying promise.

```typescript
reject(reason?: any): void;
```

#### Parameters

| Parameter | Type           | Description                                           |
| --------- | -------------- | ----------------------------------------------------- |
| `reason`  | <pre>any</pre> | Rejection reason forwarded to the underlying promise. |

#### Throws

When the deferred fate is already resolved.

#### Remarks

Sets [Deferred.fate](#deferredfate) to `"resolved"` synchronously. [Deferred.state](#deferredstate) transitions to `"rejected"` asynchronously on the next microtask.

### Deferred.resolve

Resolves the underlying promise.

```typescript
resolve(value?: PromiseLike<T> | T): void;
```

#### Parameters

| Parameter | Type                            | Description                                                        |
| --------- | ------------------------------- | ------------------------------------------------------------------ |
| `value`   | <pre>PromiseLike\<T> \| T</pre> | Fulfillment value or thenable forwarded to the underlying promise. |

#### Throws

When the deferred fate is already resolved.

#### Remarks

Sets [Deferred.fate](#deferredfate) to `"resolved"` synchronously. [Deferred.state](#deferredstate) transitions to `"fulfilled"` asynchronously on the next microtask. When `value` is a `PromiseLike`, the state remains `"pending"` until that thenable settles.

### Deferred.fate

Whether the deferred has been locked in.

```typescript
fate: DeferredFate
```

#### Remarks

Set to `"resolved"` by either [Deferred.resolve](#deferredresolve) or [Deferred.reject](#deferredreject). A resolved fate means the outcome is determined; it does not imply fulfillment.

### Deferred.promise

Underlying promise whose outcome is controlled by this deferred.

```typescript
promise: Promise<T>
```

### Deferred.state

Current settlement state of the underlying promise.

```typescript
state: DeferredState
```

#### Remarks

Mirrors the internal `[[PromiseState]]` slot. Updated asynchronously via microtask after [Deferred.resolve](#deferredresolve) or [Deferred.reject](#deferredreject) is called, so a brief window exists where [Deferred.fate](#deferredfate) is `"resolved"` but this field is still `"pending"`.

## const DEFERRED_ERROR_ALREADY_RESOLVED [↗](src/index.ts#L44 'DEFERRED_ERROR_ALREADY_RESOLVED')

Error message thrown when attempting to resolve or reject an already-resolved deferred.

```typescript
DEFERRED_ERROR_ALREADY_RESOLVED = 'Deferred fate is already resolved'
```

## const DEFERRED_FATE_RESOLVED [↗](src/index.ts#L29 'DEFERRED_FATE_RESOLVED')

Fate value indicating the deferred outcome has been determined.

```typescript
DEFERRED_FATE_RESOLVED: 'resolved'
```

## const DEFERRED_FATE_UNRESOLVED [↗](src/index.ts#L32 'DEFERRED_FATE_UNRESOLVED')

Fate value indicating the deferred outcome has not yet been determined.

```typescript
DEFERRED_FATE_UNRESOLVED: 'unresolved'
```

## const DEFERRED_STATE_FULFILLED [↗](src/index.ts#L35 'DEFERRED_STATE_FULFILLED')

State value indicating the promise completed successfully.

```typescript
DEFERRED_STATE_FULFILLED: 'fulfilled'
```

## const DEFERRED_STATE_PENDING [↗](src/index.ts#L38 'DEFERRED_STATE_PENDING')

State value indicating the promise has not yet settled.

```typescript
DEFERRED_STATE_PENDING: 'pending'
```

## const DEFERRED_STATE_REJECTED [↗](src/index.ts#L41 'DEFERRED_STATE_REJECTED')

State value indicating the promise failed.

```typescript
DEFERRED_STATE_REJECTED: 'rejected'
```

## type DeferredFate [↗](src/index.ts#L47 'DeferredFate')

Possible fates of a [Deferred](#class-deferred-): `"resolved"` or `"unresolved"`.

```typescript
export type DeferredFate = typeof DEFERRED_FATE_RESOLVED | typeof DEFERRED_FATE_UNRESOLVED
```

## type DeferredState [↗](src/index.ts#L50-L53 'DeferredState')

Possible states of a [Deferred](#class-deferred-): `"fulfilled"`, `"pending"`, or `"rejected"`.

```typescript
export type DeferredState =
  | typeof DEFERRED_STATE_FULFILLED
  | typeof DEFERRED_STATE_PENDING
  | typeof DEFERRED_STATE_REJECTED
```
