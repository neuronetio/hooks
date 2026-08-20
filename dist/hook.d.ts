import { ArgumentsProvider, HOOK_DATA, HookKeyComposite, HookKeyDynamic, HookKeyOrKeys, HookKeySingle, HookName, IHookFn, InferMiddlewareArgs, InferMiddlewareResult, InferMiddlewareThis } from "./shared.js";
//#region src/hook.d.ts
/**
 * Retrieves the hook key context for the currently executing hook.
 * This is useful for inferring the hook key when it's not explicitly provided.
 *
 * @returns The current HookKey or null if no hook is executing.
 */
declare function getCurrentHookKeyContext(): HookKeyOrKeys | null;
/**
 * Creates a hook function that can be used to dynamically and externally add or remove middleware
 * without any further modifications to the function itself.
 *
 * Can also be used as a decorator for class methods, accessors, and fields.
 *
 * See {@link https://github.com/neuronetio/hooks#readme} for more examples and full documentation.
 */
interface HookApi {
  /**
   * Creates a hook function for a composite key (an array of hook keys).
   *
   * @param keys The composite key (array of hook keys) identifying the hook context.
   * @param fn The original function to be hooked.
   * @returns A hook function wrapping `fn`.
   */
  <const C extends HookKeyComposite, Args extends any[], R extends any>(keys: C, fn: (...args: Args) => R | null): IHookFn<Args, R>;
  /**
   * Creates a hook function for a composite key with an arguments provider.
   *
   * @param keys The composite key (array of hook keys) identifying the hook context.
   * @param args An arguments provider that supplies the arguments passed to the hooked function.
   * @param fn The original function to be hooked.
   * @returns A hook function wrapping `fn` that uses the provided arguments.
   */
  <const C extends HookKeyComposite, Args extends any[], R extends any>(keys: C, args: ArgumentsProvider<Args>, fn: (...args: Args) => R | null): IHookFn<Args, R, []>;
  /**
   * Creates a hook function for a composite key with a custom hook name.
   *
   * @param keys The composite key (array of hook keys) identifying the hook context.
   * @param name The name of the hook.
   * @param fn The original function to be hooked.
   * @returns A hook function wrapping `fn` under the given name.
   */
  <const C extends HookKeyComposite, Args extends any[], R extends any>(keys: C, name: HookName, fn: (...args: Args) => R | null): IHookFn<Args, R>;
  /**
   * Creates a hook function for a composite key with a custom hook name and an arguments provider.
   *
   * @param keys The composite key (array of hook keys) identifying the hook context.
   * @param name The name of the hook.
   * @param args An arguments provider that supplies the arguments passed to the hooked function.
   * @param fn The original function to be hooked.
   * @returns A hook function wrapping `fn` under the given name, using the provided arguments.
   */
  <const C extends HookKeyComposite, Args extends any[], R extends any>(keys: C, name: HookName, args: ArgumentsProvider<Args>, fn: (...args: Args) => R | null): IHookFn<Args, R, []>;
  /**
   * Creates a hook decorator with no arguments.
   *
   * @returns A decorator that wraps the decorated class member in a hook.
   */
  (): ReturnType<typeof hookDecorator>;
  /**
   * Creates a hook decorator with an alternative name.
   *
   * @param alternativeName The alternative name used for the hook instead of the member name.
   * @returns A decorator that wraps the decorated class member in a hook.
   */
  (alternativeName: string): ReturnType<typeof hookDecorator>;
  /**
   * Creates a hook decorator with a dynamic key.
   *
   * @param dynamic The dynamic hook key resolver.
   * @returns A decorator that wraps the decorated class member in a hook.
   */
  (dynamic: HookKeyDynamic): ReturnType<typeof hookDecorator>;
  /**
   * Creates a hook decorator with an alternative name and a dynamic key.
   *
   * @param alternativeName The alternative name used for the hook instead of the member name.
   * @param dynamic The dynamic hook key resolver.
   * @returns A decorator that wraps the decorated class member in a hook.
   */
  (alternativeName: string, dynamic: HookKeyDynamic): ReturnType<typeof hookDecorator>;
  /**
   * Creates a hook decorator with a dynamic key and an alternative name.
   *
   * @param dynamic The dynamic hook key resolver.
   * @param alternativeName The alternative name used for the hook instead of the member name.
   * @returns A decorator that wraps the decorated class member in a hook.
   */
  (dynamic: HookKeyDynamic, alternativeName: string): ReturnType<typeof hookDecorator>;
  /**
   * Creates a hook function wrapping the given function.
   *
   * @param fn The original function to be hooked.
   * @returns A hook function wrapping `fn`.
   */
  <F extends (...args: any[]) => any>(fn: F | null): IHookFn<Parameters<F>, ReturnType<F>>;
  /**
   * Creates a hook function wrapping the given function with an arguments provider.
   *
   * @param args An arguments provider that supplies the arguments passed to the hooked function.
   * @param fn The original function to be hooked.
   * @returns A hook function wrapping `fn` that uses the provided arguments.
   */
  <F extends (...args: any[]) => any>(args: ArgumentsProvider<Parameters<F>>, fn: F | null): IHookFn<Parameters<F>, ReturnType<F>, []>;
  /**
   * Creates a hook function wrapping the given function with a custom hook name.
   *
   * @param name The name of the hook.
   * @param fn The original function to be hooked.
   * @returns A hook function wrapping `fn` under the given name.
   */
  <F extends (...args: any[]) => any>(name: HookName, fn: F | null): IHookFn<Parameters<F>, ReturnType<F>>;
  /**
   * Creates a hook function wrapping the given function with a custom hook name and an arguments provider.
   *
   * @param name The name of the hook.
   * @param args An arguments provider that supplies the arguments passed to the hooked function.
   * @param fn The original function to be hooked.
   * @returns A hook function wrapping `fn` under the given name, using the provided arguments.
   */
  <F extends (...args: any[]) => any>(name: HookName, args: ArgumentsProvider<Parameters<F>>, fn: F | null): IHookFn<Parameters<F>, ReturnType<F>, []>;
  /**
   * Creates a hook function for a single hook key.
   *
   * @param key The single hook key identifying the hook context.
   * @param fn The original function to be hooked.
   * @returns A hook function wrapping `fn`.
   */
  <F extends (...args: any[]) => any>(key: HookKeySingle, fn: F | null): IHookFn<Parameters<F>, ReturnType<F>>;
  /**
   * Creates a hook function for a single hook key with an arguments provider.
   *
   * @param key The single hook key identifying the hook context.
   * @param args An arguments provider that supplies the arguments passed to the hooked function.
   * @param fn The original function to be hooked.
   * @returns A hook function wrapping `fn` that uses the provided arguments.
   */
  <F extends (...args: any[]) => any>(key: HookKeySingle, args: ArgumentsProvider<Parameters<F>>, fn: F | null): IHookFn<Parameters<F>, ReturnType<F>, []>;
  /**
   * Creates a hook function for a single hook key with a custom hook name.
   *
   * @param key The single hook key identifying the hook context.
   * @param name The name of the hook.
   * @param fn The original function to be hooked.
   * @returns A hook function wrapping `fn` under the given name.
   */
  <F extends (...args: any[]) => any>(key: HookKeySingle, name: HookName, fn: F | null): IHookFn<Parameters<F>, ReturnType<F>>;
  /**
   * Creates a hook function for a single hook key with a custom hook name and an arguments provider.
   *
   * @param key The single hook key identifying the hook context.
   * @param name The name of the hook.
   * @param args An arguments provider that supplies the arguments passed to the hooked function.
   * @param fn The original function to be hooked.
   * @returns A hook function wrapping `fn` under the given name, using the provided arguments.
   */
  <F extends (...args: any[]) => any>(key: HookKeySingle, name: HookName, args: ArgumentsProvider<Parameters<F>>, fn: F | null): IHookFn<Parameters<F>, ReturnType<F>, []>;
}
declare const hook: HookApi;
declare module "@neuronet/hooks" {
  interface HookApi {
    /**
     * Used to inherit middlewares from the base class.
     * It traverses down the prototype chain and collects all constructors.
     * By default it will include the instance itself, but you can set `includeInstance` to false to exclude it.
     * The constructors are returned from the most derived class up to the base class.
     *
     * @param classOrInstance The class or instance whose prototype chain should be inspected.
     * @returns All constructors found on the class or instance's prototype chain, excluding native `Object`.
     */
    inherit: typeof inherit;
  }
}
/**
 * Used to inherit middlewares from the base class.
 * It traverses down the prototype chain and collects all constructors.
 *
 * @param classOrInstance The class or instance whose prototype chain should be inspected.
 * @returns All constructors found on the class or instance's prototype chain, excluding native `Object`.
 */
