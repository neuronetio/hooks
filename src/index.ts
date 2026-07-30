const PREFIX = `[@neuronet/hooks]`;

export const DEFAULT_HOOK_NAME = Symbol("DEFAULT_HOOK_NAME");

/**
 * Hook property key used to store hook metadata on functions and classes.
 */
export const HOOK = Symbol("HOOK");

const noop = (..._args: any[]): any => {};
const identity = <T>(value: T): T => value;

/**
 * Represents a composition of multiple hook keys.
 * Used to support hierarchical or multi-layered hook contexts.
 */
class HookKeyComposite {
  keys: HookKey[];

  constructor(keys: HookKey[] = []) {
    this.keys = keys;
  }

  /**
   * Flattens the composite keys into a single-level array of non-composite keys.
   * @param keys The keys to flatten. Defaults to the keys of this composite.
   * @returns An array of non-composite hook keys.
   */
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

  /**
   * Iterates over all non-composite keys in this composite (recursive).
   */
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

/**
 * Composes multiple hook keys into a single composite key.
 * Useful for scenarios where a hook should trigger middleware attached to multiple contexts
 * (e.g., an instance and its class).
 *
 * @param keys The hook keys to compose.
 * @returns A new HookKeyComposite instance.
 */
export function composeHookKeys(...keys: HookKey[]): HookKey {
  return new HookKeyComposite(keys);
}

export type HookKeyDynamicFn = () => HookKey;

/**
 * Represents a hook key that is resolved dynamically at runtime.
 * The key is resolved by calling the provided function, usually with the `this` context
 * of the hooked method.
 */
class HookKeyDynamic {
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

/**
 * Metadata stored on a hook function.
 */
export interface IHookData<A extends any[] = any[], R = any> {
  /** The original function being hooked. */
  origin: (...args: A) => R;
  /** The key associated with this hook. */
  key: HookKey;
  /** The name of the hook. */
  name: HookName;
  /** Optional arguments override. */
  args?: A;
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

let currentHookKey: HookKey | null = null;

/**
 * Retrieves the hook key context for the currently executing hook.
 * This is useful for inferring the hook key when it's not explicitly provided.
 *
 * @returns The current HookKey or null if no hook is executing.
 */
export function getCurrentHookKeyContext(): HookKey | null {
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
export function hook<A extends any[], R>(fn: ((...args: A) => R) | null): IHookFn<A, R>;
/** Wraps a function in a hook with overridden arguments */
export function hook<A extends any[], R>(args: A, fn: ((...args: A) => R) | null): IHookFn<A, R, []>;
/** Wraps a function in a hook with a specific name */
export function hook<A extends any[], R>(name: HookName, fn: ((...args: A) => R) | null): IHookFn<A, R>;
/** Wraps a function in a hook with a specific name and overridden arguments */
export function hook<A extends any[], R>(name: HookName, args: A, fn: ((...args: A) => R) | null): IHookFn<A, R, []>;
/** Wraps a function in a hook with a specific key */
export function hook<A extends any[], R>(key: HookKey, fn: ((...args: A) => R) | null): IHookFn<A, R>;
/** Wraps a function in a hook with a specific key and overridden arguments */
export function hook<A extends any[], R>(key: HookKey, args: A, fn: ((...args: A) => R) | null): IHookFn<A, R, []>;
/** Wraps a function in a hook with a specific key and name */
export function hook<A extends any[], R>(key: HookKey, name: HookName, fn: ((...args: A) => R) | null): IHookFn<A, R>;
/** Wraps a function in a hook with a specific key, name, and overridden arguments */
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
        const callArgs = (argsOverride || (args as any as A)) as unknown as A;
        const originalFn = _hookData.origin as unknown as (...args: any[]) => R;
        const result = originalFn.apply(this, callArgs as unknown as any[]);
        currentHookKey = oldHookKey;
        return result;
      }
      const flat = keyComposite.flat();
      let i = 1;
      key = flat[0]!;
      next = (...args: A) => {
        if (i < keyComposite.keys.length) {
          return runMiddleware(flat[i++]!, _hookData.name, next, this, ...args);
        } else {
          return _hookData.origin.apply(this, args);
        }
      };
    }
    const result = runMiddleware(key, _hookData.name, next, this, ...(argsOverride || (args as any as A)));
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
          key: this,
          name: propertyKey,
        };
      }
    }
  });
}

type HookDecoratorArgument = HookKeyDynamic | string;
type HookDecoratedClass = new (...args: any[]) => any;

type HookPropertyName<TClass extends HookDecoratedClass> = Exclude<
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

interface IManualHookState<TClass extends HookDecoratedClass = HookDecoratedClass> {
  Class: TClass;
  instanceInitializers: Array<(instance: any) => void>;
}

const MANUAL_HOOK_STATE = Symbol("[hook][manual-state]");

/**
 * Normalizes optional manual decorator arguments into one predictable object.
 *
 * Internal helpers accept the same flexible argument order as `hook()` and `@hook()`.
 * This function converts those variants into a simple `{ dynamicKey, alternativeName }` shape.
 *
 * @param arg1 The first optional manual decorator argument.
 * @param arg2 The second optional manual decorator argument.
 * @returns The normalized options used by the internal manual decoration helpers.
 */
