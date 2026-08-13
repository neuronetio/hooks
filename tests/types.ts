import type { HookExpPropertyKey, ResolveMemberValue, IHookFn, MiddlewareMethod } from "../src/index";
import { argsProvider, attach, Hook, hook, Hooks } from "../src/index";

// NOTICE: tests contains a lot of types that are also checked within "test" script

@Hook()
class Example {
  @hook()
  myMethod(x: number): string {
    return String(x);
  }

  @hook()
  withThis(this: Example, x: number): string {
    return String(this.myMethod(x));
  }

  @hook()
  get value(): number {
    return 1;
  }

  @hook()
  set value(v: number) {}

  @hook()
  initField = "value";

  @hook()
  static staticMethod(x: string): boolean {
    return x.length > 0;
  }

  @hook()
  #privateMethod(x: number): string {
    return String(x);
  }

  privateMethod(x: number): string {
    return this.#privateMethod(x);
  }

  @hook()
  static #privateStaticMethod(x: string): boolean {
    return x.length > 0;
  }

  static privateStaticMethod(x: string): boolean {
    return this.#privateStaticMethod(x);
  }

  @hook()
  static initStaticField = "staticValue";

  @hook()
  static get staticValue(): string {
    return "static";
  }

  @hook()
  static set staticValue(v: string) {}

  @hook()
  static #privateStaticField = "privateStaticValue";

  @hook()
  static get privateStaticField(): string {
    return this.#privateStaticField;
  }

  @hook()
  static set privateStaticField(v: string) {
    this.#privateStaticField = v;
  }

  @hook()
  accessor #privateField = "privateValue";

  @hook()
  #privateFieldInitializer = "privateValue";

  @hook()
  get privateFieldInitializer(): string {
    return this.#privateFieldInitializer;
  }
}

const instance = new Example();

attach(instance, "myMethod", (next, x) => {
  return next(x + 1);
});

attach(instance, "withThis", function (this: Example, next, x) {
  return next(this.myMethod(x + 1).length);
});

attach(Example, "myMethod", (next, x) => {
  return next(x + 1);
});

attach(Example, "staticMethod", (next, x) => {
  return next(x.toUpperCase());
});

attach(instance, "get value", (next) => {
  return next() + 1;
});

attach(instance, "set value", (next, value) => {
  next(value + 1);
});

attach(instance, "init initField", (next, value) => {
  return next(value.toUpperCase());
});

// @ts-expect-error middleware should require a number argument for myMethod
attach(instance, "myMethod", (next, x: string) => next(x));

// @ts-expect-error getters should not receive a parameter
attach(instance, "get value", (next, value: number) => next(value));

// @ts-expect-error setters should require a number value
attach(instance, "set value", (next, value: string) => next(value));

const fallbackMiddleware: MiddlewareMethod<any[], unknown> = (next, ...args) => next(...args);
attach(Symbol("fallback"), "plain-name", fallbackMiddleware);

let ManualExample = class ManualExample {
  myMethod(x: number): string {
    return String(x);
  }

  withThis(this: Example, x: number): string {
    return String(this.myMethod(x));
  }

  get value(): number {
    return 1;
  }

  set value(v: number) {}

  initField = "value";

  static staticMethod(x: string): boolean {
    return x.length > 0;
  }
};

ManualExample = Hooks(ManualExample)
  .method("myMethod")
  .method("withThis")
  .getter("value")
  .setter("value")
  .field("initField")
  .accessor("initField")
  .get();

ManualExample = Hooks(ManualExample)
  // @ts-expect-error method does not exist
  .method("nonExistingMethod")
  // @ts-expect-error getter does not exist
  .getter("nonExistingGetter")
  // @ts-expect-error setter does not exist
  .setter("nonExistingSetter")
  // @ts-expect-error accessor does not exist
  .accessor("nonExistingAccessor")
  // @ts-expect-error field does not exist
  .field("nonExistingField")
  .get();

attach(ManualExample, "myMethod", (next, x) => {
  return next(x + 1);
});

// @ts-expect-error middleware should require a number argument for myMethod
attach(ManualExample, "myMethod", (next, x: string) => {
  // @ts-expect-error middleware should require a number argument for myMethod
  return next(x + 1);
});

attach(ManualExample, "init value", (next, value) => {
  return next(value + 1);
});

// @ts-expect-error middleware should require a number argument for myMethod
attach(ManualExample, "init value", (next, value: string) => {
  // @ts-expect-error number is expected
  return next(value + 1);
});

attach(ManualExample, "staticMethod", (next, x) => {
  return next(x.toUpperCase());
});

// @ts-expect-error middleware should require a string argument for staticMethod
attach(ManualExample, "staticMethod", (next, x: number) => {
  // @ts-expect-error string is expected
  return next(x.toUpperCase());
});

class FnManualExample {
  myMethod(x: number): string {
    return String(x);
  }

  withThis(this: Example, x: number): string {
    return String(this.myMethod(x));
  }

  get value(): number {
    return 1;
  }

  set value(v: number) {}

  initField = "value";

  static initStatic = "value";

  static staticMethod(x: string): boolean {
    return x.length > 0;
  }

  static get staticGet() {
    return "value";
  }

  static set staticSet(v: string) {
    this.initStatic = v;
  }
}

hook.method(FnManualExample, "myMethod");
hook.method(FnManualExample, "withThis");
hook.getter(FnManualExample, "value");
hook.setter(FnManualExample, "value");
hook.field(FnManualExample, "initField");
hook.method(FnManualExample, "staticMethod");

