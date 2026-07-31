const PREFIX = `[@neuronet/hooks]`;

export const DEFAULT_HOOK_NAME = Symbol("DEFAULT_HOOK_NAME");

/**
 * Hook property key used to store hook metadata on functions and classes.
 */
export const HOOK = Symbol("HOOK");

export const noop = (..._args: any[]): any => {};

/**
 * @internal
 */
export const _identity = <T>(value: T): T => value;

export type HookKeyDynamicFn = () => HookKeyOrKeys;

/**
 * Represents a hook key that is resolved dynamically at runtime.
 * The key is resolved by calling the provided function, usually with the `this` context
 * of the hooked method.
 */
export class HookKeyDynamic {
  fn: HookKeyDynamicFn;

  constructor(fn: HookKeyDynamicFn) {
    this.fn = fn;
  }
}

/**
 * Creates a dynamic hook key.
 *
 * @param fn A function that returns a HookKey.
 * @returns A new HookKeyDynamic instance.
 */
export function dynamicHookKey(fn: HookKeyDynamicFn): HookKeyDynamic {
  return new HookKeyDynamic(fn);
}

/**
 * An alias for `dynamicHookKey` to provide a shorter and more convenient name.
 *
 * Creates a dynamic hook key.
 *
 * @param fn A function that returns a HookKey.
 * @returns A new HookKeyDynamic instance.
 */
export const dynKey = dynamicHookKey;

/**
 * A utility class to provide the arguments passed to the middleware and hook functions.
 */
export class ArgumentsProvider<A extends any[] = any[]> {
  args: () => A;
  constructor(args: A | (() => A)) {
    this.args = typeof args === "function" ? args : () => args;
  }
}

export type ArgumentsFromProvider<AP extends ArgumentsProvider<any[]>> =
  AP extends ArgumentsProvider<infer A> ? A : never;

/**
 * Creates an ArgumentsProvider instance to provide the arguments passed to the middleware and hook functions.
 */
export function argsProvider<A extends any[]>(dynamicArgs: () => A): ArgumentsProvider<A>;
export function argsProvider<A extends any[]>(...args: A): ArgumentsProvider<A>;
export function argsProvider<A extends any[]>(...args: any[]): ArgumentsProvider<A> {
  return new ArgumentsProvider(args.length === 1 && typeof args[0] === "function" ? args[0] : args);
}

export type HookKeySingle = symbol | Function | object;
export type HookKeyComposite = [HookKeySingle, ...HookKeySingle[]]; // at least one key is required, otherwise ts may have problems with type inference
/**
 * HookKey can be a symbol, an object, or a function (but not an array).
 * It is used to identify a specific hook context.
 */
export type HookKeyOrKeys = HookKeyComposite | HookKeySingle;

export type HookName = string | symbol;

/**
 * Metadata stored on a hook function.
 */
export interface IHookData<A extends any[] = any[], R = any> {
  /** The original function being hooked. */
  origin: (...args: A) => R;
  /** The key associated with this hook. */
  keyOrKeys: HookKeyOrKeys;
  /** The name of the hook. */
  name: HookName;
  /** Optional arguments override. */
  argsProvider?: ArgumentsProvider<A>;
}

/**
 * A function wrapped in a hook.
 */
export interface IHookFn<A extends any[] = any[], R = any, CallArgs extends any[] = A> {
  (...args: CallArgs): R;
  /** Metadata for the hook. */
  [HOOK]: IHookData<A, R>;
}

export type MetadataHooks = (string | symbol)[];

let currentHookKey: HookKeyOrKeys | null = null;

/**
 * Retrieves the hook key context for the currently executing hook.
 * This is useful for inferring the hook key when it's not explicitly provided.
 *
 * @returns The current HookKey or null if no hook is executing.
 */
export function getCurrentHookKeyContext(): HookKeyOrKeys | null {
  return currentHookKey;
}

