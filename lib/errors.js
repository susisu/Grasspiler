/*
 * Grasspiler / errors.js
 * copyright (c) 2016 Susisu
 */

"use strict";

function endModule() {
    module.exports = Object.freeze({
        ParseError,
        CompileError
    });
}

class ParseError extends Error {
    constructor(error) {
        super(error.toString());
        this.name  = this.constructor.name;
        this.error = error;
    }

    get position() {
        return this.error.pos;
    }
}

class CompileError extends Error {
    constructor(trace, message) {
        super(message);
        this.name  = this.constructor.name;
        this.trace = trace;
    }

    addTrace(trace) {
        return new CompileError(trace.concat(this.trace), this.message);
    }

    toString() {
        const traceStr = this.trace.map(t => t.toString() + ":\n").join("");
        return this.name + ": " + traceStr + this.message;
    }
}

endModule();