function resolveHookDecoratorOptions(
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
 * @returns A function that lazily creates and reuses the wrapped hook for one receiver.
 */
function createLazyHookInvoker(
  propertyKey: PropertyKey,
  hookName: HookName,
  value: (...args: any[]) => any,
  dynamicKey?: HookKeyDynamic,
) {
  const hookKey = Symbol(`[hook][${String(propertyKey)}]`);
  return function runHook(this: any, ...args: any[]) {
    if (!this[hookKey]) {
      this[hookKey] = hook(dynamicKey ?? composeHookKeys(this, this.constructor), hookName, value.bind(this));
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
 */
function createAccessorDecoratorHooks(
  propertyKey: PropertyKey,
  hookName: HookName,
  get: (...args: any[]) => any,
  set: (...args: any[]) => any,
  dynamicKey?: HookKeyDynamic,
): IAccessorDecoratorHooks {
  const getHookKey = Symbol(`[hook][get ${String(propertyKey)}]`);
  const setHookKey = Symbol(`[hook][set ${String(propertyKey)}]`);
  const initHookKey = Symbol(`[hook][init ${String(propertyKey)}]`);

  return {
    get: function runHook(this: any, ...args: any[]) {
      if (!this[getHookKey]) {
        this[getHookKey] = hook(
          dynamicKey ?? composeHookKeys(this, this.constructor),
          "get " + String(hookName),
          get.bind(this),
        );
      }
      return this[getHookKey](...args);
    },
    set: function runHook(this: any, ...args: any[]) {
      if (!this[setHookKey]) {
        this[setHookKey] = hook(
          dynamicKey ?? composeHookKeys(this, this.constructor),
          "set " + String(hookName),
          set.bind(this),
        );
      }
      return this[setHookKey](...args);
    },
    init: function runHook(this: any, initialValue: any) {
      if (!this[initHookKey]) {
        this[initHookKey] = hook(
          dynamicKey ?? composeHookKeys(this, this.constructor),
          "init " + String(hookName),
          identity,
        );
      }
      return this[initHookKey](initialValue);
    },
  };
}

/**
 * Builds a lightweight method decorator context for the manual API.
 *
 * Manual decoration does not run through the JavaScript decorator runtime, so this helper
 * creates the subset of `ClassMemberDecoratorContext` that `hookDecorator()` needs.
 * It also collects initializer callbacks so they can be replayed later.
 *
 * @param propertyKey The method name.
 * @param isStatic Tells the manual context whether the method is static.
 * @returns A synthetic decorator context and the initializer list collected from it.
 */
function createManualMethodContext(
  propertyKey: PropertyKey,
  isStatic: boolean,
): {
  context: HookDecoratorContext;
  initializers: Array<(this: any) => void>;
} {
  const initializers: Array<(this: any) => void> = [];
  return {
    initializers,
    context: {
      kind: "method",
      name: propertyKey,
      static: isStatic,
      private: false,
      metadata: {} as DecoratorMetadataObject,
      addInitializer(initializer: () => void) {
        initializers.push(initializer as (this: any) => void);
      },
    } as HookDecoratorContext,
  };
}

/**
 * Returns the cached manual hook runtime state for a class, creating it when needed.
 *
 * The state stores a wrapped constructor and the list of instance initializers that should
 * run after each new instance is created. This is the foundation of the manual decoration API.
 *
 * @param Class The class being prepared for manual decoration.
 * @returns The shared runtime state for that class.
 */
function ensureManualHookState<TClass extends HookDecoratedClass>(Class: TClass): IManualHookState<TClass> {
  const existingState = (Class as any)[MANUAL_HOOK_STATE] as IManualHookState<TClass> | undefined;
  if (existingState) {
    return existingState;
  }

  const instanceInitializers: IManualHookState<TClass>["instanceInitializers"] = [];
  const HookedClass = new Proxy(Class as HookDecoratedClass, {
    construct(target, args, newTarget) {
      const instance = Reflect.construct(target, args, newTarget);
      for (const initializer of instanceInitializers) {
        initializer(instance);
      }
      return instance;
    },
  }) as TClass;

  const state: IManualHookState<TClass> = {
    Class: HookedClass,
    instanceInitializers,
  };

  (HookedClass as any)[MANUAL_HOOK_STATE] = state;
  (Class as any)[MANUAL_HOOK_STATE] = state;
  HookedClass.prototype.constructor = HookedClass;

  return state;
}

/**
 * Finds a member descriptor on the class or its prototype and validates its shape.
 *
 * Manual decoration can target either static members or instance members. This helper checks
 * both locations, returns the first compatible descriptor, and throws a clear error otherwise.
 *
 * @param Class The class being inspected.
 * @param propertyKey The member name to find.
 * @param validate A predicate that confirms the descriptor matches the expected member kind.
 * @param apiName The public API name used in the error message.
 * @returns The matching descriptor together with its target and static flag.
 */
function resolveMemberDescriptor(
  Class: HookDecoratedClass,
  propertyKey: PropertyKey,
  validate: (descriptor: PropertyDescriptor | undefined) => boolean,
  apiName: string,
) {
  const staticDescriptor = Object.getOwnPropertyDescriptor(Class, propertyKey);
  if (validate(staticDescriptor)) {
    return {
      descriptor: staticDescriptor!,
      isStatic: true,
      target: Class,
    };
  }

  const instanceDescriptor = Object.getOwnPropertyDescriptor(Class.prototype, propertyKey);
  if (validate(instanceDescriptor)) {
    return {
      descriptor: instanceDescriptor!,
      isStatic: false,
      target: Class.prototype,
    };
  }

  throw new Error(
    `${PREFIX}[${apiName}] Could not find a compatible member named "${String(propertyKey)}" on the class or its prototype.`,
  );
}

/**
 * Detects whether a field decoration should apply to a static field or an instance field.
 *
 * The helper also guards against accidental decoration of methods or accessors through
 * `hookField()`, because those member kinds must use their dedicated APIs.
 *
 * @param Class The class being inspected.
 * @param propertyKey The field name to check.
 * @returns Information about whether the field is static.
 * @throws Error When the named member exists but is not a field.
 */
function resolveFieldPlacement(Class: HookDecoratedClass, propertyKey: PropertyKey) {
  const staticDescriptor = Object.getOwnPropertyDescriptor(Class, propertyKey);
  if (staticDescriptor) {
    if (
      typeof staticDescriptor.value === "function" ||
      typeof staticDescriptor.get === "function" ||
      typeof staticDescriptor.set === "function"
    ) {
      throw new Error(`${PREFIX}[hookField] Member "${String(propertyKey)}" is not a field.`);
    }

    return true;
  }

  const instanceDescriptor = Object.getOwnPropertyDescriptor(Class.prototype, propertyKey);
  if (instanceDescriptor) {
    throw new Error(`${PREFIX}[hookField] Member "${String(propertyKey)}" is not a field.`);
  }

  return false;
}

/**
 * Checks whether a method accessor getter is being read from the prototype itself.
 *
 * Prototype reads should return the class-level hook wrapper, while instance reads should
 * trigger per-instance initialization.
 *
 * @param value The receiver passed to the property getter.
 * @returns `true` when the receiver is the class prototype, otherwise `false`.
 */
function isPrototypeReceiver(value: any): boolean {
  return Boolean(value && value.constructor && value === value.constructor.prototype);
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
  const resolvedOptions = resolveHookDecoratorOptions(dynamicKey, alternativeName);
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
          this[propertyKey] = hook(dynamicKey ?? composeHookKeys(this, this.constructor), hookName, value.bind(this));
        }
      });

      return value;
    }

    if (context.kind === "accessor") {
      const { get, set } = value;
      return createAccessorDecoratorHooks(propertyKey, hookName, get, set, dynamicKey);
    }

    if (context.kind === "field") {
      propertyKey = "init " + String(propertyKey);
      hookName = "init " + String(hookName);
      value = identity;
    } else if (context.kind === "getter") {
      propertyKey = "get " + String(propertyKey);
      hookName = "get " + String(hookName);
    } else if (context.kind === "setter") {
      propertyKey = "set " + String(propertyKey);
      hookName = "set " + String(hookName);
    }

    return createLazyHookInvoker(propertyKey, hookName, value, dynamicKey);
  };
}

