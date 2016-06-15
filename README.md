# Grasspiler
[Untyped lambda calculus](https://en.wikipedia.org/wiki/Lambda_calculus) to [Grass](http://www.blue.sky.or.jp/grass/) compiler.

Grass is an esoteric language based on the untyped lambda calculus, and its program is written by using only three characters: `w`, `W`, and `v`.

## Install
``` shell
npm i -g @susisu/grasspiler
```

## Usage
``` shell
grasspile <srcfile> -o <outfile>
```
For more information about the CLI, see `grasspile -h`.

### Source language spec
The source language is (of course) based on the untyped lambda calculus, and has a simple ML-like syntax.

The syntax is defined as below (though this is very informal and incomplete):

```
<program> ::= <definition>+
<definition> ::= let <ident>+ = <term>
<term> ::= <ident>                            variable
           <term> <term>                      application
           λ<ident>+. <term>                  lambda abstraction
           let <ident>+ = <term> in <term>    local binding
```

A lambda abstraction can be written in several kinds of notation, and also mixture of them.

``` ml
(* lambda calculus-like *)
let S = λx y z. x z (y z)
(* ML-like *)
let S = fun x y z -> x z (y z)
(* Haskell-like *)
let S = \x y z -> x z (y z)
(* mixture of something *)
let S = fun x y z => x z (y z)
(* Of course you can also write it like this *)
let S x y z = x z (y z)
```

The primitives `Out`, `Succ`, `w` and `In` are exposed to the environment,
and the value defined at the end of the source program is called by the Grass VM with itself as an argument.

### Example
Here is a simple program, which takes a character as input, and output it repeatedly.
``` ml
(* fixed-point operator *)
let fix = fun f ->
    (fun x -> f (fun y -> x x y))
    (fun x -> f (fun y -> x x y))

(* infinite loop *)
let loop = fix (fun loop c ->
    let _ = Out c in
    loop c
)

let main _ = loop (In w)
```

Save this source program as `resonance.ml` (it is not an ML program, though) and compile it with `grasspile`.

``` shell
$ grasspile resonance.ml -o resonance.w
$ cat resonance.w
wwWWwwWwwvwwWWWwWWWwvwWWwWWWwwWwwvwwWWWWWWwWWWwwvWWwvwWWWWWWWWWWwwwwwwwwwWWWw
```

Then you can run the compiled program with a Grass compiler/interpreter (for instance, [Grass-JS](https://github.com/susisu/Grass-JS)).

``` shell
$ grass resonance.w
A
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA...
```

Stop it if you are satisfied.

## License
[MIT License](http://opensource.org/licenses/mit-license.php)

## Author
Susisu ([GitHub](https://github.com/susisu), [Twitter](https://twitter.com/susisu2413))
