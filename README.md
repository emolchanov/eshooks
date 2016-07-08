# Extremely Simple Hooks

[![Build Status](https://travis-ci.org/emolchanov/eshooks.svg?branch=master)](https://travis-ci.org/emolchanov/eshooks)
[![Dependency Status](https://david-dm.org/emolchanov/eshooks.svg)](https://david-dm.org/emolchanov/eshooks)
[![devDependency Status](https://david-dm.org/emolchanov/eshooks/dev-status.svg)](https://david-dm.org/emolchanov/eshooks#info=devDependencies)

Asynchronous hooks for NodeJS and browsers. Works with promise-based architectures.

## Installing

```
npm install eshooks
```

## Using

Hooks registered using the `on()` method and return Promises.
If it returns a Promise, the hook finishes executing before the next hook starts.

```javascript
import HooksStorage from 'eshooks'

const hooks = new HooksStorage()

hooks.on('start', (...args) => console.log(`Pre-start check - stage 0: ${JSON.stringify(args)}`))
hooks.on('start', (...args) => console.log(`Pre-start check - stage 1: ${JSON.stringify(args)}`))

hooks.trigger('start', 'test').then(() => console.log('Starting...'))

```

Output:
```
Pre-start check - stage 0: ["test"]
Pre-start check - stage 1: ["test"]
Starting...
```

## Priorities

Priorities can be specified as a second argument to `.on()`. Lower priorities execute first.
If no priority is specified, it defaults to 0. If multiple hooks are registered with the same priority, they are
executed in the order they are registered.

```javascript
import HooksStorage from 'eshooks'

const hooks = new HooksStorage()

hooks.on('start', (...args) => console.log(`Pre-start check - stage 0: ${JSON.stringify(args)}`))
hooks.on('start', 2, (...args) => console.log(`Pre-start check - stage 2: ${JSON.stringify(args)}`))
hooks.on('start', 1, (...args) => console.log(`Pre-start check - stage 1: ${JSON.stringify(args)}`))
hooks.on('start', 2, (...args) => console.log(`Pre-start check - stage 3: ${JSON.stringify(args)}`))

hooks.trigger('start', 'test').then(() => console.log('Starting...'))
```

Output:
```
Pre-start check - stage 0: ["test"]
Pre-start check - stage 1: ["test"]
Pre-start check - stage 2: ["test"]
Pre-start check - stage 3: ["test"]
Starting...
```

## Errors

You can also register an error cleanup function with registering a hook. This function should undo
any effects of the hook that need to be undone on error. If an error occurs in the chain of hooks, the
error cleanup function of any previous hooks (not including the hook that generated the error) are called
in reverse order.

```javascript
import HooksStorage from 'eshooks'

const hooks = new HooksStorage()

hooks.on('start', (...args) => console.log('Pre-start check - stage 0'),
                  (err, ...args) => console.log('Reverting stage 0'))
                  
hooks.on('start', (...args) => console.log('Pre-start check - stage 1'), 
                  (err, ...args) => console.log('Reverting stage 1'))
                  
hooks.on('start', (...args) => { console.log('Pre-start check - stage 1'); throw new Error(args) },
                  (err, ...args) => console.log('Reverting stage 2'))
                  
hooks.on('start', (...args) => console.log('Pre-start check - stage 3'),
                  (err, ...args) => console.log('Reverting stage 3'))

hooks.trigger('start', 'test')
     .then(() => console.log('Starting...'), (err) => console.log('Aborting...', err))

```

Output:
```
Pre-start check - stage 0
Pre-start check - stage 1
Reverting stage 1
Reverting stage 0
Aborting... Error 'test'
```