/**
 * Enables hook support for an existing class without using decorator syntax.
 *
 * This function is the manual equivalent of `@Hook`. It returns a wrapped constructor
 * that runs all manual hook initializers for instance members.
 *
 * Always keep the returned class reference:
 * ```ts
 * let UserService = class UserService {};
 * UserService = hookClass(UserService);
 * ```
 *
 * @param Class The class to prepare for manual hook decoration.
 * @returns The wrapped class constructor that should replace the original binding.
 */
export function hookClass<TClass extends HookDecoratedClass>(Class: TClass): TClass {
  return ensureManualHookState(Class).Class;
}

/**
 * Applies hook behavior to a class method without using decorator syntax.
 *
 * This function is the manual equivalent of `@hook()` for methods.
 *
 * Static methods are wrapped immediately. Prototype methods are prepared in two layers:
 * the method on the prototype becomes the class-level hook, and each instance receives
 * its own composite hook key automatically when the method is initialized.
 *
 * You can pass the same optional arguments as with `@hook()`:
 * - no extra arguments: use the member name as the hook name
 * - alternative name: `hookMethod(Class, "save", "saveAlt")`
 * - dynamic key: `hookMethod(Class, "save", dynamicHookKey(...))`
 * - dynamic key with alternative name
 *
 * @param Class The class that owns the method.
 * @param propertyKey The method name. The function looks for both static and prototype methods.
 * @param arg1 Optional alternative hook name or dynamic hook key.
 * @param arg2 Optional dynamic hook key or alternative hook name.
 * @returns The wrapped class constructor.
 */
export function hookMethod<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
): TClass;
export function hookMethod<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  alternativeName: string,
): TClass;
export function hookMethod<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  dynamicKey: HookKeyDynamic,
): TClass;
export function hookMethod<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  dynamicKeyOrName: HookKeyDynamic | string,
): TClass;
export function hookMethod<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  dynamicKey: HookKeyDynamic,
  alternativeName: string,
): TClass;
export function hookMethod<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  alternativeName: string,
  dynamicKey: HookKeyDynamic,
): TClass;
export function hookMethod<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  arg1?: HookDecoratorArgument,
  arg2?: HookDecoratorArgument,
): TClass;
export function hookMethod<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  arg1?: HookDecoratorArgument,
  arg2?: HookDecoratorArgument,
): TClass {
  const state = ensureManualHookState(Class);
  const { descriptor, isStatic } = resolveMemberDescriptor(
    state.Class,
    propertyKey,
    (candidate) => typeof candidate?.value === "function",
    "hookMethod",
  );
  const decorate = hookDecorator(arg1 as any, arg2 as any);
  const { context, initializers } = createManualMethodContext(propertyKey, isStatic);
  const decoratedMethod = decorate(descriptor.value, context);

  if (isStatic) {
    Object.defineProperty(state.Class, propertyKey, {
      ...descriptor,
      value: decoratedMethod,
    });

    for (const initializer of initializers) {
      initializer.call(state.Class);
    }

    return state.Class;
  }

  const { alternativeName } = resolveHookDecoratorOptions(arg1, arg2);
  const hookName = (alternativeName ?? propertyKey) as HookName;
  const classHook = hook(state.Class, hookName, decoratedMethod);
  const runInitializers = function runHookMethodInitializers(this: any) {
    for (const initializer of initializers) {
      initializer.call(this);
    }
  };

  Object.defineProperty(state.Class.prototype, propertyKey, {
    configurable: descriptor.configurable,
    enumerable: descriptor.enumerable,
    get: function getHookedMethod(this: any) {
      if (isPrototypeReceiver(this)) {
        return classHook;
      }

      if (!Object.prototype.hasOwnProperty.call(this, propertyKey)) {
        runInitializers.call(this);
      }

      return this[propertyKey];
    },
    set: function setHookedMethod(this: any, value: any) {
      Object.defineProperty(this, propertyKey, {
        value,
        writable: true,
        configurable: true,
        enumerable: descriptor.enumerable,
      });
    },
  });

  state.instanceInitializers.push((instance) => {
    if (!Object.prototype.hasOwnProperty.call(instance, propertyKey)) {
      runInitializers.call(instance);
    }
  });

  return state.Class;
}

