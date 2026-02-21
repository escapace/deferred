import { assert, describe, it } from 'vitest'
import { Deferred } from './index'

// eslint-disable-next-line typescript/no-empty-function
const noop = () => {}

describe('Deferred', () => {
  it('pending', () => {
    const d = new Deferred()

    assert.isTrue(d.isPending())
    assert.isFalse(d.isSettled())
    assert.isFalse(d.isResolved())
    assert.isFalse(d.isFulfilled())
    assert.isFalse(d.isRejected())
  })

  it('fulfilled', async () =>
    await new Promise<void>((done) => {
      const d = new Deferred<string>()

      d.resolve('abc')

      void d.promise.then((value) => {
        assert.equal(value, 'abc')

        assert.isFalse(d.isPending())
        assert.isTrue(d.isSettled())
        assert.isTrue(d.isResolved())
        assert.isTrue(d.isFulfilled())
        assert.isFalse(d.isRejected())

        done()
      })
    }))

  it('rejected', async () =>
    await new Promise<void>((done) => {
      const d = new Deferred<string>()

      d.reject('abc')

      d.promise.catch((value) => {
        assert.equal(value, 'abc')

        assert.isFalse(d.isPending())
        assert.isTrue(d.isSettled())
        assert.isTrue(d.isResolved())
        assert.isFalse(d.isFulfilled())
        assert.isTrue(d.isRejected())

        done()
      })
    }))

  it('resolved twice', () => {
    assert.throws(() => {
      const d = new Deferred<string>()

      d.reject('abc')
      d.reject('abc')
    }, /Deferred fate is already resolved/)

    assert.throws(() => {
      const d = new Deferred<string>()

      d.resolve('abc')
      d.resolve('abc')
    }, /Deferred fate is already resolved/)

    assert.throws(() => {
      const d = new Deferred<string>()

      d.resolve('abc')
      d.reject('abc')
    }, /Deferred fate is already resolved/)

    assert.throws(() => {
      const d = new Deferred<string>()

      d.reject('abc')
      d.resolve('abc')
    }, /Deferred fate is already resolved/)
  })

  it('fate and state are readable', () => {
    const d = new Deferred<string>()

    assert.equal(d.fate, 'unresolved')
    assert.equal(d.state, 'pending')

    d.resolve('abc')

    assert.equal(d.fate, 'resolved')
  })

  describe('microtask timing', () => {
    it('resolve() sets fate synchronously but state stays pending', () => {
      const d = new Deferred<number>()

      d.resolve(1)

      assert.equal(d.fate, 'resolved')
      assert.equal(d.state, 'pending')
      assert.isTrue(d.isResolved())
      assert.isTrue(d.isPending())
      assert.isFalse(d.isFulfilled())
      assert.isFalse(d.isSettled())
    })

    it('reject() sets fate synchronously but state stays pending', () => {
      const d = new Deferred<number>()

      d.reject(new Error('fail'))

      assert.equal(d.fate, 'resolved')
      assert.equal(d.state, 'pending')
      assert.isTrue(d.isResolved())
      assert.isTrue(d.isPending())
      assert.isFalse(d.isRejected())
      assert.isFalse(d.isSettled())

      // prevent unhandled rejection
      d.promise.catch(noop)
    })

    it('state becomes fulfilled after awaiting a resolved deferred', async () => {
      const d = new Deferred<string>()

      d.resolve('value')

      assert.equal(d.state, 'pending')

      await d.promise

      assert.equal(d.state, 'fulfilled')
      assert.isTrue(d.isFulfilled())
      assert.isTrue(d.isSettled())
    })

    it('state becomes rejected after awaiting a rejected deferred', async () => {
      const d = new Deferred<string>()
      const error = new Error('reason')

      d.reject(error)

      assert.equal(d.state, 'pending')

      await d.promise.catch(noop)

      assert.equal(d.state, 'rejected')
      assert.isTrue(d.isRejected())
      assert.isTrue(d.isSettled())
    })

    it('single queueMicrotask is enough for state to propagate after resolve()', async () => {
      const d = new Deferred<number>()

      d.resolve(42)

      assert.equal(d.state, 'pending')

      await new Promise<void>((done) => queueMicrotask(done))

      assert.equal(d.state, 'fulfilled')
    })

    it('single queueMicrotask is enough for state to propagate after reject()', async () => {
      const d = new Deferred<number>()

      d.reject('err')
      d.promise.catch(noop)

      assert.equal(d.state, 'pending')

      await new Promise<void>((done) => queueMicrotask(done))

      assert.equal(d.state, 'rejected')
    })

    it('resolve(thenable) keeps state pending until the thenable fulfills', async () => {
      const inner = new Deferred<string>()
      const outer = new Deferred<string>()

      outer.resolve(inner.promise)

      // fate is locked, but inner has not settled
      assert.equal(outer.fate, 'resolved')
      assert.equal(outer.state, 'pending')
      assert.isFalse(outer.isSettled())

      // flush a microtask — inner is still pending so outer stays pending
      await new Promise<void>((done) => queueMicrotask(done))

      assert.equal(outer.state, 'pending')

      // settle the inner promise
      inner.resolve('from-inner')
      await outer.promise

      assert.equal(outer.state, 'fulfilled')
      assert.isTrue(outer.isSettled())
      assert.isTrue(outer.isFulfilled())

      const value = await outer.promise
      assert.equal(value, 'from-inner')
    })

    it('resolve(thenable) keeps state pending until the thenable rejects', async () => {
      const inner = new Deferred<string>()
      const outer = new Deferred<string>()

      outer.resolve(inner.promise)

      assert.equal(outer.fate, 'resolved')
      assert.equal(outer.state, 'pending')

      await new Promise<void>((done) => queueMicrotask(done))

      assert.equal(outer.state, 'pending')

      const error = new Error('inner-fail')
      inner.reject(error)

      await outer.promise.catch(noop)

      assert.equal(outer.state, 'rejected')
      assert.isTrue(outer.isRejected())
      assert.isTrue(outer.isSettled())
    })

    it('resolve() with an already-fulfilled promise settles after microtask', async () => {
      const d = new Deferred<number>()

      d.resolve(Promise.resolve(99))

      // even though the inner promise is already fulfilled, the
      // outer state lags by at least one microtask
      assert.equal(d.state, 'pending')

      await d.promise

      assert.equal(d.state, 'fulfilled')
      const value = await d.promise
      assert.equal(value, 99)
    })

    it('resolve() with an already-rejected promise settles after microtask', async () => {
      const error = new Error('already-rejected')
      const d = new Deferred<number>()

      d.resolve(Promise.reject(error))

      assert.equal(d.state, 'pending')

      const caught = await d.promise.catch((reason: Error) => reason)
      assert.equal(caught, error)

      assert.equal(d.state, 'rejected')
      assert.isTrue(d.isRejected())
    })

    it('chained thenables delay state proportionally', async () => {
      const first = new Deferred<string>()
      const second = new Deferred<string>()
      const outer = new Deferred<string>()

      // outer → first → second (two levels of indirection)
      outer.resolve(first.promise)
      first.resolve(second.promise)

      assert.equal(outer.fate, 'resolved')
      assert.equal(outer.state, 'pending')
      assert.equal(first.fate, 'resolved')
      assert.equal(first.state, 'pending')

      // nothing has settled yet
      await new Promise<void>((done) => queueMicrotask(done))

      assert.equal(outer.state, 'pending')
      assert.equal(first.state, 'pending')

      second.resolve('deep')
      await outer.promise

      assert.equal(second.state, 'fulfilled')
      assert.equal(first.state, 'fulfilled')
      assert.equal(outer.state, 'fulfilled')

      const value = await outer.promise
      assert.equal(value, 'deep')
    })

    it('.then() handlers registered before resolve fire after microtask', async () => {
      const d = new Deferred<number>()
      const order: string[] = []

      void d.promise.then(() => order.push('before'))

      d.resolve(1)

      void d.promise.then(() => order.push('after'))

      await d.promise

      // both handlers execute; "before" was registered first
      assert.include(order, 'before')
      assert.include(order, 'after')
    })

    it('.catch() handler registered before reject fires after microtask', async () => {
      const d = new Deferred<number>()
      const order: string[] = []

      d.promise.catch(() => order.push('before'))

      d.reject(new Error('x'))

      d.promise.catch(() => order.push('after'))

      await d.promise.catch(noop)

      assert.include(order, 'before')
      assert.include(order, 'after')
    })

    it('state never transitions more than once', async () => {
      const d = new Deferred<string>()
      const observed: string[] = []

      // sample state on every microtask until settled
      const poll = async () => {
        for (let index = 0; index < 10; index++) {
          observed.push(d.state)
          await new Promise<void>((done) => queueMicrotask(done))
        }
      }

      const polling = poll()
      d.resolve('x')
      await polling

      // should see some "pending" entries then only "fulfilled"
      const firstFulfilled = observed.indexOf('fulfilled')
      assert.notEqual(firstFulfilled, -1, 'should eventually observe fulfilled')

      // every entry after the first fulfilled must also be fulfilled
      for (let index = firstFulfilled; index < observed.length; index++) {
        assert.equal(observed[index], 'fulfilled')
      }

      // every entry before must be pending
      for (let index = 0; index < firstFulfilled; index++) {
        assert.equal(observed[index], 'pending')
      }
    })

    it('state never transitions more than once (rejection path)', async () => {
      const d = new Deferred<string>()
      d.promise.catch(noop)

      const observed: string[] = []

      const poll = async () => {
        for (let index = 0; index < 10; index++) {
          observed.push(d.state)
          await new Promise<void>((done) => queueMicrotask(done))
        }
      }

      const polling = poll()
      d.reject('x')
      await polling

      const firstRejected = observed.indexOf('rejected')
      assert.notEqual(firstRejected, -1, 'should eventually observe rejected')

      for (let index = firstRejected; index < observed.length; index++) {
        assert.equal(observed[index], 'rejected')
      }

      for (let index = 0; index < firstRejected; index++) {
        assert.equal(observed[index], 'pending')
      }
    })

    it('isSettled() is false synchronously after resolve, true after await', async () => {
      const d = new Deferred<number>()

      d.resolve(1)

      assert.isFalse(d.isSettled())

      await d.promise

      assert.isTrue(d.isSettled())
    })

    it('isSettled() is false synchronously after reject, true after await', async () => {
      const d = new Deferred<number>()

      d.reject('e')

      assert.isFalse(d.isSettled())

      await d.promise.catch(noop)

      assert.isTrue(d.isSettled())
    })

    it('resolve(undefined) behaves identically to resolve(value)', async () => {
      const d = new Deferred<undefined>()

      d.resolve(undefined)

      assert.equal(d.fate, 'resolved')
      assert.equal(d.state, 'pending')

      await d.promise

      assert.equal(d.state, 'fulfilled')
      const value = await d.promise
      assert.isUndefined(value)
    })

    it('resolve() without arguments fulfills with undefined', async () => {
      const d = new Deferred<undefined>()

      d.resolve()

      assert.equal(d.fate, 'resolved')
      assert.equal(d.state, 'pending')

      await d.promise

      assert.equal(d.state, 'fulfilled')
      const value = await d.promise
      assert.isUndefined(value)
    })

    it('multiple deferreds resolved in sequence settle independently', async () => {
      const a = new Deferred<number>()
      const b = new Deferred<number>()

      a.resolve(1)
      b.resolve(2)

      assert.equal(a.state, 'pending')
      assert.equal(b.state, 'pending')

      await Promise.all([a.promise, b.promise])

      assert.equal(a.state, 'fulfilled')
      assert.equal(b.state, 'fulfilled')
    })

    it('mixed resolve and reject across deferreds settle independently', async () => {
      const a = new Deferred<number>()
      const b = new Deferred<number>()

      a.resolve(1)
      b.reject('err')

      assert.equal(a.state, 'pending')
      assert.equal(b.state, 'pending')

      await a.promise
      await b.promise.catch(noop)

      assert.equal(a.state, 'fulfilled')
      assert.equal(b.state, 'rejected')
    })

    it('custom thenable (non-Promise PromiseLike) delays state', async () => {
      const d = new Deferred<number>()
      let thenableResolve: ((value: number) => void) | undefined

      const thenable: PromiseLike<number> = {
        then<TResult1 = number, TResult2 = never>(
          onFulfilled?: ((value: number) => PromiseLike<TResult1> | TResult1) | null,
          // eslint-disable-next-line typescript/no-explicit-any
          _onRejected?: ((reason: any) => PromiseLike<TResult2> | TResult2) | null,
        ): PromiseLike<TResult1 | TResult2> {
          thenableResolve = onFulfilled as unknown as (value: number) => void
          return this as unknown as PromiseLike<TResult1 | TResult2>
        },
      }

      d.resolve(thenable)

      assert.equal(d.fate, 'resolved')
      assert.equal(d.state, 'pending')

      // flush several microtasks — thenable has not resolved yet
      for (let index = 0; index < 5; index++) {
        await new Promise<void>((done) => queueMicrotask(done))
      }

      assert.equal(d.state, 'pending')

      // settle the thenable
      assert.isDefined(thenableResolve)
      thenableResolve(77)

      await d.promise

      assert.equal(d.state, 'fulfilled')
      const value = await d.promise
      assert.equal(value, 77)
    })
  })
})