/**
 * Creates a hook function that can be used to dynamically and externally add or remove middleware
 * without any further modifications to the function itself.
 *
 * Can also be used as a decorator for class methods, accessors, and fields.
 *
 * &nbsp;
 *
 * ### Examples
 *
 * &nbsp;
 *
 * #### As a function wrapper
 * ```ts
 * const myFn = hook((a: number) => a + 1);
 * myFn(5); // 6
 * attach(myFn, (next, a) => next(a) * 2);
 * myFn(5); // 12
 * ```
 * &nbsp;
 *
 * #### As a decorator
 * ```ts
 * class MyClass {
 *   @hook()
 *   myMethod(a: number) {
 *     return a + 1;
 *   }
 * }
 * attach(MyClass, "myMethod", (next, a) => next(a) * 2);
 * const instance = new MyClass();
 * instance.myMethod(5); // 12
 *
 * // middleware only for specific instance
 * attach(instance, "myMethod", (next, a) => next(a) + 3);
 * instance.myMethod(5); // 15
 * ```
 *
 * &nbsp;
 *
 * See `https://github.com/neuronet/hooks#readme` for more examples and full documentation.
 */

// COMPOSITES must go first, because HookKeySingle might be an object which is array also

/** Wraps a function in a hook with a specific key */
export function hook<const C extends HookKeyComposite, Args extends any[], R extends any>(
  keys: C,
  fn: (...args: Args) => R | null,
): IHookFn<Args, R>;
/** Wraps a function in a hook with a specific key and overridden arguments */
export function hook<const C extends HookKeyComposite, Args extends any[], R extends any>(
  keys: C,
  args: ArgumentsProvider<Args>,
  fn: (...args: Args) => R | null,
): IHookFn<Args, R, []>;
/** Wraps a function in a hook with a specific key and name */
export function hook<const C extends HookKeyComposite, Args extends any[], R extends any>(
  keys: C,
  name: HookName,
  fn: (...args: Args) => R | null,
): IHookFn<Args, R>;
/** Wraps a function in a hook with a specific key, name, and overridden arguments */
export function hook<const C extends HookKeyComposite, Args extends any[], R extends any>(
  keys: C,
  name: HookName,
  args: ArgumentsProvider<Args>,
  fn: (...args: Args) => R | null,
): IHookFn<Args, R, []>;

export function hook(): ReturnType<typeof hookDecorator>; // decorator
/** Decorator with alternative name */
export function hook(alternativeName: string): ReturnType<typeof hookDecorator>; // decorator
/** Decorator with dynamic key */
export function hook(dynamic: HookKeyDynamic): ReturnType<typeof hookDecorator>; // decorator
/** Decorator with alternative name and dynamic key */
export function hook(alternativeName: string, dynamic: HookKeyDynamic): ReturnType<typeof hookDecorator>; // decorator
/** Decorator with dynamic key and alternative name */
export function hook(dynamic: HookKeyDynamic, alternativeName: string): ReturnType<typeof hookDecorator>; // decorator
/** Wraps a function in a hook */
export function hook<F extends (...args: any[]) => any>(fn: F | null): IHookFn<Parameters<F>, ReturnType<F>>;
/** Wraps a function in a hook with overridden arguments */
export function hook<F extends (...args: any[]) => any>(
  args: ArgumentsProvider<Parameters<F>>,
  fn: F | null,
): IHookFn<Parameters<F>, ReturnType<F>, []>;
/** Wraps a function in a hook with a specific name */
export function hook<F extends (...args: any[]) => any>(
  name: HookName,
  fn: F | null,
): IHookFn<Parameters<F>, ReturnType<F>>;
/** Wraps a function in a hook with a specific name and overridden arguments */
export function hook<F extends (...args: any[]) => any>(
  name: HookName,
  args: ArgumentsProvider<Parameters<F>>,
  fn: F | null,
): IHookFn<Parameters<F>, ReturnType<F>, []>;

/** Wraps a function in a hook with a specific key */
export function hook<F extends (...args: any[]) => any>(
  key: HookKeySingle,
  fn: F | null,
): IHookFn<Parameters<F>, ReturnType<F>>;
/** Wraps a function in a hook with a specific key and overridden arguments */
export function hook<F extends (...args: any[]) => any>(
  key: HookKeySingle,
  args: ArgumentsProvider<Parameters<F>>,
  fn: F | null,
): IHookFn<Parameters<F>, ReturnType<F>, []>;
/** Wraps a function in a hook with a specific key and name */
export function hook<F extends (...args: any[]) => any>(
  key: HookKeySingle,
  name: HookName,
  fn: F | null,
): IHookFn<Parameters<F>, ReturnType<F>>;
/** Wraps a function in a hook with a specific key, name, and overridden arguments */
export function hook<F extends (...args: any[]) => any>(
  key: HookKeySingle,
  name: HookName,
  args: ArgumentsProvider<Parameters<F>>,
  fn: F | null,
): IHookFn<Parameters<F>, ReturnType<F>, []>;