/**
 * Applies hook behavior to a getter without using decorator syntax.
 *
 * This is the manual equivalent of `@hook()` placed on `get property()`.
 * The created hook name uses the `get ` prefix, for example `get total`.
 *
 * @param Class The class that owns the getter.
 * @param propertyKey The getter name. The function looks for both static and prototype getters.
 * @param arg1 Optional alternative hook name or dynamic hook key.
 * @param arg2 Optional dynamic hook key or alternative hook name.
 * @returns The wrapped class constructor.
 */
export function hookGetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
): TClass;
export function hookGetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  alternativeName: string,
): TClass;
export function hookGetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  dynamicKey: HookKeyDynamic,
): TClass;
export function hookGetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  dynamicKeyOrName: HookKeyDynamic | string,
): TClass;
export function hookGetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  dynamicKey: HookKeyDynamic,
  alternativeName: string,
): TClass;
export function hookGetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  alternativeName: string,
  dynamicKey: HookKeyDynamic,
): TClass;
export function hookGetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  arg1?: HookDecoratorArgument,
  arg2?: HookDecoratorArgument,
): TClass;
export function hookGetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  arg1?: HookDecoratorArgument,
  arg2?: HookDecoratorArgument,
): TClass {
  const state = ensureManualHookState(Class);
  const { descriptor, target } = resolveMemberDescriptor(
    state.Class,
    propertyKey,
    (candidate) => typeof candidate?.get === "function",
    "hookGetter",
  );
  const { dynamicKey, alternativeName } = resolveHookDecoratorOptions(arg1, arg2);
  const hookName = (alternativeName ?? propertyKey) as HookName;

  Object.defineProperty(target, propertyKey, {
    ...descriptor,
    get: createLazyHookInvoker("get " + String(propertyKey), "get " + String(hookName), descriptor.get!, dynamicKey),
  });

  return state.Class;
}

/**
 * Applies hook behavior to a setter without using decorator syntax.
 *
 * This is the manual equivalent of `@hook()` placed on `set property(value)`.
 * The created hook name uses the `set ` prefix, for example `set total`.
 *
 * @param Class The class that owns the setter.
 * @param propertyKey The setter name. The function looks for both static and prototype setters.
 * @param arg1 Optional alternative hook name or dynamic hook key.
 * @param arg2 Optional dynamic hook key or alternative hook name.
 * @returns The wrapped class constructor.
 */
export function hookSetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
): TClass;
export function hookSetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  alternativeName: string,
): TClass;
export function hookSetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  dynamicKey: HookKeyDynamic,
): TClass;
export function hookSetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  dynamicKeyOrName: HookKeyDynamic | string,
): TClass;
export function hookSetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  dynamicKey: HookKeyDynamic,
  alternativeName: string,
): TClass;
export function hookSetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  alternativeName: string,
  dynamicKey: HookKeyDynamic,
): TClass;
export function hookSetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  arg1?: HookDecoratorArgument,
  arg2?: HookDecoratorArgument,
): TClass;
export function hookSetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  arg1?: HookDecoratorArgument,
  arg2?: HookDecoratorArgument,
): TClass {
  const state = ensureManualHookState(Class);
  const { descriptor, target } = resolveMemberDescriptor(
    state.Class,
    propertyKey,
    (candidate) => typeof candidate?.set === "function",
    "hookSetter",
  );
  const { dynamicKey, alternativeName } = resolveHookDecoratorOptions(arg1, arg2);
  const hookName = (alternativeName ?? propertyKey) as HookName;

  Object.defineProperty(target, propertyKey, {
    ...descriptor,
    set: createLazyHookInvoker("set " + String(propertyKey), "set " + String(hookName), descriptor.set!, dynamicKey),
  });

  return state.Class;
}

/**
 * Applies hook behavior to a public field initializer without using decorator syntax.
 *
 * This is the manual equivalent of `@hook()` placed on a public field.
 * The hook name uses the `init ` prefix, for example `init status`.
 *
 * Use this function before creating new instances. Manual field decoration updates
 * the value during initialization, not after the field already exists.
 *
 * @param Class The class that owns the field.
 * @param propertyKey The field name. The function supports public instance fields and static fields.
 * @param arg1 Optional alternative hook name or dynamic hook key.
 * @param arg2 Optional dynamic hook key or alternative hook name.
 * @returns The wrapped class constructor.
 */