declare function inherit(classOrInstance: object): object[];
/**
 * A class decorator that enables hook support for the class.
 * It initializes metadata required for `@hook()` decorated members to work correctly,
 * ensuring that middleware can be attached to both the class and its instances.
 */
declare function Hook(): (_Class: any, context: ClassDecoratorContext) => void;
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
type MiddlewareMethod<A extends any[] = any[], R = any, TThis = unknown> = [A] extends [never] ? never : [R] extends [never] ? never : [TThis] extends [never] ? never : (this: TThis, next: (...args: A) => R, ...args: A) => R;
type HookOrigin<T> = T extends {
  [HOOK_DATA]: infer HookData;
} ? HookData extends {
  origin: infer Origin;
} ? Origin extends ((...args: infer A) => infer R) ? [A, R] : [any[], any] : [any[], any] : T extends ((...args: infer A) => infer R) ? [A, R] : [any[], any];
type HookOriginArgs<T> = HookOrigin<T>[0];
type HookOriginResult<T> = HookOrigin<T>[1];
type HookOriginThis<T> = T extends {
  [HOOK_DATA]: infer HookData;
} ? HookData extends {
  origin: infer Origin;
} ? Origin extends ((this: infer ThisArg, ...args: any[]) => any) ? ThisArg : unknown : unknown : T extends ((this: infer ThisArg, ...args: any[]) => any) ? ThisArg : unknown;
interface IMiddlewareMethods {
  [key: string | symbol]: MiddlewareMethod[];
}
declare const middleware: WeakMap<HookKeyOrKeys, IMiddlewareMethods>;
interface HookApi {
  /**
   * Attaches a middleware to a hook function.
   *
   * Middleware registered this way runs before the hook's original function whenever the hook is
   * invoked. Each middleware receives a `next` function that continues the chain (calling the next
   * middleware or, at the end, the original function) followed by the hook's arguments. Middleware
   * can inspect or modify the arguments before calling `next`, and can modify the returned result
   * after `next` resolves. Multiple middlewares attached to the same hook run in the order they were
   * attached.
   *
   * The hook to attach to can be identified in several ways:
   * - **A hook function** (`attach(hookFn, fn)`): the key and name are read from the hook's internal
   *   metadata, so the middleware is attached exactly where the hook was created.
   * - **A hook key** (`attach(key, fn)` or `attach(key, name, fn)`): the middleware is attached to
   *   every hook that uses the given key. The key can be a symbol, an object, a function, or an array
   *   of keys — in which case the first key from the array is used.
   * - **A class or instance** (`attach(obj, expression, fn)`): the middleware is attached to the hook
   * using the given expression. The middleware's arguments, result, and `this` types are inferred from the
   * given class or instance when an expression is used. A leading `!` at the beginning of an expression is
   * stripped and ignored; it is used to turn off type checking when needed. For example, when you want
   * to use an alternative name for middleware or want to use a different type.
   *
   * When a composite key (an array of keys) is passed, only the first key is used. This is the
   * instance-level key, which has the highest priority and can override lower levels, so middleware
   * attached this way behaves like a normal single-level middleware. To target a key from a lower
   * level, pass that key explicitly.
   *
   * Dynamic hook keys are not supported (here) and throw an error, because a dynamic key is resolved at
   * runtime (with proper `this` context) and cannot be used as a stable attachment target.
   *
   * @param hookFn The hook function to attach the middleware to.
   * @param fn The middleware function to attach.
   * @returns A function that detaches the middleware when called.
   */
  attach<T extends (...args: any[]) => any>(hookFn: T, fn: MiddlewareMethod<HookOriginArgs<T>, HookOriginResult<T>, HookOriginThis<T>>): () => void;
  /**
   * Attaches a middleware to a hook key.
   *
   * Middleware registered this way runs before the hook's original function whenever the hook is
   * invoked. Each middleware receives a `next` function that continues the chain (calling the next
   * middleware or, at the end, the original function) followed by the hook's arguments. Middleware
   * can inspect or modify the arguments before calling `next`, and can modify the returned result
   * after `next` resolves. Multiple middlewares attached to the same hook run in the order they were
   * attached.
   *
   * The hook to attach to can be identified in several ways:
   * - **A hook function** (`attach(hookFn, fn)`): the key and name are read from the hook's internal
   *   metadata, so the middleware is attached exactly where the hook was created.
   * - **A hook key** (`attach(key, fn)` or `attach(key, name, fn)`): the middleware is attached to
   *   every hook that uses the given key. The key can be a symbol, an object, a function, or an array
   *   of keys — in which case the first key from the array is used.
   * - **A class or instance** (`attach(obj, expression, fn)`): the middleware is attached to the hook
   * using the given expression. The middleware's arguments, result, and `this` types are inferred from the
   * given class or instance when an expression is used. A leading `!` at the beginning of an expression is
   * stripped and ignored; it is used to turn off type checking when needed. For example, when you want
   * to use an alternative name for middleware or want to use a different type.
   *
   * When a composite key (an array of keys) is passed, only the first key is used. This is the
   * instance-level key, which has the highest priority and can override lower levels, so middleware
   * attached this way behaves like a normal single-level middleware. To target a key from a lower
   * level, pass that key explicitly.
   *
   * Dynamic hook keys are not supported (here) and throw an error, because a dynamic key is resolved at
   * runtime (with proper `this` context) and cannot be used as a stable attachment target.
   *
   * @param key The hook key to attach the middleware to.
   * @param fn The middleware function to attach.
   * @returns A function that detaches the middleware when called.
   */
  attach<A extends any[] = any[], R = any>(key: HookKeyOrKeys, fn: MiddlewareMethod<A, R>): () => void;
  /**
   * Attaches a middleware to a symbol hook key under a specific hook name.
   *
   * Middleware registered this way runs before the hook's original function whenever the hook is
   * invoked. Each middleware receives a `next` function that continues the chain (calling the next
   * middleware or, at the end, the original function) followed by the hook's arguments. Middleware
   * can inspect or modify the arguments before calling `next`, and can modify the returned result
   * after `next` resolves. Multiple middlewares attached to the same hook run in the order they were
   * attached.
   *
   * The hook to attach to can be identified in several ways:
   * - **A hook function** (`attach(hookFn, fn)`): the key and name are read from the hook's internal
   *   metadata, so the middleware is attached exactly where the hook was created.
   * - **A hook key** (`attach(key, fn)` or `attach(key, name, fn)`): the middleware is attached to
   *   every hook that uses the given key. The key can be a symbol, an object, a function, or an array
   *   of keys — in which case the first key from the array is used.
   * - **A class or instance** (`attach(obj, expression, fn)`): the middleware is attached to the hook
   * using the given expression. The middleware's arguments, result, and `this` types are inferred from the
   * given class or instance when an expression is used. A leading `!` at the beginning of an expression is
   * stripped and ignored; it is used to turn off type checking when needed. For example, when you want
   * to use an alternative name for middleware or want to use a different type.
   *
   * When a composite key (an array of keys) is passed, only the first key is used. This is the
   * instance-level key, which has the highest priority and can override lower levels, so middleware
   * attached this way behaves like a normal single-level middleware. To target a key from a lower
   * level, pass that key explicitly.
   *
   * Dynamic hook keys are not supported (here) and throw an error, because a dynamic key is resolved at
   * runtime (with proper `this` context) and cannot be used as a stable attachment target.
   *
   * @param key The symbol hook key to attach the middleware to.
   * @param name The hook name to attach the middleware under.
   * @param fn The middleware function to attach.
   * @returns A function that detaches the middleware when called.
   */
  attach<S extends symbol, N extends HookName>(key: S, name: N, fn: MiddlewareMethod<any[], any>): () => void;
  /**
   * Attaches a middleware to a class or instance under a specific expression.
   *
   * Middleware registered this way runs before the hook's original function whenever the hook is
   * invoked. Each middleware receives a `next` function that continues the chain (calling the next
   * middleware or, at the end, the original function) followed by the hook's arguments. Middleware
   * can inspect or modify the arguments before calling `next`, and can modify the returned result
   * after `next` resolves. Multiple middlewares attached to the same hook run in the order they were
   * attached.
   *
   * The hook to attach to can be identified in several ways:
   * - **A hook function** (`attach(hookFn, fn)`): the key and name are read from the hook's internal
   *   metadata, so the middleware is attached exactly where the hook was created.
   * - **A hook key** (`attach(key, fn)` or `attach(key, name, fn)`): the middleware is attached to
   *   every hook that uses the given key. The key can be a symbol, an object, a function, or an array
   *   of keys — in which case the first key from the array is used.
   * - **A class or instance** (`attach(obj, expression, fn)`): the middleware is attached to the hook
   * using the given expression. The middleware's arguments, result, and `this` types are inferred from the
   * given class or instance when an expression is used. A leading `!` at the beginning of an expression is
   * stripped and ignored; it is used to turn off type checking when needed. For example, when you want
   * to use an alternative name for middleware or want to use a different type.
   *
   * When a composite key (an array of keys) is passed, only the first key is used. This is the
   * instance-level key, which has the highest priority and can override lower levels, so middleware
   * attached this way behaves like a normal single-level middleware. To target a key from a lower
   * level, pass that key explicitly.
   *
   * Dynamic hook keys are not supported (here) and throw an error, because a dynamic key is resolved at
   * runtime (with proper `this` context) and cannot be used as a stable attachment target.
   *
   * @param key The class or instance to attach the middleware to.
   * @param name The hook name to attach the middleware under.
   * @param fn The middleware function to attach.
   * @returns A function that detaches the middleware when called.
   */
  attach<TObject extends object, TName extends HookName>(key: TObject, name: TName, fn: MiddlewareMethod<InferMiddlewareArgs<TObject, TName>, InferMiddlewareResult<TObject, TName>, InferMiddlewareThis<TObject, TName>>): () => void;
}
/**
 * Attaches a middleware to a hook function.
 * Middleware registered this way runs before the hook's original function whenever the hook is
 * invoked. Each middleware receives a `next` function that continues the chain (calling the next
 * middleware or, at the end, the original function) followed by the hook's arguments. Middleware
 * can inspect or modify the arguments before calling `next`, and can modify the returned result
 * after `next` resolves. Multiple middlewares attached to the same hook run in the order they were
 * attached.
 *
 * The hook to attach to can be identified in several ways:
 * - **A hook function** (`attach(hookFn, fn)`): the key and name are read from the hook's internal
 *   metadata, so the middleware is attached exactly where the hook was created.
 * - **A hook key** (`attach(key, fn)` or `attach(key, name, fn)`): the middleware is attached to
 *   every hook that uses the given key. The key can be a symbol, an object, a function, or an array
 *   of keys — in which case the first key from the array is used.
 * - **A class or instance** (`attach(obj, expression, fn)`): the middleware is attached to the hook
 * using the given expression. The middleware's arguments, result, and `this` types are inferred from the
 * given class or instance when an expression is used. A leading `!` at the beginning of an expression is
 * stripped and ignored; it is used to turn off type checking when needed. For example, when you want
 * to use an alternative name for middleware or want to use a different type.
 *
 * When a composite key (an array of keys) is passed, only the first key is used. This is the
 * instance-level key, which has the highest priority and can override lower levels, so middleware
 * attached this way behaves like a normal single-level middleware. To target a key from a lower
 * level, pass that key explicitly.
 *
 * Dynamic hook keys are not supported (here) and throw an error, because a dynamic key is resolved at
 * runtime (with proper `this` context) and cannot be used as a stable attachment target.
 *
 * @param hookFn The hook function to attach the middleware to.
 * @param fn The middleware function to attach.
 * @returns A function that detaches the middleware when called.
 */
