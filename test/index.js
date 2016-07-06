import Promise from "promise";
import {expect} from "chai";

import Hooks from "../src/index";

const asyncResult = result => new Promise(resolve => setImmediate(() => resolve(result)));

const asyncError = error => new Promise((resolve, reject) => setImmediate(() => reject(error)));

describe('Hooks', () => {

    let hooks = new Hooks();

    beforeEach(() => {
        hooks = new Hooks();
    });

    it('execute hooks as registered', done => {
        hooks.hook('ping', arg => asyncResult('A' + arg));
        hooks.hook('ping', arg => asyncResult('B' + arg));
        hooks.hook('ping', (arg1, arg2) => asyncResult('C' + arg1 + arg2));
        hooks.trigger('ping', 1, 2).then(result => {
            expect(result).to.deep.equal(['A1', 'B1', 'C12']);
            done();
        }).catch(done);
    });

    it('execute hooks in priority order', done => {
        hooks.hook('ping', 2, arg => asyncResult('A' + arg));
        hooks.hook('ping', 3, arg => asyncResult('B' + arg));
        hooks.hook('ping', 1, arg => asyncResult('C' + arg));
        hooks.trigger('ping', 1).then(result => {
            expect(result).to.deep.equal(['C1', 'A1', 'B1']);
            done();
        }).catch(done);
    });

    it('execute hooks with the correct this', done => {
        const context = {};
        hooks.hook('ping', function (arg) {
            expect(this).not.equal(hooks);
            return asyncResult('A' + arg);
        }.bind(context));
        hooks.hook('ping', function (arg) {
            expect(this).to.equal(context);
            return asyncResult('B' + arg);
        }.bind(context));
        hooks.hook('ping', function (arg) {
            expect(this).to.equal(null);
            return asyncResult('C' + arg);
        }.bind(null));
        hooks.trigger('ping', 1).then(result => done()).catch(done);
    });

    it('execute a mix of synchronous and asynchronous hooks', done => {
        hooks.hook('ping', arg => 'A' + arg);
        hooks.hook('ping', arg => asyncResult('B' + arg));
        hooks.hook('ping', arg => 'C' + arg);
        hooks.trigger('ping', 1).then(result => {
            expect(result).to.deep.equal(['A1', 'B1', 'C1']);
            done();
        }).catch(done);
    });

    it('handle asynchronous errors', done => {
        hooks.hook('ping', arg => 'A' + arg);
        hooks.hook('ping', arg => asyncError(123));
        hooks.hook('ping', arg => 'C' + arg);
        hooks.trigger('ping', 1).then(() => {
            done(new Error('should not reach'));
        }, error => {
            expect(error).to.equal(123);
            done();
        }).catch(done);
    });

    it('handle synchronous errors', done => {
        hooks.hook('ping', arg => 'A' + arg);
        hooks.hook('ping', () => {
            throw "error"
        });
        hooks.hook('ping', arg => 'C' + arg);
        hooks.trigger('ping', 0).then(() => {
            done(new Error('should not reach'));
        }, error => {
            expect(error).to.equal("error");
            done();
        }).catch(done);
    });

    it('don`t have unexpected results when no hooks are registered', done => {
        hooks.trigger('ping', 0).then((result) => {
            expect(result).to.deep.equal([]);
            done();
        }).catch(done);
    });

    it('don`t have unexpected results when a single hook is registered', done => {
        hooks.hook('ping', arg => asyncResult('A' + arg));
        hooks.trigger('ping', 0).then(result => {
            expect(result).to.deep.equal(['A0']);
            done();
        }).catch(done);
    });

    it('execute error handler hooks in reverse order', done => {
        const results = [];
        hooks.hook('ping', 1, arg => {
            results.push('A');
            return asyncResult('A' + arg);
        }, (error, arg) => {
            results.push('errA');
            expect(error).to.equal("error");
            expect(arg).to.equal(7);
        });
        hooks.hook('ping', 2, arg => {
            results.push('B');
            return asyncResult('B' + arg);
        }, (error, arg) => {
            results.push('errB');
            expect(error).to.equal("error");
            expect(arg).to.equal(7);
            return asyncResult();
        });
        hooks.hook('ping', 3, () => {
            results.push('C');
            return asyncError("error");
        }, () => {
            results.push('errC');
            throw new Error('shouldn\'t reach');
        });
        hooks.trigger('ping', 7).then(() => {
            done(new Error('shouldn\'t reach'));
        }, error => {
            expect(error).to.equal("error");
            expect(results).to.deep.equal(['A', 'B', 'C', 'errB', 'errA']);
            done();
        }).catch(done);
    });

});
