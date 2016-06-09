/*
 * Grasspiler / exprs.js
 * copyright (c) 2016 Susisu
 */

"use strict";

function endModule() {
    module.exports = Object.freeze({
        Stmt,
        Def,

        Term,
        Val,
        Var,
        Abs,
        App,
        Let
    });
}

// statements
class Stmt {
    constructor() {
    }
}

class Def extends Stmt {
    constructor(name, term) {
        super();
        this.name = name;
        this.term = term;
    }

    toString() {
        return `\u001b[1;37mlet\u001b[22;39m ${this.name} = ${this.term.toString()}`;
    }
}

// terms
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
    constructor(name) {
        super();
        this.name = name;
    }

    toString() {
        return this.name;
    }

    toFuncString() {
        return this.toString();
    }

    toArgString() {
        return this.toString();
    }

    subst(name, term) {
        if (this.name === name) {
            return term;
        }
        else {
            return this;
        }
    }
}

class Abs extends Val {
    constructor(arg, body) {
        super();
        this.arg  = arg;
        this.body = body;
    }

    toString() {
        return `\u001b[1;32mfun\u001b[22;39m ${this.arg} => ${this.body.toString()}`;
    }

    toFuncString() {
        return `(${this.toString()})`;
    }

    toArgString() {
        return `(${this.toString()})`;
    }

    subst(name, term) {
        if (name === this.arg) {
            return this;
        }
        else {
            return new Abs(this.arg, this.body.subst(name, term));
        }
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

    subst(name, term) {
        return new App(this.func.subst(name, term), this.arg.subst(name, term));
    }

    eval1() {
        if (!(this.func instanceof Val)) {
            return new App(this.func.eval1(), this.arg);
        }
        else if (!(this.arg instanceof Val)) {
            return new App(this.func, this.arg.eval1());
        }
        else {
            return this.func.body.subst(this.func.arg, this.arg);
        }
    }
}

class Let extends Term {
    constructor(name, expr, body) {
        super();
        this.name = name;
        this.expr = expr;
        this.body = body;
    }

    toString() {
        return `\u001b[1;35mlet\u001b[22;39m ${this.name} = (${this.expr.toString()}) \u001b[1;35min\u001b[22;39m ${this.body.toString()}`;
    }

    toFuncString() {
        return `(${this.toString()})`;
    }

    toArgString() {
        return `(${this.toString()})`;
    }

    subst(name, term) {
        if (name === this.name) {
            return new Let(this.name, this.expr.subst(name, term), this.body);
        }
        else {
            return new Let(this.name, this.expr.subst(name, term), this.body.subst(name, term));
        }
    }

    eval1() {
        return this.body.subst(this.name, this.expr);
    }
}

endModule();