export function hook<
  A extends any[] = any[],
  AP extends ArgumentsProvider<A> = ArgumentsProvider<A>,
  R = any,
  F extends (...args: A) => R = (...args: A) => R,
>(
  this: any,
  arg1?: HookKeyOrKeys | F | AP | HookName | HookKeyDynamic | null,
  arg2?: HookName | F | AP | null,
  arg3?: AP | F | null,
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

  let keyOrKeys: HookKeyOrKeys;
  let name: HookName = DEFAULT_HOOK_NAME;
  let argsProv: AP | undefined = undefined;
  let fn: F;

  if (arg4 !== undefined) {
    // hook(key, name, args, fn)
    keyOrKeys = arg1 as HookKeyOrKeys;
    name = arg2 as HookName;
    argsProv = arg3 as AP;
    fn = (arg4 || noop) as F;
  } else if (arg3 !== undefined) {
    // hook(key, name, fn) OR hook(key, args, fn) OR hook(name, args, fn)
    if (typeof arg1 === "string") {
      if (!currentHookKey) {
        throw new Error(`${PREFIX} Hook key must be provided or inferred from the context.`);
      }
      keyOrKeys = currentHookKey;
      name = arg1;
      argsProv = arg2 as AP;
      fn = (arg3 || noop) as F;
    } else {
      keyOrKeys = arg1 as HookKeyOrKeys;
      if (typeof arg2 === "string" || typeof arg2 === "symbol") {
        name = arg2 as HookName;
        fn = (arg3 || noop) as F;
      } else {
        argsProv = arg2 as AP;
        fn = (arg3 || noop) as F;
      }
    }
  } else if (arg2 !== undefined) {
    // hook(args, fn) OR hook(key, fn) OR hook(name, fn)
    if (typeof arg1 === "string") {
      if (!currentHookKey) {
        throw new Error(`${PREFIX} Hook key must be provided or inferred from the context.`);
      }
      keyOrKeys = currentHookKey;
      name = arg1;
      fn = (arg2 || noop) as F;
    } else if (arg1 instanceof ArgumentsProvider) {
      argsProv = arg1 as AP;
      fn = (arg2 || noop) as F;
      if (fn === noop && !currentHookKey) {
        throw new Error(`${PREFIX} Hook key must be provided or inferred from the context.`);
      }
      keyOrKeys = fn;
    } else {
      keyOrKeys = arg1 as HookKeyOrKeys;
      fn = (arg2 || noop) as F;
    }
  } else {
    // hook(fn)
    fn = (arg1 || noop) as F;
    keyOrKeys = fn as any as HookKeyOrKeys;
  }

  const _hookData: IHookData<A, R> = {
    origin: fn,
    keyOrKeys: keyOrKeys,
    name,
    argsProvider: argsProv,
  };

  function runHook(this: any, ...args: A) {
    let key = _hookData.keyOrKeys;
    const oldHookKey = currentHookKey;

    // we need to resolve dynamic keys for nested hooks here, because otherwise it will cause incorrect `this` inside dynamic key function
    // in other words, sub hook `this` should not be used for parent hook dynamic key function
    while (key instanceof HookKeyDynamic) {
      key = key.fn.call(this);
    }
    currentHookKey = key;

    let next: MiddlewareNext<A, R> = _hookData.origin;

    if (Array.isArray(key)) {
      if (key.length === 0) {
        const callArgs = (argsProv?.args.call(this) || (args as any as A)) as unknown as A;
        const originalFn = _hookData.origin as unknown as (...args: any[]) => R;
        const result = originalFn.apply(this, callArgs as unknown as any[]);
        currentHookKey = oldHookKey;
        return result;
      }
      let i = 1;
      const _keys = key;
      key = _keys[0]!;
      next = (...args: A) => {
        if (i < _keys.length) {
          return runMiddleware(_keys[i++]!, _hookData.name, next, this, ...args);
        } else {
          return _hookData.origin.apply(this, args);
        }
      };
    }
    const result = runMiddleware(key, _hookData.name, next, this, ...(argsProv?.args.call(this) || args));
    currentHookKey = oldHookKey;
    return result;
  }

  runHook[HOOK] = _hookData;

  return runHook as any;
}

