const PREFIX = `[@neuronet/hooks]`;

export const DEFAULT_HOOK_NAME = Symbol("DEFAULT_HOOK_NAME");

/**
 * Hook property key used to store hook metadata on functions and classes.
 */
export const HOOK = Symbol("HOOK");

const noop = (..._args: any[]): any => {};

class HookKeyComposite {
  keys: HookKey[];

  constructor(keys: HookKey[] = []) {
    this.keys = keys;
  }

  flat(keys: HookKey[] = this.keys): Exclude<HookKey, HookKeyComposite>[] {
    const result: HookKey[] = [];
    for (const key of keys) {
      if (key instanceof HookKeyComposite) {
        result.push(...key.flat(key.keys));
      } else {
        result.push(key);
      }
    }
    return result;
  }

  *[Symbol.iterator](): Generator<HookKey, void, undefined> {
    for (const key of this.keys) {
      if (key instanceof HookKeyComposite) {
        yield* key;
      } else {
        yield key;
      }
    }
  }
}

export function composeHookKeys(...keys: HookKey[]): HookKey {
  return new HookKeyComposite(keys);
}

export type HookKeyDynamicFn = () => HookKey;

class HookKeyDynamic {
  fn: HookKeyDynamicFn;

  constructor(fn: HookKeyDynamicFn) {
    this.fn = fn;
  }
}

export function dynamicHookKey(fn: HookKeyDynamicFn): HookKeyDynamic {
  return new HookKeyDynamic(fn);
}

export type HookKeySingle =
  | symbol
  | Function
  | (Record<PropertyKey, any> & ({ length?: never } | { push?: never } | { pop?: never } | { splice?: never }));

/**
 * HookKey can be a symbol, an object, or a function (but not an array).
 * It is used to identify a specific hook context.
 */
export type HookKey = HookKeySingle | HookKeyComposite;

export type HookName = string | symbol;

export interface IHookData<A extends any[] = any[], R = any> {
  origin: (...args: A) => R;
  key: HookKey;
  name: HookName;
  args?: A;
}

export interface IHookFn<A extends any[] = any[], R = any, CallArgs extends any[] = A> {
  (...args: CallArgs): R;
  [HOOK]: IHookData<A, R>;
}

export type MetadataHooks = (string | symbol)[];

let currentHookKey: HookKey | null = null;

export function getCurrentHookKeyContext(): HookKey | null {
  return currentHookKey;
}

/**
 * Creates a hook function that can be used to dynamically and externally add or remove middleware without any further modifications to the function itself.
 * It may also be used as a decorator for class methods, accessors, and fields.
 */
