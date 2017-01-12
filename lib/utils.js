/*
 * Grasspiler / utils.js
 * copyright (c) 2016 Susisu
 */

"use strict";

function endModule() {
    module.exports = Object.freeze({
        List
    });
}

class Nil {
    constructor() {
    }

    toString() {
        return "[]";
    }
}

class Cons {
    constructor(car, cdr) {
        this.car = car;
        this.cdr = cdr;
    }

    toString() {
        return `${this.car.toString()} :: ${this.cdr.toString()}`;
    }
}

class List {
    constructor(nilCons) {
        this.list = nilCons;
    }

    static empty() {
        return new List(new Nil());
    }

    static fromArray(arr) {
        let l   = new Nil();
        const len = arr.length;
        for (let i = len - 1; i >= 0; i--) {
            l = new Cons(arr[i], l);
        }
        return new List(l);
    }

    toString() {
        return this.list.toString();
    }

    toArray() {
        let l = this.list;
        const arr = [];
        let i = 0;
        while (!(l instanceof Nil)) {
            arr[i] = l.car;
            l = l.cdr;
            i += 1;
        }
        return arr;
    }

    isEmpty() {
        return this.list instanceof Nil;
    }

    cons(x) {
        return new List(new Cons(x, this.list));
    }

    head() {
        if (this.list instanceof Nil) {
            throw new Error("empty list");
        }
        else {
            return this.list.car;
        }
    }

    tail() {
        if (this.list instanceof Nil) {
            throw new Error("empty list");
        }
        else {
            return new List(this.list.cdr);
        }
    }

    findIndexBy(callback) {
        let l = this.list;
        let i = 0;
        while (!(l instanceof Nil)) {
            if (callback(l.car, i)) {
                return i;
            }
            l = l.cdr;
            i += 1;
        }
        return -1;
    }
}

endModule();