/**
 * A class decorator that enables hook support for the class.
 * It initializes metadata required for `@hook()` decorated members to work correctly,
 * ensuring that middleware can be attached to both the class and its instances.
 *
 * @param _Class The class constructor.
 * @param context The class decorator context.
 */
export function Hook(_Class: any, context: ClassDecoratorContext) {
  context.addInitializer(function (this: any) {
    const hooks: MetadataHooks = (context.metadata.hooks as MetadataHooks) || [];
    for (const propertyKey of hooks) {
      const hooked = this.prototype[propertyKey];
      if (hooked && (hooked as any)[HOOK] === undefined) {
        (hooked as any)[HOOK] = {
          origin: hooked,
          keyOrKeys: this,
          name: propertyKey,
        } satisfies IHookData;
      }
    }
  });
}

export type HookDecoratorArgument = HookKeyDynamic | string;
export type HookDecoratedClass = new (...args: any[]) => any;

export type HookPropertyName<TClass extends HookDecoratedClass> = Exclude<
  Extract<keyof InstanceType<TClass> | keyof TClass | "constructor", PropertyKey>,
  "prototype"
>;

interface IHookDecoratorOptions {
  dynamicKey?: HookKeyDynamic;
  alternativeName?: string;
}

interface IAccessorDecoratorHooks {
  get: (...args: any[]) => any;
  set: (...args: any[]) => any;
  init: (initialValue: any) => any;
}

/**
 * Normalizes optional manual decorator arguments into one predictable object.
 *
 * Internal helpers accept the same flexible argument order as `hook()` and `@hook()`.
 * This function converts those variants into a simple `{ dynamicKey, alternativeName }` shape.
 *
 * @param arg1 The first optional manual decorator argument.
 * @param arg2 The second optional manual decorator argument.
 * @returns The normalized options used by the internal manual decoration helpers.
 *
 * @internal
 */
export function _resolveHookDecoratorOptions(
  arg1?: HookDecoratorArgument,
  arg2?: HookDecoratorArgument,
): IHookDecoratorOptions {
  if (typeof arg1 === "string") {
    return {
      alternativeName: arg1,
      dynamicKey: arg2 instanceof HookKeyDynamic ? arg2 : undefined,
    };
  }

  return {
    dynamicKey: arg1 instanceof HookKeyDynamic ? arg1 : undefined,
    alternativeName: typeof arg2 === "string" ? arg2 : undefined,
  };
}

/**
 * Creates a lazy hook wrapper for members that should initialize on first use.
 *
 * This keeps the runtime behavior close to decorator semantics. The actual hook function
 * is created only when the member is called for the first time on a concrete receiver.
 *
 * @param propertyKey The original member key, used to store the cached wrapped function.
 * @param hookName The public hook name used by `attach()`.
 * @param value The original member implementation.
 * @param dynamicKey Optional runtime key resolver.
 * @param owner Optional owner to bind the original member to, instead of the receiver.
 * @returns A function that lazily creates and reuses the wrapped hook for one receiver.
 *
 * @internal
 */
export function _createLazyHookInvoker(
  propertyKey: PropertyKey,
  hookName: HookName,
  value: (...args: any[]) => any,
  dynamicKey?: HookKeyDynamic,
  owner?: any,
) {
  const hookKey = Symbol(`[hook][${String(propertyKey)}]`);
  return function runHook(this: any, ...args: any[]) {
    if (!this[hookKey]) {
      const receiver = owner ?? this;
      this[hookKey] = hook(dynamicKey ?? [this, this.constructor], hookName, value.bind(receiver));
    }
    return this[hookKey](...args);
  };
}

/**
 * Creates the three hook handlers used by accessor-style members.
 *
 * Auto-accessors expose separate `get`, `set`, and `init` entry points. This helper builds
 * all three wrappers so the manual API and the decorator API share the same naming and behavior.
 *
 * @param propertyKey The original accessor key.
 * @param hookName The public hook base name.
 * @param get The original getter implementation.
 * @param set The original setter implementation.
 * @param dynamicKey Optional runtime key resolver.
 * @returns An object with lazy hook handlers for `get`, `set`, and `init`.
 *
 * @internal
 */