export function hook(): ReturnType<typeof hookDecorator>; // decorator
export function hook(alternativeName: string): ReturnType<typeof hookDecorator>; // decorator
export function hook(dynamic: HookKeyDynamic): ReturnType<typeof hookDecorator>; // decorator
export function hook(alternativeName: string, dynamic: HookKeyDynamic): ReturnType<typeof hookDecorator>; // decorator
export function hook(dynamic: HookKeyDynamic, alternativeName: string): ReturnType<typeof hookDecorator>; // decorator
export function hook<A extends any[], R>(fn: ((...args: A) => R) | null): IHookFn<A, R>;
export function hook<A extends any[], R>(args: A, fn: ((...args: A) => R) | null): IHookFn<A, R, []>;
export function hook<A extends any[], R>(name: HookName, fn: ((...args: A) => R) | null): IHookFn<A, R>;
export function hook<A extends any[], R>(name: HookName, args: A, fn: ((...args: A) => R) | null): IHookFn<A, R, []>;
export function hook<A extends any[], R>(key: HookKey, fn: ((...args: A) => R) | null): IHookFn<A, R>;
export function hook<A extends any[], R>(key: HookKey, args: A, fn: ((...args: A) => R) | null): IHookFn<A, R, []>;
export function hook<A extends any[], R>(key: HookKey, name: HookName, fn: ((...args: A) => R) | null): IHookFn<A, R>;
export function hook<A extends any[], R>(
  key: HookKey,
  name: HookName,
  args: A,
  fn: ((...args: A) => R) | null,
): IHookFn<A, R, []>;
export function hook<A extends any[] = any[], R = any, F extends (...args: A) => R = (...args: A) => R>(
  this: any,
  arg1?: HookKey | F | A | HookName | HookKeyDynamic | null,
  arg2?: HookName | F | A | null,
  arg3?: A | F | null,
  arg4?: F | null,
): IHookFn<A, R, any> | ReturnType<typeof hookDecorator> {
  if (arg1 === undefined) {
    return hookDecorator(); // decorator
  }
  if ((arg1 instanceof HookKeyDynamic || typeof arg1 === "string") && arg2 === undefined) {
    return hookDecorator(arg1); // decorator
  }
  if (typeof arg1 === "string" && arg2 instanceof HookKeyDynamic && arg3 === undefined) {
    return hookDecorator(arg2, arg1); // decorator
  }
  if (arg1 instanceof HookKeyDynamic && typeof arg2 === "string" && arg3 === undefined) {
    return hookDecorator(arg2, arg1); // decorator
  }

  let key: HookKey;
  let name: HookName = DEFAULT_HOOK_NAME;
  let argsOverride: A | undefined = undefined;
  let fn: F;

  if (arg4 !== undefined) {
    // hook(key, name, args, fn)
    key = arg1 as HookKey;
    name = arg2 as HookName;
    argsOverride = arg3 as A;
    fn = (arg4 || noop) as F;
  } else if (arg3 !== undefined) {
    // hook(key, name, fn) OR hook(key, args, fn) OR hook(name, args, fn)
    if (typeof arg1 === "string") {
      if (!currentHookKey) {
        throw new Error(`${PREFIX} Hook key must be provided or inferred from the context.`);
      }
      key = currentHookKey;
      name = arg1;
      argsOverride = arg2 as A;
      fn = (arg3 || noop) as F;
    } else {
      key = arg1 as HookKey;
      if (typeof arg2 === "string" || typeof arg2 === "symbol") {
        name = arg2 as HookName;
        fn = (arg3 || noop) as F;
      } else {
        argsOverride = arg2 as A;
        fn = (arg3 || noop) as F;
      }
    }
  } else if (arg2 !== undefined) {
    // hook(args, fn) OR hook(key, fn) OR hook(name, fn)
    if (typeof arg1 === "string") {
      if (!currentHookKey) {
        throw new Error(`${PREFIX} Hook key must be provided or inferred from the context.`);
      }
      key = currentHookKey;
      name = arg1;
      fn = (arg2 || noop) as F;
    } else if (Array.isArray(arg1)) {
      argsOverride = arg1 as A;
      fn = (arg2 || noop) as F;
      key = fn as any as HookKey;
    } else {
      key = arg1 as HookKey;
      fn = (arg2 || noop) as F;
    }
  } else {
    // hook(fn)
    fn = (arg1 || noop) as F;
    key = fn as any as HookKey;
  }

  const _hookData: IHookData<A, R> = {
    origin: fn,
    key,
    name,
    args: argsOverride,
  };

  function runHook(this: any, ...args: any[]) {
    let key = _hookData.key;
    const oldHookKey = currentHookKey;

    // we need to resolve dynamic keys for nested hooks here, because otherwise it will cause incorrect `this` inside dynamic key function
    // in other words, sub hook `this` should not be used for parent hook dynamic key function
    while (key instanceof HookKeyDynamic) {
      key = key.fn.call(this);
    }
    currentHookKey = key;

    let next: MiddlewareNext<A, R> = _hookData.origin;

    if (key instanceof HookKeyComposite) {
      const keyComposite = key as HookKeyComposite;
      if (keyComposite.keys.length === 0) {
        const result = _hookData.origin(...(argsOverride || (args as any as A)));
        currentHookKey = oldHookKey;
        return result;
      }
      const flat = keyComposite.flat();
      let i = 1;
      key = flat[0]!;
      next = (...args: A) => {
        if (i < keyComposite.keys.length) {
          return runMiddleware(flat[i++]!, _hookData.name, next, ...args);
        } else {
          return _hookData.origin(...args);
        }
      };
    }
    const result = runMiddleware(key, _hookData.name, next, ...(argsOverride || (args as any as A)));
    currentHookKey = oldHookKey;
    return result;
  }

  runHook[HOOK] = _hookData;

  return runHook as any;
}

export function Hook(_Class: any, context: ClassDecoratorContext) {
  context.addInitializer(function (this: any) {
    const hooks: MetadataHooks = (context.metadata.hooks as MetadataHooks) || [];
    for (const propertyKey of hooks) {
      const hooked = this.prototype[propertyKey];
      if (hooked && (hooked as any)[HOOK] === undefined) {
        (hooked as any)[HOOK] = {
          origin: hooked,
          key: this,
          name: propertyKey,
        };
      }
    }
  });
}

export type DecoratorResult = (value: any, context: ClassMemberDecoratorContext) => any;

/**
 * Decorator for class methods that wraps the method in a hook.
 * Supports only ECMA TC39 Stage 3+ decorators.
 */
