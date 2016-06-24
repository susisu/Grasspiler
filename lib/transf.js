/*
 * Grasspiler / transf.js
 * copyright (c) 2016 Susisu
 */

"use strict";

function endModule() {
    module.exports = Object.freeze({
        termToDeBruijnIndexed,
        defsToDeBruijnIndexed,
        aNormalize,
        grassNormalize,
        lambdaLift,
        plant
    });
}

const utils = require("./utils.js");
const exprs = require("./exprs.js");
const ix    = require("./ixterms.js");

// translate terms into de Bruijn indexed terms
function termToDeBruijnIndexed(term, ctx) {
    if (term instanceof exprs.Var) {
        let n = ctx.findIndexBy(x => x === term.name);
        if (n >= 0) {
            return new ix.Var(n);
        }
        else {
            throw new Error(term.pos.toString() + ":\nunbound variable: " + term.name);
        }
    }
    else if (term instanceof exprs.Abs) {
        return new ix.Abs(termToDeBruijnIndexed(term.body, ctx.cons(term.arg)));
    }
    else if (term instanceof exprs.App) {
        return new ix.App(termToDeBruijnIndexed(term.func, ctx), termToDeBruijnIndexed(term.arg, ctx));
    }
    else if (term instanceof exprs.Let) {
        return new ix.Let(termToDeBruijnIndexed(term.expr, ctx), termToDeBruijnIndexed(term.body, ctx.cons(term.name)));
    }
    else {
        throw new Error("unexpected term");
    }
}

function defsToDeBruijnIndexed(defs, ctx) {
    let c     = ctx;
    let terms = [];
    for (let def of defs) {
        let term = termToDeBruijnIndexed(def.term, c);
        terms.push(term);
        c = c.cons(def.name);
    }
    return terms.reduceRight((b, t) => new ix.Let(t, b));;
}

// A-normalization
class EvalCtx {
    constructor() {
    }

    compose(ctx) {
        return new CompositeCtx(this, ctx);
    }

    innermost() {
        return this;
    }
}

class CompositeCtx extends EvalCtx {
    constructor(ctx1, ctx2) {
        super();
        this.ctx1 = ctx1;
        this.ctx2 = ctx2;
    }

    apply(term) {
        return this.ctx1.apply(this.ctx2.apply(term));
    }

    innermost() {
        return this.ctx2.innermost();
    }

    shift(i, n) {
        return new CompositeCtx(this.ctx1.shift(i, n), this.ctx2.shift(i, n));
    }
}

class EmptyCtx extends EvalCtx {
    constructor() {
        super();
    }

    apply(term) {
        return term;
    }

    shift(i, n) {
        return this;
    }
}

class LetExprCtx extends EvalCtx {
    constructor(body) {
        super();
        this.body = body;
    }

    apply(term) {
        return new ix.Let(term, this.body);
    }

    shift(i, n) {
        return new LetExprCtx(this.body.shift(i + 1, n));
    }
}

class AppFuncCtx extends EvalCtx {
    constructor(arg) {
        super();
        this.arg = arg;
    }

    apply(term) {
        return new ix.App(term, this.arg);
    }

    shift(i, n) {
        return new AppFuncCtx(this.arg.shift(i, n));
    }
}

class AppArgCtx extends EvalCtx {
    constructor(func) {
        super();
        this.func = func;
    }

    apply(term) {
        return new ix.App(this.func, term);
    }

    shift(i, n) {
        return new AppArgCtx(this.func.shift(i, n));
    }
}

function aNormalizeWithCtx(term, ctx) {
    if (term instanceof ix.Abs) {
        return ctx.apply(new ix.Abs(aNormalizeWithCtx(term.body, new EmptyCtx())));
    }
    else if (term instanceof ix.App) {
        let func = term.func;
        let arg  = term.arg;
        if (func instanceof ix.Abs) {
            func = aNormalizeWithCtx(func, new EmptyCtx());
        }
        if (arg instanceof ix.Abs) {
            arg = aNormalizeWithCtx(arg, new EmptyCtx());
        }
        if (func instanceof ix.Val && arg instanceof ix.Val
            && !(ctx instanceof EmptyCtx) && !(ctx.innermost() instanceof LetExprCtx)) {
            return aNormalizeWithCtx(
                new ix.Let(new ix.App(func, arg), ctx.shift(0, 1).apply(new ix.Var(0))),
                new EmptyCtx()
            );
        }
        else if (!(func instanceof ix.Val)) {
            return aNormalizeWithCtx(ctx.apply(aNormalizeWithCtx(func, new AppFuncCtx(arg))), new EmptyCtx());
        }
        else if (!(arg instanceof ix.Val)) {
            return aNormalizeWithCtx(ctx.apply(aNormalizeWithCtx(arg, new AppArgCtx(func))), new EmptyCtx());
        }
        else {
            return ctx.apply(new ix.App(func, arg));
        }
    }
    else if (term instanceof ix.Let) {
        if (!(ctx instanceof EmptyCtx)) {
            return aNormalizeWithCtx(new ix.Let(term.expr, ctx.shift(0, 1).apply(term.body)), new EmptyCtx());
        }
        else {
            return ctx.apply(
                aNormalizeWithCtx(term.expr, new LetExprCtx(aNormalizeWithCtx(term.body, new EmptyCtx())))
            );
        }
    }
    else {
        return ctx.apply(term);
    }
}

function aNormalize(term) {
    return aNormalizeWithCtx(term, new EmptyCtx());
}

