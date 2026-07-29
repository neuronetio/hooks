# @neuronet/hooks

A powerful, type-safe hooking and middleware library for JavaScript and TypeScript. `@neuronet/hooks` allows you to wrap functions, class methods, accessors, and fields with hooks. This enables you to attach and detach middleware dynamically at runtime, profoundly modifying behavior (arguments and return values) without changing the original source code.

## Benefits

- 🚀 **Extensible Architecture**: Add new behavior dynamically without altering the original code, allowing uncoupled and clean integrations.
- 🛡️ **TypeScript Support**: Full type safety for functions and class methods, automatically inferred from your signatures (excludes hooks using Symbols or other objects as keys).
- 🎨 **Decorator Support**: Easy to integrate into OOP paradigms using ECMA TC39 Stage 3 decorators (`@Hook`, `@hook()`).
- 🏗️ **Comprehensive Class Support**: Works perfectly with instance methods, static methods, private methods, getters, setters, and class fields.
- 🔗 **Composite Hooks**: Supports cascading hooks (e.g., executing middleware attached to a specific class instance first, followed by middleware attached to the entire class).
- 🧩 **Zero Dependencies**: Lightweight and cleanly isolated footprint.

---

## Quick Start (Most Common Use Cases)

Here are the most frequently used examples to get you started immediately.

### 1. Wrapping a Simple Function

You can wrap any function into a hook to dynamically add behavior before, after, or around its execution.

```ts
import { hook, attach, detach } from "@neuronet/hooks";

// 1. Create a hooked function
const greet = hook((name: string) => `Hello, ${name}!`);

// 2. Execute normally
greet("John"); // "Hello, John!"

// 3. Attach a middleware
// The `next` function calls the original function or the next middleware in line.
const unregister = attach(greet, (next, name) => {
  console.log(`Middleware intercepted name: ${name}`);

  // Modify the argument
  const result = next(name.toUpperCase());

  // Modify the result
  return `${result} (intercepted)`;
});

greet("John");
// Logs: "Middleware intercepted name: John"
// Returns: "Hello, JOHN! (intercepted)"

// 4. Detach returning it to normal
unregister();
greet("John"); // "Hello, John!"
```

### 2. Class Methods (Instance & Static)

Using ES decorators, you can hook classes effortlessly. You can attach middleware to **all instances** (via the class constructor) or a **specific instance**.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

@Hook
class UserService {
  @hook()
  greet(name: string) {
    return `Hello, ${name}`;
  }

  @hook()
  static getVersion() {
    return "v1.0";
  }
}

const service1 = new UserService();
const service2 = new UserService();

// Attach to ALL instances of UserService
attach(UserService, "greet", (next, name) => {
  return next(name) + "!";
});

service1.greet("Alice"); // "Hello, Alice!"
service2.greet("Bob"); // "Hello, Bob!"

// Attach to a SINGLE specific instance (takes precedence over class middleware)
attach(service1, "greet", (next, name) => {
  return next(name) + " (service1)";
});

service1.greet("Alice"); // "Hello, Alice! (service1)"
service2.greet("Bob"); // "Hello, Bob!"

// Attach to a Static Method
attach(UserService, "getVersion", (next) => {
  return next() + "-beta";
});

UserService.getVersion(); // "v1.0-beta"
```

### 3. Accessors (Getters/Setters) & Fields

You can hook `get` and `set` accessors, as well as the initialization (`init`) of class fields. The library automatically namespaces these with `get `, `set `, and `init ` prefixes.

```ts
import { Hook, hook, attach } from "@neuronet/hooks";

@Hook
class Product {
  // Hook the field initialization
  @hook()
  price = 100;

  #discount = 0;

  // Hook the getter
  @hook()
  get discount() {
    return this.#discount;
  }

  // Hook the setter
  @hook()
  set discount(value: number) {
    this.#discount = value;
  }
}

const item = new Product();

// Attach to getter (prefix with "get ")
attach(item, "get discount", (next) => {
  return next() + 5; // Fake an extra 5% discount
});

// Attach to setter (prefix with "set ")
attach(item, "set discount", (next, value) => {
  if (value > 50) throw new Error("Discount too high!");
  next(value);
});

