/*
 * Grasspiler / ixterms.js
 * copyright (c) 2016 Susisu
 */

"use strict";

function endModule() {
    module.exports = Object.freeze({
        Term,
        Val,
        Var,
        Abs,
        App,
        Let
    });
}

// de Bruijn indexed terms
class Term {
    constructor() {
    }

    eval(log) {
        let term = this;
        if (log) {
            console.log(term.toString());
        }
        while (!(term instanceof Val)) {
            term = term.eval1();
            if (log) {
                console.log(`\t-> ${term.toString()}`);
            }
        }
        return term;
    }
}

class Val extends Term {
    constructor() {
        super();
    }

    eval1() {
        return this;
    }
}

class Var extends Val {
    constructor(index) {
        super();
        this.index = index;
    }

    toString() {
        return this.index.toString();
    }

    toFuncString() {
        return this.toString();
    }

    toArgString() {
        return this.toString();
    }

    shift(i, n) {
        if (this.index >= i) {
            return new Var(this.index + n);
        }
        else {
            return this;
        }
    }

    subst(n, term) {
        if (this.index === n) {
            return term;
        }
        else {
            return this;
        }
    }

    contains(n) {
        return this.index === n;
    }

    swap(n, m) {
        if (this.index === n) {
            return new Var(m);
        }
        else if (this.index === m) {
            return new Var(n);
        }
        else {
            return this;
        }
    }

    equals(term) {
        return term instanceof Var && this.index === term.index;
    }
}

class Abs extends Val {
    constructor(body) {
        super();
        this.body = body;
    }

    toString() {
        return `\u001b[1;32mfun\u001b[22;39m => ${this.body.toString()}`;
    }

    toFuncString() {
        return `(${this.toString()})`;
    }

    toArgString() {
        return `(${this.toString()})`;
    }

    shift(i, n) {
        return new Abs(this.body.shift(i + 1, n));
    }

    subst(n, term) {
        return new Abs(this.body.subst(n + 1, term.shift(0, 1)));
    }

    contains(n) {
        return this.body.contains(n + 1);
    }

    swap(n, m) {
        return new Abs(this.body.swap(n + 1, m + 1));
    }

    equals(term) {
        return term instanceof Abs && this.body.equals(term.body);
    }
}

class App extends Term {
    constructor(func, arg) {
        super();
        this.func = func;
        this.arg  = arg;
    }

    toString() {
        return `${this.func.toFuncString()} ${this.arg.toArgString()}`;
    }

    toFuncString() {
        return this.toString();
    }

    toArgString() {
        return `(${this.toString()})`;
    }

    shift(i, n) {
        return new App(this.func.shift(i, n), this.arg.shift(i, n));
    }

    subst(n, term) {
        return new App(this.func.subst(n, term), this.arg.subst(n, term));
    }

    eval1() {
        if (!(this.func instanceof Val)) {
            return new App(this.func.eval1(), this.arg);
        }
        else if (!(this.arg instanceof Val)) {
            return new App(this.func, this.arg.eval1());
        }
        else {
            return this.func.body.subst(0, this.arg.shift(0, 1)).shift(0, -1);
        }
    }

    contains(n) {
        return this.func.contains(n) || this.arg.contains(n);
    }

    swap(n, m) {
        return new App(this.func.swap(n, m), this.arg.swap(n, m));
    }

    equals(term) {
        return term instanceof App && this.func.equals(term.func) && this.arg.equals(term.arg);
    }
}

class Let extends Term {
    constructor(expr, body) {
        super();
        this.expr = expr;
        this.body = body;
    }

    toString() {
        return `\u001b[1;35mlet\u001b[22;39m (${this.expr.toString()}) \u001b[1;35min\u001b[22;39m ${this.body.toString()}`;
    }

    toFuncString() {
        return `(${this.toString()})`;
    }

    toArgString() {
        return `(${this.toString()})`;
    }

    shift(i, n) {
        return new Let(this.expr.shift(i, n), this.body.shift(i + 1, n));
    }

    subst(n, term) {
        return new Let(this.expr.subst(n, term), this.body.subst(n + 1, term.shift(0, 1)));
    }

    eval1() {
        if (!(this.expr instanceof Val)) {
            return new Let(this.expr.eval1(), this.body);
        }
        else {
            return this.body.subst(0, this.expr.shift(0, 1)).shift(0, -1);
        }
    }

    contains(n) {
        return this.expr.contains(n) || this.body.contains(n + 1);
    }

    swap(n, m) {
        return new Let(this.expr.swap(n, m), this.body.swap(n + 1, m + 1));
    }

    equals(term) {
        return term instanceof Let && this.expr.equals(term.expr) && this.body.equals(term.body);
    }
}

endModule();