export function hookDecorator(): DecoratorResult;
export function hookDecorator(dynamicKey: HookKeyDynamic): DecoratorResult;
export function hookDecorator(alternativeName: string): DecoratorResult;
export function hookDecorator(dynamicKeyOrName: HookKeyDynamic | string): DecoratorResult;
export function hookDecorator(dynamicKey: HookKeyDynamic, alternativeName: string): DecoratorResult;
export function hookDecorator(alternativeName: string, dynamicKey: HookKeyDynamic): DecoratorResult;
export function hookDecorator(
  dynamicKey?: HookKeyDynamic | string,
  alternativeName?: HookKeyDynamic | string,
): DecoratorResult {
  if (typeof dynamicKey === "string") {
    const _str = dynamicKey;
    dynamicKey = alternativeName as HookKeyDynamic;
    alternativeName = _str as string;
  }
  return function decorate(this: any, value: any, context: ClassMemberDecoratorContext): any {
    let propertyKey = context.name;
    let hookName = (alternativeName || propertyKey) as string | symbol;

    if (!context.private && context.kind === "method") {
      const metadata: DecoratorMetadataObject = context.metadata;
      const hooks: MetadataHooks = (metadata.hooks as MetadataHooks) || (metadata.hooks = []);
      hooks.push(propertyKey);

      context.addInitializer(function (this: any) {
        // reassign & redecorate at the initialization phase because of different `Hook` decorator keys
        // instance is working on composite keys while class is working on single key (class constructor)
        // we shouldn't change original class keys, we may change only our current instance keys
        // also when we are working with static methods, we should use class constructor which isn't available earlier
        if (context.static) {
          this[propertyKey] = hook(dynamicKey ?? this, hookName, value.bind(this));
        } else {
          // instance has higher priority than class, so we can override middleware for specific instance and it can suppress calling class middlewares
          this[propertyKey] = hook(dynamicKey ?? composeHookKeys(this, this.constructor), hookName, value.bind(this));
        }
      });

      return value;
    }

    if (context.kind === "accessor") {
      const { get, set } = value;
      const getHookKey = Symbol(`[hook][get ${String(propertyKey)}]`);
      const setHookKey = Symbol(`[hook][set ${String(propertyKey)}]`);
      const initHookKey = Symbol(`[hook][init ${String(propertyKey)}]`);
      return {
        get: function runHook(this: any, ...args: any[]) {
          if (!this[getHookKey]) {
            this[getHookKey] = hook(
              // instance has higher priority than class, so we can override middleware for specific instance and it can suppress calling class middlewares
              dynamicKey ?? composeHookKeys(this, this.constructor),
              "get " + String(hookName),
              // we don't override arguments here, because getter does not have any, and users may forgot to add them, and if they do, it will return undefined
              // it may be also confusing when user want to pass undefined in the middleware with calling empty `next()` because he want undefined as a result
              // and we will override it with original value like `(val: any) => arguments.length > 0 ? arguments[0] : val`
              // it is very risky to add magic like that, so while it also may be confusing that `next() + value` will first call `next` middlewares and then decorate the result,
              // but it is more secure way
              // when someone is calling `next() + value` it must think about what is going to happen
              get.bind(this),
            );
          }
          return this[getHookKey](...args);
        },
        set: function runHook(this: any, ...args: any[]) {
          if (!this[setHookKey]) {
            this[setHookKey] = hook(
              // instance has higher priority than class, so we can override middleware for specific instance and it can suppress calling class middlewares
              dynamicKey ?? composeHookKeys(this, this.constructor),
              "set " + String(hookName),
              set.bind(this),
            );
          }
          return this[setHookKey](...args);
        },
        init: function runHook(this: any, ...args: any[]) {
          if (!this[initHookKey]) {
            this[initHookKey] = hook(
              // instance has higher priority than class, so we can override middleware for specific instance and it can suppress calling class middlewares
              dynamicKey ?? composeHookKeys(this, this.constructor),
              "init " + String(hookName),
              (initialValue: any) => initialValue,
            );
          }
          return this[initHookKey](...args);
        },
      };
    }

    if (context.kind === "field") {
      propertyKey = "init " + String(propertyKey);
      hookName = "init " + String(hookName);
      value = (initialValue: any) => initialValue;
    } else if (context.kind === "getter") {
      propertyKey = "get " + String(propertyKey);
      hookName = "get " + String(hookName);
    } else if (context.kind === "setter") {
      propertyKey = "set " + String(propertyKey);
      hookName = "set " + String(hookName);
    }

    // lazy evaluation for private methods that cannot be changed later
    const hookKey = Symbol(`[hook][${String(propertyKey)}]`);
    return function runHook(this: any, ...args: any[]) {
      if (!this[hookKey]) {
        // instance has higher priority than class, so we can override middleware for specific instance and it can suppress calling class middlewares
        this[hookKey] = hook(dynamicKey ?? composeHookKeys(this, this.constructor), hookName, value.bind(this));
      }
      return this[hookKey](...args);
    };
  };
}

