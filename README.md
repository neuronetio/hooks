# @neuronet/hooks

`@neuronet/hooks` is a simple, unified and flexible library for adding hooks, middleware or events to JavaScript and
TypeScript code.

## When to use this library

`@neuronet/hooks` are especially useful when:

- you need to add or change behavior without modifying the original source code (keeping it upgradable).
- you want a plugin-style extension mechanism for libraries or applications.
- you deliver customer-specific solutions that stay separate from, yet ship with, the core code.
- you want to create a dynamic composition of functions that can be modified at runtime without manual recomposition.
- you need observable events or lifecycle hooks inside your code.
- you want granular control and a very flexible way of attaching middleware at different levels (also with dynamic
  conditions).
- you need middlewares that can be attached and detached at runtime.
- you want more `O` from `SOLID` principles
  ([Open/Closed principle](https://en.wikipedia.org/wiki/Open%E2%80%93closed_principle)).
- you need middleware on classes that works with inheritance.
- you want a single, consistent and complete API for injecting behavior into functions, methods, fields, getters,
  setters, and accessors — across public, static, and private members of the class or specific instances.

Basically this library can be used for cross-cutting concerns but in a more flexible manner. For example, it can be used
for (dynamic) dependency injection, validation, testing, logging, caching, memoization, retries, metrics, and other
common tasks. The most useful thing is that you can replace your strategies (or choose different ones based on
configuration) for those tasks without touching the main business logic.

On top of that, `@neuronet/hooks` is very lightweight, well tested, and has no external dependencies.

## Drawbacks (rare, but they can occur)

Like any library, `@neuronet/hooks` also has its drawbacks and compromises. Here are some of them:

- Since middleware is usually defined in a different file than the function it decorates, debugging the code can be more
  difficult (we have useful tools for this, such as `inspectHook`, `getMiddleware`, or `bypassMiddleware`). You can also
  use const variables to store the hook key and name, which makes it easier to find the middleware in the codebase.
  Unfortunately, this does not apply to middleware defined in another project (e.g., in microservices), which means you
  can forget to update some middleware (although this is generally a problem of changes in the public API, and does not
  strictly concern hooks/middleware). This problem can be solved by using API versioning, by requiring peer dependencies
  in `package.json`, or even through solutions like SBOM.
- It can be harder to understand the program flow, especially for new team members (it requires some additional learning
  — fortunately, it doesn't take much time).
- Because dynamic keys are functions (which gives them great flexibility), we must be careful when using them and take
  them into account in tests, since they may sometimes skip some middleware and other times not (which can be both an
  advantage and a disadvantage in some cases). It is best to keep these functions simple and extract complex logic into
  separate functions that can be tested on their own.
- Refactoring might be more difficult.
- The order in which middleware is defined can matter.

Most of these are typical problems that we often encounter as programmers in our work, regardless of whether we use
hooks or not. Some of these problems can be solved through good middleware organization, testing and with the help of
strong class typing (although in some cases it is not available, which is the cost of flexibility).

### If you like it, you can leave a star ⭐ on GitHub. It helps a lot, thanks.

## Table of contents

- [When to use this library](#when-to-use-this-library)
- [Drawbacks (rare, but they can occur)](#drawbacks-rare-but-they-can-occur)
- [Basic concepts](#basic-concepts)
  - [The four main ways to use it](#the-four-main-ways-to-use-it)
    - [1. Quick start: wrap a function](#1-quick-start-wrap-a-function)
    - [2. Quick start: builder-style expressions for classes](#2-quick-start-builder-style-expressions)
    - [3. Quick start: manual decorators](#3-quick-start-manual-decorators)
    - [4. Quick start: ECMA decorators](#4-quick-start-ecma-decorators)
  - [Short-circuiting and the `next` function](#short-circuiting-and-the-next-function)
  - [Middleware execution order / key composition](#middleware-execution-order--key-composition)
  - [Dynamic keys](#dynamic-keys)
- [API](#api)
  - [Function hooks](#function-hooks)
    - [`hook(fn)`](#hookfn)
    - [`hook(key, fn)`](#hookkey-fn)
    - [`hook(key, name, fn)`](#hookkey-name-fn)
    - [`hook(argsProvider, fn)`](#hookargsprovider-fn)
    - [`hook(key, argsProvider, fn)`](#hookkey-argsprovider-fn)
    - [`hook(key, name, argsProvider, fn)`](#hookkey-name-argsprovider-fn)
    - [`hook(name, fn)`](#hookname-fn)
    - [`hook(name, argsProvider, fn)`](#hookname-argsprovider-fn)
  - [Hooks builder](#hooks-for-classes-builder-style)
    - [`Hooks(Class)`](#using-hooksclass-builder)
    - [`method`](#method)
    - [`getter`](#getter)
    - [`setter`](#setter)
    - [`init`](#init)
    - [`accessor`](#accessor)
    - [Sub-hooks in the builder](#sub-hooks-in-the-builder)
  - [ECMA decorators](#ecma-decorators)
    - [`@Hook`](#hook)
    - [`@hook()` on methods](#hook-on-methods)
    - [`@hook()` on getters](#hook-on-getters)
    - [`@hook()` on setters](#hook-on-setters)
    - [`@hook()` on fields](#hook-on-fields)
    - [`@hook()` on accessors](#hook-on-accessors)
    - [Custom names in ECMA decorators](#custom-names-in-ecma-decorators)
    - [Dynamic keys in ECMA decorators](#dynamic-keys-in-ecma-decorators)
    - [Alternative names and dynamic keys together](#alternative-names-and-dynamic-keys-together)
    - [Static methods, fields and accessors](#static-methods-fields-and-accessors)
      - [Static methods](#static-methods)
      - [Static fields](#static-fields)
      - [Static accessors](#static-accessors)
    - [Private members](#private-members)
      - [Private methods](#private-methods)
      - [Private getters](#private-getters)
      - [Private setters](#private-setters)
      - [Private fields](#private-fields)
      - [Private accessors](#private-accessors)
      - [Private static members](#private-static-members)
      - [Security considerations: private members with hooks](#security-considerations-private-members-with-hooks)
    - [Sub-hooks in ECMA decorators](#sub-hooks-in-ecma-decorators)

## Basic concepts

### The four main ways to use it

You can use this library in four simple ways:

1. [Directly with functions (wrapping them)](#1-quick-start-wrap-a-function)
2. [With classes, by using builder style expressions](#2-quick-start-builder-style-expressions)
3. [By manually wrapping class members](#3-quick-start-wrap-a-class-member)
4. [Using ECMA decorators (with TypeScript or Babel as ECMA decorators are not yet ready ¯\_(ツ)_/¯)](#4-quick-start-ecma-decorators)

#### 1. Quick start: wrap a function

```ts
import { hook, attach } from "@neuronet/hooks";

// wrap a function with a hook
const greet = hook((name: string) => `Hello, ${name}\!`);

greet("Ada"); // Hello, Ada

// attach a middleware to the hook
const detach = attach(greet, (next, name) => {
  const result = next(name.toUpperCase());
  return `${result} 👋`;
});

greet("Ada"); // Hello, ADA 👋

// detach the middleware if you need to remove it later
detach();
```

#### 2. Quick start: Builder style expressions

```ts
import { hook, attach } from "@neuronet/hooks";

class MyService {
  greet(name: string) {
    return `Hello, ${name}`;
  }

  static getId() {
    return "MyService";
  }
}

// use hook for methods
Hooks(MyService).for("method greet").for("static method getId");

// attach a middleware to the hook
const detachGreet = attach(MyService, "method greet", (next, name) => {
  return next(name.toUpperCase());
});

const service = new MyService();

// you can define middlewares whenever you want
const detachGetId = attach(MyService, "static method getId", (next) => {
  // next() result is a string
  return next().toUpperCase();
});

service.greet("Ada"); // Hello, ADA
```

#### 3. Quick start: wrap a class member

```ts
import { hook, inherit, attach } from "@neuronet/hooks";

// inherit(this) is needed so that hooks use middleware for classes as well as for specific instances.
// When a class inherits from another, inherit(this) also ensures that middleware from parent classes will be executed.
// It will simply traverse the prototype chain to find any hooks defined in parent classes.
class UserService {
  greet = hook(inherit(this), "method greet", (name: string) => {
    return `Hello, ${name}`;
  });
}

// attach a middleware to the hook
const detach = attach(UserService, "method greet", (next, name) => {
  return next(name.toUpperCase());
});

const service = new UserService();
service.greet("Ada"); // Hello, ADA

// detach the middleware if you need to remove it later
detach();
```

#### 4. Quick start: ECMA decorators

This style is very convenient when you work with classes directly. For ECMA decorators, you usually need TypeScript or
Babel, and the [babel-plugin-proposal-decorators](https://babeljs.io/docs/babel-plugin-proposal-decorators) (it depends
on your environment).

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

@Hook
class UserService {
  @hook()
  greet(name: string) {
    return `Hello, ${name}`;
  }
}

const service = new UserService();

service.greet("Ada"); // Hello, Ada

// attach a middleware to the hook
const detach = attach(service, "greet", (next, name) => {
  return next(name.toUpperCase());
});

service.greet("Ada"); // Hello, ADA

// detach the middleware if you need to remove it later
detach();
```

---

### Short-circuiting and the `next` function

Short-circuiting occurs when a middleware function does not call the `next` function. This prevents the subsequent
middleware in the chain from being executed. It is useful when you want to conditionally stop the execution of the
middleware chain based on certain criteria.

```ts
import { hook, attach } from "@neuronet/hooks";

const greet = hook((name: string) => `Hello, ${name}`);

greet("test"); // Hello, test

attach(greet, (next, name) => {
  return next(name.toUpperCase());
});

greet("test"); // Hello, TEST

attach(greet, (next, name) => {
  // short-circuit by not calling next()
  return name + " short-circuited";
});

greet("test"); // test short-circuited

attach(greet, (next, name) => {
  // this middleware will not be executed because the previous one short-circuited
  return next(name + " should not appear");
});

greet("test"); // test short-circuited
```

---

### Middleware execution order / key composition

By default, middleware runs in the order it was registered (the most recently added middleware runs at the end of the
chain).

You can also use multiple keys in a hook (by using an array). This allows you to trigger middleware from multiple entry
points simultaneously and combine them into a single chain. This is particularly useful in classes where you sometimes
need to run middleware across all instances, and other times only need to attach to a specific instance. Using the
`[instance, Class]` composition, the algorithm first executes all middleware registered on the instance, followed by all
middleware registered on the class — merging them into a single chain.

Composed keys are evaluated in cascade (waterfall) manner: for a composition made of two keys, all middleware registered
on the first key runs first (in their registration order), and then all middleware registered on the second key runs.
Everything is concatenated, so if you modify the argument in a middleware for the first key, it will be passed as input
to the middleware for the second key, or if any middleware for the first key does not call `next()`, the middleware for
the second key will not be executed.

In other words, middleware functions are ordered first by key, and then by registration order within each key, and they
are executed as one big chain.

**Example 1**: single key order

```ts
import { hook, attach } from "@neuronet/hooks";

const oneKey = Symbol("one");
const one = hook(oneKey, (name: string) => name);
attach(oneKey, (next, name) => next(name + " one1")); // one1 added first
attach(oneKey, (next, name) => next(name + " one2")); // one2 added second
one("test"); // test one1 one2
```

**Example 2**: composite key order

```ts
import { hook, attach } from "@neuronet/hooks";

const key1 = Symbol("key1");
const key2 = Symbol("key2");
const composite = hook([key1, key2], (name: string) => name);
attach(key2, (next, name) => next(name + " key2")); // key2 added first
attach(key1, (next, name) => next(name + " key1")); // key1 added second, but runs first because it's the first key in the composition
composite("test"); // test key1 key2
```

**Example 3**: multiple middleware

```ts
import { hook, attach } from "@neuronet/hooks";

const key1 = Symbol("key1");
const key2 = Symbol("key2");
const key3 = Symbol("key3");
const composite = hook([key1, key2, key3], (name: string) => name);

attach(key1, (next, name) => next(name + "  key1_1"));
attach(key2, (next, name) => next(name + "  key2_1"));
attach(key1, (next, name) => next(name + "  key1_2"));
composite("test"); // test  key1_1  key1_2  key2_1

attach(key3, (next, name) => next(name + "  key3_1"));
composite("test"); // test  key1_1  key1_2  key2_1  key3_1

attach(key2, (next, name) => next(name + "  key2_2"));
composite("test"); // test  key1_1  key1_2  key2_1  key2_2  key3_1
```

**Example 4**: class / instance middleware

```ts
import { hook, attach } from "@neuronet/hooks";

class Service {
  // by using two entry levels we can attach middleware to the class (which affects all instances) or to a specific instance
  // PS: This is only demonstration, in your actual code you should use `inherit(this)` instead of `[this, this.constructor]`
  greet = hook([this, this.constructor], "greet", (name: string) => name);
}

attach(Service, "greet", (next, name) => next(name + " class")); // affects all instances (class-level)

const service1 = new Service();
service1.greet("test"); // test class

const service2 = new Service();
attach(service2, "greet", (next, name) => next(name + " instance")); // affects only service2 instance (attached to instance)

service2.greet("test"); // test instance class

// service 1 should not be affected by service2 middleware
service1.greet("test"); // test class
```

**Example 5**: composition short-circuiting

```ts
import { hook, attach } from "@neuronet/hooks";

const key1 = Symbol("key1");
const key2 = Symbol("key2");
const composite = hook([key1, key2], (name: string) => name);

attach(key1, (next, name) => next(name + " key1"));
attach(key2, (next, name) => next(name + " key2"));

composite("test"); // test key1 key2

attach(key1, (next, name) => `${name} short-circuited`);
composite("test"); // test key1 short-circuited
// (without key2 middleware because the next function was not called)
```

**Example 6**: class / instance composition short-circuiting

```ts
import { hook, attach } from "@neuronet/hooks";

class Service {
  // by using two entry levels we can attach middleware to the class (which affects all instances) or to a specific instance
  greet = hook([this, this.constructor], "greet", (name: string) => name);
}

// attach middleware to the class (affects all instances)
attach(Service, "greet", (next, name) => next(name + " class")); // affects all instances

const service = new Service();

// attach middleware to the instance (affects only this instance)
attach(service, "greet", (next, name) => {
  // prevent further execution of the chain (short-circuit) by not calling next()
  return name + " instance";
});

service.greet("test"); // test instance (without "class" which is after the instance)

// because we attached the middleware to concrete instance, other instances are not affected
const service2 = new Service();
service2.greet("test"); // test class

// This way we can add instance-specific behavior without affecting other instances or the class itself.
```

---

### Dynamic keys

Dynamic keys (`dynamicHookKey` or the shorter `dhk` alias) are a powerful feature that allows you to resolve the hook
key at runtime. Dynamic keys are more flexible and can be used in places where your code is more dynamic. For example,
you can use dynamic keys if your class is injected dynamically into a parent class and you want to attach middleware at
a higher level, or when you want to use different pipeline behavior based on runtime conditions. This is also useful
because you can dynamically decide which middleware to use based on certain conditions **without unregistering them**;
they remain registered, and you decide when and which ones to use. Basically, dynamic keys allow you to choose which
middleware to run at runtime. This gives you control from both sides — from within a hook or from the middleware itself.

**Example**: dynamic pipeline selection

```ts
import { hook, attach, dynamicHookKey } from "@neuronet/hooks";

// different set of behavior
const pipeline1 = Symbol("pipeline1");
const pipeline2 = Symbol("pipeline2");

// middleware can be created in advance
attach(pipeline1, (next, name) => next(name + ":pipeline1"));
attach(pipeline2, (next, name) => next(name + ":pipeline2"));

let usePipeline = 1;

// resolve the key at runtime
const myDynamicKey = dynamicHookKey(() => {
  if (usePipeline === 1) {
    return pipeline1;
  }
  return pipeline2;
});

const greet = hook(myDynamicKey, (name: string) => `Hello, ${name}`);

greet("Ada"); // Hello, Ada:pipeline1

usePipeline = 2; // configuration changed

greet("Ada"); // Hello, Ada:pipeline2
```

**Example**: Log only connected instances

```ts
import { hook, attach, dhk } from "@neuronet/hooks";

// dhk = dynamicHookKey alias

class Child {
  #parent: Parent | null = null;

  greet = hook(
    // use dynamic hook key
    // because declaring a function in a class using the equals sign `=` causes
    // the function to be created in the context of the instance (like inside a constructor),
    // we can use `this` to refer to the current instance of the Child class
    // also because we are inside a class, we can use `this.#parent` to access the private property
    dhk(() => {
      // if we have a parent...
      if (this.#parent) {
        // we will use parent middleware also

        // `this.#parent` to use parent instance-specific middleware
        // `this.#parent.constructor` to use parent middleware for all Parent instances
        // `this` to use child instance-specific middleware
        // `this.constructor` to use child middleware for all Child instances
        // PS this is only example in real world you should use `[...inherit(this.#parent), ...inherit(this)]`
        return [this.#parent, this.#parent.constructor, this, this.constructor];
      }
      // PS this is only example in real world you should use `return inherit(this)`
      return [this, this.constructor];
    }),

    // use custom name for the hook (optionally — you can omit this line or provide a different name)
    "child_greet",

    // method body
    (name: string) => {
      const result = `Hello, ${name}`;
      console.log(result);
      return result;
    },
  );

  setParent(parent: Parent) {
    this.#parent = parent;
  }
}

class Parent {
  injected: Child[] = [];

  inject(child: Child) {
    child.setParent(this);
    this.injected.push(child);
  }
}

function log(next: (name: string) => string, level: string, name: string) {
  console.log(`[LOG] ${level} middleware called with name: ${name}`);
  const result = next(name);
  console.log(`[LOG] ${level} middleware returned: ${result}`);
  return result;
}

const parent = new Parent();

// attach middleware to concrete parent instance which will log operations from injected children
attach(parent, "child_greet", (next, name) => log(next, "parent_instance", name));

const child = new Child();
child.greet("Alice");
// Hello, Alice (child is not injected = not affected by parent middleware)

parent.inject(child); // now child will use parent middleware

child.greet("Alice");
// [LOG] parent_instance middleware called with name: Alice
// Hello, Alice
// [LOG] parent_instance middleware returned: Hello, Alice
```

**Example**: dynamic key with key on parent class (direct)

```ts
import { hook, attach, dhk } from "@neuronet/hooks";

class Child {
  parent: Parent | null = null;

  greet = hook(
    // because declaring a function in a class using the equals sign `=` causes
    // the function to be created in the context of the instance (like inside a constructor),
    // we can use `this` to refer to the current instance of the Child class
    dhk(() => {
      if (this.parent) {
        // or `[...inherit(this.parent), ...inherit(this)]` which is the recommended approach in real world scenarios
        return [this.parent, this.parent.constructor, this, this.constructor];
      }
      // or `return inherit(this)` which is the recommended approach in real world scenarios
      return [this, Child];
    }),
    "greet",
    (name: string) => `Hello, ${name}`,
  );
}

class Parent {
  injected: Child | null = null;

  inject(child: Child) {
    this.injected = child;
    child.parent = this;
  }
}

const child = new Child();
const parent = new Parent();

child.greet("John"); // "Hello, John"

// attach middleware to concrete parent instance
attach(parent, "greet", (next, name) => next(name.toUpperCase().split("").join("-")));
// or Parent class to affect all Parent instances and all connected children
// attach(Parent, "greet", (next, name) => next(name + " [parent_class]"));

child.greet("John"); // "Hello, John" - not injected = not affected by parent middleware

parent.inject(child);

child.greet("John"); // "Hello, J-O-H-N" - injected = affected
```

---

## API

### Function hooks

A hook wraps a function and gives you a place to run extra logic before, after, or around the original call.

The basic idea is simple:

- you create a hooked function,
- you attach one or more middlewares,
- each middleware can call `next()` to continue the chain (or not call it to short-circuit the chain),
- the middleware can also change arguments or the final result.

#### `hook(fn)`

Wraps a function using its own function object as the hook key.

```ts
import { hook, attach } from "@neuronet/hooks";

const greet = hook((name: string) => `Hello, ${name}`);
attach(greet, (next, name) => next(name.toUpperCase()));

greet("Ada"); // Hello, ADA
```

#### `hook(key, fn)`

Uses an explicit hook key.

```ts
import { hook, attach } from "@neuronet/hooks";

const key = Symbol("greet");
const greet = hook(key, (name: string) => `Hello, ${name}`);

attach(key, (next, name) => next(name.toUpperCase()));
greet("Ada"); // Hello, ADA
```

#### `hook(key, name, fn)`

Uses an explicit key and a custom hook name. Thanks to the additional name, a single key can be used for many different
hooks. This is used, among other things, in classes.

```ts
import { hook, attach } from "@neuronet/hooks";

const key = Symbol("anyKey");
const greet = hook(key, "customName", (name: string) => `Hello, ${name}`);

attach(key, "customName", (next, name) => next(name.toUpperCase()));
greet("Ada"); // Hello, ADA
```

In most cases, the hook name should be unique within a given key. If there are multiple hooks with the same key and
name, they will run the same middleware (which may be intended).

```ts
import { hook, attach } from "@neuronet/hooks";

const key = Symbol("myKey");

const greet1 = hook(key, "greet", (name: string) => `Hello, ${name}`);
const greet2 = hook(key, "greet", (name: string) => `Hi, ${name}`);

attach(key, "greet", (next, name) => next(name.toUpperCase()));

greet1("John"); // Hello, JOHN
greet2("John"); // Hi, JOHN
```

#### `hook(argsProvider, fn)`

Provides hardcoded arguments for the wrapped function via an `argsProvider`. The wrapped function will no longer accept
arbitrary arguments at call time. This allows us to inject arguments into the middleware (from the very top), rather
than only before the original function is called (from the bottom). You can simply think of it as injecting arguments
into the middleware. This is useful for composition and for creating predefined functions.

```ts
import { hook, argsProvider } from "@neuronet/hooks";

function originalGreet(name: string) {
  return `Hello, ${name}`;
}

const greet = hook(argsProvider(["Ada"]), originalGreet);

// name is declared inside the middleware
attach(greet, (next, name) => next(name.toUpperCase()));

greet(); // Hello, ADA
```

Without injected arguments, the middleware would not have access to the `name` value in this case.

```ts
import { hook } from "@neuronet/hooks";

function originalGreet(name: string) {
  return `Hello, ${name}`;
}

const greetAda = () => greet("Ada");

const greet = hook(greetAda);

// name isn't declared inside the middleware
attach(greet, (next) => {
  // there is no "name" here because of `greetAda` having no arguments, so we can't do anything with it
  return next();
});

greet(); // Hello, Ada
```

`argsProvider` can also accept a function that returns an array of arguments. For example:

```ts
import { hook, argsProvider } from "@neuronet/hooks";

function originalGreet(name: string) {
  return `Hello, ${name}`;
}

const greet = hook(
  argsProvider(() => ["Ada"]), // arguments can be dynamically generated at runtime
  originalGreet,
);

attach(greet, (next, name) => next(name.toUpperCase()));

greet(); // Hello, ADA
```

There is also a shorter alias for `argsProvider` which is called `args`.

```ts
import { hook, args } from "@neuronet/hooks";

function originalGreet(name: string) {
  return `Hello, ${name}`;
}

const greet = hook(args(["Ada"]), originalGreet);

attach(greet, (next, name) => next(name.toUpperCase()));

greet(); // Hello, ADA
```

#### `hook(key, argsProvider, fn)`

Uses a custom key and hardcoded arguments (injected into the middleware — look above).

```ts
import { hook, attach, argsProvider } from "@neuronet/hooks";

const key = Symbol("greet");
const greet = hook(key, argsProvider(["Ada"]), (name: string) => `Hello, ${name}`);

attach(key, (next, name) => next(name.toUpperCase()));
greet(); // Hello, ADA
```

#### `hook(key, name, argsProvider, fn)`

The most explicit form: custom key, custom name, and hardcoded arguments (injected into the middleware — see
[`hook(argsProvider, fn)`](#hookargsprovider-fn)).

```ts
import { hook, attach, argsProvider } from "@neuronet/hooks";

const key = Symbol("greet");
const greet = hook(key, "custom", argsProvider(["Ada"]), (name: string) => `Hello, ${name}`);

attach(key, "custom", (next, name) => next(name.toUpperCase()));
greet(); // Hello, ADA
```

#### `hook(name, fn)`

This overload can only be used inside another hook (hook inside hook). In that case it creates a sub-hook and inherits
the hook key from the parent hook context. If there is no parent hook context, it throws an error.

```ts
import { hook, attach } from "@neuronet/hooks";

const parentKey = Symbol("parent");
const parent = hook(parentKey, "parent", () => {
  const child = hook("child", (value: string) => `Child: ${value}`);
  return child("ok");
});

attach(parentKey, "parent", (next) => next());
attach(parentKey, "child", (next, value) => next(value.toUpperCase()));

parent(); // Child: OK
```

#### `hook(name, argsProvider, fn)`

Same situation as the previous overload, but with hardcoded arguments.

```ts
import { hook, attach, argsProvider } from "@neuronet/hooks";

const parentKey = Symbol("parent");
const parent = hook(parentKey, "parent", () => {
  const child = hook("child", argsProvider(["ok"]), (value: string) => `Child: ${value}`);
  return child();
});

attach(parentKey, "parent", (next) => next());
attach(parentKey, "child", (next, value) => next(value.toUpperCase()));

parent(); // Child: OK
```

---

### Hooks for classes (builder-style)

Hooks builder is useful when you want to decorate an already defined class without using the standard decorator syntax.
The `Hooks(Class)` builder exposes a fluent API for enabling hooks on several members at once.

Note: builder methods accept a property name, an optional alternative hook name (string), or a dynamic key resolver
created with `dynamicHookKey(...)`. You can also pass both a dynamic key and an alternative name when needed.

##### method

- `for("method <property>")` — enable hooks for a class method where `<property>` is the method name.
- `for("method <property>", alternativeName)` — use `alternativeName` as the hook name.
- `for("method <property>", dynamicKey)` — resolve hook key at runtime using `dynamicHookKey`.
- `for("method <property>", alternativeName, dynamicKey)` — combine alternative name and dynamic key.

##### static method

- `for("static method <property>")` — enable hooks for a static method where `<property>` is the method name.
- `for("static method <property>", alternativeName)` — use `alternativeName` as the hook name.
- `for("static method <property>", dynamicKey)` — resolve hook key at runtime using `dynamicHookKey`.
- `for("static method <property>", alternativeName, dynamicKey)` — combine alternative name and dynamic key.

###### Simple method

```ts
import { Hooks, attach } from "@neuronet/hooks";

class MyService {
  myMethod(x: string) {
    return x + ":orig";
  }

  static myStaticMethod(x: string) {
    return x + ":orig_static";
  }
}

// enable hooks for the method `myMethod` and `myStaticMethod`
Hooks(MyService).for("method myMethod").for("static method myStaticMethod");

// attach middleware to the hook
attach(MyService, "method myMethod", (next, x) => next(x + ":mid"));
attach(MyService, "static method myStaticMethod", (next, x) => next(x + ":static_mid"));

const service = new MyService();
service.myMethod("test"); // "test:mid:orig"
MyService.myStaticMethod("test"); // "test:static_mid:orig_static"
```

###### Alternative name for methods

If you don't want to use the original method name, or if for some reason a different, more descriptive hook name would
be better (e.g., when you have a hierarchy of dynamically attached classes), you can use your own hook name. In this
case, the original method name will not be used to invoke the hook; instead, the provided alternative name will be used.

When using TypeScript and you want to use an alternative name, you must disable type checking for these methods, because
TypeScript will try to find a method with that name in the class. To do this, use an exclamation mark `!` before the
method name in the `attach` function.

```ts
import { Hooks, attach } from "@neuronet/hooks";

class MyService {
  myMethod(x: string) {
    return x + ":orig";
  }

  static myStaticMethod(x: string) {
    return x + ":orig_static";
  }
}

// enable hooks for the method `myMethod` and use `myMethodAlt` as the hook name
Hooks(MyService).for("method myMethod", "myMethodAlt").for("static method myStaticMethod", "myStaticMethodAlt");

// attach middleware to the alternative hook name
// because typescript will try to find method `myMethodAlt` and `myStaticMethodAlt` on the class,
// we need to use exclamation mark to turn off type checking here
attach(MyService, "!method myMethodAlt", (next, x) => next(x + ":alt"));
attach(MyService, "!static method myStaticMethodAlt", (next, x) => next(x + ":alt_static"));

const service = new MyService();

// the original method name is still used to call the method,
// but the middleware is attached to the alternative name
service.myMethod("test"); // "test:alt:orig"
MyService.myStaticMethod("test"); // "test:alt_static:orig_static"
```

###### Dynamic key

See [Dynamic keys](#dynamic-keys) for more information.

```ts
import { Hooks, attach, dynamicHookKey } from "@neuronet/hooks";

const key1 = Symbol("myKey1");
const key2 = Symbol("myKey2");

class MyService {
  myMethod(x: string) {
    return x + ":orig";
  }

  static myStaticMethod(x: string) {
    return x + ":orig_static";
  }
}

let useMiddleware = 1;

const myDynamicKey = dynamicHookKey(() => {
  if (useMiddleware === 1) {
    return key1;
  } else {
    return key2;
  }
});

Hooks(MyService).for("method myMethod", myDynamicKey).for("static method myStaticMethod", myDynamicKey);

// middleware for key1
attach(key1, "method myMethod", (next, x) => next(x + ":mid_1"));
attach(key1, "static method myStaticMethod", (next, x) => next(x + ":mid_static_1"));

// middleware for key2
attach(key2, "method myMethod", (next, x) => next(x + ":mid_2"));
attach(key2, "static method myStaticMethod", (next, x) => next(x + ":mid_static_2"));

const service = new MyService();

// useMiddleware is set to 1, so the middleware attached to key1 will be executed

service.myMethod("test"); // "test:mid_1:orig"
MyService.myStaticMethod("test"); // "test:mid_static_1:orig_static"

useMiddleware = 2;
// now dynamic hook key will resolve to key2, so the middleware attached to key2 will be executed

service.myMethod("test"); // "test:mid_2:orig"
MyService.myStaticMethod("test"); // "test:mid_static_2:orig_static"
```

###### Dynamic key + alternative name

```ts
import { Hooks, attach, dynamicHookKey } from "@neuronet/hooks";

class MyService {
  myMethod(x: string) {
    return x + ":orig";
  }

  static myStaticMethod(x: string) {
    return x + ":orig_static";
  }
}

const key1 = Symbol("k1");
const key2 = Symbol("k2");

let useMiddleware = 1;

const myDynamicKey = dynamicHookKey(function () {
  if (useMiddleware === 1) {
    return key1;
  } else {
    return key2;
  }
});

// enable hooks for the methods and use alternative names for the hooks,
// while also resolving the key dynamically
Hooks(MyService)
  .for("method myMethod", "myMethodAlt", myDynamicKey)
  .for("static method myStaticMethod", "myStaticMethodAlt", myDynamicKey);

// or
// Hooks(MyService)
//   .for("method myMethod", myDynamicKey, "myMethodAlt")
//   .for("static method myStaticMethod", myDynamicKey, "myStaticMethodAlt");

// attach middleware
attach(key1, "!method myMethodAlt", (next, x) => next(x + ":mid_1"));
attach(key1, "!static method myStaticMethodAlt", (next, x) => next(x + ":mid_static_1"));

attach(key2, "!method myMethodAlt", (next, x) => next(x + ":mid_2"));
attach(key2, "!static method myStaticMethodAlt", (next, x) => next(x + ":mid_static_2"));

const service = new Service();

// useMiddleware is set to 1, so the middleware attached to key1 will be executed

service.myMethod("test"); // "test:mid_1:orig"
MyService.myStaticMethod("test"); // "test:mid_static_1:orig_static"

useMiddleware = 2;
// now dynamic hook key will resolve to key2, so the middleware attached to key2 will be executed

service.myMethod("test"); // "test:mid_2:orig"
MyService.myStaticMethod("test"); // "test:mid_static_2:orig_static"
```

##### getter

In `@neuronet/hooks` you can also add middleware to getters. The syntax is similar to methods, but you use `get` instead
of `method`.

- `for("get <property>")` — enable `get <property>` hook for getters using the member name.
- `for("get <property>", alternativeName)` — use `alternativeName` as the public `get` hook name.
- `for("get <property>", dynamicKey)` — resolve key dynamically.
- `for("get <property>", alternativeName, dynamicKey)` — combine alternative name and dynamic key.

##### static getter

- `for("static get <property>")` — enable `static get <property>` hook for getters using the member name.
- `for("static get <property>", alternativeName)` — use `alternativeName` as the public `get` hook name.
- `for("static get <property>", dynamicKey)` — resolve key dynamically.
- `for("static get <property>", alternativeName, dynamicKey)` — combine alternative name and dynamic key.

###### Simple getter

```ts
import { Hooks, attach } from "@neuronet/hooks";

class MyService {
  get value() {
    return 1;
  }

  static get staticValue() {
    return 1;
  }
}

// enable hooks for the getter `value` and `staticValue`
Hooks(MyService).for("get value").for("static get staticValue");

// attach middleware to the hooks
attach(MyService, "get value", (next) => next() + 1);
attach(MyService, "static get staticValue", (next) => next() + 1);

const service = new MyService();

service.value; // 2
service.value = 5;
service.value; // 6

MyService.staticValue; // 2
MyService.staticValue = 5;
MyService.staticValue; // 6
```

###### Alternative name for getters

Same as [Alternative name for methods](#alternative-name-for-methods) but for getters.

```ts
import { Hooks, attach } from "@neuronet/hooks";

class MyService {
  get value() {
    return 1;
  }

  static get staticValue() {
    return 1;
  }
}

Hooks(MyService).for("get value", "valueAlt").for("static get staticValue", "staticValueAlt");

// because typescript will try to find getter `valueAlt` and `staticValueAlt` on the class,
// we need to use exclamation mark to turn off type checking here
attach(MyService, "!get valueAlt", (next) => next() + 1);
attach(MyService, "!static get staticValueAlt", (next) => next() + 1);

const service = new MyService();

service.value; // 2
service.value = 5;
service.value; // 6

MyService.staticValue; // 2
MyService.staticValue = 5;
MyService.staticValue; // 6
```

###### Dynamic key

```ts
import { Hooks, attach, dynamicHookKey } from "@neuronet/hooks";

const key = Symbol("gk");

class MyService {
  get value() {
    return 1;
  }
  static get staticValue() {
    return 1;
  }
}

const key1 = Symbol("key1");
const key2 = Symbol("key2");

let useMiddleware = 1;

const myDynamicKey = dynamicHookKey(() => {
  if (useMiddleware === 1) {
    return key1;
  } else {
    return key2;
  }
});

// enable hooks for the getter `value` and `staticValue` with dynamic key
Hooks(MyService).for("get value", myDynamicKey).for("static get staticValue", myDynamicKey);

// attach middleware to the hooks
attach(key1, "get value", (next) => next() + 1);
attach(key1, "static get staticValue", (next) => next() + 1);

attach(key2, "get value", (next) => next() + 2);
attach(key2, "static get staticValue", (next) => next() + 2);

const service = new MyService();

// useMiddleware is set to 1, so the middleware attached to key1 will be executed

service.value; // 2
service.value = 5;
service.value; // 6

MyService.staticValue; // 2
MyService.staticValue = 5;
MyService.staticValue; // 6

useMiddleware = 2;
// now dynamic hook key will resolve to key2, so the middleware attached to key2 will be executed

service.value; // 3
service.value = 5;
service.value; // 7

MyService.staticValue; // 3
MyService.staticValue = 5;
MyService.staticValue; // 7
```

###### Dynamic key + alternative name

```ts
import { Hooks, attach, dynamicHookKey } from "@neuronet/hooks";

class MyService {
  get value() {
    return 1;
  }

  static get staticValue() {
    return 1;
  }
}

const key1 = Symbol("key1");
const key2 = Symbol("key2");

let useMiddleware = 1;

const myDynamicKey = dynamicHookKey(() => {
  if (useMiddleware === 1) {
    return key1;
  } else {
    return key2;
  }
});

// enable hooks for the getter `value` and use `valueAlt` as the hook name, while also resolving the key dynamically
Hooks(MyService)
  .for("get value", "valueAlt", myDynamicKey)
  .for("static get staticValue", "staticValueAlt", myDynamicKey);

// or
// Hooks(MyService)
//   .for("get value", myDynamicKey, "valueAlt")
//   .for("static get staticValue", myDynamicKey, "staticValueAlt");

// attach middleware
// because typescript will try to find getter `valueAlt` and `staticValueAlt` on the class,
// we need to use exclamation mark to turn off type checking here
attach(key1, "!get valueAlt", (next) => next() + 1);
attach(key1, "!static get staticValueAlt", (next) => next() + 1);

attach(key2, "!get valueAlt", (next) => next() + 2);
attach(key2, "!static get staticValueAlt", (next) => next() + 2);

const service = new MyService();

// useMiddleware is set to 1, so the middleware attached to key1 will be executed

service.value; // 2
service.value = 5;
service.value; // 6

MyService.staticValue; // 2
MyService.staticValue = 5;
MyService.staticValue; // 6

useMiddleware = 2;
// now dynamic hook key will resolve to key2, so the middleware attached to key2 will be executed

service.value; // 3
service.value = 5;
service.value; // 7

MyService.staticValue; // 3
MyService.staticValue = 5;
MyService.staticValue; // 7
```

##### setter

In `@neuronet/hooks` you can also add middleware to setters. The syntax is similar to methods, but you use `set` instead
of `method`.

- `for("set <property>")` — enable `set <property>` hook for setters using the member name.
- `for("set <property>", alternativeName)` — use `alternativeName` as the public `set` hook name.
- `for("set <property>", dynamicKey)` — resolve key dynamically.
- `for("set <property>", alternativeName, dynamicKey)` — combine alternative name and dynamic key.

##### static setter

- `for("static set <property>")` — enable `static set <property>` hook for setters using the member name.
- `for("static set <property>", alternativeName)` — use `alternativeName` as the public `set` hook name.
- `for("static set <property>", dynamicKey)` — resolve key dynamically.
- `for("static set <property>", alternativeName, dynamicKey)` — combine alternative name and dynamic key.

###### Simple setter

```ts
import { Hooks, attach } from "@neuronet/hooks";

class MyService {
  #val = 1;

  get value() {
    return this.#val;
  }

  set value(v: number) {
    this.#val = v;
  }

  static #valStatic = 1;

  static get staticValue() {
    return this.#valStatic;
  }

  static set staticValue(v: number) {
    this.#valStatic = v;
  }
}

// enable hooks for the setter `value` and `staticValue`
Hooks(MyService).for("set value").for("static set staticValue");

// attach middleware to the hooks
attach(MyService, "set value", (next, v) => next(v + 1));
attach(MyService, "static set staticValue", (next, v) => next(v + 1));

const service = new MyService();

service.value; // 1
service.value = 2; // middleware adds 1, so value becomes 3
service.value; // 3

MyService.staticValue; // 1
MyService.staticValue = 2; // middleware adds 1, so staticValue becomes 3
MyService.staticValue; // 3
```

###### Alternative name for setters

Same as [Alternative name for methods](#alternative-name-for-methods) but for setters.

```ts
import { Hooks, attach } from "@neuronet/hooks";

class MyService {
  #val = 1;

  get value() {
    return this.#val;
  }

  set value(v: number) {
    this.#val = v;
  }

  static #valStatic = 1;

  static get staticValue() {
    return this.#valStatic;
  }

  static set staticValue(v: number) {
    this.#valStatic = v;
  }
}

Hooks(MyService).for("set value", "valueAlt").for("static set staticValue", "staticValueAlt");

// because typescript will try to find setter `valueAlt` and `staticValueAlt` on the class,
// we need to use exclamation mark to turn off type checking here
attach(MyService, "!set valueAlt", (next, v) => next(v + 1));
attach(MyService, "!static set staticValueAlt", (next, v) => next(v + 1));

const service = new MyService();

service.value; // 1
service.value = 2; // middleware adds 1, so value becomes 3
service.value; // 3

MyService.staticValue; // 1
MyService.staticValue = 2; // middleware adds 1, so staticValue becomes 3
MyService.staticValue; // 3
```

###### Dynamic key

```ts
import { Hooks, attach, dynamicHookKey } from "@neuronet/hooks";

class MyService {
  #val = 1;

  get value() {
    return this.#val;
  }

  set value(v: number) {
    this.#val = v;
  }

  static #valStatic = 1;

  static get staticValue() {
    return this.#valStatic;
  }

  static set staticValue(v: number) {
    this.#valStatic = v;
  }
}

const key1 = Symbol("key1");
const key2 = Symbol("key2");

let useMiddleware = 1;

const myDynamicKey = dynamicHookKey(() => {
  if (useMiddleware === 1) {
    return key1;
  } else {
    return key2;
  }
});

// enable hooks for the setter `value` and `staticValue` with dynamic key
Hooks(MyService).for("set value", myDynamicKey).for("static set staticValue", myDynamicKey);

// attach middleware to the hooks
attach(key1, "set value", (next, v) => next(v + 1));
attach(key1, "static set staticValue", (next, v) => next(v + 1));

attach(key2, "set value", (next, v) => next(v + 2));
attach(key2, "static set staticValue", (next, v) => next(v + 2));

const service = new MyService();

// useMiddleware is set to 1, so the middleware attached to key1 will be executed

service.value; // 1
service.value = 2; // middleware adds 1, so value becomes 3
service.value; // 3

MyService.staticValue; // 1
MyService.staticValue = 2; // middleware adds 1, so staticValue becomes 3
MyService.staticValue; // 3

useMiddleware = 2;
// now dynamic hook key will resolve to key2, so the middleware attached to key2 will be executed

service.value; // 1
service.value = 2; // middleware adds 2, so value becomes 4
service.value; // 4

MyService.staticValue; // 1
MyService.staticValue = 2; // middleware adds 2, so staticValue becomes 4
MyService.staticValue; // 4
```

###### Dynamic key + alternative name

```ts
import { Hooks, attach, dynamicHookKey } from "@neuronet/hooks";

class MyService {
  #val = 1;

  get value() {
    return this.#val;
  }

  set value(v: number) {
    this.#val = v;
  }

  static #valStatic = 1;

  static get staticValue() {
    return this.#valStatic;
  }

  static set staticValue(v: number) {
    this.#valStatic = v;
  }
}

const key1 = Symbol("key1");
const key2 = Symbol("key2");

let useMiddleware = 1;

const myDynamicKey = dynamicHookKey(() => {
  if (useMiddleware === 1) {
    return key1;
  } else {
    return key2;
  }
});

// enable hooks for the setter `value` and use `valueAlt` as the hook name, while also resolving the key dynamically
Hooks(MyService)
  .for("set value", "valueAlt", myDynamicKey)
  .for("static set staticValue", "staticValueAlt", myDynamicKey);

// or
// Hooks(MyService)
//   .for("set value", myDynamicKey, "valueAlt")
//   .for("static set staticValue", myDynamicKey, "staticValueAlt");

// attach middleware
// because typescript will try to find setter `valueAlt` and `staticValueAlt` on the class,
// we need to use exclamation mark to turn off type checking here
attach(key1, "!set valueAlt", (next, v) => next(v + 1));
attach(key1, "!static set staticValueAlt", (next, v) => next(v + 1));

attach(key2, "!set valueAlt", (next, v) => next(v + 2));
attach(key2, "!static set staticValueAlt", (next, v) => next(v + 2));

const service = new MyService();

// useMiddleware is set to 1, so the middleware attached to key1 will be executed

service.value; // 1
service.value = 2; // middleware adds 1, so value becomes 3
service.value; // 3

MyService.staticValue; // 1
MyService.staticValue = 2; // middleware adds 1, so staticValue becomes 3
MyService.staticValue; // 3

useMiddleware = 2;
// now dynamic hook key will resolve to key2, so the middleware attached to key2 will be executed

service.value; // 1
service.value = 2; // middleware adds 2, so value becomes 4
service.value; // 4

MyService.staticValue; // 1
MyService.staticValue = 2; // middleware adds 2, so staticValue becomes 4
MyService.staticValue; // 4
```

##### init

`init` is used to initialize class fields and allows you to attach middleware that can modify the field's value during
its initialization (inside the constructor).

- `for("init <property>")` — enable `init <property>` hook using the member name.
- `for("init <property>", alternativeName: string)` — use `alternativeName` as the public `init` hook name.
- `for("init <property>", dynamicKey: dynamicHookKey)` — resolve key dynamically.
- `for("init <property>", dynamicKey, alternativeName)` — combine dynamic key and alternative name.

Unfortunately, ECMA decorators are not ready yet (at the time of writing this documentation), so to use middleware for
initialization, you need to call `hook.init(this)` in the class constructor to initialize all fields that have `init`
hooks enabled. The `hook.init(this)` function can also serve another purpose: if you do `return hook.init(this)` in the
constructor, you can use the returned object instead of the default class instance. In other words, you can replace the
entire instance.

```ts
// file: MyService.js
import { hook } from "@neuronet/hooks";

class MyService {
  constructor() {
    return hook.init(this);
  }
}

// file: MyService.my-middleware.js
import { attach } from "@neuronet/hooks";
import { MyService } from "./MyService.js";

class MyServiceReplacement extends MyService {
  value = "different_value";
}

attach(MyService, "constructor", (next) => {
  return new MyServiceReplacement();
});

// usage
import { MyService } from "./MyService.js";
import "./MyService.my-middleware.js";

const service = new MyService();
service.value; // "different_value"
```

##### static init

Using middleware for static initialization is, in a sense, impossible, because static fields are initialized only once,
when the class is loaded (for example, when you import the file containing the class). The key for the middleware is the
class itself. For this reason, you cannot attach middleware to something that has not been defined yet, and once it has
been defined (and you could retrieve the "key"), it is already too late, because the field has already been initialized.
So, in a sense, we want to "have our cake and eat it too".

Nevertheless, if you need to use middleware for the initial value of a static field, you can do so by using a different
key defined in another file and taking care of the import order, so that the middleware is attached before the static
field is initialized.

```ts
// file: MyService.init-key.ts
export const MY_SERVICE_INIT_KEY = Symbol("MY_SERVICE_INIT_KEY");

// file: MyService.my-middleware.ts
import { attach } from "@neuronet/hooks";
import { MY_SERVICE_INIT_KEY } from "./MyService.init-key.js";

attach(MY_SERVICE_INIT_KEY, "!static init staticValue", (next, v) => next(v + 1));
attach(MY_SERVICE_INIT_KEY, "!static init otherStaticValue", (next, v) => next(v + 2));

// file: MyService.ts
import { Hooks, attach } from "@neuronet/hooks";
import { MY_SERVICE_INIT_KEY } from "./MyService.init-key.js";

class MyService {
  // `(v) => v` function returns the value as is, so we can assign a result to the static field
  // `(1)` at the end is executing a hook right in place with the default initial value set to 1
  static staticValue = hook(MY_SERVICE_INIT_KEY, "static init staticValue", (v) => v)(1);
  static otherStaticValue = hook(MY_SERVICE_INIT_KEY, "static init otherStaticValue", (v) => v)(2);
}

// static field is already initialized, so we can retrieve its value
MyService.staticValue; // 2
MyService.otherStaticValue; // 4
```

WARNING: You cannot use `Symbol.for("...")` for the key here, because middleware registry uses `WeakMap` to store
middleware, and `WeakMap` does not support global (`Symbol.for`) symbols.

###### Simple init

```ts
import { Hooks, attach } from "@neuronet/hooks";

class MyService {
  value = "x";

  constructor() {
    hook.init(this);
  }
}

// enable hooks for the instance field `value`
Hooks(MyService).for("init value");

// attach middleware to the hook
attach(MyService, "init value", (next, v) => next(v + ":init"));

const service = new MyService();

service.value; // "x:init"
```

###### Alternative name

```ts
import { Hooks, attach } from "@neuronet/hooks";

class MyService {
  value = "x";
}

// enable hooks for the instance field `value` and use `valueAlt` as the hook name
Hooks(MyService).for("init value", "valueAlt");

// attach middleware to the alternative hook name
// because typescript will try to find hook `valueAlt` on the class,
// we need to use exclamation mark to turn off type checking here
attach(MyService, "!init valueAlt", (next, v) => next(v + ":altInit"));

const service = new MyService();
service.value; // "x:altInit"
```

###### Dynamic key

```ts
import { Hooks, attach, dynamicHookKey } from "@neuronet/hooks";

class MyService {
  value = "x";
}

const key1 = Symbol("key1");
const key2 = Symbol("key2");

let useMiddleware = 1;

const myDynamicKey = dynamicHookKey(() => {
  if (useMiddleware === 1) {
    return key1;
  } else {
    return key2;
  }
});

// enable hooks for the instance field `value` with dynamic key
Hooks(MyService).for("init value", myDynamicKey);

// attach middleware to the hooks
attach(key1, "init value", (next, v) => next(v + ":dynInit1"));
attach(key2, "init value", (next, v) => next(v + ":dynInit2"));

// useMiddleware is set to 1, so the middleware attached to key1 will be executed
const service1 = new Service();
service1.value; // "x:dynInit1"

useMiddleware = 2;
// now dynamic hook key will resolve to key2, so the middleware attached to key2 will be executed

const service2 = new Service();
service2.value; // "x:dynInit2"
```

###### Dynamic key + alternative name

```ts
import { Hooks, hook, attach, dynamicHookKey } from "@neuronet/hooks";

class MyService {
  value = "x";

  constructor() {
    // required so that the `init` middleware runs when the instance is created
    hook.init(this);
  }
}

const key1 = Symbol("key1");
const key2 = Symbol("key2");

let useMiddleware = 1;

const myDynamicKey = dynamicHookKey(() => {
  if (useMiddleware === 1) {
    return key1;
  } else {
    return key2;
  }
});

// enable hooks for the field `value` and use `valueAlt` as the hook name, while also resolving the key dynamically
Hooks(MyService).for("init value", "valueAlt", myDynamicKey);

// or
// Hooks(MyService).for("init value", myDynamicKey, "valueAlt");

// attach middleware
// because typescript will try to find field `valueAlt` on the class,
// we need to use exclamation mark to turn off type checking here
attach(key1, "!init valueAlt", (next, v) => next(v + ":dynInit1"));
attach(key2, "!init valueAlt", (next, v) => next(v + ":dynInit2"));

// useMiddleware is set to 1, so the middleware attached to key1 will be executed
const service1 = new MyService();
service1.value; // "x:dynInit1"

useMiddleware = 2;
// now dynamic hook key will resolve to key2, so the middleware attached to key2 will be executed

const service2 = new MyService();
service2.value; // "x:dynInit2"
```

##### accessor

- `accessor(property)` — enable `init <property>`, `get <property>`, and `set <property>` hooks using the member name.
- `accessor(property, alternativeName: string)` — change the public base name used for the three hooks.
- `accessor(property, dynamicKey: dynamicHookKey)` — resolve key dynamically for accessor hooks.
- `accessor(property, dynamicKey, alternativeName)` — combine dynamic key and alternative name.

###### Simple accessor

```ts
import { Hooks, attach } from "@neuronet/hooks";

const Service = Hooks(
  class {
    x: string = "a";
  },
)
  .accessor("x")
  .build();

attach(Service, "get x", (next) => next() + ":getMid");

const service = new Service();
console.log(service.x); // "a:getMid"
```

###### Alternative name

```ts
import { Hooks, attach } from "@neuronet/hooks";

const Service = Hooks(
  class {
    x: string = "a";
  },
)
  .accessor("x", "xAlt")
  .build();

attach(Service, "init xAlt", (next, v) => next(v + ":initAlt"));

const service = new Service();
console.log(service.x); // "a:initAlt"
```

###### Dynamic key

```ts
import { Hooks, attach, dynamicHookKey } from "@neuronet/hooks";

const key = Symbol("ak");

const Service = Hooks(
  class {
    x: string = "a";
  },
)
  .accessor(
    "x",
    dynamicHookKey(() => key),
  )
  .build();

attach(key, "get x", (next) => next() + ":dynGet");

const service = new Service();
console.log(service.x); // "a:dynGet"
```

###### Dynamic key + alternative name

```ts
import { Hooks, attach, dynamicHookKey } from "@neuronet/hooks";

const key = Symbol("ak");

const Service = Hooks(
  class {
    x: string = "a";
  },
)
  .accessor(
    "x",
    "xAlt",
    dynamicHookKey(() => key),
  )
  .build();

attach(Service, "get xAlt", (next) => next() + ":getAlt");

const service = new Service();
console.log(service.x); // "a:getAlt"
```

#### Sub-hooks in the builder

You can create sub-hooks inside hooked methods using the `hook(name, fn)` syntax. These sub-hooks inherit the parent
hook key and can be attached separately.

```ts
import { Hooks, attach, hook } from "@neuronet/hooks";

const UserService = Hooks(
  class {
    greet(name: string) {
      const formatName = hook("formatName", (name: string) => name.toUpperCase());
      return `Hello, ${formatName(name)}`;
    }
  },
)
  .method("greet") // without wrapping greet, the sub-hook will throw an error because of missing parent hook context
  .build();

attach(UserService, "formatName", (next, name) => next(name + "!!!"));
new UserService().greet("Ada"); // Hello, ADA!!!
```

You can also create sub-hooks with custom key instead of inherited one.

```ts
import { Hooks, attach, hook } from "@neuronet/hooks";

const subKey = Symbol("subKey");

const UserService = Hooks(
  class {
    greet(name: string) {
      const formatName = hook(subKey, "formatName", (name: string) => name.toUpperCase());
      return `Hello, ${formatName(name)}`;
    }
  },
)
  .method("greet") // this line is now optional (because sub-hook is using a custom key)
  .build();

attach(subKey, "formatName", (next, name) => next(name + "!!!"));
new UserService().greet("Ada"); // Hello, ADA!!!
```

Or you can even create sub-hooks without a name.

```ts
import { Hooks, attach, hook } from "@neuronet/hooks";

const subKey = Symbol("subKey");

const UserService = Hooks(
  class {
    greet(name: string) {
      const formatName = hook(subKey, (name: string) => name.toUpperCase());
      return `Hello, ${formatName(name)}`;
    }
  },
)
  .method("greet")
  .build();

attach(subKey, (next, name) => next(name + "!!!"));
new UserService().greet("Ada"); // Hello, ADA!!!
```

## ECMA decorators

ECMA decorators are the most convenient option when you work directly with classes. To use hooks with ECMA decorators,
you need to decorate the class with `@Hook`, which enables the `@hook()` decorator syntax for all members of the class.

### `@Hook`

Enables ECMA decorator syntax for methods, getters, setters, fields, and accessors within the class.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

@Hook()
class UserService {
  @hook()
  greet(name: string) {
    return `Hello, ${name}`;
  }
}

const service = new UserService();
service.greet("Ada"); // Hello, Ada

const detach = attach(service, "greet", (next, name) => next(name.toUpperCase()));
service.greet("Ada"); // Hello, ADA

detach();
service.greet("Ada"); // Hello, Ada
```

### `@hook()` on methods

Wraps a method and enables hooks for that method. Works with both public and private methods.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

@Hook()
class UserService {
  @hook()
  greet(name: string) {
    return `Hello, ${name}`;
  }

  @hook()
  private #processName(name: string) {
    return name.toUpperCase();
  }
}

const service = new UserService();
service.greet("Ada"); // Hello, Ada

const detach = attach(service, "greet", (next, name) => {
  return next(name.toUpperCase());
});
service.greet("Ada"); // Hello, ADA

detach();
service.greet("Ada"); // Hello, Ada
```

### `@hook()` on getters

Wraps a getter and creates a hook under the name `get <property>`.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

@Hook()
class Counter {
  #value = 1;

  @hook()
  get value() {
    return this.#value;
  }
}

const counter = new Counter();
counter.value; // 1

const detach = attach(Counter, "get value", (next) => next() + 1);
new Counter().value; // 2

detach();
new Counter().value; // 1
```

### `@hook()` on setters

Wraps a setter and creates a hook under the name `set <property>`.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

@Hook()
class Counter {
  #value = 0;

  @hook()
  set value(next: number) {
    this.#value = next;
  }

  get value() {
    return this.#value;
  }
}

const counter = new Counter();
counter.value = 2;
console.log(counter.value); // 2

const detach = attach(Counter, "set value", (next, value) => next(value + 1));
counter.value = 2;
console.log(counter.value); // 3

detach();
counter.value = 2;
console.log(counter.value); // 2
```

### `@hook()` on fields

Wraps a field initializer and creates a hook under the name `init <property>`.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

@Hook()
class User {
  @hook()
  status = "new";
}

new User().status; // new

const detach = attach(User, "init status", (next, value) => next(value.toUpperCase()));
new User().status; // NEW

detach();
new User().status; // new
```

### `@hook()` on accessors

Wraps an accessor (auto-generated getter and setter from the `accessor` keyword) and enables `init`, `get`, and `set`
hooks for it.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

@Hook()
class Product {
  @hook()
  accessor price: number = 0;
}

const detachInit = attach(Product, "init price", (next, value) => next(value + 1));

const product = new Product();

console.log(product.price); // 1

product.price = 2;
console.log(product.price); // 2

const detachGet = attach(Product, "get price", (next) => next() + 10);
const detachSet = attach(Product, "set price", (next, value) => next(value + 2));
product.price = 2;
console.log(product.price); // 2 + 2 + 10 = 14

detachGet();
detachSet();
product.price = 2;
console.log(product.price); // 2
```

### Custom names in ECMA decorators

You can give a hooked member a custom hook name with `@hook("name")`.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

@Hook()
class UserService {
  @hook("greetCustom")
  greet(name: string) {
    return `Hello, ${name}`;
  }
}

const service = new UserService();
service.greet("Ada"); // Hello, Ada

const detach = attach(service, "greetCustom", (next, name) => next(name.toUpperCase()));
service.greet("Ada"); // Hello, ADA

detach();
service.greet("Ada"); // Hello, Ada
```

### Dynamic keys in ECMA decorators

You can resolve the hook key dynamically at runtime with `dynamicHookKey(...)`. This is useful when you need
per-instance hook isolation or composition.

```ts
import { Hook, hook, attach, dynamicHookKey, composeHookKeys } from "@neuronet/hooks";

@Hook()
class UserService {
  myKey = Symbol("user");

  @hook(
    dynamicHookKey(function (this: UserService) {
      return composeHookKeys(this, UserService);
    }),
  )
  greet(name: string) {
    return `Hello, ${name}`;
  }
}

const service = new UserService();
service.greet("Ada"); // Hello, Ada

attach(UserService, "greet", (next, name) => {
  return next(name.toUpperCase());
});
service.greet("Ada"); // Hello, ADA

attach(service, "greet", (next, name) => {
  return next(name + "!");
});
service.greet("Ada"); // Hello, ADA!
```

### Alternative names and dynamic keys together

You can combine both a custom name and a dynamic key.

```ts
import { Hook, hook, attach, dynamicHookKey, composeHookKeys } from "@neuronet/hooks";

@Hook()
class UserService {
  myKey = Symbol("user");

  @hook(
    "greetCustom",
    dynamicHookKey(function (this: UserService) {
      return this.myKey;
    }),
  )
  greet(name: string) {
    return `Hello, ${name}`;
  }
}

const service = new UserService();
service.greet("Ada"); // Hello, Ada

const detach = attach(service, "greetCustom", (next, name) => next(name.toUpperCase()));
service.greet("Ada"); // Hello, ADA

detach();
service.greet("Ada"); // Hello, Ada
```

### Static methods, fields and accessors

ECMA decorators work with static members (methods, fields, and accessors) using the same `@hook()` syntax as instance
members.

#### Static methods

ECMA decorators work with static methods in a similar way as instance methods.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

@Hook()
class MathService {
  @hook()
  static add(a: number, b: number) {
    return a + b;
  }
}

MathService.add(2, 3); // 5

const detach = attach(MathService, "add", (next, a, b) => {
  return next(a, b) * 2;
});
MathService.add(2, 3); // 10

detach();
MathService.add(2, 3); // 5

const instance = new MathService();
attach(instance, "add", (next, a, b) => {
  return next(a, b) * 3;
});
MathService.add(2, 3); // still 5 because static methods are not affected by instance hooks
```

#### Static fields

ECMA decorators work with static field initializers the same way as instance fields. Hooks are created under the name
`init <property>`. Static initializers may be used to set up static state, when declaring a class.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

const initKey = Symbol("initKey");

// You can define middleware anywhere, and it will patiently wait until it's actually used
const detach = attach(initKey, "init version", (next, value) => {
  return next(value + "-beta");
});

@Hook()
class Config {
  @hook(dynamicHookKey(() => initKey))
  static version = "1.0.0";
}

console.log(Config.version); // 1.0.0-beta

detach();
console.log(Config.version); // also 1.0.0-beta, because the static initializer has already run and the hook was only called once
```

#### Static accessors

ECMA decorators work with static accessors the same way as instance accessors, enabling `init`, `get`, and `set` hooks.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

@Hook()
class Settings {
  @hook()
  static accessor theme: string = "light";
}

console.log(Settings.theme); // light

const detachGet = attach(Settings, "get theme", (next) => next() + ":modified");
console.log(Settings.theme); // light:modified

const detachSet = attach(Settings, "set theme", (next, value) => next(value.toUpperCase()));
Settings.theme = "dark";
console.log(Settings.theme); // DARK:modified

detachGet();
detachSet();
Settings.theme = "auto";
console.log(Settings.theme); // auto
```

### Private members

ECMA decorators work with private methods, getters, setters, fields, and accessors. Private members are hooked using
their names with a `#` prefix. This is the only way to hook private members, since they are not accessible outside the
class.

#### Private methods

Private methods are hooked using the `@hook()` decorator and accessed via their `#` prefix.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

@Hook()
class UserService {
  @hook()
  #processName(name: string) {
    return name.toUpperCase();
  }

  public greet(name: string) {
    const processed = this.#processName(name);
    return `Hello, ${processed}`;
  }
}

const service = new UserService();
service.greet("Ada"); // Hello, ADA

const detach = attach(UserService, "#processName", (next, name) => {
  return next(name + "!");
});
service.greet("Ada"); // Hello, ADA!

detach();
service.greet("Ada"); // Hello, ADA
```

#### Private getters

Private getters are hooked using the `@hook()` decorator and create a hook under the name `get #<property>`.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

@Hook()
class Counter {
  #count = 0;

  @hook()
  get #value() {
    return this.#count;
  }

  public getValue() {
    return this.#value;
  }
}

const counter = new Counter();
counter.getValue(); // 0

const detach = attach(Counter, "get #value", (next) => next() + 10);
counter.getValue(); // 10

detach();
counter.getValue(); // 0
```

#### Private setters

Private setters are hooked using the `@hook()` decorator and create a hook under the name `set #<property>`.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

@Hook()
class Counter {
  #count = 0;

  @hook()
  set #value(val: number) {
    this.#count = val;
  }

  public setValue(val: number) {
    this.#value = val;
  }

  public getValue() {
    return this.#count;
  }
}

const counter = new Counter();
counter.setValue(5);
counter.getValue(); // 5

const detach = attach(Counter, "set #value", (next, val) => next(val * 2));
counter.setValue(5);
counter.getValue(); // 10

detach();
counter.setValue(5);
counter.getValue(); // 5
```

#### Private fields

Private field initializers are hooked using the `@hook()` decorator and create a hook under the name `init #<property>`.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

@Hook()
class User {
  @hook()
  #status = "new";

  public getStatus() {
    return this.#status;
  }
}

const user = new User();
user.getStatus(); // new

const detach = attach(User, "init #status", (next, value) => next(value.toUpperCase()));
const user2 = new User();
user2.getStatus(); // NEW

detach();
const user3 = new User();
user3.getStatus(); // new
```

#### Private accessors

Private accessors are hooked using the `@hook()` decorator and enable `init`, `get`, and `set` hooks under the names
`get #<property>`, `set #<property>`, and `init #<property>`.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

@Hook()
class Config {
  @hook()
  accessor #theme: string = "light";

  public getTheme() {
    return this.#theme;
  }

  public setTheme(value: string) {
    this.#theme = value;
  }
}

const config = new Config();
config.getTheme(); // light

const detachGet = attach(Config, "get #theme", (next) => next() + ":modified");
config.getTheme(); // light:modified

const detachSet = attach(Config, "set #theme", (next, value) => next(value.toUpperCase()));
config.setTheme("dark");
config.getTheme(); // DARK:modified

detachGet();
detachSet();
config.setTheme("auto");
config.getTheme(); // auto
```

#### Private static members

Private static members (methods, getters, setters, fields, and accessors) work the same way as private instance members.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

@Hook()
class Logger {
  @hook()
  static #formatMessage(msg: string) {
    return `[LOG] ${msg}`;
  }

  public static log(msg: string) {
    return Logger.#formatMessage(msg);
  }
}

Logger.log("test"); // [LOG] test

const detach = attach(Logger, "#formatMessage", (next, msg) => {
  return next(msg.toUpperCase());
});
Logger.log("test"); // [LOG] TEST

detach();
Logger.log("test"); // [LOG] test
```

### Security considerations: private members with hooks

When you add the `@hook()` decorator to a private member (method, getter, setter, field, or accessor), it creates a
middleware access point. This means that although the member is not accessible through the public API of the class and
TypeScript won't provide autocomplete for it, anyone with access to the class can intercept and read private data
through middleware.

By default, the class is used as the hook key for all its members. This means that **middleware attached to hooks on
private members can access those specific private members**, making them effectively "internal" rather than truly
private.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

@Hook()
class BankAccount {
  @hook()
  #balance: number = 1000;

  public getBalance() {
    return this.#balance;
  }
}

const account = new BankAccount();
account.getBalance(); // 1000

// Although #balance is private, we can intercept and read it through middleware
// by attaching to the class (the default hook key)
const spyLogs: number[] = [];
const detach = attach(BankAccount, "init #balance", (next, value) => {
  spyLogs.push(value);
  return next(value);
});

const account2 = new BankAccount();
console.log(spyLogs); // [1000]

// We can even modify private data
const detach2 = attach(BankAccount, "set #balance", (next, value) => {
  console.log(`Balance was: ${value}`);
  return next(value * 2); // double the balance!
});

// Now if someone creates a new account, its balance will be doubled
const account3 = new BankAccount();
account3.getBalance(); // 2000 (doubled through middleware)

detach();
detach2();
```

### Sub-hooks in ECMA decorators

You can create sub-hooks inside hooked methods using the `hook(name, fn)` syntax. These sub-hooks inherit the parent
hook key and can be attached separately.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

@Hook()
class UserService {
  @hook()
  greet(name: string) {
    const processed = hook("processSub", (name: string) => name)(name);
    return `Hello, ${processed}`;
  }
}

const service = new UserService();
service.greet("Ada"); // Hello, Ada

attach(service, "processSub", (next, name) => {
  return next(name + ":instanceSubHook");
});

service.greet("Ada"); // Hello, Ada:instanceSubHook
service.greet("Bob"); // Hello, Bob:instanceSubHook

attach(UserService, "processSub", (next, name) => {
  return next(name + ":classSubHook");
});

// instance hooks are called first, then class hooks
service.greet("Charlie"); // Hello, Charlie:instanceSubHook:classSubHook
```