export function _createAccessorDecoratorHooks(
  propertyKey: PropertyKey,
  hookName: HookName,
  get: (...args: any[]) => any,
  set: (...args: any[]) => any,
  dynamicKey?: HookKeyDynamic,
  owner?: any,
): IAccessorDecoratorHooks {
  const getHookKey = Symbol(`[hook][get ${String(propertyKey)}]`);
  const setHookKey = Symbol(`[hook][set ${String(propertyKey)}]`);
  const initHookKey = Symbol(`[hook][init ${String(propertyKey)}]`);

  return {
    get: function runHook(this: any, ...args: any[]) {
      if (!this[getHookKey]) {
        const receiver = owner ?? this;
        this[getHookKey] = hook(dynamicKey ?? [this, this.constructor], "get " + String(hookName), get.bind(receiver));
      }
      return this[getHookKey](...args);
    },
    set: function runHook(this: any, ...args: any[]) {
      if (!this[setHookKey]) {
        const receiver = owner ?? this;
        this[setHookKey] = hook(dynamicKey ?? [this, this.constructor], "set " + String(hookName), set.bind(receiver));
      }
      return this[setHookKey](...args);
    },
    init: function runHook(this: any, initialValue: any) {
      if (!this[initHookKey]) {
        this[initHookKey] = hook(dynamicKey ?? [this, this.constructor], "init " + String(hookName), _identity);
      }
      return this[initHookKey](initialValue);
    },
  };
}

export interface HookDecoratorContext {
  kind: "method" | "getter" | "setter" | "field" | "accessor";
  name: string | symbol;
  static: boolean;
  private: boolean;
  metadata: DecoratorMetadataObject;
  addInitializer(initializer: (this: any) => void): void;
}

export type DecoratorResult = (value: any, context: HookDecoratorContext) => any;

/**
 * A decorator for class members (methods, accessors, fields) that wraps them in a hook.
 * Supports ECMA TC39 Stage 3+ decorators.
 *
 * When applied to a method, it allows attaching middleware to that method via its instance or class.
 * When applied to accessors, it generates hooks for `get` and `set` operations.
 * When applied to fields, it generates an `init` hook.
 */
export function hookDecorator(): DecoratorResult;
/** Decorator with dynamic key */
export function hookDecorator(dynamicKey: HookKeyDynamic): DecoratorResult;
/** Decorator with alternative name */
export function hookDecorator(alternativeName: string): DecoratorResult;
/** Decorator with dynamic key or alternative name */
export function hookDecorator(dynamicKeyOrName: HookKeyDynamic | string): DecoratorResult;
/** Decorator with dynamic key and alternative name */
export function hookDecorator(dynamicKey: HookKeyDynamic, alternativeName: string): DecoratorResult;
/** Decorator with alternative name and dynamic key */
export function hookDecorator(alternativeName: string, dynamicKey: HookKeyDynamic): DecoratorResult;
export function hookDecorator(
  dynamicKey?: HookKeyDynamic | string,
  alternativeName?: HookKeyDynamic | string,
): DecoratorResult {
  const resolvedOptions = _resolveHookDecoratorOptions(dynamicKey, alternativeName);
  dynamicKey = resolvedOptions.dynamicKey;
  alternativeName = resolvedOptions.alternativeName;
  return function decorate(this: any, value: any, context: HookDecoratorContext): any {
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
          this[propertyKey] = hook(dynamicKey ?? [this, this.constructor], hookName, value.bind(this));
        }
      });

      return value;
    }

    if (context.kind === "accessor") {
      const { get, set } = value;
      return _createAccessorDecoratorHooks(propertyKey, hookName, get, set, dynamicKey);
    }

    if (context.kind === "field") {
      propertyKey = "init " + String(propertyKey);
      hookName = "init " + String(hookName);
      value = _identity;
    } else if (context.kind === "getter") {
      propertyKey = "get " + String(propertyKey);
      hookName = "get " + String(hookName);
    } else if (context.kind === "setter") {
      propertyKey = "set " + String(propertyKey);
      hookName = "set " + String(hookName);
    }

    return _createLazyHookInvoker(propertyKey, hookName, value, dynamicKey);
  };
}

export type MiddlewareMethod<A extends any[] = any[], R = any, TThis = unknown> = (
  this: TThis,
  next: (...args: A) => R,
  ...args: A
) => R;

