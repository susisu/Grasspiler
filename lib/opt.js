/*
 * Grasspiler / opt.js
 * copyright (c) 2016 Susisu
 */

"use strict";

function endModule() {
    module.exports = Object.freeze({
        deleteUnusedDefs,
        deleteDuplicateDefs,
        randomPermOptimize
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
        const body = deleteUnusedDefsWithCtx(term.body, ctx.cons(term.expr));
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
        const body = deleteDuplicateDefsWithCtx(term.body, ctx.cons(term.expr));
        if (term.expr instanceof ix.Var) {
            return deleteDuplicateDefsWithCtx(body.subst(0, term.expr.shift(0, 1)).shift(0, -1), ctx);
        }
        else if (term.expr instanceof ix.Abs) {
            const n = ctx.findIndexBy((t, i) => term.expr.equals(t.shift(0, i + 1)));
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

// convert a term to/from a list of terms
function termToList(term) {
    if (term instanceof ix.Abs) {
        return utils.List.empty().cons(term);
    }
    else if (term instanceof ix.App) {
        return utils.List.empty().cons(term);
    }
    else if (term instanceof ix.Let) {
        return termToList(term.body).cons(term.expr);
    }
    else {
        throw new Error("unexpected term");
    }
}

function termFromList(list) {
    if (list.tail().isEmpty()) {
        return list.head();
    }
    else {
        return new ix.Let(list.head(), termFromList(list.tail()));
    }
}

// utilities for dependency
function shiftDep(dep) {
    const newDep = new Map();
    for (const [i, v] of dep.entries()) {
        if (i > 0) {
            newDep.set(i - 1, v);
        }
    }
    return newDep;
}

function mergeDeps(dep1, dep2) {
    const newDep = new Map();
    for (const [i, v] of dep1.entries()) {
        newDep.set(i, v);
    }
    for (const [i, v] of dep2.entries()) {
        if (newDep.has(i)) {
            newDep.set(i, newDep.get(i) + v);
        }
        else {
            newDep.set(i, v);
        }
    }
    return newDep;
}

function addToDep(dep, i, n) {
    if (dep.has(i)) {
        dep.set(i, dep.get(i) + n);
    }
    else {
        dep.set(i, n);
    }
}

// extract dependency information from a term
function getTermDependency(term) {
    if (term instanceof ix.Var) {
        const dep = new Map();
        dep.set(term.index, 1);
        return dep;
    }
    else if (term instanceof ix.Abs) {
        return shiftDep(getTermDependency(term.body));
    }
    else if (term instanceof ix.App) {
        return mergeDeps(getTermDependency(term.func), getTermDependency(term.arg));
    }
    else if (term instanceof ix.Let) {
        return mergeDeps(getTermDependency(term.expr), shiftDep(getTermDependency(term.body)));
    }
    else {
        throw new Error("unexpected term");
    }
}

// extract dependencies from array of terms
function getDependencies(terms) {
    const len        = terms.length;
    const deps       = [];
    const appIndices = [];
    for (let i = 0; i < len; i++) {
        const dep = getTermDependency(terms[i]);
        if (terms[i] instanceof ix.App) {
            for (const j of appIndices) {
                addToDep(dep, i - j - 1, 0);
            }
            appIndices.push(i);
        }
        deps.push(dep);
    }
    if (len > 0) {
        const lastDep = deps[len - 1];
        for (let i = 0; i <= len - 2; i++) {
            addToDep(lastDep, i, 0);
        }
    }
    return deps;
}

// calculate cost of a permutation
function calcCost(perm, deps) {
    let c = 0;
    for (const [i, dep] of deps.entries()) {
        for (const [j, w] of dep.entries()) {
            const k = i - j - 1;
            if (k >= 0) {
                c += (perm[i] - perm[k]) * w;
            }
            else {
                c += (perm[i] - k) * w;
            }
        }
    }
    return c;
}

// index remapping
function liftMap(map) {
    const newMap = new Map();
    for (const [k, v] of map.entries()) {
        newMap.set(k + 1, v + 1);
    }
    return newMap;
}

function mapIndices(map, term) {
    if (term instanceof ix.Var) {
        if (map.has(term.index)) {
            return new ix.Var(map.get(term.index));
        }
        else {
            return term;
        }
    }
    else if (term instanceof ix.Abs) {
        return new ix.Abs(mapIndices(liftMap(map), term.body));
    }
    else if (term instanceof ix.App) {
        return new ix.App(mapIndices(map, term.func), mapIndices(map, term.arg));
    }
    else if (term instanceof ix.Let) {
        return new ix.Let(mapIndices(map, term.expr), mapIndices(liftMap(map), term.body));
    }
    else {
        throw new Error("unexpected term");
    }
}

// apply permutation on terms
function permute(perm, terms, deps) {
    const len       = terms.length;
    const permTerms = [];
    for (let i = 0; i < len; i++) {
        const map = new Map();
        for (const [d] of deps[i].entries()) {
            const k = i - d - 1;
            if (k >= 0) {
                map.set(d, perm[i] - perm[k] - 1);
            }
            else {
                map.set(d, perm[i] - k - 1);
            }
        }
        permTerms[perm[i]] = mapIndices(map, terms[i]);
    }
    return permTerms;
}

// random optimization
function randomPermOptimize(term, numTrials) {
    const terms   = termToList(term).toArray();
    const len     = terms.length;
    if (len <= 1) {
        return term;
    }
    const deps    = getDependencies(terms);
    const perm    = terms.map((_, i) => i);
    let cost    = calcCost(perm, deps);
    let minCost = cost;
    let minPerm = perm.slice();
    trial: for (let t = 0; t < numTrials; t++) {
        // temperature parameter
        const temp = Math.log(numTrials) * (numTrials - 1 - t) / numTrials;
        // choose two terms at random
        let i    = Math.floor(Math.random() * len);
        let j    = Math.floor(Math.random() * (len - 1));
        if (j >= i) {
            j += 1;
        }
        let pi = perm[i];
        let pj = perm[j];
        if (pi > pj) {
            [i, j]   = [j, i];
            [pi, pj] = [pj, pi];
        }
        // retry if swapping is not allowed
        for (let k = 0; k < len; k++) {
            const pk = perm[k];
            if (pi < pk && pk < pj && deps[k].has(k - i - 1)) {
                continue trial;
            }
        }
        for (const [d] of deps[j].entries()) {
            const k = j - d - 1;
            if (pi <= perm[k] && perm[k] < pj) {
                continue trial;
            }
        }
        // try swapping
        [perm[i], perm[j]] = [perm[j], perm[i]];
        const newCost = calcCost(perm, deps);
        if (newCost <= cost || Math.random() < Math.exp(-(newCost - cost) / temp)) {
            cost = newCost;
            if (cost <= minCost) {
                minCost = cost;
                minPerm = perm.slice();
            }
        }
        else {
            [perm[i], perm[j]] = [perm[j], perm[i]];
        }
    }
    return termFromList(utils.List.fromArray(permute(minPerm, terms, deps)));
}

endModule();
