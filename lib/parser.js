/*
 * Grasspiler / parser.js
 * copyright (c) 2016 Susisu
 */

"use strict";

function endModule() {
    module.exports = Object.freeze({
        parse
    });
}

const lq = require("loquat");

const exprs = require("./exprs.js");

let langDef = new lq.LanguageDef(
    "(*",
    "*)",
    "",
    true,
    lq.letter,
    lq.alphaNum.or(lq.oneOf("_'")),
    lq.oneOf(":!#$%&*+./<=>?@\\^|-~λ"),
    lq.oneOf(":!#$%&*+./<=>?@\\^|-~λ"),
    ["fun", "let", "in"],
    ["λ", "\\", ".", "=>", "->", "="],
    true
);
let tp = lq.makeTokenParser(langDef);

let unbound = tp.symbol("_").then(lq.pure(undefined));
let pattern = tp.identifier.or(unbound);

let term = lq.lazy(() => lq.choice([
    app,
    abs,
    letin,
    tp.parens(term)
]));

let appTerm = lq.lazy(() => lq.choice([
    variable,
    tp.parens(term)
]));

let variable = lq.gen(function * () {
    let pos  = yield lq.getPosition;
    let name = yield tp.identifier;
    return new exprs.Var(pos, name)
});

let absHead = lq.choice([
    tp.reservedOp("λ"),
    tp.reservedOp("\\"),
    tp.reserved("fun")
]);
let absArrow = lq.choice([
    tp.reservedOp("."),
    tp.reservedOp("->"),
    tp.reservedOp("=>")
]);
let abs = lq.gen(function * () {
    let pos = yield lq.getPosition;
    yield absHead;
    let args = yield pattern.many1();
    yield absArrow;
    let body = yield term;
    return args.reduceRight((b, a) => new exprs.Abs(pos, a, b), body);
}).label("abstraction");

let app = lq.gen(function * () {
    let func = yield appTerm;
    let args = yield appTerm.many();
    return args.reduce((f, a) => new exprs.App(a.pos, f, a), func);
});

let letin = lq.gen(function * () {
    let pos = yield lq.getPosition;
    yield tp.reserved("let");
    let name = yield pattern;
    yield tp.reservedOp("=");
    let expr = yield term;
    yield tp.reserved("in");
    let body = yield term;
    return new exprs.Let(pos, name, expr, body);
}).label("binding");

let def = lq.gen(function * () {
    let pos = yield lq.getPosition;
    yield tp.reserved("let");
    let name = yield pattern;
    let args = yield pattern.many();
    yield tp.reservedOp("=");
    let expr = yield term;
    if (args.length === 0) {
        return new exprs.Def(pos, name, expr);
    }
    else {
        return new exprs.Def(pos, name, args.reduceRight((b, a) => new exprs.Abs(pos, a, b), expr));
    }
}).label("definition");

let prog = lq.gen(function * () {
    yield tp.whiteSpace;
    let stmts = yield def.many1();
    yield lq.eof;
    return stmts;
});

function parse(name, src) {
    let res = lq.parse(prog, name, src, 8);
    if (res.succeeded) {
        return res.value;
    }
    else {
        throw res.error;
    }
}

endModule();
