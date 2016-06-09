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
    let name = yield tp.identifier;
    return new exprs.Var(name)
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
    yield absHead;
    let args = yield tp.identifier.many1();
    yield absArrow;
    let body = yield term;
    return args.reduceRight((b, a) => new exprs.Abs(a, b), body);
}).label("abstraction");

let app = lq.gen(function * () {
    let func = yield appTerm;
    let args = yield appTerm.many();
    return args.reduce((f, a) => new exprs.App(f, a), func);
});

let letin = lq.gen(function * () {
    yield tp.reserved("let");
    let name = yield tp.identifier;
    yield tp.reservedOp("=");
    let expr = yield term;
    yield tp.reserved("in");
    let body = yield term;
    return new exprs.Let(name, expr, body);
}).label("binding");

let def = lq.gen(function * () {
    yield tp.reserved("let");
    let name = yield tp.identifier;
    let args = yield tp.identifier.many();
    yield tp.reservedOp("=");
    let expr = yield term;
    if (args.length === 0) {
        return new exprs.Def(name, expr);
    }
    else {
        return new exprs.Def(name, args.reduceRight((b, a) => new exprs.Abs(a, b), expr));
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
