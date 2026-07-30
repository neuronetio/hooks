import type { IHookFn, MiddlewareMethod } from "../src/index";
import {
  attach,
  composeHookKeys,
  Hook,
  hook,
  hookField,
  hookGetter,
  hookMethod,
  Hooks,
  hookSetter,
} from "../src/index";

// NOTICE: tests contains a lot of types that are also checked within "test" script

@Hook
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
  .build();

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
  .build();

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

let FnManualExample = class FnManualExample {
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

FnManualExample = hookMethod(FnManualExample, "myMethod");
FnManualExample = hookMethod(FnManualExample, "withThis");
FnManualExample = hookGetter(FnManualExample, "value");
FnManualExample = hookSetter(FnManualExample, "value");
FnManualExample = hookField(FnManualExample, "initField");
FnManualExample = hookMethod(FnManualExample, "staticMethod");

// @ts-expect-error hookMethod should reject non existing method
FnManualExample = hookMethod(FnManualExample, "nonExistingMethod");
// @ts-expect-error hookGetter should reject non existing getter
FnManualExample = hookGetter(FnManualExample, "nonExistingGetter");
// @ts-expect-error hookSetter should reject non existing setter
FnManualExample = hookSetter(FnManualExample, "nonExistingSetter");
// @ts-expect-error hookField should reject non existing field
FnManualExample = hookField(FnManualExample, "nonExistingField");
// @ts-expect-error hookMethod should reject non existing accessor
FnManualExample = hookMethod(FnManualExample, "nonExistingAccessor");

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

attach(FnManualExample, "staticMethod", (next, x) => {
  return next(x.toUpperCase());
});

// @ts-expect-error middleware should require a string argument for staticMethod
attach(FnManualExample, "staticMethod", (next, x: number) => {
  // @ts-expect-error string is expected
  return next(x.toUpperCase());
});

const _fn1: IHookFn<[x: number], string, [x: number]> = hook(
  composeHookKeys(instance, Example),
  "myMethod",
  (x: number) => String(x),
);

const _fn2: IHookFn<[x: number], string, [x: number]> = hook(instance, "myMethod", (x: number) => String(x));

const _fn3: IHookFn<[x: number], string, [x: number]> = hook(Example, "myMethod", (x: number) => String(x));

class Service {
  #instPrv = "prv";

  getVal = hook(composeHookKeys(this, Service), "getVal", (v: string) => {
    return v + " " + this.#instPrv.toUpperCase();
  });

  getValTypeInst = hook(this, "getVal", (v: string) => {
    return v + " " + this.#instPrv.toUpperCase();
  });

  getValTypeClass = hook(Service, "getVal", (v: string) => {
    return v + " " + this.#instPrv.toUpperCase();
  });

  getValArgs = hook(composeHookKeys(this, Service), "getValArgs", [this.#instPrv], (v: string) => {
    return v + " " + this.#instPrv.toUpperCase();
  });

  static #prv = "prv";

  static staticGetVal = hook(this, "staticGetVal", (v: string) => {
    return v + " " + this.#prv.toUpperCase();
  });

  static staticGetValArgs = hook(this, "staticGetValArgs", [this.#prv], (v: string) => {
    return v + " " + this.#prv.toUpperCase();
  });
}

const _service = new Service();