declare function attach<T extends (...args: any[]) => any>(hookFn: T, fn: MiddlewareMethod<HookOriginArgs<T>, HookOriginResult<T>, HookOriginThis<T>>): () => void;
/**
 * Attaches a middleware to a hook key.
 * Middleware registered this way runs before the hook's original function whenever the hook is
 * invoked. Each middleware receives a `next` function that continues the chain (calling the next
 * middleware or, at the end, the original function) followed by the hook's arguments. Middleware
 * can inspect or modify the arguments before calling `next`, and can modify the returned result
 * after `next` resolves. Multiple middlewares attached to the same hook run in the order they were
 * attached.
 *
 * The hook to attach to can be identified in several ways:
 * - **A hook function** (`attach(hookFn, fn)`): the key and name are read from the hook's internal
 *   metadata, so the middleware is attached exactly where the hook was created.
 * - **A hook key** (`attach(key, fn)` or `attach(key, name, fn)`): the middleware is attached to
 *   every hook that uses the given key. The key can be a symbol, an object, a function, or an array
 *   of keys — in which case the first key from the array is used.
 * - **A class or instance** (`attach(obj, expression, fn)`): the middleware is attached to the hook
 * using the given expression. The middleware's arguments, result, and `this` types are inferred from the
 * given class or instance when an expression is used. A leading `!` at the beginning of an expression is
 * stripped and ignored; it is used to turn off type checking when needed. For example, when you want
 * to use an alternative name for middleware or want to use a different type.
 *
 * When a composite key (an array of keys) is passed, only the first key is used. This is the
 * instance-level key, which has the highest priority and can override lower levels, so middleware
 * attached this way behaves like a normal single-level middleware. To target a key from a lower
 * level, pass that key explicitly.
 *
 * Dynamic hook keys are not supported (here) and throw an error, because a dynamic key is resolved at
 * runtime (with proper `this` context) and cannot be used as a stable attachment target.
 *
 * @param key The hook key to attach the middleware to.
 * @param fn The middleware function to attach.
 * @returns A function that detaches the middleware when called.
 */
