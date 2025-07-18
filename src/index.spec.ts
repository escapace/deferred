import { assert, describe, it } from 'vitest'
import { Deferred } from './index'

describe('Deferred', () => {
  it('pending', () => {
    const d = new Deferred()

    assert.isTrue(d.isPending())
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
    }, /Deferred cannot be resolved twice/)

    assert.throws(() => {
      const d = new Deferred<string>()

      d.resolve('abc')
      d.resolve('abc')
    }, /Deferred cannot be resolved twice/)
  })
})
