//#region src/hook.d.ts
declare const DEFAULT_HOOK_NAME: unique symbol;
/**
 * Hook property key used to store hook metadata on functions and classes.
 */
declare const HOOK: unique symbol;
/**
 * Represents a composition of multiple hook keys.
 * Used to support hierarchical or multi-layered hook contexts.
 */
declare class HookKeyComposite {
  keys: HookKey[];
  constructor(keys?: HookKey[]);
  /**
   * Flattens the composite keys into a single-level array of non-composite keys.
   * @param keys The keys to flatten. Defaults to the keys of this composite.
   * @returns An array of non-composite hook keys.
   */
  flat(keys?: HookKey[]): Exclude<HookKey, HookKeyComposite>[];
  /**
   * Iterates over all non-composite keys in this composite (recursive).
   */
  [Symbol.iterator](): Generator<HookKey, void, undefined>;
}
/**
 * Composes multiple hook keys into a single composite key.
 * Useful for scenarios where a hook should trigger middleware attached to multiple contexts
 * (e.g., an instance and its class).
 *
 * @param keys The hook keys to compose.
 * @returns A new HookKeyComposite instance.
 */
declare function composeHookKeys(...keys: HookKey[]): HookKey;
/**
 * An alias for `composeHookKeys` to provide a shorter and more convenient name.
 *
 * Composes multiple hook keys into a single composite key.
 * Useful for scenarios where a hook should trigger middleware attached to multiple contexts
 * (e.g., an instance and its class).
 *
 * @param keys The hook keys to compose.
 * @returns A new HookKeyComposite instance.
 */
declare const keys: typeof composeHookKeys;
type HookKeyDynamicFn = () => HookKey;
/**
 * Represents a hook key that is resolved dynamically at runtime.
 * The key is resolved by calling the provided function, usually with the `this` context
 * of the hooked method.
 */
declare class HookKeyDynamic {
  fn: HookKeyDynamicFn;
  constructor(fn: HookKeyDynamicFn);
}
/**
 * Creates a dynamic hook key.
 *
 * @param fn A function that returns a HookKey.
 * @returns A new HookKeyDynamic instance.
 */
declare function dynamicHookKey(fn: HookKeyDynamicFn): HookKeyDynamic;
/**
 * An alias for `dynamicHookKey` to provide a shorter and more convenient name.
 *
 * Creates a dynamic hook key.
 *
 * @param fn A function that returns a HookKey.
 * @returns A new HookKeyDynamic instance.
 */
declare const dynKey: typeof dynamicHookKey;
/**
 * A utility class to provide the arguments passed to the middleware and hook functions.
 */
declare class ArgumentsProvider<A extends any[] = any[]> {
  args: () => A;
  constructor(args: A | (() => A));
}
type ArgumentsFromProvider<AP extends ArgumentsProvider<any[]>> = AP extends ArgumentsProvider<infer A> ? A : never;
/**
 * Creates an ArgumentsProvider instance to provide the arguments passed to the middleware and hook functions.
 */
declare function argsProvider<A extends any[]>(dynamicArgs: () => A): ArgumentsProvider<A>;
declare function argsProvider<A extends any[]>(...args: A): ArgumentsProvider<A>;
type HookKeySingle = symbol | Function | object | (Record<PropertyKey, any> & ({
  length?: never;
} | {
  push?: never;
} | {
  pop?: never;
} | {
  splice?: never;
})) | (Record<PropertyKey, any> & {
  args?: never;
});
/**
 * HookKey can be a symbol, an object, or a function (but not an array).
 * It is used to identify a specific hook context.
 */
type HookKey = HookKeySingle | HookKeyComposite;
type HookName = string | symbol;
/**
 * Metadata stored on a hook function.
 */
interface IHookData<A extends any[] = any[], R = any> {
  /** The original function being hooked. */
  origin: (...args: A) => R;
  /** The key associated with this hook. */
  key: HookKey;
  /** The name of the hook. */
  name: HookName;
  /** Optional arguments override. */
  argsProvider?: ArgumentsProvider<A>;
}
/**
 * A function wrapped in a hook.
 */
interface IHookFn<A extends any[] = any[], R = any, CallArgs extends any[] = A> {
  (...args: CallArgs): R;
  /** Metadata for the hook. */
  [HOOK]: IHookData<A, R>;
}
type MetadataHooks = (string | symbol)[];
/**
 * Retrieves the hook key context for the currently executing hook.
 * This is useful for inferring the hook key when it's not explicitly provided.
 *
 * @returns The current HookKey or null if no hook is executing.
 */
