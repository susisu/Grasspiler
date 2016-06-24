/*
 * Grasspiler / opt.js
 * copyright (c) 2016 Susisu
 */

"use strict";

function endModule() {
    module.exports = Object.freeze({
        optimize
    });
}

const utils = require("./utils.js");
const ix    = require("./ixterms.js");

// optimization
function optimizeWithCtx(term, ctx) {
    if (term instanceof ix.Var) {
        return term;
    }
    else if (term instanceof ix.Abs) {
        return new ix.Abs(optimizeWithCtx(term.body, ctx.cons(new ix.Var(0))));
    }
    else if (term instanceof ix.App) {
        return term;
    }
    else if (term instanceof ix.Let) {
        let expr = optimizeWithCtx(term.expr, ctx);
        if (expr instanceof ix.Val && !term.body.contains(0)) {
            return optimizeWithCtx(term.body.shift(0, -1), ctx);
        }
        else if (expr instanceof ix.Var) {
            return optimizeWithCtx(term.body.subst(0, expr.shift(0, 1)).shift(0, -1), ctx);
        }
        else if (expr instanceof ix.Abs) {
            let n = ctx.findIndexBy((term, i) => expr.equals(term.shift(0, i + 1)));
            if (n >= 0) {
                return optimizeWithCtx(term.body.subst(0, new ix.Var(n).shift(0, 1)).shift(0, -1), ctx);
            }
            else {
                return new ix.Let(expr, optimizeWithCtx(term.body, ctx.cons(expr)));
            }
        }
        else {
            return new ix.Let(expr, optimizeWithCtx(term.body, ctx.cons(expr)));
        }
    }
    else {
        throw new Error("unexpected term");
    }
}

function optimize(term) {
    return optimizeWithCtx(term, utils.List.empty());
}

endModule();
