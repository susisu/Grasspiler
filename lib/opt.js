/*
 * Grasspiler / opt.js
 * copyright (c) 2016 Susisu
 */

"use strict";

function endModule() {
    module.exports = Object.freeze({
        deleteUnusedDefs,
        deleteDuplicateDefs
    });
}

const utils = require("./utils.js");
const ix    = require("./ixterms.js");

// delete unused definitions
function deleteUnusedDefsWithCtx(term, ctx) {
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
        let body = deleteUnusedDefsWithCtx(term.body, ctx.cons(term.expr));
        if (term.expr instanceof ix.Val && !body.contains(0)) {
            return body.shift(0, -1);
        }
        else {
            return new ix.Let(term.expr, body);
        }
    }
    else {
        throw new Error("unexpected term");
    }
}

function deleteUnusedDefs(term) {
    return deleteUnusedDefsWithCtx(term, utils.List.empty());
}

// delete duplicate definitions
function deleteDuplicateDefsWithCtx(term, ctx) {
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
        let body = deleteDuplicateDefsWithCtx(term.body, ctx.cons(term.expr));
        if (term.expr instanceof ix.Var) {
            return deleteDuplicateDefsWithCtx(body.subst(0, term.expr.shift(0, 1)).shift(0, -1), ctx);
        }
        else if (term.expr instanceof ix.Abs) {
            let n = ctx.findIndexBy((t, i) => term.expr.equals(t.shift(0, i + 1)));
            if (n >= 0) {
                return deleteDuplicateDefsWithCtx(body.subst(0, new ix.Var(n).shift(0, 1)).shift(0, -1), ctx);
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

function deleteDuplicateDefs(term) {
    return deleteDuplicateDefsWithCtx(term, utils.List.empty());
}

endModule();
