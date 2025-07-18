# @escapace/deferred

A TypeScript implementation of the deferred pattern, providing explicit control over promise resolution and rejection.

## Installation

```bash
pnpm add @escapace/deferred
```

## Usage

```typescript
import { Deferred } from '@escapace/deferred'

// Create a deferred
const deferred = new Deferred<string>()

// Access the promise
const promise = deferred.promise

// Resolve the deferred
deferred.resolve('success')

// Or reject it
// deferred.reject('error')

// Check state
console.log(deferred.isFulfilled()) // true
console.log(deferred.isResolved()) // true
```

## API Reference

### `new Deferred<T>()`

Creates a new deferred instance.

**Properties:**

- `promise: Promise<T>` - The underlying promise

**Methods:**

#### `resolve(value?: PromiseLike<T> | T): void`

Resolves the deferred with the given value.

#### `reject(reason?: any): void`

Rejects the deferred with the given reason.

#### `isPending(): boolean`

Returns true if the promise is still pending.

#### `isFulfilled(): boolean`

Returns true if the promise was resolved successfully.

#### `isRejected(): boolean`

Returns true if the promise was rejected.

#### `isResolved(): boolean`

Returns true if the deferred has been resolved or rejected.

**Error Handling:**

- Attempting to resolve or reject a deferred twice throws an error: "Deferred cannot be resolved twice"

## License

MPL-2.0
