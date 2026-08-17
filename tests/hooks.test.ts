import { describe, it, expect, vi } from "vitest";

import type { HookKeyOrKeys } from "../src";
import {
  DEFAULT_HOOK_NAME,
  HOOK_DATA,
  hook,
  argsProvider,
  attach,
  detach,
  inspectHook,
  getCurrentHookKeyContext,
  middleware,
  getMiddleware,
  noop,
  bypassMiddleware,
} from "../src";

describe("hooks", () => {
  describe("basic functionality", () => {
    it("should run the original function when no middleware is present", () => {
      const key = Symbol("test");
      const name = "testMethod";
      const originalFn = vi.fn((a: number, b: number) => a + b);

      const wrappedFn = hook(key, name, originalFn);
      const result = wrappedFn(2, 3);

      expect(result).toBe(5);
      expect(originalFn).toHaveBeenCalledWith(2, 3);
    });

    it("should preserve the receiver context for wrapped functions", () => {
      const ctx = {
        value: 5,
        multiply(n: number) {
          return this.value + n;
        },
      };

      const wrapped = hook(function (this: typeof ctx, n: number) {
        return this.multiply(n);
      });

      expect(wrapped.call(ctx, 3)).toBe(8);
    });

    it("should expose debugging info for hooks", () => {
      const key = Symbol("debug");
      const wrapped = hook(key, "debugName", (x: number) => x + 1);

      attach(key, "debugName", (next, x) => next(x + 1));

      const info = inspectHook(wrapped);
      expect(info.key).toBe(key);
      expect(info.name).toBe("debugName");
      expect(info.middlewareCount).toBe(1);
      expect(info.middlewareNames).toEqual(["debugName"]);
    });

    it("should throw when inspecting a function without hook metadata", () => {
      const plainFn = () => 42;

      expect(() => inspectHook(plainFn as any)).toThrowError("[inspectHook] Hook function metadata not found.");
    });

    it("should count middleware entries when inspecting a hook", () => {
      const key = { emptyMiddleware: true };
      const wrapped = hook(key, "debugName", (x: number) => x + 1);

      middleware.set(key as any, { debugName: [] as any } as any);

      const info = inspectHook(wrapped);
      expect(info.middlewareCount).toBe(0);
      expect(info.middlewareNames).toEqual(["debugName"]);
    });

    it("should count one middleware entry when inspecting a hook", () => {
      const key = { middleware: true };
      const wrapped = hook(key, "debugName", (x: number) => x + 1);

      middleware.set(key as any, { debugName: [() => undefined] as any } as any);

      const info = inspectHook(wrapped);
      expect(info.middlewareCount).toBe(1);
      expect(info.middlewareNames).toEqual(["debugName"]);
    });

    it("should inspect a hook with no registered middleware", () => {
      const key = { noMiddleware: true };
      const wrapped = hook(key, "debugName", (x: number) => x + 1);

      const info = inspectHook(wrapped);
      expect(info.middlewareCount).toBe(0);
      expect(info.middlewareNames).toEqual([]);
    });

    it("should run middleware before the original function", () => {
      const key: HookKeyOrKeys = Symbol("test");
      const name = "testMethod";
      const originalFn = vi.fn((a: number) => a * 2);

      const logs: string[] = [];
      attach(key, name, (next, a) => {
        logs.push(`middleware 1: ${a}`);
        return next(a + 1);
      });

      const wrappedFn = hook(key, name, originalFn);
      const result = wrappedFn(5);

      expect(result).toBe(12); // (5 + 1) * 2
      expect(logs).toEqual(["middleware 1: 5"]);
      expect(originalFn).toHaveBeenCalledWith(6);
    });

    it("should run multiple middlewares in order", () => {
      const key = Symbol("test");
      const name = "testMethod";
      const originalFn = vi.fn((s: string) => s + "!");

      attach(key, name, (next, s) => next(s + "A"));
      attach(key, name, (next, s) => next(s + "B"));

      const wrappedFn = hook(key, name, originalFn);
      const result = wrappedFn("start");

      expect(result).toBe("startAB!");
    });

    it("should allow middleware to modify the result", () => {
      const key = Symbol("test");
      const name = "testMethod";
      const originalFn = () => "original";

      attach(key, name, (next) => {
        const res = next();
        return res + " + middleware";
      });

      const wrappedFn = hook(key, name, originalFn);
      expect(wrappedFn()).toBe("original + middleware");
    });

    it("should be able to remove middleware", () => {
      const key = Symbol("test");
      const name = "testMethod";
      const originalFn = (n: number) => n;

      const mid = (next: any, n: number) => next(n + 1);
      const unregister = attach(key, name, mid);

      const wrappedFn = hook(key, name, originalFn);
      expect(wrappedFn(1)).toBe(2);

      unregister();
      expect(wrappedFn(1)).toBe(1);
    });

    it("should be able to remove middleware with dedicated function", () => {
      const key = Symbol("test");
      const name = "testMethod";
      const originalFn = (n: number) => n;

      const mid = (next: any, n: number) => next(n + 1);
      attach(key, name, mid);

      const wrappedFn = hook(key, name, originalFn);
      expect(wrappedFn(1)).toBe(2);

      detach(key, name, mid);
      expect(wrappedFn(1)).toBe(1);
    });

    it("should work with multiple middlewares across different overloads", () => {
      const key = { m: 1 };
      const name = "action";
      const originalFn = (v: number) => v * 2;

      attach(key, name, (next, v) => next(v + 1));
      attach(key, name, (next, v) => next(v) + 1);

      // Using hook(key, name, fn)
      const wrapped = hook(key, name, originalFn);
      expect(wrapped(10)).toBe((10 + 1) * 2 + 1); // 23
    });

    it("should work with hook(args, fn) and middleware registered on fn", () => {
      const fn = (a: number) => a;
      attach(fn, (next, a) => next(a + 1));

      expect(hook(argsProvider(10), fn)()).toBe(11);
    });

    it("should work with multiple middlewares and symbols as keys", () => {
      const key = Symbol("myKey");
      const fn = (x: number) => x * x;

      attach(key, (next, x) => next(x + 1));
      attach(key, (next, x) => next(x) - 1);

      expect(hook(key, argsProvider(5), fn)()).toBe((5 + 1) * (5 + 1) - 1); // 35
      expect(hook(key, fn)(5)).toBe((5 + 1) * (5 + 1) - 1); // 35
    });

    it("should work with class methods", () => {
      interface IMyClass {
        myMethod: (x: number) => number;
      }

      class MyClass implements IMyClass {
        myMethod = hook((x: number) => {
          hook("myMethod_sub", null)(x);
          return x + 1;
        });
      }

      const instance = new MyClass();
      expect(instance.myMethod(5)).toBe(6);

      expect((instance.myMethod as any)[HOOK_DATA]).toBeDefined();

      attach(instance.myMethod, (next, x) => next(x * 2));
      expect(instance.myMethod(5)).toBe(11); // (5 * 2) + 1

      let subHookCalledWith = 0;
      attach(instance.myMethod, "myMethod_sub", (next, x) => {
        subHookCalledWith = x;
        return next(x);
      });
      instance.myMethod(7);
      expect(subHookCalledWith).toBe(14); // 7 * 2

      class AnotherClass {
        myMethod(x: number) {
          return hook(this, "myMethod", (y: number) => {
            hook("myMethod_sub", null)(y);
            return y + 1;
          })(x);
        }
      }

      const anotherInstance = new AnotherClass();
      expect(anotherInstance.myMethod(3)).toBe(4);
      attach(anotherInstance, "myMethod", (next, y) => next(y * 3));
      expect(anotherInstance.myMethod(3)).toBe(10); // (3 * 3) + 1

      let subHook2CalledWith = 0;
      attach(anotherInstance, "myMethod_sub", (next, y) => {
        subHook2CalledWith = y;
        return next(y);
      });
      anotherInstance.myMethod(4);
      expect(subHook2CalledWith).toBe(12); // 4 * 3
      // should not be affected
      expect(subHookCalledWith).toBe(14); // 7 * 2
    });
  });

  describe("overloads", () => {
    const originalFn = (a: number, b: number) => a + b;
    const key = { some: "key" };
    const name = "customName";
    const _args = [10, 20] as [number, number];

    it("hook(fn)", () => {
      const wrapped = hook(originalFn);
      expect(wrapped(1, 2)).toBe(3);
      expect(wrapped[HOOK_DATA].keyOrKeys).toBe(originalFn);
      expect(wrapped[HOOK_DATA].name).toBe(DEFAULT_HOOK_NAME);
    });

    it("hook(args, fn)", () => {
      const wrapped = hook(argsProvider(..._args), originalFn);
      expect(wrapped()).toBe(30);
      expect(wrapped[HOOK_DATA].keyOrKeys).toBe(originalFn);
      expect(wrapped[HOOK_DATA].argsProvider?.args()).toEqual(_args);
    });

    it("hook(key, fn)", () => {
      const wrapped = hook(key, originalFn);
      expect(wrapped(1, 2)).toBe(3);
      expect(wrapped[HOOK_DATA].keyOrKeys).toBe(key);
      expect(wrapped[HOOK_DATA].name).toBe(DEFAULT_HOOK_NAME);
    });

    it("hook(key, args, fn)", () => {
      const wrapped = hook(
        key,
        argsProvider(() => _args),
        originalFn,
      );
      expect(wrapped()).toBe(30);
      expect(wrapped[HOOK_DATA].keyOrKeys).toBe(key);
      expect(wrapped[HOOK_DATA].argsProvider?.args()).toEqual(_args);
    });

    it("hook(key, name, fn)", () => {
      const wrapped = hook(key, name, originalFn);
      expect(wrapped(1, 2)).toBe(3);
      expect(wrapped[HOOK_DATA].keyOrKeys).toBe(key);
      expect(wrapped[HOOK_DATA].name).toBe(name);
    });

    it("hook(key, name, args, fn)", () => {
      const wrapped = hook(
        key,
        name,
        argsProvider(() => _args),
        originalFn,
      );
      expect(wrapped()).toBe(30);
      expect(wrapped[HOOK_DATA].keyOrKeys).toBe(key);
      expect(wrapped[HOOK_DATA].name).toBe(name);
      expect(wrapped[HOOK_DATA].argsProvider?.args()).toEqual(_args);
    });
  });

  describe("middleware overloads", () => {
    it("middleware(hookFn, fn)", () => {
      const originalFn = (x: number) => x;
      const wrapped = hook({ k: "hookFn" }, "custom", originalFn);

      attach(wrapped, (next, x) => next(x + 1));
      attach(wrapped, (next, x) => {
        return next(x) * 2;
      });

      expect(wrapped(10)).toBe(22);
    });

    it("middleware(key, fn) defaults to 'default' name", () => {
      const key = { k: "keyOnly" };
      const originalFn = (x: number) => x;
      const wrapped = hook(key, originalFn); // default name is DEFAULT_HOOK_NAME

      attach(key, (next, x) => next(x + 2));

      expect(wrapped(10)).toBe(12);
    });

    it("middleware(key, name, fn)", () => {
      const key = { k: "keyAndName" };
      const name = "myMethod";
      const originalFn = (x: number) => x;
      const wrapped = hook(key, name, originalFn);

      attach(key, name, (next, x) => next(x + 3));

      expect(wrapped(10)).toBe(13);
    });

    it("should work with multiple middlewares registered via different overloads for same hook", () => {
      const key = { k: "multi" };
      const name = "multi";
      const originalFn = (x: number) => x;
      const wrapped = hook(key, name, originalFn);

      // registered via key, name
      attach(key, name, (next, x) => next(x + 1));
      // registered via hookFn
      attach(wrapped, (next, x) => next(x) * 2);

      // (10 + 1) * 2 = 22
      expect(wrapped(10)).toBe(22);
    });

    it("multiple middlewares: hookFn + key/name + key only", () => {
      const key = { k: "mix" };
      const name = "action";
      const originalFn = (v: number) => v as any;
      const wrapped = hook(key, name, originalFn);

      attach(wrapped, (next, v) => next(v) + "A");
      attach(key, name, (next, v) => next(v) + "B");

      // another hook with same key but different name
      const wrapped2 = hook(key, "other", originalFn);
      attach(wrapped2, (next, v) => next(v) + "C");

      // hook with same key and default name
      const wrapped3 = hook(key, originalFn);
      attach(key, (next, v) => next(v) + "D");

      expect(wrapped(10)).toBe("10BA");
      expect(wrapped2(10)).toBe("10C");
      expect(wrapped3(10)).toBe("10D");
    });

    it("middleware(fn, fn) where fn has no metadata", () => {
      const fn = (x: number) => x;
      // if I use middleware(fn, mid), it should treat fn as key and use DEFAULT_HOOK_NAME
      attach(fn, (next, x) => next(x + 5));

      const wrapped = hook(fn, fn); // key is fn, name is DEFAULT_HOOK_NAME
      expect(wrapped(10)).toBe(15);
    });
  });

  describe("nested context with automatic key propagation", () => {
    it("hook(name, fn)", () => {
      const key = { k: "auto-key" };
      attach(key, "child", (next, x) => next(x + 1));
      attach(key, "child", (next, x) => next(x) * 2);

      const result = hook(key, "parent", () => {
        const wrapped = hook("child", (x: number) => x);
        expect(wrapped[HOOK_DATA].keyOrKeys).toBe(key);
        return wrapped(10);
      })();

      expect(result).toBe(22); // (10 + 1) * 2
    });

    it("hook(name, args, fn)", () => {
      const key = Symbol("auto-key-symbol");
      attach(key, "child", (next, x) => next(x + 5));
      attach(key, "child", (next, x) => next(x) + 1);

      const result = hook(key, "parent", () => {
        const wrapped = hook("child", argsProvider(10), (x: number) => x);
        return wrapped();
      })();

      expect(result).toBe(16); // (10 + 5) + 1
    });

    it("should throw if called outside of hook context", () => {
      expect(() => hook("someName", () => {})).toThrow(/key must be provided/);
    });

    it("should work with multiple levels of nesting", () => {
      const key1 = { k: "level1" };
      const key2 = { k: "level2" };

      attach(key1, "op1", (next, x) => next(x + 1));
      attach(key2, "op2", (next, x) => next(x * 2));

      const result = hook(key1, "top", () => {
        const r1 = hook("op1", argsProvider(10), (x) => x)(); // uses key1 -> 11

        const r2 = hook(key2, "mid", () => {
          return hook("op2", argsProvider(r1), (x) => x)(); // uses key2 -> 22
        })();

        return hook("op1", argsProvider(r2), (x) => x)(); // back to key1 -> 23
      })();

      expect(result).toBe(23);
    });

    it("should have proper hook key inside middleware and composite keys", () => {
      const key1 = { k: "level1" };
      const key2 = { k: "level2" };

      let key1Called = 0;
      attach(key1, "subHook", (next, x) => {
        expect(getCurrentHookKeyContext()).toBe(key1);
        hook("subMiddleware", () => {
          expect(getCurrentHookKeyContext()).toBe(key1);
          hook("subMiddleware2", () => {
            expect(getCurrentHookKeyContext()).toBe(key1);
          })(); // should use key1
        })();
        key1Called++;
        return next(x + 1);
      });

      let key2Called = 0;
      attach(key2, "subHook", (next, x) => {
        expect(getCurrentHookKeyContext()).toBe(key2);
        hook("subMiddleware", () => {
          expect(getCurrentHookKeyContext()).toBe(key2);
          hook("subMiddleware2", () => {
            expect(getCurrentHookKeyContext()).toBe(key2);
          })(); // should use key2
        })(); // should use key2
        key2Called++;
        return next(x * 2);
      });

      let subMiddlewareKey1Called = 0;
      attach(key1, "subMiddleware", (next, x) => {
        expect(getCurrentHookKeyContext()).toBe(key1);
        subMiddlewareKey1Called++;
        return next(x);
      });

      let subMiddlewareKey2Called = 0;
      attach(key2, "subMiddleware", (next, x) => {
        expect(getCurrentHookKeyContext()).toBe(key2);
        subMiddlewareKey2Called++;
        return next(x);
      });

      let subMiddleware2Key1Called = 0;
      attach(key1, "subMiddleware2", (next, x) => {
        expect(getCurrentHookKeyContext()).toBe(key1);
        subMiddleware2Key1Called++;
        return next(x);
      });

      let subMiddleware2Key2Called = 0;
      attach(key2, "subMiddleware2", (next, x) => {
        expect(getCurrentHookKeyContext()).toBe(key2);
        subMiddleware2Key2Called++;
        return next(x);
      });

      let subHookCalled = 0;
      hook([key1, key2], "top", () => {
        expect(getCurrentHookKeyContext()).toEqual([key1, key2]);
        hook("subHook", () => {
          expect(getCurrentHookKeyContext()).toEqual([key1, key2]);
          subHookCalled++;
        })(); // uses key1 -> 11
        expect(getCurrentHookKeyContext()).toEqual([key1, key2]);
      })();

      expect(key1Called).toBe(1);
      expect(key2Called).toBe(1);
      expect(subMiddlewareKey1Called).toBe(1);
      expect(subMiddlewareKey2Called).toBe(1);
      expect(subHookCalled).toBe(1);
      expect(subMiddleware2Key1Called).toBe(1);
      expect(subMiddleware2Key2Called).toBe(1);
    });
  });

  describe("null function", () => {
    it("should work with hook(null)", () => {
      const h = hook(null);
      expect(h()).toBeUndefined();
    });

    it("should work with hook(args, null)", () => {
      const h = hook([1, 2], null);
      expect(h()).toBeUndefined();
    });

    it("should work with hook(name, null)", () => {
      const key = Symbol("context");
      const result = hook(key, () => {
        const h = hook("test", null);
        return h(1, 2, 3);
      })();
      expect(result).toBeUndefined();
    });

    it("should work with hook(name, args, null)", () => {
      const key = Symbol("context");
      const result = hook(key, () => {
        const h = hook("test", argsProvider(1), null);
        return h();
      })();
      expect(result).toBeUndefined();
    });

    it("should work with hook(key, null)", () => {
      const key = Symbol("key");
      const h = hook(key, null);
      expect(h()).toBeUndefined();
    });

    it("should work with hook(key, args, null)", () => {
      const key = Symbol("key");
      const h = hook(key, argsProvider(1), null);
      expect(h()).toBeUndefined();
    });

    it("should work with hook(key, name, null)", () => {
      const key = Symbol("key");
      const h = hook(key, "test", null);
      expect(h()).toBeUndefined();
    });

    it("should work with hook(key, name, args, null)", () => {
      const key = Symbol("key");
      const h = hook(key, "test", argsProvider(1), null);
      expect(h()).toBeUndefined();
    });

    it("should allow middleware to run even if fn is null", () => {
      const key = Symbol("key");
      const h = hook(key, null);
      let called = false;
      attach(key, (next) => {
        called = true;
        return next();
      });
      h();
      expect(called).toBe(true);
    });
  });

  describe("additional coverage tests", () => {
    it("should throw when hook(name, args, fn) is called outside of hook context", () => {
      // @ts-expect-error no such overload
      expect(() => hook("someName", argsProvider(123), () => {})).toThrow(/key must be provided/);
    });

    it("should work with empty composite hook key keys.length === 0", () => {
      const emptyComposite: any[] = [];
      const fn = (x: number) => x + 10;
      const h = hook(emptyComposite, "someHook", fn);
      expect(h(5)).toBe(15);
    });

    it("should work with empty composite hook key and override args", () => {
      const emptyComposite: any[] = [];
      const fn = (x: number) => x + 10;
      const h = hook(emptyComposite, "someHook", argsProvider(5), fn);
      expect(h()).toBe(15);
    });

    it("should work with empty keys array", () => {
      const fn = (x: number) => x + 10;
      expect(hook([], "someHook", fn)(5)).toBe(15);
      expect(hook([], "someHook", argsProvider(5), fn)()).toBe(15);
    });

    it("should throw when attach is called with invalid arguments", () => {
      const key = Symbol("key");
      expect(() => (attach as any)(key, null)).toThrow(/Invalid arguments/);
    });

    it("should handle detach when no middlewares exist for key", () => {
      const key = Symbol("unregisteredKey");
      const fn = () => {};
      expect(() => detach(key, "someMethod", fn)).not.toThrow();
    });

    it("should handle detach when some methods exist for key but not the target name", () => {
      const key = Symbol("key");
      const fn1 = () => {};
      const fn2 = () => {};
      attach(key, "method1", fn1);
      expect(() => detach(key, "method2", fn2)).not.toThrow();
    });

    it("should fallback to noop in runMiddleware if next is null or falsy", () => {
      const key = Symbol("key");
      const h = hook(key, "method", () => {});
      (h as any)[HOOK_DATA].origin = null;

      let midCalled = 0;
      attach(key, "method", (next) => {
        midCalled++;
        return next();
      });

      expect(h()).toBeUndefined();
      expect(midCalled).toBe(1);
    });

    it("should handle detach when other methods remain registered for key", () => {
      const key = Symbol("keyWithMultipleMethods");
      const fn1 = () => {};
      const fn2 = () => {};
      attach(key, "method1", fn1);
      attach(key, "method2", fn2);

      // Detach only method1
      detach(key, "method1", fn1);

      // Verify that middlewares still has key and method2 is still there
      expect(middleware.has(key)).toBe(true);

      // Clean up method2
      detach(key, "method2", fn2);
      expect(middleware.has(key)).toBe(false);
    });

    it("should handle detach when multiple middlewares are registered for the same name", () => {
      const key = Symbol("keyWithMultipleSameName");
      const fn1 = (next: any, x: any) => next(x);
      const fn2 = (next: any, x: any) => next(x);

      attach(key, "method", fn1);
      const detach2 = attach(key, "method", fn2);

      // Detach only fn2
      detach2();

      // Since fn1 is still registered, the method array is not empty
      const methods = middleware.get(key);
      expect(methods).toBeDefined();
      expect(methods!["method"]).toBeDefined();
      expect(methods!["method"]!.length).toBe(1);

      // Clean up
      detach(key, "method", fn1);
      expect(middleware.has(key)).toBe(false);
    });

    it("should cover false branch of initHookKey check in accessor decorator", () => {
      const decorator = hook();
      const target = {};
      const accessorValue = { get: () => "val", set: () => {} };
      const context = { name: "testProp", kind: "accessor" } as any;
      const result = (decorator as any)(accessorValue, context);

      // Call init the first time
      const initResult1 = result.init.call(target, "first");
      expect(initResult1).toBe("first");

      // Call init the second time
      const initResult2 = result.init.call(target, "second");
      expect(initResult2).toBe("second");
    });

    it("should handle non existent fn in detach gracefully", () => {
      const key = Symbol("nonExistentFn");
      const fn = () => {};
      attach(key, "method", fn);
      expect(() => detach(key, "method", () => {})).not.toThrow();
    });

    it("should get middlewares attached to key and name", () => {
      const key = Symbol("getMiddlewares");
      const name = "method";
      const fn1 = (next: any, x: any) => next(x);
      const fn2 = (next: any, x: any) => next(x);

      attach(key, name, fn1);
      attach(key, name, fn2);

      const methods = getMiddleware(key, name);
      expect(methods).toBeDefined();
      expect(methods).toEqual([fn1, fn2]);

      expect(getMiddleware(key, "nonExistentMethod")).toEqual([]);
      expect(getMiddleware(Symbol("nonExistentKey"), name)).toEqual([]);
    });

    it("should throw when no key is provided within hook(ArgumentProvider, null)", () => {
      expect(() => hook(argsProvider(5), null)).toThrow("key");
    });

    it("should handle hook keys as array hook([], name, fn)", () => {
      const key1 = Symbol("key1");
      const key2 = Symbol("key2");
      const h = hook([key1, key2], "test", (x: number) => x + 1);
      attach(key1, "test", (next, x) => next(x + 1));
      attach(key2, "test", (next, x) => next(x * 2));
      expect(h(5)).toBe(13); // ((5 + 1) * 2) + 1
    });

    it("should handle hook keys as array hook([], name, args, fn)", () => {
      const key1 = Symbol("key1");
      const key2 = Symbol("key2");
      const h = hook([key1, key2], "test", argsProvider(5), (x: number) => x + 1);
      attach(key1, "test", (next, x) => next(x + 1));
      attach(key2, "test", (next, x) => next(x * 2));
      expect(h()).toBe(13); // ((5 + 1) * 2) + 1
    });

    it("should handle attach with empty array of keys", () => {
      expect(attach([], (next, x) => next(x + 1))).toBe(noop);
      expect(attach([], "test", (next, x) => next(x + 1))).toBe(noop);
    });

    it("should not run middlewares with withoutMiddleware context", () => {
      const fn = hook((x: number) => x + 1);
      let middlewareCalled = false;
      attach(fn, (next, x) => {
        middlewareCalled = true;
        return next(x + 10);
      });

      expect(fn(5)).toBe(16);
      expect(middlewareCalled).toBe(true);
      middlewareCalled = false;

      let withoutCalled = false;
      bypassMiddleware(() => {
        withoutCalled = true;
        expect(fn(5)).toBe(6);
        expect(middlewareCalled).toBe(false);
      });
      expect(withoutCalled).toBe(true);
    });

    it("should work with null key", () => {
      let middleware1Called = false;
      // @ts-expect-error testing null key
      const result1 = attach(null, "hello", () => {
        middleware1Called = true;
      });
      expect(result1).toBe(noop);
      let middleware2Called = false;
      // @ts-expect-error testing null key
      const result2 = attach(null, () => {
        middleware1Called = true;
      });
      expect(result2).toBe(noop);
      // @ts-expect-error testing null key
      hook(null, () => {});
      // @ts-expect-error testing null key
      hook(null, "test", () => {});
      expect(middleware1Called).toBe(false);
      expect(middleware2Called).toBe(false);

      // @ts-expect-error testing null key
      const fn = hook(null, "test", () => {});
      expect(fn[HOOK_DATA].keyOrKeys).toBe(null);
      expect(attach(fn, (next) => {})).toBe(noop);
    });

    it("should work with undefined key", () => {
      // @ts-expect-error testing undefined key
      expect(attach(undefined, "test", () => {})).toBe(noop);
    });
  });
});