export function hookField<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
): TClass;
export function hookField<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  alternativeName: string,
): TClass;
export function hookField<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  dynamicKey: HookKeyDynamic,
): TClass;
export function hookField<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  dynamicKeyOrName: HookKeyDynamic | string,
): TClass;
export function hookField<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  dynamicKey: HookKeyDynamic,
  alternativeName: string,
): TClass;
export function hookField<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  alternativeName: string,
  dynamicKey: HookKeyDynamic,
): TClass;
export function hookField<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  arg1?: HookDecoratorArgument,
  arg2?: HookDecoratorArgument,
): TClass;
export function hookField<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(
  Class: TClass,
  propertyKey: TName,
  arg1?: HookDecoratorArgument,
  arg2?: HookDecoratorArgument,
): TClass {
  const state = ensureManualHookState(Class);
  const isStatic = resolveFieldPlacement(state.Class, propertyKey);
  const { dynamicKey, alternativeName } = resolveHookDecoratorOptions(arg1, arg2);
  const hookName = (alternativeName ?? propertyKey) as HookName;
  const runInitializer = createLazyHookInvoker(
    "init " + String(propertyKey),
    "init " + String(hookName),
    identity,
    dynamicKey,
  );

  if (isStatic) {
    (state.Class as any)[propertyKey] = runInitializer.call(state.Class, (state.Class as any)[propertyKey]);
    return state.Class;
  }

  state.instanceInitializers.push((instance) => {
    instance[propertyKey] = runInitializer.call(instance, instance[propertyKey]);
  });

  return state.Class;
}

/**
 * Applies hook behavior to an auto-accessor without using decorator syntax.
 *
 * This is the manual equivalent of `@hook()` placed on `accessor property`.
 * It creates the same three hook entry points as the decorator version:
 * `init <name>`, `get <name>`, and `set <name>`.
 *
 * @param Class The class that owns the accessor.
 * @param propertyKey The accessor name. The function supports instance and static auto-accessors.
 * @param arg1 Optional alternative hook name or dynamic hook key.
 * @param arg2 Optional dynamic hook key or alternative hook name.
 * @returns The wrapped class constructor.
 */
export function hookAccessor<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey): TClass;
export function hookAccessor<TClass extends HookDecoratedClass>(
  Class: TClass,
  propertyKey: PropertyKey,
  alternativeName: string,
): TClass;
export function hookAccessor<TClass extends HookDecoratedClass>(
  Class: TClass,
  propertyKey: PropertyKey,
  dynamicKey: HookKeyDynamic,
): TClass;
export function hookAccessor<TClass extends HookDecoratedClass>(
  Class: TClass,
  propertyKey: PropertyKey,
  dynamicKeyOrName: HookKeyDynamic | string,
): TClass;
export function hookAccessor<TClass extends HookDecoratedClass>(
  Class: TClass,
  propertyKey: PropertyKey,
  dynamicKey: HookKeyDynamic,
  alternativeName: string,
): TClass;
export function hookAccessor<TClass extends HookDecoratedClass>(
  Class: TClass,
  propertyKey: PropertyKey,
  alternativeName: string,
  dynamicKey: HookKeyDynamic,
): TClass;
export function hookAccessor<TClass extends HookDecoratedClass>(
  Class: TClass,
  propertyKey: PropertyKey,
  arg1?: HookDecoratorArgument,
  arg2?: HookDecoratorArgument,
): TClass;
export function hookAccessor<TClass extends HookDecoratedClass>(
  Class: TClass,
  propertyKey: PropertyKey,
  arg1?: HookDecoratorArgument,
  arg2?: HookDecoratorArgument,
): TClass {
  const state = ensureManualHookState(Class);
  const { dynamicKey, alternativeName } = resolveHookDecoratorOptions(arg1, arg2);
  const hookName = (alternativeName ?? propertyKey) as HookName;
  const staticDescriptor = Object.getOwnPropertyDescriptor(state.Class, propertyKey);
  const instanceDescriptor = Object.getOwnPropertyDescriptor(state.Class.prototype, propertyKey);

  if (typeof staticDescriptor?.get === "function" && typeof staticDescriptor?.set === "function") {
    const originalGet = staticDescriptor.get;
    const originalSet = staticDescriptor.set;
    const decoratedAccessor = createAccessorDecoratorHooks(propertyKey, hookName, originalGet, originalSet, dynamicKey);
    const initializedKey = Symbol(`[hook][manual-initialized ${String(propertyKey)}]`);
    const ensureInitialized = function runHookAccessorInitializer(this: any) {
      if (this[initializedKey]) {
        return;
      }

      const initialValue = originalGet.call(this);
      const nextValue = decoratedAccessor.init.call(this, initialValue);
      originalSet.call(this, nextValue);
      this[initializedKey] = true;
    };

    Object.defineProperty(state.Class, propertyKey, {
      ...staticDescriptor,
      get: function getHookedAccessor(this: any, ...args: any[]) {
        ensureInitialized.call(this);
        return decoratedAccessor.get.apply(this, args);
      },
      set: function setHookedAccessor(this: any, ...args: any[]) {
        ensureInitialized.call(this);
        return decoratedAccessor.set.apply(this, args);
      },
    });

    ensureInitialized.call(state.Class);
    return state.Class;
  }

  if (typeof instanceDescriptor?.get === "function" && typeof instanceDescriptor?.set === "function") {
    const originalGet = instanceDescriptor.get;
    const originalSet = instanceDescriptor.set;
    const decoratedAccessor = createAccessorDecoratorHooks(propertyKey, hookName, originalGet, originalSet, dynamicKey);
    const initializedKey = Symbol(`[hook][manual-initialized ${String(propertyKey)}]`);
    const ensureInitialized = function runHookAccessorInitializer(this: any) {
      if (this[initializedKey]) {
        return;
      }

      const initialValue = originalGet.call(this);
      const nextValue = decoratedAccessor.init.call(this, initialValue);
      originalSet.call(this, nextValue);
      this[initializedKey] = true;
    };

    Object.defineProperty(state.Class.prototype, propertyKey, {
      ...instanceDescriptor,
      get: function getHookedAccessor(this: any, ...args: any[]) {
        ensureInitialized.call(this);
        return decoratedAccessor.get.apply(this, args);
      },
      set: function setHookedAccessor(this: any, ...args: any[]) {
        ensureInitialized.call(this);
        return decoratedAccessor.set.apply(this, args);
      },
    });

    state.instanceInitializers.push((instance) => {
      ensureInitialized.call(instance);
    });

    return state.Class;
  }

  if (instanceDescriptor) {
    throw new Error(
      `${PREFIX}[hookAccessor] Could not find a compatible member named "${String(propertyKey)}" on the class or its prototype.`,
    );
  }

  if (
    staticDescriptor &&
    (typeof staticDescriptor.value === "function" ||
      typeof staticDescriptor.get === "function" ||
      typeof staticDescriptor.set === "function")
  ) {
    throw new Error(
      `${PREFIX}[hookAccessor] Could not find a compatible member named "${String(propertyKey)}" on the class or its prototype.`,
    );
  }

  const storageKey = Symbol(`[hook][accessor-storage ${String(propertyKey)}]`);
  const originalGet = function getFieldBackedAccessorValue(this: any) {
    return this[storageKey];
  };
  const originalSet = function setFieldBackedAccessorValue(this: any, value: any) {
    this[storageKey] = value;
  };
  const decoratedAccessor = createAccessorDecoratorHooks(propertyKey, hookName, originalGet, originalSet, dynamicKey);
  const isStatic = Boolean(staticDescriptor);
  const target = isStatic ? state.Class : state.Class.prototype;

  Object.defineProperty(target, propertyKey, {
    configurable: staticDescriptor?.configurable ?? true,
    enumerable: staticDescriptor?.enumerable ?? true,
    get: function getHookedFieldAccessor(this: any, ...args: any[]) {
      return decoratedAccessor.get.apply(this, args);
    },
    set: function setHookedFieldAccessor(this: any, ...args: any[]) {
      return decoratedAccessor.set.apply(this, args);
    },
  });

  if (isStatic) {
    const nextValue = decoratedAccessor.init.call(state.Class, staticDescriptor!.value);
    originalSet.call(state.Class, nextValue);
    return state.Class;
  }

  state.instanceInitializers.push((instance) => {
    const initialValue = instance[propertyKey];
    delete instance[propertyKey];
    const nextValue = decoratedAccessor.init.call(instance, initialValue);
    originalSet.call(instance, nextValue);
  });

  return state.Class;
}

