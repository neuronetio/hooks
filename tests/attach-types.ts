import { attach, type MiddlewareMethod } from "../src/index";

class Example {
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