item.discount = 20;
console.log(item.discount); // 25 (20 internal + 5 from getter middleware)

item.discount = 100; // Throws "Discount too high!"

// Attach to field initialization (prefix with "init ")
attach(Product, "init price", (next, initialValue) => {
  return next(initialValue * 2); // Double the base price on init
});

const item2 = new Product();
console.log(item2.price); // 200 (Modified by init hook)
```

---

## Detailed API and Capabilities

### `hook(...)`

_Brief: Wraps a function with hook behavior, allowing middlewares to be attached and executed._

**Returns:**
Returns a wrapper function (with `IHookFn` properties).

#### Combinations:

You can use `hook` directly on functions to define execution context.

1. `hook(fn)`: Uses the original function object itself as the HookKey.

   ```ts
   import { hook, attach } from "@neuronet/hooks";

   const simple = hook((s: string) => `Base: ${s}`);
   attach(simple, (next, s) => next(s) + " + Extra");

   simple("test"); // "Base: test + Extra"
   ```

2. `hook(key, fn)`: Explicitly provide a custom key to identify this hook.

   ```ts
   import { hook, attach } from "@neuronet/hooks";

   const key = Symbol("myKey");
   const keyed = hook(key, (v: number) => v * 10);

   attach(key, (next, v) => next(v) + 5);
   keyed(2); // 25
   ```

3. `hook(name, fn)`: The hook resolves the HookKey implicitly relying on its parent hook context.

   ```ts
   import { hook, attach } from "@neuronet/hooks";

   const key = Symbol("myKey");
   const named = hook(key, "myHook", (n: number) => {
     // Resolves the key from the parent hook scope
     const subResult = hook("mySubHook", (s: string) => `Sub: ${s}`)(n);
     return `Named: ${n}, ${subResult}`;
   });

   attach(named, "myHook", (next, n) => next(n * 2));
   attach(named, "mySubHook", (next, s) => next(`SubExtra(${s})`));

   named(5); // "Named: 10, Sub: SubExtra(10)"
   ```

4. `hook(key, name, fn)`: Provide a custom key and an explicit string/symbol name.

   ```ts
   import { hook, attach } from "@neuronet/hooks";

   const key = Symbol("myKey");
   const named = hook(key, "methodA", (n: number) => n + 1);

   attach(key, "methodA", (next, n) => next(n * 2));
   named(10); // 21 (10 * 2 + 1)
   ```

5. `hook(args, fn)` / `hook(key, args, fn)` / `hook(key, name, args, fn)`: Hardcode customized fallback arguments. - makes the hook not require arguments when called.
   ```ts
   import { hook, attach } from "@neuronet/hooks";

   const key = Symbol("myKey");
   const fn = (s: string) => `Value: ${s}`;

   // No key, default args
   const withArgs1 = hook(["default"], fn);
   attach(withArgs1, (next, s) => next(s.toUpperCase()));
   withArgs1(); // "Value: DEFAULT"

   // With key and default args
   const withArgs2 = hook(key, ["default"], fn);
   attach(key, (next, s) => next(s.toUpperCase()));
   withArgs2(); // "Value: DEFAULT"

   // With key, name and default args
   const withArgs3 = hook(key, "methodB", ["default"], (s: string) => `Value: ${s}`);
   attach(key, "methodB", (next, s) => next(s.toUpperCase()));
   withArgs3(); // "Value: DEFAULT"
   ```

### Decorators: `@Hook` and `@hook()`

_Brief: Apply hooks directly onto class constructors, prototypes, methods, getters, setters, and fields._

**Class Structure Support:**

- **Public/Private Methods:** Both `#privateMethod()` and `publicMethod()` can be hooked. Midlewares are attached identically: `attach(instance, "#privateMethod", ...)`
- **Static Methods:** Both public and private static methods are supported. Middleware is attached onto the class constructor: `attach(Class, "staticMethod", ...)`
- **Getters/Setters:** Handled as two separate hooks (`get <propertyName>` and `set <propertyName>`). Note that getter middleware cannot intercept arguments (as there are none) and expects `next()` without parameters.
- **Fields:** Handled as an `init <propertyName>` hook which resolves initial assignments.