type HookOrigin<T> = T extends { [HOOK]: infer HookData }
  ? HookData extends { origin: infer Origin }
    ? Origin extends (...args: infer A) => infer R
      ? [A, R]
      : [any[], any]
    : [any[], any]
  : T extends (...args: infer A) => infer R
    ? [A, R]
    : [any[], any];

type HookOriginArgs<T> = HookOrigin<T>[0];
type HookOriginResult<T> = HookOrigin<T>[1];

type HookOriginThis<T> = T extends { [HOOK]: infer HookData }
  ? HookData extends { origin: infer Origin }
    ? Origin extends (this: infer ThisArg, ...args: any[]) => any
      ? ThisArg
      : unknown
    : unknown
  : T extends (this: infer ThisArg, ...args: any[]) => any
    ? ThisArg
    : unknown;

type HookNamePropertyKey<N extends HookName> = N extends `get ${infer P}`
  ? P & PropertyKey
  : N extends `set ${infer P}`
    ? P & PropertyKey
    : N extends `init ${infer P}`
      ? P & PropertyKey
      : N extends PropertyKey
        ? N
        : never;

type HookPrototype<TObject> = TObject extends abstract new (...args: any[]) => any
  ? TObject extends { prototype: infer TPrototype }
    ? TPrototype
    : never
  : never;

type ResolveMemberValue<TObject, TName extends PropertyKey> = TObject extends object
  ? TName extends keyof TObject
    ? TObject[TName]
    : TObject extends abstract new (...args: any[]) => any
      ? TName extends keyof HookPrototype<TObject>
        ? HookPrototype<TObject>[TName]
        : never
      : never
  : never;

type InferHookSignature<TObject, TName extends HookName> = TName extends string
  ? ResolveMemberValue<TObject, HookNamePropertyKey<TName>> extends infer Member
    ? [Member] extends [never]
      ? [any[], any]
      : Member extends { [HOOK]: infer HookData }
        ? HookData extends { origin: infer Origin }
          ? Origin extends (...args: infer A) => infer R
            ? [A, R]
            : [any[], any]
          : [any[], any]
        : Member extends (...args: infer A) => infer R
          ? [A, R]
          : TName extends `get ${string}`
            ? [[], Member]
            : TName extends `set ${string}`
              ? [[Member], void]
              : TName extends `init ${string}`
                ? [[Member], Member]
                : [any[], any]
    : [any[], any]
  : [any[], any];

type InferMiddlewareArgs<TObject, TName extends HookName> = InferHookSignature<TObject, TName>[0];
type InferMiddlewareResult<TObject, TName extends HookName> = InferHookSignature<TObject, TName>[1];
type InferMiddlewareThis<TObject, TName extends HookName> =
  ResolveMemberValue<TObject, HookNamePropertyKey<TName>> extends infer Member
    ? Member extends { [HOOK]: infer HookData }
      ? HookData extends { origin: infer Origin }
        ? Origin extends (this: infer ThisArg, ...args: any[]) => any
          ? ThisArg
          : unknown
        : unknown
      : Member extends (this: infer ThisArg, ...args: any[]) => any
        ? ThisArg
        : unknown
    : unknown;

export interface IMiddlewareMethods {
  [key: string | symbol]: MiddlewareMethod[];
}

export const middlewares: WeakMap<HookKeyOrKeys, IMiddlewareMethods> = new WeakMap();

/**
 * Attaches a middleware function to a hook.
 * Middleware functions can intercept and modify arguments or results of the hooked function.
 *
 * @param hookFn The hook function to attach to.
 * @param fn The middleware function.
 * @returns A function that detaches the middleware when called.
 */
export function attach<T extends (...args: any[]) => any>(
  hookFn: T,
  fn: MiddlewareMethod<HookOriginArgs<T>, HookOriginResult<T>, HookOriginThis<T>>,
): () => void;
/** Attaches middleware to a specific hook key */
export function attach<A extends any[] = any[], R = any>(key: HookKeyOrKeys, fn: MiddlewareMethod<A, R>): () => void;
/** Attaches middleware to a specific member of a class/instance */
export function attach<TObject, TName extends HookName>(
  key: TObject,
  name: TName,
  fn: MiddlewareMethod<
    InferMiddlewareArgs<TObject, TName>,
    InferMiddlewareResult<TObject, TName>,
    InferMiddlewareThis<TObject, TName>
  >,
): () => void;
/** Attaches middleware with a specific key and name */
export function attach(key: HookKeyOrKeys, name: HookName, fn: MiddlewareMethod<any[], unknown>): () => void;