/**
 * Fluent builder for decorating existing classes without decorator syntax.
 *
 * The builder is useful when you want to decorate several members in one place
 * and finish with a single `build()` call.
 */
export interface IHookDecoratorBuilder<TClass extends HookDecoratedClass = HookDecoratedClass> {
  /**
   * Decorates an auto-accessor and enables `init`, `get`, and `set` hooks for it.
   *
   * @param propertyKey The accessor name.
   * @param arg1 Optional alternative hook name or dynamic hook key.
   * @param arg2 Optional dynamic hook key or alternative hook name.
   * @returns The same builder so you can keep chaining calls.
   */
  accessor<TName extends HookPropertyName<TClass>>(propertyKey: TName): IHookDecoratorBuilder<TClass>;
  accessor<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    alternativeName: string,
  ): IHookDecoratorBuilder<TClass>;
  accessor<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKey: HookKeyDynamic,
  ): IHookDecoratorBuilder<TClass>;
  accessor<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKeyOrName: HookKeyDynamic | string,
  ): IHookDecoratorBuilder<TClass>;
  accessor<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKey: HookKeyDynamic,
    alternativeName: string,
  ): IHookDecoratorBuilder<TClass>;
  accessor<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    alternativeName: string,
    dynamicKey: HookKeyDynamic,
  ): IHookDecoratorBuilder<TClass>;
  accessor<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    arg1?: HookDecoratorArgument,
    arg2?: HookDecoratorArgument,
  ): IHookDecoratorBuilder<TClass>;
  /**
   * Decorates a public field and enables the `init` hook for it.
   *
   * @param propertyKey The field name.
   * @param arg1 Optional alternative hook name or dynamic hook key.
   * @param arg2 Optional dynamic hook key or alternative hook name.
   * @returns The same builder so you can keep chaining calls.
   */
  field<TName extends HookPropertyName<TClass>>(propertyKey: TName): IHookDecoratorBuilder<TClass>;
  field<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    alternativeName: string,
  ): IHookDecoratorBuilder<TClass>;
  field<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKey: HookKeyDynamic,
  ): IHookDecoratorBuilder<TClass>;
  field<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKeyOrName: HookKeyDynamic | string,
  ): IHookDecoratorBuilder<TClass>;
  field<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKey: HookKeyDynamic,
    alternativeName: string,
  ): IHookDecoratorBuilder<TClass>;
  field<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    alternativeName: string,
    dynamicKey: HookKeyDynamic,
  ): IHookDecoratorBuilder<TClass>;
  field<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    arg1?: HookDecoratorArgument,
    arg2?: HookDecoratorArgument,
  ): IHookDecoratorBuilder<TClass>;
  /**
   * Decorates a getter and enables the `get <name>` hook for it.
   *
   * @param propertyKey The getter name.
   * @param arg1 Optional alternative hook name or dynamic hook key.
   * @param arg2 Optional dynamic hook key or alternative hook name.
   * @returns The same builder so you can keep chaining calls.
   */
  getter<TName extends HookPropertyName<TClass>>(propertyKey: TName): IHookDecoratorBuilder<TClass>;
  getter<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    alternativeName: string,
  ): IHookDecoratorBuilder<TClass>;
  getter<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKey: HookKeyDynamic,
  ): IHookDecoratorBuilder<TClass>;
  getter<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKeyOrName: HookKeyDynamic | string,
  ): IHookDecoratorBuilder<TClass>;
  getter<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKey: HookKeyDynamic,
    alternativeName: string,
  ): IHookDecoratorBuilder<TClass>;
  getter<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    alternativeName: string,
    dynamicKey: HookKeyDynamic,
  ): IHookDecoratorBuilder<TClass>;
  getter<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    arg1?: HookDecoratorArgument,
    arg2?: HookDecoratorArgument,
  ): IHookDecoratorBuilder<TClass>;
  /**
   * Decorates a method and enables class-level and instance-level hooks for it.
   *
   * @param propertyKey The method name.
   * @param arg1 Optional alternative hook name or dynamic hook key.
   * @param arg2 Optional dynamic hook key or alternative hook name.
   * @returns The same builder so you can keep chaining calls.
   */
  method<TName extends HookPropertyName<TClass>>(propertyKey: TName): IHookDecoratorBuilder<TClass>;
  method<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    alternativeName: string,
  ): IHookDecoratorBuilder<TClass>;
  method<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKey: HookKeyDynamic,
  ): IHookDecoratorBuilder<TClass>;
  method<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKeyOrName: HookKeyDynamic | string,
  ): IHookDecoratorBuilder<TClass>;
  method<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKey: HookKeyDynamic,
    alternativeName: string,
  ): IHookDecoratorBuilder<TClass>;
  method<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    alternativeName: string,
    dynamicKey: HookKeyDynamic,
  ): IHookDecoratorBuilder<TClass>;
  method<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    arg1?: HookDecoratorArgument,
    arg2?: HookDecoratorArgument,
  ): IHookDecoratorBuilder<TClass>;
  /**
   * Decorates a setter and enables the `set <name>` hook for it.
   *
   * @param propertyKey The setter name.
   * @param arg1 Optional alternative hook name or dynamic hook key.
   * @param arg2 Optional dynamic hook key or alternative hook name.
   * @returns The same builder so you can keep chaining calls.
   */
  setter<TName extends HookPropertyName<TClass>>(propertyKey: TName): IHookDecoratorBuilder<TClass>;
  setter<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    alternativeName: string,
  ): IHookDecoratorBuilder<TClass>;
  setter<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKey: HookKeyDynamic,
  ): IHookDecoratorBuilder<TClass>;
  setter<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKeyOrName: HookKeyDynamic | string,
  ): IHookDecoratorBuilder<TClass>;
  setter<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKey: HookKeyDynamic,
    alternativeName: string,
  ): IHookDecoratorBuilder<TClass>;
  setter<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    alternativeName: string,
    dynamicKey: HookKeyDynamic,
  ): IHookDecoratorBuilder<TClass>;
  setter<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    arg1?: HookDecoratorArgument,
    arg2?: HookDecoratorArgument,
  ): IHookDecoratorBuilder<TClass>;
  /**
   * Finishes the decoration chain and returns the wrapped class constructor.
   *
   * @returns The final decorated class.
   */
  build(): TClass;
}

