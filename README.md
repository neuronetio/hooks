# @neuronet/hooks

`@neuronet/hooks` is a simple unified and flexible library for adding hooks and middleware or events to JavaScript and TypeScript code.

It helps you extend behavior without changing the original codebase. In practice, that means you can add dependency injection, logging, validation, retries, caching, instrumentation, or custom logic in a clean and reusable way.

## When this library might be useful

- When you need observable events or lifecycle hooks inside your code.
- When you need to add or change behavior without modifying the original source code (keeping it upgradable).
- When you want a plugin-style extension mechanism for libraries or applications.
- When you deliver customer-specific solutions that stay separate from, yet ship with, the core code.
- Ideal for cross-cutting concerns such as dependency injection, validation, testing, logging, caching, memoization, retries, metrics, and other common tasks.
- When you want to chain functions dynamically and achieve a dynamic pipeline.
- When you want more granular control over the order of execution of multiple middlewares.
- When you want full control over where to attach middleware (at the function, class, or specific instance level).
- When you need middlewares that can be attached and detached at runtime.
- When you want a single, consistent API for injecting behavior into functions, methods, fields, getters, setters, and accessors — across public, static, and private members.

On top of that, `@neuronet/hooks` is very lightweight, well tested, and has no external dependencies. It is written in TypeScript and runs in Node.js, web browsers, Deno, Bun, and other JavaScript runtimes.

## Table of contents