declare function getCurrentHookKeyContext(): HookKey | null;
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
declare function hook(): ReturnType<typeof hookDecorator>;
/** Decorator with alternative name */
declare function hook(alternativeName: string): ReturnType<typeof hookDecorator>;
/** Decorator with dynamic key */
declare function hook(dynamic: HookKeyDynamic): ReturnType<typeof hookDecorator>;
/** Decorator with alternative name and dynamic key */
declare function hook(alternativeName: string, dynamic: HookKeyDynamic): ReturnType<typeof hookDecorator>;
/** Decorator with dynamic key and alternative name */
declare function hook(dynamic: HookKeyDynamic, alternativeName: string): ReturnType<typeof hookDecorator>;
/** Wraps a function in a hook */
declare function hook<F extends (...args: any[]) => any>(fn: F | null): IHookFn<Parameters<F>, ReturnType<F>>;
/** Wraps a function in a hook with overridden arguments */
declare function hook<F extends (...args: any[]) => any>(args: ArgumentsProvider<Parameters<F>>, fn: F | null): IHookFn<Parameters<F>, ReturnType<F>, []>;
/** Wraps a function in a hook with a specific name */
declare function hook<F extends (...args: any[]) => any>(name: HookName, fn: F | null): IHookFn<Parameters<F>, ReturnType<F>>;
/** Wraps a function in a hook with a specific name and overridden arguments */
declare function hook<F extends (...args: any[]) => any>(name: HookName, args: ArgumentsProvider<Parameters<F>>, fn: F | null): IHookFn<Parameters<F>, ReturnType<F>, []>;
/** Wraps a function in a hook with a specific key */
declare function hook<F extends (...args: any[]) => any>(key: HookKey, fn: F | null): IHookFn<Parameters<F>, ReturnType<F>>;
/** Wraps a function in a hook with a specific key and overridden arguments */
declare function hook<F extends (...args: any[]) => any>(key: HookKey, args: ArgumentsProvider<Parameters<F>>, fn: F | null): IHookFn<Parameters<F>, ReturnType<F>, []>;
/** Wraps a function in a hook with a specific key and name */
declare function hook<F extends (...args: any[]) => any>(key: HookKey, name: HookName, fn: F | null): IHookFn<Parameters<F>, ReturnType<F>>;
/** Wraps a function in a hook with a specific key, name, and overridden arguments */
declare function hook<F extends (...args: any[]) => any>(key: HookKey, name: HookName, args: ArgumentsProvider<Parameters<F>>, fn: F | null): IHookFn<Parameters<F>, ReturnType<F>, []>;
/**
 * A class decorator that enables hook support for the class.
 * It initializes metadata required for `@hook()` decorated members to work correctly,
 * ensuring that middleware can be attached to both the class and its instances.
 *
 * @param _Class The class constructor.
 * @param context The class decorator context.
 */
declare function Hook(_Class: any, context: ClassDecoratorContext): void;
type HookDecoratorArgument = HookKeyDynamic | string;
type HookDecoratedClass = new (...args: any[]) => any;
type HookPropertyName<TClass extends HookDecoratedClass> = Exclude<Extract<keyof InstanceType<TClass> | keyof TClass | "constructor", PropertyKey>, "prototype">;
interface HookDecoratorContext {
  kind: "method" | "getter" | "setter" | "field" | "accessor";
  name: string | symbol;
  static: boolean;
  private: boolean;
  metadata: DecoratorMetadataObject;
  addInitializer(initializer: (this: any) => void): void;
}
type DecoratorResult = (value: any, context: HookDecoratorContext) => any;
/**
 * A decorator for class members (methods, accessors, fields) that wraps them in a hook.
 * Supports ECMA TC39 Stage 3+ decorators.
 *
 * When applied to a method, it allows attaching middleware to that method via its instance or class.
 * When applied to accessors, it generates hooks for `get` and `set` operations.
 * When applied to fields, it generates an `init` hook.
 */