// Normalization for the Grass language
function grassNormalize(term) {
    if (term instanceof ix.Var) {
        if (term.index === 0) {
            return term;
        }
        else {
            return new ix.Let(new ix.Abs(new ix.Var(0)), new ix.App(new ix.Var(0), term.shift(0, 1)));
        }
    }
    else if (term instanceof ix.Abs) {
        return new ix.Abs(grassNormalize(term.body));
    }
    else if (term instanceof ix.App) {
        if (term.func instanceof ix.Abs) {
            return new ix.Let(
                grassNormalize(term.func),
                grassNormalize(new ix.App(new ix.Var(0), term.arg.shift(0, 1)))
            );
        }
        else if (term.arg instanceof ix.Abs) {
            return new ix.Let(
                grassNormalize(term.arg),
                grassNormalize(new ix.App(term.func.shift(0, 1), new ix.Var(0)))
            );
        }
        else {
            return term;
        }
    }
    else if (term instanceof ix.Let) {
        if (term.expr instanceof ix.Var) {
            return grassNormalize(term.body.subst(0, term.expr.shift(0, 1)).shift(0, -1));
        }
        else {
            let expr = grassNormalize(term.expr);
            if (expr instanceof ix.Var) {
                return grassNormalize(term.body.subst(0, expr.shift(0, 1)).shift(0, -1));
            }
            else {
                let body = grassNormalize(term.body);
                if (body instanceof ix.Var && body.index === 0) {
                    return expr;
                }
                else {
                    return new ix.Let(expr, body);
                }
            }
        }
    }
    else {
        throw new Error("unexpected term");
    }
}

// lambda lifting
function lambdaLiftWithLevevl(term, toplevel) {
    if (term instanceof ix.Var) {
        return term;
    }
    else if (term instanceof ix.Abs) {
        let body = lambdaLiftWithLevevl(term.body, false);
        if (body instanceof ix.Let && body.expr instanceof ix.Abs) {
            if (body.expr.contains(0)) {
                return new ix.Let(
                    new ix.Abs(body.expr),
                    lambdaLiftWithLevevl(
                        new ix.Abs(new ix.Let(new ix.App(new ix.Var(1), new ix.Var(0)), body.body.shift(2, 1))),
                        false
                    )
                );
            }
            else {
                return new ix.Let(
                    body.expr.shift(0, -1),
                    lambdaLiftWithLevevl(new ix.Abs(body.body.swap(0, 1)), false)
                );
            }
        }
        else {
            return new ix.Abs(body);
        }
    }
    else if (term instanceof ix.App) {
        // Assuming an application has no lambda-abstractions
        return term;
    }
    else if (term instanceof ix.Let) {
        let expr = lambdaLiftWithLevevl(term.expr, toplevel);
        if (expr instanceof ix.Let) {
            return lambdaLiftWithLevevl(new ix.Let(expr.expr, new ix.Let(expr.body, term.body.shift(1, 1))), toplevel);
        }
        else {
            let body = lambdaLiftWithLevevl(term.body, toplevel);
            if (toplevel) {
                return new ix.Let(expr, body);
            }
            else {
                if (body instanceof ix.Let && !(expr instanceof ix.Abs) && body.expr instanceof ix.Abs) {
                    if (body.expr.contains(0)) {
                        return new ix.Let(
                            new ix.Abs(body.expr),
                            lambdaLiftWithLevevl(
                                new ix.Let(
                                    expr.shift(0, 1),
                                    new ix.Let(new ix.App(new ix.Var(1), new ix.Var(0)), body.body.shift(2, 1))
                                ),
                                false
                            )
                        );
                    }
                    else {
                        return new ix.Let(
                            body.expr.shift(0, -1),
                            lambdaLiftWithLevevl(new ix.Let(expr.shift(0, 1), body.body.swap(0, 1)), false)
                        );
                    }
                }
                else if (body instanceof ix.Abs) {
                    return lambdaLiftWithLevevl(
                        new ix.Let(
                            expr,
                            new ix.Let(
                                body,
                                new ix.Let(new ix.Abs(new ix.Var(0)), new ix.App(new ix.Var(0), new ix.Var(1)))
                            )
                        ),
                        false
                    );
                }
                else {
                    return new ix.Let(expr, body);
                }
            }
        }
    }
    else {
        throw new Error("unexpected term");
    }
}

function lambdaLift(term) {
    return lambdaLiftWithLevevl(term, true);
}

// planting
function intPlant(term, chars) {
    if (term instanceof ix.Abs) {
        if (term.body instanceof ix.Var) {
            if (term.body.index === 0) {
                return chars["w"];
            }
            else {
                throw new Error("illegal index: " + term.body.index.toString());
            }
        }
        else {
            return chars["w"] + intPlant(term.body, chars);
        }
    }
    else if (term instanceof ix.App) {
        if (term.func instanceof ix.Var && term.arg instanceof ix.Var) {
            return chars["W"].repeat(term.func.index + 1) + chars["w"].repeat(term.arg.index + 1);
        }
        else {
            throw new Error("illegal form");
        }
    }
    else if (term instanceof ix.Let) {
        if (term.expr instanceof ix.App
            && (term.body instanceof ix.App || (term.body instanceof ix.Let && term.body.expr instanceof ix.App))) {
            return intPlant(term.expr, chars) + intPlant(term.body, chars);
        }
        else {
            return intPlant(term.expr, chars) + chars["v"] + intPlant(term.body, chars);
        }
    }
    else {
        throw new Error("unexpected term");
    }
}

function plant(term, chars) {
    if (term instanceof ix.App || (term instanceof ix.Let && term.expr instanceof ix.App)) {
        return intPlant(new ix.Let(new ix.Abs(new ix.Var(0)), term.shift(0, 1)), chars);
    }
    else {
        return intPlant(term, chars);
    }
}

endModule();