export function attach<A extends any[] = any[], R = any>(
  arg1: HookKeyOrKeys | IHookFn<A, R>,
  arg2: HookName | MiddlewareMethod<A, R>,
  arg3?: MiddlewareMethod<A, R>,
) {
  let key: HookKeyOrKeys;
  let name: HookName = DEFAULT_HOOK_NAME;
  let fn: MiddlewareMethod<A, R>;

  const maybeHook = (arg1 as IHookFn<A, R>)[HOOK];

  if (maybeHook) {
    key = maybeHook.keyOrKeys;
    name = maybeHook.name;
  } else {
    key = arg1 as HookKeyOrKeys;
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

  if (Array.isArray(key)) {
    // by default use first key to attach middleware as if it was normal middleware with no levels
    // because first key is the instance key that might be overridden
    // if you want to attach middleware to the key from level below, then you need to specify it explicitly
    if (key.length === 0) {
      return noop;
    }
    key = key[0]!;
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

export interface IHookInspection {
  key: HookKeyOrKeys;
  name: HookName;
  middlewareCount: number;
  middlewareNames: HookName[];
}

/**
 * Inspects a hook function and returns its metadata and middleware statistics.
 *
 * @param hookFn The hook function to inspect.
 * @returns Metadata about the hook, including its key, name, and middleware count.
 * @throws Error if the provided function is not a valid hook function.
 */
export function inspectHook(hookFn: IHookFn<any, any>): IHookInspection {
  const maybeHook = (hookFn as IHookFn<any, any>)[HOOK];
  if (!maybeHook) {
    throw new Error(`${PREFIX}[inspectHook] Hook function metadata not found.`);
  }

  const methods = middlewares.get(maybeHook.keyOrKeys);
  const middlewareNames = Object.keys(methods || {}) as HookName[];
  const middlewareCount = middlewareNames.reduce((count, methodName) => {
    return count + (methods?.[methodName]?.length || 0);
  }, 0);

  return {
    key: maybeHook.keyOrKeys,
    name: maybeHook.name,
    middlewareCount,
    middlewareNames,
  };
}

export function getMiddleware(key: HookKeyOrKeys, name: HookName): MiddlewareMethod[] {
  const methods = middlewares.get(key);
  if (!methods) {
    return [];
  }

  const method = methods[name];
  if (!method) {
    return [];
  }

  return [...method];
}

/**
 * Detaches a specific middleware function from a hook.
 *
 * @param key The hook key.
 * @param name The hook name.
 * @param fn The middleware function to remove.
 */
export function detach(key: HookKeyOrKeys, name: HookName, fn: MiddlewareMethod): void {
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

/**
 * Internally runs middleware chain for a specific hook.
 *
 * @param key The single hook key to run middleware for.
 * @param name The hook name.
 * @param next The next function in the chain (either original function or next level composite).
 * @param thisArg The `this` context for the execution.
 * @param args The arguments passed to the hook.
 * @returns The result of the execution.
 */
function runMiddleware<A extends any[] = any[], R = any>(
  key: HookKeySingle,
  name: HookName,
  next: MiddlewareNext<A, R>,
  thisArg: any,
  ...args: A
): R {
  const actualNext = next || noop;
  const oldHookKey = currentHookKey;
  const methods = middlewares.get(key);
  if (!methods) {
    currentHookKey = oldHookKey;
    return actualNext.apply(thisArg, args as any);
  }

  const method = methods[name];
  if (!method) {
    currentHookKey = oldHookKey;
    return actualNext.apply(thisArg, args as any);
  }
  // we need to switch to key from current middleware, because middlewares may call hooks too (or even save them somewhere)
  // if we rely on currentHookKey from running context, then running with different composites will create hooks differently each time
  // additionally, it is not intuitive that when you declare middleware with specific key, other key will be used instead (composite)
  currentHookKey = key;

  let index = 0;
  const runner = (...runnerArgs: A): R => {
    if (index < method.length) {
      const fn = method[index++]!;
      return fn.call(thisArg, runner, ...runnerArgs);
    } else {
      currentHookKey = oldHookKey; // restore original hook key, and leave it as it was before entering middlewares
      return actualNext.apply(thisArg, runnerArgs);
    }
  };

  return runner(...args);
}
