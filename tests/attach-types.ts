import type { MiddlewareMethod } from "../src/index";
import { attach, Hook, hook } from "../src/index";

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