export class HookDecoratorBuilder<
  TClass extends HookDecoratedClass = HookDecoratedClass,
> implements IHookDecoratorBuilder<TClass> {
  private HookedClass: TClass;

  constructor(Class: TClass) {
    this.HookedClass = hookClass(Class);
  }

  accessor<TName extends HookPropertyName<TClass>>(propertyKey: TName): HookDecoratorBuilder<TClass>;
  accessor<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    alternativeName: string,
  ): HookDecoratorBuilder<TClass>;
  accessor<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKey: HookKeyDynamic,
  ): HookDecoratorBuilder<TClass>;
  accessor<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKeyOrName: HookKeyDynamic | string,
  ): HookDecoratorBuilder<TClass>;
  accessor<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKey: HookKeyDynamic,
    alternativeName: string,
  ): HookDecoratorBuilder<TClass>;
  accessor<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    alternativeName: string,
    dynamicKey: HookKeyDynamic,
  ): HookDecoratorBuilder<TClass>;
  accessor<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    arg1?: HookDecoratorArgument,
    arg2?: HookDecoratorArgument,
  ): this {
    this.HookedClass = hookAccessor(this.HookedClass, propertyKey, arg1, arg2);
    return this;
  }

  field<TName extends HookPropertyName<TClass>>(propertyKey: TName): HookDecoratorBuilder<TClass>;
  field<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    alternativeName: string,
  ): HookDecoratorBuilder<TClass>;
  field<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKey: HookKeyDynamic,
  ): HookDecoratorBuilder<TClass>;
  field<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKeyOrName: HookKeyDynamic | string,
  ): HookDecoratorBuilder<TClass>;
  field<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKey: HookKeyDynamic,
    alternativeName: string,
  ): HookDecoratorBuilder<TClass>;
  field<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    alternativeName: string,
    dynamicKey: HookKeyDynamic,
  ): HookDecoratorBuilder<TClass>;
  field<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    arg1?: HookDecoratorArgument,
    arg2?: HookDecoratorArgument,
  ): this {
    this.HookedClass = hookField(this.HookedClass, propertyKey, arg1, arg2);
    return this;
  }

  getter<TName extends HookPropertyName<TClass>>(propertyKey: TName): HookDecoratorBuilder<TClass>;
  getter<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    alternativeName: string,
  ): HookDecoratorBuilder<TClass>;
  getter<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKey: HookKeyDynamic,
  ): HookDecoratorBuilder<TClass>;
  getter<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKeyOrName: HookKeyDynamic | string,
  ): HookDecoratorBuilder<TClass>;
  getter<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKey: HookKeyDynamic,
    alternativeName: string,
  ): HookDecoratorBuilder<TClass>;
  getter<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    alternativeName: string,
    dynamicKey: HookKeyDynamic,
  ): HookDecoratorBuilder<TClass>;
  getter<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    arg1?: HookDecoratorArgument,
    arg2?: HookDecoratorArgument,
  ): this {
    this.HookedClass = hookGetter(this.HookedClass, propertyKey, arg1, arg2);
    return this;
  }

  method<TName extends HookPropertyName<TClass>>(propertyKey: TName): HookDecoratorBuilder<TClass>;
  method<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    alternativeName: string,
  ): HookDecoratorBuilder<TClass>;
  method<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKey: HookKeyDynamic,
  ): HookDecoratorBuilder<TClass>;
  method<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKeyOrName: HookKeyDynamic | string,
  ): HookDecoratorBuilder<TClass>;
  method<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKey: HookKeyDynamic,
    alternativeName: string,
  ): HookDecoratorBuilder<TClass>;
  method<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    alternativeName: string,
    dynamicKey: HookKeyDynamic,
  ): HookDecoratorBuilder<TClass>;
  method<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    arg1?: HookDecoratorArgument,
    arg2?: HookDecoratorArgument,
  ): this {
    this.HookedClass = hookMethod(this.HookedClass, propertyKey, arg1, arg2);
    return this;
  }

  setter<TName extends HookPropertyName<TClass>>(propertyKey: TName): HookDecoratorBuilder<TClass>;
  setter<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    alternativeName: string,
  ): HookDecoratorBuilder<TClass>;
  setter<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKey: HookKeyDynamic,
  ): HookDecoratorBuilder<TClass>;
  setter<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKeyOrName: HookKeyDynamic | string,
  ): HookDecoratorBuilder<TClass>;
  setter<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    dynamicKey: HookKeyDynamic,
    alternativeName: string,
  ): HookDecoratorBuilder<TClass>;
  setter<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    alternativeName: string,
    dynamicKey: HookKeyDynamic,
  ): HookDecoratorBuilder<TClass>;
  setter<TName extends HookPropertyName<TClass>>(
    propertyKey: TName,
    arg1?: HookDecoratorArgument,
    arg2?: HookDecoratorArgument,
  ): this {
    this.HookedClass = hookSetter(this.HookedClass, propertyKey, arg1, arg2);
    return this;
  }

  build(): TClass {
    return this.HookedClass;
  }
}