declare function attach<A extends any[] = any[], R = any>(key: HookKeyOrKeys, fn: MiddlewareMethod<A, R>): () => void;
/**
 * Attaches a middleware to a symbol hook key under a specific hook name.
 *
 * Middleware registered this way runs before the hook's original function whenever the hook is
 * invoked. Each middleware receives a `next` function that continues the chain (calling the next
 * middleware or, at the end, the original function) followed by the hook's arguments. Middleware
 * can inspect or modify the arguments before calling `next`, and can modify the returned result
 * after `next` resolves. Multiple middlewares attached to the same hook run in the order they were
 * attached.
 *
 * The hook to attach to can be identified in several ways:
 * - **A hook function** (`attach(hookFn, fn)`): the key and name are read from the hook's internal
 *   metadata, so the middleware is attached exactly where the hook was created.
 * - **A hook key** (`attach(key, fn)` or `attach(key, name, fn)`): the middleware is attached to
 *   every hook that uses the given key. The key can be a symbol, an object, a function, or an array
 *   of keys — in which case the first key from the array is used.
 * - **A class or instance** (`attach(obj, expression, fn)`): the middleware is attached to the hook
 * using the given expression. The middleware's arguments, result, and `this` types are inferred from the
 * given class or instance when an expression is used. A leading `!` at the beginning of an expression is
 * stripped and ignored; it is used to turn off type checking when needed. For example, when you want
 * to use an alternative name for middleware or want to use a different type.
 *
 * When a composite key (an array of keys) is passed, only the first key is used. This is the
 * instance-level key, which has the highest priority and can override lower levels, so middleware
 * attached this way behaves like a normal single-level middleware. To target a key from a lower
 * level, pass that key explicitly.
 *
 * Dynamic hook keys are not supported (here) and throw an error, because a dynamic key is resolved at
 * runtime (with proper `this` context) and cannot be used as a stable attachment target.
 *
 * @param key The symbol hook key to attach the middleware to.
 * @param name The hook name to attach the middleware under.
 * @param fn The middleware function to attach.
 * @returns A function that detaches the middleware when called.
 */
