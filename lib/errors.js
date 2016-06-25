/*
 * Grasspiler / errors.js
 * copyright (c) 2016 Susisu
 */

"use strict";

function endModule() {
    module.exports = Object.freeze({
        CompileError
    });
}

class CompileError extends Error {
    constructor(trace, message) {
        super(message);
        this.trace = trace;
    }

    addTrace(trace) {
        return new CompileError(trace.concat(this.trace), this.message);
    }

    toString() {
        let traceStr = this.trace.map(t => t.toString() + ":\n").join("");
        return traceStr + this.message;
    }
}

endModule();
