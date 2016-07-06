'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _promise = require('promise');

var _promise2 = _interopRequireDefault(_promise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Hooks = function () {
    function Hooks() {
        _classCallCheck(this, Hooks);

        this.storage = {};
    }

    /**
     * @param {String} name - The name of the event to add a hook to
     * @param {Number} [priority] - Numeric priority for the order of the hook execution.
     * @param {Function} handler - Handler for the hook.
     * @param {Function} [errorHandler] - Handler for error. They are called in reverse order of handler.
     * @return {Hooks} - this
     */


    _createClass(Hooks, [{
        key: 'hook',
        value: function hook() {
            return Hooks.addHook.call(this, Hooks.toArray(arguments));
        }

        /**
         * @param {String} name - The name of the event to trigger.
         * @param {Mixed} [arg1...argN] - Optional arguments to supply to the hooks.
         * @return {Promise} - Promise that resolves when all hooks are complete.
         */

    }, {
        key: 'trigger',
        value: function trigger() {
            return Hooks.trigger.call(this, Hooks.toArray(arguments));
        }
    }], [{
        key: 'getHooks',
        value: function getHooks(name) {
            return this.storage[name] || { hooks: [], sorted: true };
        }
    }, {
        key: 'addHook',
        value: function addHook(args) {
            var name = args.shift();
            var priority = typeof args[0] === 'number' ? args.shift() : 0;
            var handler = args.shift();
            var errorHandler = args.shift();

            if (args.length !== 0) throw new Error('Too many arguments');

            var nameStorage = this.storage[name] = Hooks.getHooks.call(this, name);

            nameStorage.hooks.push({ priority: priority, handler: handler, errorHandler: errorHandler });

            nameStorage.sorted = nameStorage.hooks.length <= 1;

            return this;
        }
    }, {
        key: 'sortHooks',
        value: function sortHooks(name) {
            var nameStorage = this.storage[name];

            if (!nameStorage || !nameStorage.hooks || nameStorage.hooks.length <= 1 || nameStorage.sorted) return;

            nameStorage.hooks.sort(function (a, b) {
                return a.priority > b.priority;
            });

            nameStorage.sorted = true;
        }
    }, {
        key: 'trigger',
        value: function trigger(args) {
            var name = args.shift();
            var nameStorage = this.storage[name];

            if (!nameStorage) return _promise2.default.resolve([]);

            Hooks.sortHooks.call(this, name);

            var hooksArray = nameStorage.hooks;

            return new _promise2.default(function (resolve, reject) {

                var results = [];

                var executeNextHook = function executeNextHook(err) {

                    if (err) {
                        hookIndex -= 2;
                        return executeNextErrorHook(err);
                    }

                    if (hookIndex >= hooksArray.length) {
                        return resolve(results);
                    }

                    var hook = hooksArray[hookIndex];
                    hookIndex++;

                    try {
                        var hookResult = hook.handler.apply(hook, _toConsumableArray(args));
                        Hooks.isPromise(hookResult) ? hookResult.then(function (result) {
                            return results.push(result) && executeNextHook();
                        }).catch(function (err) {
                            return executeNextHook(err || new Error('executing error'));
                        }).catch(Hooks.catchPromiseError) : results.push(hookResult) && executeNextHook();
                    } catch (err) {
                        executeNextHook(err);
                    }
                };

                var executeNextErrorHook = function executeNextErrorHook(err) {

                    if (hookIndex < 0) {
                        return reject(err);
                    }

                    var hook = hooksArray[hookIndex];
                    hookIndex--;

                    if (!hook.errorHandler) return executeNextErrorHook(err);

                    try {
                        var hookResult = hook.errorHandler.apply(hook, _toConsumableArray([err].concat(args)));
                        Hooks.isPromise(hookResult) ? hookResult.then(function () {
                            return executeNextErrorHook(err);
                        }).catch(Hooks.catchPromiseError) : executeNextErrorHook(err);
                    } catch (ex) {
                        return Hooks.catchPromiseError(ex);
                    }
                };

                var hookIndex = 0;

                executeNextHook();
            });
        }
    }, {
        key: 'catchPromiseError',
        value: function catchPromiseError(err) {
            return setImmediate(function () {
                throw err;
            });
        }
    }, {
        key: 'toArray',
        value: function toArray(args) {
            return Array.prototype.slice.call(args, 0);
        }
    }, {
        key: 'isPromise',
        value: function isPromise(obj) {
            return obj && typeof obj.then === 'function';
        }
    }]);

    return Hooks;
}();

exports.default = Hooks;