/**
 * Creates a fluent builder for decorating an existing class without decorator syntax.
 *
 * This is the easiest manual API when you want to decorate several members at once.
 * The builder automatically starts with `hookClass(Class)` under the hood.
 *
 * Example:
 * ```ts
 * let UserService = class UserService {
 *   save(user: any) {
 *     return user;
 *   }
 * };
 *
 * UserService = decorateHooks(UserService)
 *   .method("save")
 *   .build();
 * ```
 *
 * @param Class The class to decorate.
 * @returns A chainable builder that returns the final decorated class from `build()`.
 */
export function Hooks<TClass extends HookDecoratedClass>(Class: TClass): IHookDecoratorBuilder<TClass>;
export function Hooks<TClass extends HookDecoratedClass>(Class: TClass): HookDecoratorBuilder<TClass>;
export function Hooks<TClass extends HookDecoratedClass>(Class: TClass): IHookDecoratorBuilder<TClass> {
  return new HookDecoratorBuilder(Class);
}

export type MiddlewareMethod<A extends any[] = any[], R = any, TThis = unknown> = (
  this: TThis,
  next: (...args: A) => R,
  ...args: A
) => R;

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
    ? Member extends (this: infer ThisArg, ...args: any[]) => any
      ? ThisArg
      : unknown
    : unknown;

export interface IMiddlewareMethods {
  [key: string | symbol]: MiddlewareMethod[];
}

export const middlewares: WeakMap<HookKey, IMiddlewareMethods> = new WeakMap();

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
  fn: MiddlewareMethod<Parameters<T>, ReturnType<T>>,
): () => void;
/** Attaches middleware to a specific hook key */
export function attach<A extends any[] = any[], R = any>(key: HookKey, fn: MiddlewareMethod<A, R>): () => void;
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
export function attach(key: HookKey, name: HookName, fn: MiddlewareMethod<any[], unknown>): () => void;

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

export interface IHookInspection {
  key: HookKey;
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

  const methods = middlewares.get(maybeHook.key);
  const middlewareNames = Object.keys(methods || {}) as HookName[];
  const middlewareCount = middlewareNames.reduce((count, methodName) => {
    return count + (methods?.[methodName]?.length || 0);
  }, 0);

  return {
    key: maybeHook.key,
    name: maybeHook.name,
    middlewareCount,
    middlewareNames,
  };
}

/**
 * Detaches a specific middleware function from a hook.
 *
 * @param key The hook key.
 * @param name The hook name.
 * @param fn The middleware function to remove.
 */
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
