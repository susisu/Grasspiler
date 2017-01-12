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
    constructor(pos) {
        this.pos = pos;
    }
}

class Def extends Stmt {
    constructor(pos, name, term) {
        super(pos);
        this.name = name;
        this.term = term;
    }

    toString() {
        return `\u001b[1;37mlet\u001b[22;39m ${this.name} = ${this.term.toString()}`;
    }
}

// terms
class Term {
    constructor(pos) {
        this.pos = pos;
    }

    eval(log) {
        let term = this;
        if (log) {
            process.stdout.write(term.toString() + "\n");
        }
        while (!(term instanceof Val)) {
            term = term.eval1();
            if (log) {
                process.stdout.write(`\t-> ${term.toString()}\n`);
            }
        }
        return term;
    }
}

class Val extends Term {
    constructor(pos) {
        super(pos);
    }

    eval1() {
        return this;
    }
}

class Var extends Val {
    constructor(pos, name) {
        super(pos);
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
    constructor(pos, arg, body) {
        super(pos);
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
    constructor(pos, func, arg) {
        super(pos);
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
    constructor(pos, name, expr, body) {
        super(pos);
        this.name = name;
        this.expr = expr;
        this.body = body;
    }

    toString() {
        return `\u001b[1;35mlet\u001b[22;39m ${this.name} = (${this.expr.toString()})`
            + ` \u001b[1;35min\u001b[22;39m ${this.body.toString()}`;
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
