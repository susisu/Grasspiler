/*
 * Grasspiler / grasspiler.js
 * copyright (c) 2016 Susisu
 */

"use strict";

function endModule() {
    module.exports = Object.freeze({
        exprs,
        ixterms,
        parser,
        transf,
        opt,
        errors,
        utils
    });
}

const exprs   = require("./exprs.js");
const ixterms = require("./ixterms.js");
const parser  = require("./parser.js");
const transf  = require("./transf.js");
const opt     = require("./opt.js");
const errors  = require("./errors.js");
const utils   = require("./utils.js");

endModule();