declare function attach<S extends symbol, N extends HookName>(key: S, name: N, fn: MiddlewareMethod<any[], any>): () => void;
declare function attach<TObject extends object, TName extends HookName>(key: TObject, name: TName, fn: MiddlewareMethod<InferMiddlewareArgs<TObject, TName>, InferMiddlewareResult<TObject, TName>, InferMiddlewareThis<TObject, TName>>): () => void;
interface IHookInspection {
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
declare function inspectHook(hookFn: IHookFn<any, any>): IHookInspection;
declare function getMiddleware(key: HookKeyOrKeys, name: HookName): MiddlewareMethod[];
/**
 * Detaches a specific middleware function from a hook.
 *
 * @param key The hook key.
 * @param name The hook name.
 * @param fn The middleware function to remove.
 */
declare function detach(key: HookKeyOrKeys, name: HookName, fn: MiddlewareMethod): void;
type MiddlewareNext<A extends any[] = any[], R = any> = ((...args: A) => R) | null;
/**
 * Temporarily disables middleware execution for the duration of the provided function.
 *
 * This is useful when you want to run `super.someMethod` without triggering any attached middleware again, or want to see the original result.
 *
 * @param fn The function to execute without middleware.
 * @returns The result of the executed function.
 */
declare function bypassMiddleware<T>(fn: () => T): T;
//#endregion
export { DecoratorResult, Hook, HookApi, HookDecoratorContext, HookOrigin, HookOriginArgs, HookOriginResult, HookOriginThis, IHookInspection, IMiddlewareMethods, MiddlewareMethod, MiddlewareNext, attach, bypassMiddleware, detach, getCurrentHookKeyContext, getMiddleware, hook, hookDecorator, inherit, inspectHook, middleware };
//# sourceMappingURL=hook.d.ts.map