declare function hookDecorator(): DecoratorResult;
/** Decorator with dynamic key */
declare function hookDecorator(dynamicKey: HookKeyDynamic): DecoratorResult;
/** Decorator with alternative name */
declare function hookDecorator(alternativeName: string): DecoratorResult;
/** Decorator with dynamic key or alternative name */
declare function hookDecorator(dynamicKeyOrName: HookKeyDynamic | string): DecoratorResult;
/** Decorator with dynamic key and alternative name */
declare function hookDecorator(dynamicKey: HookKeyDynamic, alternativeName: string): DecoratorResult;
/** Decorator with alternative name and dynamic key */
declare function hookDecorator(alternativeName: string, dynamicKey: HookKeyDynamic): DecoratorResult;
type MiddlewareMethod<A extends any[] = any[], R = any, TThis = unknown> = (this: TThis, next: (...args: A) => R, ...args: A) => R;
type HookOrigin<T> = T extends {
  [HOOK]: infer HookData;
} ? HookData extends {
  origin: infer Origin;
} ? Origin extends ((...args: infer A) => infer R) ? [A, R] : [any[], any] : [any[], any] : T extends ((...args: infer A) => infer R) ? [A, R] : [any[], any];
type HookOriginArgs<T> = HookOrigin<T>[0];
type HookOriginResult<T> = HookOrigin<T>[1];
type HookOriginThis<T> = T extends {
  [HOOK]: infer HookData;
} ? HookData extends {
  origin: infer Origin;
} ? Origin extends ((this: infer ThisArg, ...args: any[]) => any) ? ThisArg : unknown : unknown : T extends ((this: infer ThisArg, ...args: any[]) => any) ? ThisArg : unknown;
type HookNamePropertyKey<N extends HookName> = N extends `get ${infer P}` ? P & PropertyKey : N extends `set ${infer P}` ? P & PropertyKey : N extends `init ${infer P}` ? P & PropertyKey : N extends PropertyKey ? N : never;
type HookPrototype<TObject> = TObject extends (abstract new (...args: any[]) => any) ? TObject extends {
  prototype: infer TPrototype;
} ? TPrototype : never : never;
type ResolveMemberValue<TObject, TName extends PropertyKey> = TObject extends object ? TName extends keyof TObject ? TObject[TName] : TObject extends (abstract new (...args: any[]) => any) ? TName extends keyof HookPrototype<TObject> ? HookPrototype<TObject>[TName] : never : never : never;
type InferHookSignature<TObject, TName extends HookName> = TName extends string ? ResolveMemberValue<TObject, HookNamePropertyKey<TName>> extends (infer Member) ? [Member] extends [never] ? [any[], any] : Member extends {
  [HOOK]: infer HookData;
} ? HookData extends {
  origin: infer Origin;
} ? Origin extends ((...args: infer A) => infer R) ? [A, R] : [any[], any] : [any[], any] : Member extends ((...args: infer A) => infer R) ? [A, R] : TName extends `get ${string}` ? [[], Member] : TName extends `set ${string}` ? [[Member], void] : TName extends `init ${string}` ? [[Member], Member] : [any[], any] : [any[], any] : [any[], any];
type InferMiddlewareArgs<TObject, TName extends HookName> = InferHookSignature<TObject, TName>[0];
type InferMiddlewareResult<TObject, TName extends HookName> = InferHookSignature<TObject, TName>[1];
type InferMiddlewareThis<TObject, TName extends HookName> = ResolveMemberValue<TObject, HookNamePropertyKey<TName>> extends (infer Member) ? Member extends {
  [HOOK]: infer HookData;
} ? HookData extends {
  origin: infer Origin;
} ? Origin extends ((this: infer ThisArg, ...args: any[]) => any) ? ThisArg : unknown : unknown : Member extends ((this: infer ThisArg, ...args: any[]) => any) ? ThisArg : unknown : unknown;
interface IMiddlewareMethods {
  [key: string | symbol]: MiddlewareMethod[];
}
declare const middlewares: WeakMap<HookKey, IMiddlewareMethods>;
/**
 * Attaches a middleware function to a hook.
 * Middleware functions can intercept and modify arguments or results of the hooked function.
 *
 * @param hookFn The hook function to attach to.
 * @param fn The middleware function.
 * @returns A function that detaches the middleware when called.
 */
declare function attach<T extends (...args: any[]) => any>(hookFn: T, fn: MiddlewareMethod<HookOriginArgs<T>, HookOriginResult<T>, HookOriginThis<T>>): () => void;
/** Attaches middleware to a specific hook key */
declare function attach<A extends any[] = any[], R = any>(key: HookKey, fn: MiddlewareMethod<A, R>): () => void;
/** Attaches middleware to a specific member of a class/instance */
declare function attach<TObject, TName extends HookName>(key: TObject, name: TName, fn: MiddlewareMethod<InferMiddlewareArgs<TObject, TName>, InferMiddlewareResult<TObject, TName>, InferMiddlewareThis<TObject, TName>>): () => void;
/** Attaches middleware with a specific key and name */
declare function attach(key: HookKey, name: HookName, fn: MiddlewareMethod<any[], unknown>): () => void;
interface IHookInspection {
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
declare function inspectHook(hookFn: IHookFn<any, any>): IHookInspection;
declare function getMiddleware(key: HookKey, name: HookName): MiddlewareMethod[];
/**
 * Detaches a specific middleware function from a hook.
 *
 * @param key The hook key.
 * @param name The hook name.
 * @param fn The middleware function to remove.
 */
declare function detach(key: HookKey, name: HookName, fn: MiddlewareMethod): void;
type MiddlewareNext<A extends any[] = any[], R = any> = ((...args: A) => R) | null;
//#endregion
export { ArgumentsFromProvider, ArgumentsProvider, DEFAULT_HOOK_NAME, DecoratorResult, HOOK, Hook, HookDecoratedClass, HookDecoratorArgument, HookDecoratorContext, HookKey, HookKeyDynamic, HookKeyDynamicFn, HookKeySingle, HookName, HookPropertyName, IHookData, IHookFn, IHookInspection, IMiddlewareMethods, MetadataHooks, MiddlewareMethod, MiddlewareNext, argsProvider, attach, composeHookKeys, detach, dynKey, dynamicHookKey, getCurrentHookKeyContext, getMiddleware, hook, hookDecorator, inspectHook, keys, middlewares };
//# sourceMappingURL=hook.d.ts.map