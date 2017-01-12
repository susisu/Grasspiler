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

const lq = require("loquat")();
lq.use(require("loquat-token"));

const exprs = require("./exprs.js");

const langDef = new lq.LanguageDef({
    commentStart  : "(*",
    commentEnd    : "*)",
    nestedComments: true,
    idStart       : lq.letter,
    idLetter      : lq.alphaNum.or(lq.oneOf("_'")),
    opStart       : lq.oneOf(":!#$%&*+./<=>?@\\^|-~λ"),
    opLetter      : lq.oneOf(":!#$%&*+./<=>?@\\^|-~λ"),
    reservedIds   : ["fun", "let", "in"],
    reservedOps   : ["λ", "\\", ".", "=>", "->", "="],
    caseSensitive : true
});
const tp = lq.makeTokenParser(langDef);

const unbound = tp.symbol("_").return(undefined);
const pattern = tp.identifier.or(unbound);

const term = lq.lazy(() => lq.choice([
    app,
    abs,
    letin,
    tp.parens(term)
]));

const appTerm = lq.lazy(() => lq.choice([
    variable,
    tp.parens(term)
]));

const variable = lq.do(function* () {
    const pos  = yield lq.getPosition;
    const name = yield tp.identifier;
    return new exprs.Var(pos, name);
});

const absHead = lq.choice([
    tp.reservedOp("λ"),
    tp.reservedOp("\\"),
    tp.reserved("fun")
]);
const absArrow = lq.choice([
    tp.reservedOp("."),
    tp.reservedOp("->"),
    tp.reservedOp("=>")
]);
const abs = lq.do(function* () {
    const pos = yield lq.getPosition;
    yield absHead;
    const args = yield pattern.many1();
    yield absArrow;
    const body = yield term;
    return args.reduceRight((b, a) => new exprs.Abs(pos, a, b), body);
}).label("abstraction");

const app = lq.do(function* () {
    const func = yield appTerm;
    const args = yield appTerm.many();
    return args.reduce((f, a) => new exprs.App(a.pos, f, a), func);
});

const letin = lq.do(function* () {
    const pos = yield lq.getPosition;
    yield tp.reserved("let");
    const name = yield pattern;
    const args = yield pattern.many();
    yield tp.reservedOp("=");
    const expr = yield term;
    yield tp.reserved("in");
    const body = yield term;
    if (args.length === 0) {
        return new exprs.Let(pos, name, expr, body);
    }
    else {
        return new exprs.Let(pos, name, args.reduceRight((b, a) => new exprs.Abs(pos, a, b), expr), body);
    }
}).label("binding");

const def = lq.do(function* () {
    const pos = yield lq.getPosition;
    yield tp.reserved("let");
    const name = yield pattern;
    const args = yield pattern.many();
    yield tp.reservedOp("=");
    const expr = yield term;
    if (args.length === 0) {
        return new exprs.Def(pos, name, expr);
    }
    else {
        return new exprs.Def(pos, name, args.reduceRight((b, a) => new exprs.Abs(pos, a, b), expr));
    }
}).label("definition");

const prog = lq.do(function* () {
    yield tp.whiteSpace;
    const stmts = yield def.many1();
    yield lq.eof;
    return stmts;
});

function parse(name, src) {
    const res = lq.parse(prog, name, src, undefined, { tabWidth: 8 });
    if (res.success) {
        return res.value;
    }
    else {
        throw res.error;
    }
}

endModule();