- [Why this library is useful](#when-this-library-might-be-useful)
- [Basic concepts](#basic-concepts)
  - [The four main ways to use it](#the-four-main-ways-to-use-it)
    - [1. Quick start: wrap a function](#1-quick-start-wrap-a-function)
    - [2. Quick start: wrap a class member](#2-quick-start-wrap-a-class-member)
    - [3. Quick start: manual decorators](#3-quick-start-manual-decorators)
    - [4. Quick start: ECMA decorators](#4-quick-start-ecma-decorators)
  - [Middleware execution order / composite keys](#middleware-execution-order--composite-keys)
  - [Dynamic keys](#dynamic-keys)
- [API](#api)
  - [Function hooks](#function-hooks)
    - [`hook(fn)`](#hookfn)
    - [`hook(key, fn)`](#hookkey-fn)
    - [`hook(key, name, fn)`](#hookkey-name-fn)
    - [`hook(args, fn)`](#hookargs-fn)
    - [`hook(key, args, fn)`](#hookkey-args-fn)
    - [`hook(key, name, args, fn)`](#hookkey-name-args-fn)
    - [`hook(name, fn)`](#hookname-fn)
    - [`hook(name, args, fn)`](#hookname-args-fn)
  - [Hooks builder](#hooks-builder)
    - [`Hooks(Class)`](#using-hooksclass-builder)
    - [`method`](#method)
    - [`getter`](#getter)
    - [`setter`](#setter)
    - [`field`](#field)
    - [`accessor`](#accessor)
    - [`build`](#build)
    - [Sub-hooks in the builder](#sub-hooks-in-the-builder)
  - [Using direct hook utilities](#using-direct-hook-utilities)
    - [`hookMethod(Class, property)`](#hookmethodclass-property)
    - [`hookGetter(Class, property)`](#hookgetterclass-property)
    - [`hookSetter(Class, property)`](#hooksetterclass-property)
    - [`hookField(Class, property)`](#hookfieldclass-property)
    - [`hookAccessor(Class, property)`](#hookaccessorclass-property)
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

1. Wrap a function
2. Wrap a class member
3. Decorate an existing class manually
4. Use ECMA decorators

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

#### 2. Quick start: wrap a class member

This style is useful when you want to decorate an existing class without using decorator syntax.
For `composeHookKeys` see: [Middleware execution order / composite keys](#middleware-execution-order--composite-keys)

```ts
import { hook, composeHookKeys, attach } from "@neuronet/hooks";

class UserService {
  greet = hook(composeHookKeys(this, UserService), (name: string) => {
    return `Hello, ${name}`;
  });
}

// attach a middleware to the hook
const detach = attach(UserService, "greet", (next, name) => {
  return next(name.toUpperCase());
});

const service = new UserService();
service.greet("Ada"); // Hello, ADA

// detach the middleware if you need to remove it later
detach();
```

#### 3. Quick start: manual decorators

This style is useful when you want to decorate an existing class without using decorator syntax.

```ts
import { Hooks, attach, hookMethod } from "@neuronet/hooks";

let UserService = class UserService {
  greet(name: string) {
    return `Hello, ${name}`;
  }
};

// convert the class to a hooked class with builder
UserService = Hooks(UserService).method("greet").build();

// or with the `hookMethod` utility function
UserService = hookMethod(UserService, "greet");

// attach a middleware to the hook
const detach = attach(UserService, "greet", (next, name) => {
  return next(name.toUpperCase());
});

const service = new UserService();
service.greet("Ada"); // Hello, ADA

// detach the middleware if you need to remove it later
detach();
```

#### 4. Quick start: ECMA decorators

This style is very convenient when you work with classes directly. For ECMA decorators, you usually need TypeScript or Babel, and the [babel-plugin-proposal-decorators](https://babeljs.io/docs/babel-plugin-proposal-decorators) (it depends on your environment).

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

&nbsp;

&nbsp;

### Middleware execution order / composite keys

By default, middleware runs in the order it was registered (the most recently added middleware runs at the end of the chain).

`composeHookKeys` is a utility that merges multiple hook keys into a single composite key, so you can attach middleware at multiple levels simultaneously.
For example, you can register middleware for a specific instance or for all instances of a class — though the mechanism is not limited to classes.

Composed keys are evaluated in cascade (waterfall): for a composition made of two keys, all middleware registered on the first key runs first (in registration order), and then all middleware registered on the second key runs.
The individual lists are concatenated into a single execution chain.

As a result, even if you register middleware alternately across two (or more) keys, execution will still be grouped by key: all handlers for the first key execute (in their registration order), followed by all handlers for the second key, and so on.

In other words, middleware are ordered first by key, and then by registration order within each key (there's no actual sorting — this example simply illustrates the concept).

**Example 1**: single key order

```ts
import { hook, composeHookKeys, attach } from "@neuronet/hooks";

const oneKey = Symbol("one");
const one = hook(oneKey, (name: string) => name);
attach(oneKey, (next, name) => next(name + ":one1")); // one1 added first
attach(oneKey, (next, name) => next(name + ":one2")); // one2 added second
one("test"); // test:one1:one2
```

**Example 2**: composite key order

```ts
import { hook, composeHookKeys, attach } from "@neuronet/hooks";

const key1 = Symbol("key1");
const key2 = Symbol("key2");
const composite = hook(composeHookKeys(key1, key2), (name: string) => name);
attach(key2, (next, name) => next(name + ":key2")); // key2 added first
attach(key1, (next, name) => next(name + ":key1")); // key1 added second, but runs first because it's the first key in the composition
composite("test"); // test:key1:key2
```

**Example 3**: multiple middleware

```ts
import { hook, composeHookKeys, attach } from "@neuronet/hooks";

const key1 = Symbol("key1");
const key2 = Symbol("key2");
const key3 = Symbol("key3");
const composite = hook(composeHookKeys(key1, key2, key3), (name: string) => name);

attach(key1, (next, name) => next(name + "  key1_1"));
attach(key2, (next, name) => next(name + "  key2_1"));
attach(key1, (next, name) => next(name + "  key1_2"));
composite("test"); // test  key1_1  key1_2  key2_1

attach(key3, (next, name) => next(name + "  key3_1"));
composite("test"); // test  key1_1  key1_2  key2_1  key3_1

attach(key2, (next, name) => next(name + "  key2_2"));
composite("test"); // test  key1_1  key1_2  key2_1  key2_2  key3_1
```

---

### Dynamic keys

Dynamic keys are a powerful feature that allows you to resolve the hook key at runtime. This is useful when you want to use different pipeline behavior based on runtime conditions or you don't know the key in advance.

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

const greet = hook(
  dynamicHookKey(() => {
    // resolve the key at runtime
    if (usePipeline === 1) {
      return pipeline1;
    }
    return pipeline2;
  }),
  (name: string) => `Hello, ${name}`,
);

greet("Ada"); // Hello, Ada:pipeline1

usePipeline = 2; // configuration changed

greet("Ada"); // Hello, Ada:pipeline2
```

`dynamicHookKey` callback can also return a composite key, so you can combine multiple keys dynamically.

```ts
import { hook, attach, dynamicHookKey, composeHookKeys } from "@neuronet/hooks";

const key1 = Symbol("key1");
const key2 = Symbol("key2");
const key3 = Symbol("key3");
const key4 = Symbol("key4");

attach(key1, (next, name) => next(name + ":key1"));
attach(key2, (next, name) => next(name + ":key2"));
attach(key3, (next, name) => next(name + ":key3"));
attach(key4, (next, name) => next(name + ":key4"));

let pipeline = [key1, key2];

const composite = hook(
  dynamicHookKey(() => composeHookKeys(...pipeline)),
  (name: string) => name,
);

composite("test"); // test:key1:key2

pipeline = [key3, key4]; // configuration changed

composite("test"); // test:key3:key4
```

---

&nbsp;

## API

&nbsp;

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

Uses an explicit key and a custom hook name.

```ts
import { hook, attach } from "@neuronet/hooks";

const key = Symbol("greet");
const greet = hook(key, "customName", (name: string) => `Hello, ${name}`);

attach(key, "customName", (next, name) => next(name.toUpperCase()));
greet("Ada"); // Hello, ADA
```

#### `hook(args, fn)`

Provides hardcoded arguments for the wrapped function. This is an override, not a fallback. The wrapped function will no longer accept arbitrary arguments at call time. In TypeScript, passing other arguments will be reported as an error.

```ts
import { hook } from "@neuronet/hooks";

const greet = hook(["Ada"], (name: string) => `Hello, ${name}`);
greet(); // Hello, Ada
```

#### `hook(key, args, fn)`

Uses a custom key and hardcoded arguments.

```ts
import { hook, attach } from "@neuronet/hooks";

const key = Symbol("greet");
const greet = hook(key, ["Ada"], (name: string) => `Hello, ${name}`);

attach(key, (next, name) => next(name.toUpperCase()));
greet(); // Hello, ADA
```

#### `hook(key, name, args, fn)`

The most explicit form: custom key, custom name, and hardcoded arguments.

```ts
import { hook, attach } from "@neuronet/hooks";

const key = Symbol("greet");
const greet = hook(key, "custom", ["Ada"], (name: string) => `Hello, ${name}`);

attach(key, "custom", (next, name) => next(name.toUpperCase()));
greet(); // Hello, ADA
```

#### `hook(name, fn)`

This overload can only be used inside another hook. In that case it creates a sub-hook and inherits the hook key from the parent hook context. If there is no parent hook context, it throws an error.

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

#### `hook(name, args, fn)`

Same situation as the previous overload, but with hardcoded arguments.

```ts
import { hook, attach } from "@neuronet/hooks";

const parentKey = Symbol("parent");
const parent = hook(parentKey, "parent", () => {
  const child = hook("child", ["ok"], (value: string) => `Child: ${value}`);
  return child();
});

attach(parentKey, "parent", (next) => next());
attach(parentKey, "child", (next, value) => next(value.toUpperCase()));

parent(); // Child: OK
```

---

### Hooks builder

Hooks builder is useful when you want to decorate an already defined class without using the standard decorator syntax.

#### Using `Hooks(Class)` builder

The `Hooks(Class)` builder exposes a fluent API for enabling hooks on several members at once. Each builder method supports multiple overloads — below we list the overloads explicitly and provide a short example for each.

Note: builder methods accept a property name, an optional alternative hook name (string), or a dynamic key resolver created with `dynamicHookKey(...)`. You can also pass both a dynamic key and an alternative name when needed.

##### method

- `method(property)` — enable hooks for a method where `property` is the method name.
- `method(property, alternativeName)` — use `alternativeName` as the hook name.
- `method(property, dynamicKey)` — resolve hook key at runtime using `dynamicHookKey`.
- `method(property, alternativeName, dynamicKey)` — combine alternative name and dynamic key.

###### Simple method

```ts
import { Hooks, attach } from "@neuronet/hooks";

let Service = class Service {
  myMethod(x: string) {
    return x + ":orig";
  }
};
Service = Hooks(Service).method("myMethod").build();

attach(Service, "myMethod", (next, x) => next(x + ":mid"));

const service = new Service();
service.myMethod("test"); // "test:mid:orig"
```

###### Alternative name

```ts
import { Hooks, attach } from "@neuronet/hooks";

let Service = class Service {
  myMethod(x: string) {
    return x + ":orig";
  }
};
Service = Hooks(Service).method("myMethod", "myMethodAlt").build();

attach(Service, "myMethodAlt", (next, x) => next(x + ":alt"));

const service = new Service();
service.myMethod("test"); // "test:alt:orig"
```

###### Dynamic key

```ts
import { Hooks, attach, dynamicHookKey } from "@neuronet/hooks";

let Service = class Service {
  myMethod(x: string) {
    return x + ":orig";
  }
};

const key = Symbol("k");

Service = Hooks(Service)
  .method(
    "myMethod",
    dynamicHookKey(() => key),
  )
  .build();

attach(key, "myMethod", (next, x) => next(x + ":dyn"));

const service = new Service();
service.myMethod("test"); // "test:dyn:orig"
```

###### Dynamic key + alternative name

```ts
import { Hooks, attach, dynamicHookKey } from "@neuronet/hooks";

let Service = class Service {
  myMethod(x: string) {
    return x + ":orig";
  }
};

const key = Symbol("k");

Service = Hooks(Service)
  .method(
    "myMethod",
    "myMethodAlt",
    dynamicHookKey(() => key),
  )
  .build();

attach(Service, "myMethodAlt", (next, x) => next(x + ":combined"));

const service = new Service();
service.myMethod("test"); // "test:combined:orig"
```

##### getter

- `getter(property)` — enable `get <property>` hook using the member name.
- `getter(property, alternativeName: string)` — use `alternativeName` as the public `get` hook name.
- `getter(property, dynamicKey)` — resolve key dynamically.
- `getter(property, alternativeName, dynamicKey)` — combine alternative name and dynamic key.

###### Simple getter

```ts
import { Hooks, attach } from "@neuronet/hooks";

let Service = class Service {
  get value() {
    return 1;
  }
};
Service = Hooks(Service).getter("value").build();

attach(Service, "get value", (next) => next() + 1);

const service = new Service();
service.value; // 2
```

###### Alternative name

```ts
import { Hooks, attach } from "@neuronet/hooks";

let Service = class Service {
  get value() {
    return 1;
  }
};
Service = Hooks(Service).getter("value", "valueAlt").build();

attach(Service, "get valueAlt", (next) => next() + 2);

const service = new Service();
service.value; // 3
```

###### Dynamic key

```ts
import { Hooks, attach, dynamicHookKey } from "@neuronet/hooks";

const key = Symbol("gk");

let Service = class Service {
  get value() {
    return 1;
  }
};

Service = Hooks(Service)
  .getter(
    "value",
    dynamicHookKey(() => key),
  )
  .build();

attach(key, "get value", (next) => next() + 2);

const service = new Service();
service.value; // 3
```

###### Dynamic key + alternative name

```ts
import { Hooks, attach, dynamicHookKey } from "@neuronet/hooks";

const key = Symbol("gk");

let Service = class Service {
  get value() {
    return 1;
  }
};

Service = Hooks(Service)
  .getter(
    "value",
    "valueAlt",
    dynamicHookKey(() => key),
  )
  .build();

attach(Service, "get valueAlt", (next) => next() + 3);

const service = new Service();
service.value; // 4
```

##### setter

- `setter(property)` — enable `set <property>` hook using the member name.
- `setter(property, alternativeName)` — use `alternativeName` as the public `set` hook name.
- `setter(property, dynamicKey)` — resolve key dynamically.
- `setter(property, alternativeName, dynamicKey)` — combine dynamic key and alternative name.

###### Simple setter

```ts
import { Hooks, attach } from "@neuronet/hooks";

let Service = class Service {
  #_ = 0;
  set value(v: number) {
    this.#_ = v;
  }
  get value() {
    return this.#_;
  }
};
Service = Hooks(Service).setter("value").build();

attach(Service, "set value", (next, v) => next(v + 1));

const service = new Service();
service.value = 2;
console.log(service.value); // 3
```

###### Alternative name

```ts
import { Hooks, attach } from "@neuronet/hooks";

let Service = class Service {
  #_ = 0;
  set value(v: number) {
    this.#_ = v;
  }
  get value() {
    return this.#_;
  }
};
Service = Hooks(Service).setter("value", "valueAlt").build();

attach(Service, "set valueAlt", (next, v) => next(v + 2));

const service = new Service();
service.value = 2;
console.log(service.value); // 4
```

###### Dynamic key

```ts
import { Hooks, attach, dynamicHookKey } from "@neuronet/hooks";

const key = Symbol("sk");

let Service = class Service {
  #_ = 0;
  set value(v: number) {
    this.#_ = v;
  }
  get value() {
    return this.#_;
  }
};

Service = Hooks(Service)
  .setter(
    "value",
    dynamicHookKey(() => key),
  )
  .build();

attach(key, "set value", (next, v) => next(v + 2));

const service = new Service();
service.value = 2;
console.log(service.value); // 4
```

###### Dynamic key + alternative name

```ts
import { Hooks, attach, dynamicHookKey } from "@neuronet/hooks";

const key = Symbol("sk");

let Service = class Service {
  #_ = 0;
  set value(v: number) {
    this.#_ = v;
  }
  get value() {
    return this.#_;
  }
};

Service = Hooks(Service)
  .setter(
    "value",
    "valueAlt",
    dynamicHookKey(() => key),
  )
  .build();

attach(Service, "set valueAlt", (next, v) => next(v + 3));

const service = new Service();
service.value = 2;
console.log(service.value); // 5
```

##### field

- `field(property)` — enable `init <property>` hook using the member name.
- `field(property, alternativeName: string)` — use `alternativeName` as the public `init` hook name.
- `field(property, dynamicKey: dynamicHookKey)` — resolve key dynamically.
- `field(property, dynamicKey, alternativeName)` — combine dynamic key and alternative name.

###### Simple field

```ts
import { Hooks, attach } from "@neuronet/hooks";

let Service = class Service {
  value = "x";
};
Service = Hooks(Service).field("value").build();

attach(Service, "init value", (next, v) => next(v + ":init"));

const service = new Service();
service.value; // "x:init"
```

###### Alternative name

```ts
import { Hooks, attach } from "@neuronet/hooks";

let Service = class Service {
  value = "x";
};
Service = Hooks(Service).field("value", "valueInit").build();

attach(Service, "init valueInit", (next, v) => next(v + ":altInit"));

const service = new Service();
service.value; // "x:altInit"
```

###### Dynamic key

```ts
import { Hooks, attach, dynamicHookKey } from "@neuronet/hooks";

const key = Symbol("fk");

let Service = class Service {
  value = "x";
};

Service = Hooks(Service)
  .field(
    "value",
    dynamicHookKey(() => key),
  )
  .build();

attach(key, "init value", (next, v) => next(v + ":dynInit"));

const service = new Service();
service.value; // "x:dynInit"
```

###### Dynamic key + alternative name

```ts
import { Hooks, attach, dynamicHookKey } from "@neuronet/hooks";

const key = Symbol("fk");

let Service = class Service {
  value = "x";
};

Service = Hooks(Service)
  .field(
    "value",
    "valueInit",
    dynamicHookKey(() => key),
  )
  .build();

attach(Service, "init valueInit", (next, v) => next(v + ":combinedInit"));

const service = new Service();
service.value; // "x:combinedInit"
```

##### accessor

- `accessor(property)` — enable `init <property>`, `get <property>`, and `set <property>` hooks using the member name.
- `accessor(property, alternativeName: string)` — change the public base name used for the three hooks.
- `accessor(property, dynamicKey: dynamicHookKey)` — resolve key dynamically for accessor hooks.
- `accessor(property, dynamicKey, alternativeName)` — combine dynamic key and alternative name.

###### Simple accessor

```ts
import { Hooks, attach } from "@neuronet/hooks";

let Service = class Service {
  x: string = "a";
};
Service = Hooks(Service).accessor("x").build();

attach(Service, "get x", (next) => next() + ":getMid");

const service = new Service();
console.log(service.x); // "a:getMid"
```

###### Alternative name

```ts
import { Hooks, attach } from "@neuronet/hooks";

let Service = class Service {
  x: string = "a";
};
Service = Hooks(Service).accessor("x", "xAlt").build();

attach(Service, "init xAlt", (next, v) => next(v + ":initAlt"));

const service = new Service();
console.log(service.x); // "a:initAlt"
```

###### Dynamic key

```ts
import { Hooks, attach, dynamicHookKey } from "@neuronet/hooks";

const key = Symbol("ak");

let Service = class Service {
  x: string = "a";
};

Service = Hooks(Service)
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

let Service = class Service {
  x: string = "a";
};

Service = Hooks(Service)
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

##### build

- `build()` — finalizes the chain and returns the wrapped class constructor that will run initializers for instance members. Use the returned class in place of the original binding.

Example — chaining multiple operations

```ts
import { Hooks, attach } from "@neuronet/hooks";

let Product = class Product {
  price = 10;
  get total() {
    return this.price;
  }
  set total(v: number) {
    this.price = v;
  }
};

Product = Hooks(Product).field("price").getter("total").setter("total").build();

attach(Product, "init price", (next, v) => next(v + 1));
attach(Product, "get total", (next) => next() + 10);
attach(Product, "set total", (next, v) => next(v + 5));

const p = new Product();
console.log(p.total); // 10 + 1 + 10 = 21

p.total = 20; // sets price to 20 + 5 = 25
console.log(p.total); // 25 + 10 = 35
```

#### Sub-hooks in the builder

You can create sub-hooks inside hooked methods using the `hook(name, fn)` syntax. These sub-hooks inherit the parent hook key and can be attached separately.

```ts
import { Hooks, attach, hook } from "@neuronet/hooks";

let UserService = class UserService {
  greet(name: string) {
    const formatName = hook("formatName", (name: string) => name.toUpperCase());
    return `Hello, ${formatName(name)}`;
  }
};

UserService = Hooks(UserService).method("greet").build(); // without this line, the sub-hook will throw an error because of missing parent hook context

attach(UserService, "formatName", (next, name) => next(name + "!!!"));
new UserService().greet("Ada"); // Hello, ADA!!!
```

You can also create sub-hooks with custom key instead of inherited one.

```ts
import { Hooks, attach, hook } from "@neuronet/hooks";

const subKey = Symbol("subKey");

let UserService = class UserService {
  greet(name: string) {
    const formatName = hook(subKey, "formatName", (name: string) => name.toUpperCase());
    return `Hello, ${formatName(name)}`;
  }
};

UserService = Hooks(UserService).method("greet").build(); // this line is now optional just for greet method

attach(subKey, "formatName", (next, name) => next(name + "!!!"));
new UserService().greet("Ada"); // Hello, ADA!!!
```

Or you can even create sub-hooks without a name.

```ts
import { Hooks, attach, hook } from "@neuronet/hooks";

const subKey = Symbol("subKey");

let UserService = class UserService {
  greet(name: string) {
    const formatName = hook(subKey, (name: string) => name.toUpperCase());
    return `Hello, ${formatName(name)}`;
  }
};

UserService = Hooks(UserService).method("greet").build(); // this line is now optional just for greet method

attach(subKey, (next, name) => next(name + "!!!"));
new UserService().greet("Ada"); // Hello, ADA!!!
```

#### Using direct hook utilities

##### Multiple utilities at once

You can use multiple utilities at once to wrap a class and create hooks for its members. The following example shows how to wrap a class with `hookMethod`, `hookGetter`, `hookSetter`, `hookField`, and `hookAccessor` utilities.

```ts
import { hookMethod, hookGetter, hookSetter, hookField, hookAccessor, attach } from "@neuronet/hooks";

let Service = class Service {
  #value = 1;

  get value() {
    return this.#value;
  }

  set value(next: number) {
    this.#value = next;
  }

  greet(name: string) {
    return `Hello, ${name}`;
  }

  status = "new";

  acc = "accessor";
};

// create hooks for the class members
Service = hookMethod(Service, "greet");
Service = hookGetter(Service, "value");
Service = hookSetter(Service, "value");
Service = hookField(Service, "status");
Service = hookAccessor(Service, "acc");

// attach middleware to the hooks
attach(Service, "greet", (next, name) => next(name.toUpperCase()));
attach(Service, "get value", (next) => next() + 1);
attach(Service, "set value", (next, value) => next(value + 1));
attach(Service, "init status", (next, value) => next(value.toUpperCase()));
attach(Service, "init acc", (next) => next() + "_init");
attach(Service, "get acc", (next) => next() + "_get");
attach(Service, "set acc", (next, value) => next(value + "_set"));
```

##### `hookMethod(Class, property)`

Wraps class method and creates a hook under the name `<property>`.

```ts
import { hookMethod, attach } from "@neuronet/hooks";

let Service = class Service {
  myMethod(x: string) {
    return x + " orig";
  }
};

// create a hook for the method
Service = hookMethod(Service, "myMethod");

// attach a middleware to all instances of the class
attach(Service, "myMethod", (next, x) => next(x + " middleware"));

// call the method with middleware attached
const service = new Service();
service.myMethod("test"); // "test middleware orig"

// ...

// you can also attach middleware to specific instances of the class
const service2 = new Service();
attach(service2, "myMethod", (next, x) => next(x + " instanceMiddleware"));

service2.myMethod("test"); // "test instanceMiddleware middleware orig"
// not affected by specific instance middleware
service.myMethod("test"); // "test middleware orig"

// ...

// do not run class-level middleware - use specific instance middleware only
const service3 = new Service();
attach(service3, "myMethod", (next, x) => {
  return "short-circuit"; // do not call next() to short-circuit the chain
});
service3.myMethod("test"); // "short-circuit"
```

##### `hookGetter(Class, property)`

Wraps a getter and creates a hook under the name `get <property>`.

```ts
import { hookGetter, attach } from "@neuronet/hooks";

let Counter = class Counter {
  get value() {
    return 1;
  }
};

Counter = hookGetter(Counter, "value");
attach(Counter, "get value", (next) => next() + 1);
new Counter().value; // 2
```

##### `hookSetter(Class, property)`

Wraps a setter and creates a hook under the name `set <property>`.

```ts
import { hookSetter, attach } from "@neuronet/hooks";

let Counter = class Counter {
  #value = 0;

  set value(next: number) {
    this.#value = next;
  }
};

Counter = hookSetter(Counter, "value");
attach(Counter, "set value", (next, value) => next(value + 1));

const counter = new Counter();
counter.value = 2;
console.log(counter.value); // 3
```

##### `hookField(Class, property)`

Wraps a public field initializer and creates a hook under the name `init <property>`.

```ts
import { hookField, attach } from "@neuronet/hooks";

let User = class User {
  status = "new";
};

User = hookField(User, "status");
attach(User, "init status", (next, value) => next(value.toUpperCase()));

new User().status; // NEW
```

##### `hookAccessor(Class, property)`

Wraps an accessor and enables `init`, `get`, and `set` hooks for it.

```ts
import { hookAccessor, attach } from "@neuronet/hooks";

let Product = class Product {
  price: number = 0;
};

Product = hookAccessor(Product, "price");
attach(Product, "init price", (next, value) => next(value + 1));
attach(Product, "get price", (next) => next() + 10);
attach(Product, "set price", (next, value) => next(value + 20));

const product = new Product();
console.log(product.price); // 1 + 10 = 11
product.price = 2;
console.log(product.price); // 2 + 20 + 10 = 32
```

Static

```ts
import { hookAccessor, attach } from "@neuronet/hooks";

const initPrice = Symbol("initPrice");
attach(initPrice, "init price", (next, value) => next(value + 1));

let Product = class Product {
  static price: number = hook(initPrice, "init price", (v: number) => v)(0);
};

Product = hookAccessor(Product, "price");
attach(Product, "get price", (next) => next() + 10);
attach(Product, "set price", (next, value) => next(value + 20));

console.log(Product.price); // 0 + 1 + 10 = 11
Product.price = 2;
console.log(Product.price); // 2 + 20 + 10 = 32
```

## ECMA decorators

ECMA decorators are the most convenient option when you work directly with classes. To use hooks with ECMA decorators, you need to decorate the class with `@Hook`, which enables the `@hook()` decorator syntax for all members of the class.

### `@Hook`

Enables ECMA decorator syntax for methods, getters, setters, fields, and accessors within the class.

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

const detach = attach(service, "greet", (next, name) => next(name.toUpperCase()));
service.greet("Ada"); // Hello, ADA

detach();
service.greet("Ada"); // Hello, Ada
```

### `@hook()` on methods

Wraps a method and enables hooks for that method. Works with both public and private methods.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

@Hook
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

@Hook
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

@Hook
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

@Hook
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

Wraps an accessor (auto-generated getter and setter from the `accessor` keyword) and enables `init`, `get`, and `set` hooks for it.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

@Hook
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

@Hook
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

You can resolve the hook key dynamically at runtime with `dynamicHookKey(...)`. This is useful when you need per-instance hook isolation or composition.

```ts
import { Hook, hook, attach, dynamicHookKey, composeHookKeys } from "@neuronet/hooks";

@Hook
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

@Hook
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

ECMA decorators work with static members (methods, fields, and accessors) using the same `@hook()` syntax as instance members.

#### Static methods

ECMA decorators work with static methods in a similar way as instance methods.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

@Hook
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

ECMA decorators work with static field initializers the same way as instance fields. Hooks are created under the name `init <property>`.
Static initializers may be used to set up static state, when declaring a class.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

const initKey = Symbol("initKey");

// You can define middleware anywhere, and it will patiently wait until it's actually used
const detach = attach(initKey, "init version", (next, value) => {
  return next(value + "-beta");
});

@Hook
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

@Hook
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

ECMA decorators work with private methods, getters, setters, fields, and accessors. Private members are hooked using their names with a `#` prefix.
This is the only way to hook private members, since they are not accessible outside the class.

#### Private methods

Private methods are hooked using the `@hook()` decorator and accessed via their `#` prefix.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

@Hook
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

@Hook
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

@Hook
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

@Hook
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

Private accessors are hooked using the `@hook()` decorator and enable `init`, `get`, and `set` hooks under the names `get #<property>`, `set #<property>`, and `init #<property>`.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

@Hook
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

@Hook
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

When you add the `@hook()` decorator to a private member (method, getter, setter, field, or accessor), it creates a middleware access point. This means that although the member is not accessible through the public API of the class and TypeScript won't provide autocomplete for it, anyone with access to the class can intercept and read private data through middleware.

By default, the class is used as the hook key for all its members. This means that **middleware attached to hooks on private members can access those specific private members**, making them effectively "internal" rather than truly private.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

@Hook
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

You can create sub-hooks inside hooked methods using the `hook(name, fn)` syntax. These sub-hooks inherit the parent hook key and can be attached separately.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

@Hook
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
