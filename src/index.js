import Promise from "promise";

export default class Hooks {

    constructor() {
        this.storage = {};
    }

    /**
     * @param {String} name - The name of the event to add a hook to
     * @param {Number} [priority] - Numeric priority for the order of the hook execution.
     * @param {Function} handler - Handler for the hook.
     * @param {Function} [errorHandler] - Handler for error. They are called in reverse order of handler.
     * @return {Hooks} - this
     */
    on() {
        return Hooks.addHook.call(this, Hooks.toArray(arguments));
    }

    /**
     * @param {String} name - The name of the event to trigger.
     * @param {Mixed} [arg1...argN] - Optional arguments to supply to the hooks.
     * @return {Promise} - Promise that resolves when all hooks are complete.
     */
    trigger() {
        return Hooks.trigger.call(this, Hooks.toArray(arguments));
    }

    static getHooks(name) {
        return this.storage[name] || {hooks: [], sorted: true};
    }

    static addHook(args) {
        const name = args.shift();
        const priority = (typeof args[0] === 'number') ? args.shift() : 0;
        const handler = args.shift();
        const errorHandler = args.shift();

        if (args.length !== 0) throw new Error('Too many arguments');

        let nameStorage = this.storage[name] = Hooks.getHooks.call(this, name);

        nameStorage.hooks.push({priority, handler, errorHandler});

        nameStorage.sorted = nameStorage.hooks.length <= 1;

        return this;
    }

    static sortHooks(name) {
        const nameStorage = this.storage[name];

        if (!nameStorage || !nameStorage.hooks || nameStorage.hooks.length <= 1 || nameStorage.sorted) return;

        nameStorage.hooks.sort((a, b) => a.priority > b.priority);

        nameStorage.sorted = true;
    }

    static trigger(args) {
        const name = args.shift();
        const nameStorage = this.storage[name];

        if (!nameStorage) return Promise.resolve([]);

        Hooks.sortHooks.call(this, name);

        const hooksArray = nameStorage.hooks;

        return new Promise((resolve, reject) => {

            const results = [];

            const executeNextHook = err => {

                if (err) {
                    hookIndex -= 2;
                    return executeNextErrorHook(err);
                }

                if (hookIndex >= hooksArray.length) {
                    return resolve(results);
                }

                const hook = hooksArray[hookIndex];
                hookIndex++;

                try {
                    const hookResult = hook.handler(...args);
                    Hooks.isPromise(hookResult)
                        ? hookResult.then(result => results.push(result) && executeNextHook())
                                    .catch(err => executeNextHook(err || new Error('executing error')))
                                    .catch(Hooks.catchPromiseError)
                        : (results.push(hookResult) && executeNextHook())
                } catch (err) {
                    executeNextHook(err);
                }
            };

            const executeNextErrorHook = err => {

                if (hookIndex < 0) {
                    return reject(err);
                }

                const hook = hooksArray[hookIndex];
                hookIndex--;

                if (!hook.errorHandler) return executeNextErrorHook(err);

                try {
                    const hookResult = hook.errorHandler(...[err].concat(args));
                    Hooks.isPromise(hookResult)
                        ? hookResult.then(() => executeNextErrorHook(err)).catch(Hooks.catchPromiseError)
                        : executeNextErrorHook(err);
                } catch (ex) {
                    return Hooks.catchPromiseError(ex);
                }
            };

            let hookIndex = 0;

            executeNextHook();
        });
    }

    static catchPromiseError(err) {
        return setImmediate(() => {
            throw err
        });
    };

    static toArray(args) {
        return Array.prototype.slice.call(args, 0)
    };

    static isPromise(obj) {
        return obj && typeof obj.then === 'function'
    };
}