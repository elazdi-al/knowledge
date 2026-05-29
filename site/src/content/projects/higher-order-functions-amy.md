---
title: Higher-Order Functions in the Amy Compiler
description: What we added, stage by stage, to let Amy pass functions around as values.
tags: [compilers, amy, higher-order-functions, wasm, c]
created: 2026-05-29
updated: 2026-05-29
---

We extended the Amy compiler so that functions can be used as
**values**: passed as arguments, returned from other functions, and
stored in variables. This is what makes patterns like `map`,
`foldLeft`, and callbacks possible.

```scala
def inc(x: Int(32)): Int(32) := x + 1 end inc

def applyTwice(f: Int(32) => Int(32), x: Int(32)): Int(32) :=
  f(f(x))
end applyTwice

Std.printInt(applyTwice(inc, 3))   // prints 5
```

Here `inc` is handed to `applyTwice` as a value, and inside
`applyTwice` the parameter `f` is called like a normal function.

## The one idea everything rests on

**A function value is just the identity of a named, top-level
function. It carries no data.**

We only allow *named top-level functions* to be values. We do **not**
support anonymous functions (`(x) => x + 1`) or closures (a function
that captures a variable from an enclosing scope).

Why this matters: a top-level function has no surrounding scope, so it
captures nothing. A function value therefore needs to remember only
*which* function it is, not *what variables it closed over*. That lets
every layer of the compiler represent it in the cheapest way it has:

| Layer        | A function value is…                          |
| ------------ | --------------------------------------------- |
| Interpreter  | a symbol (which function)                     |
| C backend    | the C function's name (a function pointer)    |
| WASM backend | a small integer (an index into a table)       |

If we ever wanted closures, we'd need "closure conversion" — bundling
the captured variables into an environment and carrying it with the
function. We deliberately avoided that.

## What we added, stage by stage

A compiler is a pipeline. Each stage needed a small, targeted change.

### Lexer
The arrow `=>` had to be a token in type syntax. It already existed
for `match` cases, so this was mostly making sure the same token is
accepted when reading a type.

### AST (the tree)
We added one new type node:

```scala
case class FunctionType(args: List[Type], ret: Type)
```

It represents types like `Int(32) => Int(32)` and
`(Int(32), Boolean) => String`. There is **no** node for an anonymous
function expression — on purpose.

### Parser
We taught the type grammar to read arrows:

- `Int(32) => Int(32)` → `FunctionType([Int], Int)`
- `(Int(32), Boolean) => String` → `FunctionType([Int, Boolean], String)`

Arrows are right-associative (`A => B => C` means `A => (B => C)`).
A parenthesized list of types is only allowed as the left side of an
arrow, because Amy has no tuples.

Using a function *as a value* needed no new expression syntax: you
just write its name (`inc`) with no parentheses, which already parses
as a plain variable.

### Name analyzer
Three changes:

1. **Translate the new type** so `FunctionType` survives into the
   later stages.
2. **Let a function name be a value.** When resolving a bare name, we
   now look in this order: local variable → parameter → *top-level
   function in this module*. So `inc` on its own resolves to the
   function.
3. **Spot indirect calls.** We did **not** add a new node for "call
   through a variable". Instead we keep one rule that every later
   stage reuses:

> A call `f(...)` is an **indirect call** if `f` is a bound variable
> (a parameter or local). Otherwise it is a direct call to a function
> or constructor.

### Type checker
- A function name used as a value gets the type
  `FunctionType(argTypes, returnType)`, built from its signature.
- A call through a function-typed variable (indirect call) is checked
  against that type: right number of arguments, right argument types,
  right return type.

One detail: function types are compared by exact structure, and the
checker never puts an "unknown" inside a function type. That keeps the
logic simple and is enough for everything we support.

### Interpreter
We added a runtime value:

```scala
case class FunctionValue(sym: Identifier)
```

It stores only the function's symbol. When a function name is used as
a value, the interpreter produces a `FunctionValue`. When that value
is later called, it unwraps the symbol and runs the real function —
with only the passed arguments in scope, never the caller's variables.
That last point is the no-closures rule, enforced at runtime.

## The two backends

The same feature is compiled differently because the two targets
represent values differently.

### C backend — function pointers
- A function type becomes a **C function pointer**, e.g.
  `int32_t (*)(int32_t)`.
- Using a function as a value just emits its C name. In C, a function
  name automatically becomes a pointer, so no extra work is needed.
- Calling through a function value is an ordinary C call:
  `amy_f(arg)`.

The only fiddly part was *printing* the type. C declaration syntax
wraps the name inside the type, so a parameter must print as
`int32_t (*amy_f)(int32_t)`, not the naive `int32_t* amy_f`. We wrote
a small recursive helper to build these declarators correctly, which
also handles functions that *return* a function pointer.

### WASM backend — a function table
WASM can't store a function in memory or call an arbitrary address.
It uses a separate `funcref` **table** plus the `call_indirect`
instruction.

- We put **every** top-level function into the table, in order.
- A function value is the function's **index** in that table — just a
  32-bit integer, which fits WASM's "everything is an i32" model.
- Using a function as a value pushes its index onto the stack.
- Calling through a function value emits `call_indirect`, which looks
  the function up in the table and calls it.

The call is selected by **arity** (number of arguments) only, because
every WASM function here takes i32 arguments and returns an i32. Real
type safety was already guaranteed by the type checker, so the runtime
only needs to match the argument count.

## What is *not* supported

These are the deliberate limits of this version:

- **No anonymous functions.** You must define a named top-level
  function to pass it.
- **No closures.** A function can't capture variables from an
  enclosing scope.
- **No qualified names as values.** `inc` works; `Std.printInt` as a
  value does not parse — you can only reference unqualified names.

Anonymous functions and closures are the natural next step, and they'd
require the closure conversion we skipped.

## End to end, in one picture

For `applyTwice(inc, 3)`:

| Stage         | What happens                                                |
| ------------- | ----------------------------------------------------------- |
| Parser        | `inc` is a plain variable; `applyTwice(...)` is a call       |
| Name analyzer | `inc` resolves to the function; `f(...)` inside is indirect  |
| Type checker  | `inc` has type `Int(32) => Int(32)`; the call type-checks    |
| C output      | `inc` → the C function name; `f(x)` → `amy_f(x)`             |
| WASM output   | `inc` → push its table index; `f(x)` → `call_indirect`      |

> The whole feature comes down to one choice: a function value is an
> identity, not a bundle of data. Everything else is just expressing
> that identity in each target language.
