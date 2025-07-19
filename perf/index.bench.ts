import { bench, describe } from 'vitest'
import { Deferred } from '../src/index.js'

describe('Promise vs Deferred Performance', () => {
  describe('Immediate Resolution', () => {
    bench('Promise.resolve()', async () => {
      const promise = Promise.resolve('test')
      await promise
    })

    bench('new Promise() immediate resolve', async () => {
      const promise = new Promise<string>((resolve) => {
        resolve('test')
      })
      await promise
    })

    bench('Deferred immediate resolve', async () => {
      const deferred = new Deferred<string>()
      deferred.resolve('test')
      await deferred.promise
    })
  })

  describe('Delayed Resolution', () => {
    bench('Promise with setTimeout', async () => {
      const promise = new Promise<string>((resolve) => {
        setTimeout(() => resolve('test'), 0)
      })
      await promise
    })

    bench('Deferred with setTimeout', async () => {
      const deferred = new Deferred<string>()
      setTimeout(() => deferred.resolve('test'), 0)
      await deferred.promise
    })
  })

  describe('Multiple Concurrent Operations', () => {
    bench('100 Promise.resolve() operations', async () => {
      const promises = Array.from({ length: 100 }, async () => await Promise.resolve('test'))
      await Promise.all(promises)
    })

    bench('100 Deferred operations', async () => {
      const deferreds = Array.from({ length: 100 }, async () => {
        const deferred = new Deferred<string>()
        deferred.resolve('test')
        await deferred.promise
      })
      await Promise.all(deferreds)
    })
  })

  describe('Promise Creation Overhead', () => {
    bench('Create Promise.resolve()', () => {
      void Promise.resolve('test')
    })

    bench('Create new Promise()', () => {
      void new Promise<string>((resolve) => {
        resolve('test')
      })
    })

    bench('Create Deferred', () => {
      void new Deferred<string>()
    })

    bench('Create and resolve Deferred', () => {
      const deferred = new Deferred<string>()
      deferred.resolve('test')
    })
  })
})