### Composite Keys & Middleware Execution Order

_Brief: Combines multiple keys to form a cascading parent-child hierarchy (e.g. Instance -> Class)._

**Detailed Workflow:**
`composeHookKeys(...keys)` merges multiple individual hook keys into a `HookKeyComposite`.
When a hooked function wielding a composite key is executed, the runtime flattens the composite arrays and evaluates middlewares sequentially from the first array index to the last key provided.

- `@hook()` inside classes automatically uses `composeHookKeys(this, this.constructor)`.
- If you call `attach()` supplying a `HookKeyComposite` as the target, the middleware is forcibly attached _only to the first non-composite array index key_ found implicitly (essentially grabbing the `instance` level inside classes).
- **Execution Order Check:** Middlwares execute sequentially starting with the first tier key (outside ring). This means Instance middlewares run _before_ Class middlewares, and can even suppress or manipulate variables passed to the Class middlewares.

```ts
import { hook, composeHookKeys, attach } from "@neuronet/hooks";

const GlobalKey = Symbol("Global");
const InstanceKey = Symbol("Instance");

const compositeKey = composeHookKeys(InstanceKey, GlobalKey);
const myCompositeFn = hook(compositeKey, "run", (val: string) => val + " Done!");

// Attach to Global
attach(GlobalKey, "run", (next, val) => {
  console.log("Global Middleware");
  return next(val);
});

// Attach to Instance
attach(InstanceKey, "run", (next, val) => {
  console.log("Instance Middleware");
  return next(val);
});

myCompositeFn("Initial");
// Priority order: "Instance Middleware" logs first, then "Global Middleware"
```

### Context and Dynamic Hooks

#### `getCurrentHookKeyContext()`

_Brief: Synchronously fetches the underlying active `HookKey` traversing on the call stack scope._

Allows inline or child hooks implicitly defined as `hook("subName", () => {})` to accurately infer what parent `HookKey` wraps the current iteration state without manually passing identifiers.
Returns a `HookKey`, or `null` if entirely outside any hook callback.

```ts
import { hook, getCurrentHookKeyContext } from "@neuronet/hooks";

const parentKey = Symbol("parent");

const nestedFunction = () => {
  // Falls back onto parentKey since context infers from parentFn wrap
  hook("nestedName", () => {})();
  return getCurrentHookKeyContext();
};

const parentFn = hook(parentKey, "parentName", () => nestedFunction());

parentFn() === parentKey; // true
```

#### `dynamicHookKey(fn)`

_Brief: Wraps a retrieval function to calculate the `HookKey` just-in-time._

Instead of hardcoding a stable object identifier or `Symbol`, `dynamicHookKey` binds an inline formula callback tied against the active `this` context.

```ts
import { hook, dynamicHookKey, attach } from "@neuronet/hooks";

const resolveKey = dynamicHookKey(function (this: any) {
  return this.customId;
});

const myDynamicFn = hook(resolveKey, "myEvt", function (this: any) {
  return "success";
});

const ctx = { customId: Symbol("A") };
attach(ctx.customId, "myEvt", (next) => "intercepted " + next());

myDynamicFn.call(ctx); // use ctx as `this` -> "intercepted success"
```

With a class decorator:

```ts
import { Hook, hook, dynamicHookKey, attach } from "@neuronet/hooks";

@Hook
class MyClass {
  myKey = Symbol("myKey");

  @hook(
    dynamicHookKey(function (this: MyClass) {
      return this.myKey;
    }),
  )
  myMethod() {
    return "ok";
  }
}

const instance = new MyClass();
attach(instance.myKey, "myMethod", (next) => "intercepted " + next());
instance.myMethod(); // "intercepted ok"
```

### Inspecting Hooks

#### `inspectHook(hookFn)`

Examines the inner tracking references and retrieves statistical information on all applied interceptors. Returns an `IHookInspection`.

```ts
import { hook, attach, inspectHook } from "@neuronet/hooks";

const targetFn = hook(Symbol("api"), "request", () => "data");
attach(targetFn, (next) => next());

const metadata = inspectHook(targetFn);
console.log(metadata.middlewareCount); // 1
console.log(metadata.middlewareNames); // ["request"]
```