export type MiddlewareMethod<A extends any[] = any[], R = any> = (next: (...args: A) => R, ...args: A) => R;

export interface IMiddlewareMethods {
  [key: string | symbol]: MiddlewareMethod[];
}

export const middlewares: WeakMap<HookKey, IMiddlewareMethods> = new WeakMap();

export function attach<A extends any[] = any[], R = any>(hookFn: IHookFn<A, R>, fn: MiddlewareMethod<A, R>): () => void;
export function attach<A extends any[] = any[], R = any>(key: HookKey, fn: MiddlewareMethod<A, R>): () => void;
export function attach<A extends any[] = any[], R = any>(
  key: HookKey,
  name: HookName,
  fn: MiddlewareMethod<A, R>,
): () => void;

export function attach<A extends any[] = any[], R = any>(
  arg1: HookKey | IHookFn<A, R>,
  arg2: HookName | MiddlewareMethod<A, R>,
  arg3?: MiddlewareMethod<A, R>,
) {
  let key: HookKey;
  let name: HookName = DEFAULT_HOOK_NAME;
  let fn: MiddlewareMethod<A, R>;

  const maybeHook = (arg1 as IHookFn<A, R>)[HOOK];
  if (maybeHook) {
    key = maybeHook.key;
    name = maybeHook.name;
  } else {
    key = arg1 as HookKey;
  }

  if (arg3) {
    // middleware(key, name, fn) OR middleware(hookFn, name, fn)
    name = arg2 as HookName;
    fn = arg3;
  } else if (typeof arg2 === "function") {
    // middleware(hookFn, fn) OR middleware(key, fn)
    fn = arg2 as MiddlewareMethod<A, R>;
  } else {
    throw new Error(`${PREFIX}[attach] Invalid arguments`);
  }

  if (key instanceof HookKeyDynamic) {
    throw new Error(
      `${PREFIX}[attach] Cannot attach middleware to dynamic hook key. Use static hook key or composite keys instead.`,
    );
  }

  if (key instanceof HookKeyComposite) {
    // by default use first key to attach middleware as if it was normal middleware with no levels
    // because first key is the instance key that might be overridden
    // if you want to attach middleware to the key from level below, then you need to specify it explicitly
    const flat = key.flat();
    key = flat[0]!;
  }

  const methods = middlewares.getOrInsert(key, {});
  let method = methods[name] as MiddlewareMethod[] | undefined;

  if (!method) {
    method = [];
    methods[name] = method;
  }

  method.push(fn);
  return () => detach(key, name, fn);
}

export function detach(key: HookKey, name: HookName, fn: MiddlewareMethod): void {
  const methods = middlewares.get(key);
  if (!methods) {
    return;
  }

  const method = methods[name];
  if (!method) {
    return;
  }

  const index = method.indexOf(fn);
  if (index !== -1) {
    method.splice(index, 1);
    if (method.length === 0) {
      delete methods[name];
      if (Object.keys(methods).length === 0) {
        middlewares.delete(key);
      }
    }
  }
}

export type MiddlewareNext<A extends any[] = any[], R = any> = ((...args: A) => R) | null;

function runMiddleware<A extends any[] = any[], R = any>(
  key: HookKeySingle,
  name: HookName,
  next: MiddlewareNext<A, R>,
  ...args: A
): R {
  const actualNext = next || noop;
  const methods = middlewares.get(key);
  if (!methods) {
    return actualNext(...args);
  }

  const method = methods[name];
  if (!method) {
    return actualNext(...args);
  }
  const oldHookKey = currentHookKey;
  // we need to switch to key from current middleware, because middlewares may call hooks too (or even save them somewhere)
  // if we rely on currentHookKey from running context, then running with different composites will create hooks differently each time
  // additionally, it is not intuitive that when you declare middleware with specific key, other key will be used instead (composite)
  currentHookKey = key;

  let index = 0;
  const runner = (...runnerArgs: A): R => {
    if (index < method.length) {
      const fn = method[index++]!;
      return fn(runner, ...runnerArgs);
    } else {
      currentHookKey = oldHookKey; // restore original hook key, and leave it as it was before entering middlewares
      return actualNext(...runnerArgs);
    }
  };

  return runner(...args);
}
