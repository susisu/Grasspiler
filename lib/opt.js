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
        return term;
    }
    else if (term instanceof ix.App) {
        return term;
    }
    else if (term instanceof ix.Let) {
        let body = optimizeWithCtx(term.body, ctx.cons(term.expr));
        if (term.expr instanceof ix.Val && !body.contains(0)) {
            return body.shift(0, -1);
        }
        else if (term.expr instanceof ix.Var) {
            return optimizeWithCtx(body.subst(0, term.expr.shift(0, 1)).shift(0, -1), ctx);
        }
        else if (term.expr instanceof ix.Abs) {
            let n = ctx.findIndexBy((t, i) => term.expr.equals(t.shift(0, i + 1)));
            if (n >= 0) {
                return optimizeWithCtx(body.subst(0, new ix.Var(n).shift(0, 1)).shift(0, -1), ctx);
            }
            else {
                return new ix.Let(term.expr, body);
            }
        }
        else {
            return new ix.Let(term.expr, body);
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