// @ts-expect-error hookMethod should reject non existing method
hook.method(FnManualExample, "nonExistingMethod");
// @ts-expect-error hookGetter should reject non existing getter
hook.getter(FnManualExample, "nonExistingGetter");
// @ts-expect-error hookSetter should reject non existing setter
hook.setter(FnManualExample, "nonExistingSetter");
// @ts-expect-error hookField should reject non existing field
hook.field(FnManualExample, "nonExistingField");
// @ts-expect-error hookMethod should reject non existing accessor
hook.method(FnManualExample, "nonExistingAccessor");

attach(FnManualExample, "myMethod", (next, x) => {
  return next(x + 1);
});

// @ts-expect-error middleware should require a number argument for myMethod
attach(FnManualExample, "myMethod", (next, x: string) => {
  // @ts-expect-error middleware should require a number argument for myMethod
  return next(x + 1);
});

attach(FnManualExample, "init value", (next, value) => {
  return next(value + 1);
});

// @ts-expect-error middleware should require a number argument for myMethod
attach(FnManualExample, "init value", (next, value: string) => {
  // @ts-expect-error number is expected
  return next(value + 1);
});

const _T: HookExpPropertyKey<"static init initStatic"> = "initStatic";
const _T2: ResolveMemberValue<typeof FnManualExample, HookExpPropertyKey<"static init initStatic">> = "value";
const _T3: ResolveMemberValue<typeof FnManualExample, "initStatic"> = "value";
attach(FnManualExample, "static init initStatic", (next, value) => {
  return next(value);
});

// @ts-expect-error middleware should require a string argument for initStatic
attach(FnManualExample, "static init initStatic", (next, value: number) => {
  next("test");
  return 8;
});

attach(FnManualExample, "static get staticGet", (next) => {
  return next();
});

// @ts-expect-error return value should be a string
attach(FnManualExample, "static get staticGet", (next) => {
  next();
  return 8;
});

attach(FnManualExample, "static set staticSet", (next, value) => {
  return next(value);
});

// @ts-expect-error middleware should require a string argument for staticSet
attach(FnManualExample, "static set staticSet", (next, value: number) => {
  // @ts-expect-error string is expected
  return next(8);
});

attach(FnManualExample, "static staticMethod", (next, x) => {
  return next(x.toUpperCase());
});

// @ts-expect-error middleware should require a string argument for staticMethod
attach(FnManualExample, "static staticMethod", (next, x: number) => {
  // @ts-expect-error string is expected
  return next(x);
});

// @ts-expect-error middleware should require a string argument for staticMethod
attach(FnManualExample, "staticMethod", (next, x: number) => {
  // @ts-expect-error string is expected
  return next(x.toUpperCase());
});

attach(Symbol("anysym"), "non_exists", (next) => {
  next();
});

attach(FnManualExample, "non_existent", (next) => {
  next();
  return 9;
});

const _fn1: IHookFn<[x: number], string, [x: number]> = hook([instance, Example], "myMethod", (x: number) => String(x));
const _fn2: IHookFn<[x: number], string, [x: number]> = hook(
  [instance, Example],
  "myMethod",
  argsProvider(4),
  (x: number) => String(x),
);
const _fn3: IHookFn<[x: number], string, [x: number]> = hook(instance, "myMethod", (x: number) => String(x));
const _fn4: IHookFn<[x: number], string, [x: number]> = hook(Example, "myMethod", (x: number) => String(x));

const predefinedKeys = [instance, Example];
const predefinedKeysAny: any[] = [instance, Example];

class Service {
  #instPrv = "prv";

  pre = hook(predefinedKeys, "getVal", (v: string) => {
    return v + " " + this.#instPrv.toUpperCase();
  });

  pre2 = hook(predefinedKeys, "getVal", argsProvider("hello"), (v: string) => {
    return v + " " + this.#instPrv.toUpperCase();
  });

  pre3 = hook(predefinedKeysAny, "getVal", (v: string) => {
    return v + " " + this.#instPrv.toUpperCase();
  });

  pre4 = hook(predefinedKeysAny, "getVal", argsProvider("hello"), (v: string) => {
    return v + " " + this.#instPrv.toUpperCase();
  });

  getVal = hook([this, Service], "getVal", (v: string) => {
    return v + " " + this.#instPrv.toUpperCase();
  });

  getValArgs = hook([this, Service], "getValArgs", argsProvider(this.#instPrv), (v: string) => {
    return v + " " + this.#instPrv.toUpperCase();
  });

  getValTypeInst = hook(this, "getVal", (v: string) => {
    return v + " " + this.#instPrv.toUpperCase();
  });

  getValTypeClass = hook(Service, "getVal", (v: string) => {
    return v + " " + this.#instPrv.toUpperCase();
  });

  static #prv = "prv";

  static staticGetVal = hook(this, "staticGetVal", (v: string) => {
    return v + " " + this.#prv.toUpperCase();
  });

  static staticGetValArgs = hook(this, "staticGetValArgs", argsProvider(this.#prv), (v: string) => {
    return v + " " + this.#prv.toUpperCase();
  });
}

const _service = new Service();

const h1 = hook((a: string, b: number) => Symbol(a + b));

attach(h1, (_next, _a, _b) => {
  return Symbol("s");
});

// @ts-expect-error return symbol
attach(h1, (_next, _a, _b) => {
  return 4;
});

const BuilderClass = hook
  .builder(
    class BuilderClass {
      myField = 10;
      method(x: string): string {
        return x + ":orig";
      }
    },
  )
  .run((Class) => {
    Class.prototype.method = function (x: string) {
      return x + ":hooked";
    };
    attach(Class, "init myField", (next, x) => next(x + 1));
    // @ts-expect-error init myField should require a number argument
    attach(Class, "init myField", (next, x) => next(x + "no_string"));
  })
  .field("myField")
  .method("method")
  .get();

const b = new BuilderClass();
b.method("test");
const _x = b.myField;
