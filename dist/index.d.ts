//#region src/index.d.ts
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
type HookKeySingle = symbol | Function | (Record<PropertyKey, any> & ({
  length?: never;
} | {
  push?: never;
} | {
  pop?: never;
} | {
  splice?: never;
}));
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
  args?: A;
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
declare function hook<A extends any[], R>(fn: ((...args: A) => R) | null): IHookFn<A, R>;
/** Wraps a function in a hook with overridden arguments */
declare function hook<A extends any[], R>(args: A, fn: ((...args: A) => R) | null): IHookFn<A, R, []>;
/** Wraps a function in a hook with a specific name */
declare function hook<A extends any[], R>(name: HookName, fn: ((...args: A) => R) | null): IHookFn<A, R>;
/** Wraps a function in a hook with a specific name and overridden arguments */
declare function hook<A extends any[], R>(name: HookName, args: A, fn: ((...args: A) => R) | null): IHookFn<A, R, []>;
/** Wraps a function in a hook with a specific key */
declare function hook<A extends any[], R>(key: HookKey, fn: ((...args: A) => R) | null): IHookFn<A, R>;
/** Wraps a function in a hook with a specific key and overridden arguments */
declare function hook<A extends any[], R>(key: HookKey, args: A, fn: ((...args: A) => R) | null): IHookFn<A, R, []>;
/** Wraps a function in a hook with a specific key and name */
declare function hook<A extends any[], R>(key: HookKey, name: HookName, fn: ((...args: A) => R) | null): IHookFn<A, R>;
/** Wraps a function in a hook with a specific key, name, and overridden arguments */
declare function hook<A extends any[], R>(key: HookKey, name: HookName, args: A, fn: ((...args: A) => R) | null): IHookFn<A, R, []>;
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
type DecoratorResult = (value: any, context: ClassMemberDecoratorContext) => any;
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
declare function hookClass<TClass extends HookDecoratedClass>(Class: TClass): TClass;
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
declare function hookMethod<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey): TClass;
declare function hookMethod<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, alternativeName: string): TClass;
declare function hookMethod<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, dynamicKey: HookKeyDynamic): TClass;
declare function hookMethod<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, dynamicKeyOrName: HookKeyDynamic | string): TClass;
declare function hookMethod<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, dynamicKey: HookKeyDynamic, alternativeName: string): TClass;
declare function hookMethod<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, alternativeName: string, dynamicKey: HookKeyDynamic): TClass;
declare function hookMethod<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, arg1?: HookDecoratorArgument, arg2?: HookDecoratorArgument): TClass;
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
declare function hookGetter<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey): TClass;
declare function hookGetter<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, alternativeName: string): TClass;
declare function hookGetter<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, dynamicKey: HookKeyDynamic): TClass;
declare function hookGetter<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, dynamicKeyOrName: HookKeyDynamic | string): TClass;
declare function hookGetter<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, dynamicKey: HookKeyDynamic, alternativeName: string): TClass;
declare function hookGetter<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, alternativeName: string, dynamicKey: HookKeyDynamic): TClass;
declare function hookGetter<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, arg1?: HookDecoratorArgument, arg2?: HookDecoratorArgument): TClass;
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
declare function hookSetter<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey): TClass;
declare function hookSetter<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, alternativeName: string): TClass;
declare function hookSetter<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, dynamicKey: HookKeyDynamic): TClass;
declare function hookSetter<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, dynamicKeyOrName: HookKeyDynamic | string): TClass;
declare function hookSetter<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, dynamicKey: HookKeyDynamic, alternativeName: string): TClass;
declare function hookSetter<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, alternativeName: string, dynamicKey: HookKeyDynamic): TClass;
declare function hookSetter<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, arg1?: HookDecoratorArgument, arg2?: HookDecoratorArgument): TClass;
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
declare function hookField<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey): TClass;
declare function hookField<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, alternativeName: string): TClass;
declare function hookField<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, dynamicKey: HookKeyDynamic): TClass;
declare function hookField<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, dynamicKeyOrName: HookKeyDynamic | string): TClass;
declare function hookField<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, dynamicKey: HookKeyDynamic, alternativeName: string): TClass;
declare function hookField<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, alternativeName: string, dynamicKey: HookKeyDynamic): TClass;
declare function hookField<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, arg1?: HookDecoratorArgument, arg2?: HookDecoratorArgument): TClass;
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
declare function hookAccessor<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey): TClass;
declare function hookAccessor<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, alternativeName: string): TClass;
declare function hookAccessor<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, dynamicKey: HookKeyDynamic): TClass;
declare function hookAccessor<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, dynamicKeyOrName: HookKeyDynamic | string): TClass;
declare function hookAccessor<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, dynamicKey: HookKeyDynamic, alternativeName: string): TClass;
declare function hookAccessor<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, alternativeName: string, dynamicKey: HookKeyDynamic): TClass;
declare function hookAccessor<TClass extends HookDecoratedClass>(Class: TClass, propertyKey: PropertyKey, arg1?: HookDecoratorArgument, arg2?: HookDecoratorArgument): TClass;
/**
 * Fluent builder for decorating existing classes without decorator syntax.
 *
 * The builder is useful when you want to decorate several members in one place
 * and finish with a single `build()` call.
 */
interface IHookDecoratorBuilder<TClass extends HookDecoratedClass = HookDecoratedClass> {
  /**
   * Decorates an auto-accessor and enables `init`, `get`, and `set` hooks for it.
   *
   * @param propertyKey The accessor name.
   * @param arg1 Optional alternative hook name or dynamic hook key.
   * @param arg2 Optional dynamic hook key or alternative hook name.
   * @returns The same builder so you can keep chaining calls.
   */
  accessor(propertyKey: PropertyKey): IHookDecoratorBuilder<TClass>;
  accessor(propertyKey: PropertyKey, alternativeName: string): IHookDecoratorBuilder<TClass>;
  accessor(propertyKey: PropertyKey, dynamicKey: HookKeyDynamic): IHookDecoratorBuilder<TClass>;
  accessor(propertyKey: PropertyKey, dynamicKeyOrName: HookKeyDynamic | string): IHookDecoratorBuilder<TClass>;
  accessor(propertyKey: PropertyKey, dynamicKey: HookKeyDynamic, alternativeName: string): IHookDecoratorBuilder<TClass>;
  accessor(propertyKey: PropertyKey, alternativeName: string, dynamicKey: HookKeyDynamic): IHookDecoratorBuilder<TClass>;
  accessor(propertyKey: PropertyKey, arg1?: HookDecoratorArgument, arg2?: HookDecoratorArgument): IHookDecoratorBuilder<TClass>;
  /**
   * Decorates a public field and enables the `init` hook for it.
   *
   * @param propertyKey The field name.
   * @param arg1 Optional alternative hook name or dynamic hook key.
   * @param arg2 Optional dynamic hook key or alternative hook name.
   * @returns The same builder so you can keep chaining calls.
   */
  field(propertyKey: PropertyKey): IHookDecoratorBuilder<TClass>;
  field(propertyKey: PropertyKey, alternativeName: string): IHookDecoratorBuilder<TClass>;
  field(propertyKey: PropertyKey, dynamicKey: HookKeyDynamic): IHookDecoratorBuilder<TClass>;
  field(propertyKey: PropertyKey, dynamicKeyOrName: HookKeyDynamic | string): IHookDecoratorBuilder<TClass>;
  field(propertyKey: PropertyKey, dynamicKey: HookKeyDynamic, alternativeName: string): IHookDecoratorBuilder<TClass>;
  field(propertyKey: PropertyKey, alternativeName: string, dynamicKey: HookKeyDynamic): IHookDecoratorBuilder<TClass>;
  field(propertyKey: PropertyKey, arg1?: HookDecoratorArgument, arg2?: HookDecoratorArgument): IHookDecoratorBuilder<TClass>;
  /**
   * Decorates a getter and enables the `get <name>` hook for it.
   *
   * @param propertyKey The getter name.
   * @param arg1 Optional alternative hook name or dynamic hook key.
   * @param arg2 Optional dynamic hook key or alternative hook name.
   * @returns The same builder so you can keep chaining calls.
   */
  getter(propertyKey: PropertyKey): IHookDecoratorBuilder<TClass>;
  getter(propertyKey: PropertyKey, alternativeName: string): IHookDecoratorBuilder<TClass>;
  getter(propertyKey: PropertyKey, dynamicKey: HookKeyDynamic): IHookDecoratorBuilder<TClass>;
  getter(propertyKey: PropertyKey, dynamicKeyOrName: HookKeyDynamic | string): IHookDecoratorBuilder<TClass>;
  getter(propertyKey: PropertyKey, dynamicKey: HookKeyDynamic, alternativeName: string): IHookDecoratorBuilder<TClass>;
  getter(propertyKey: PropertyKey, alternativeName: string, dynamicKey: HookKeyDynamic): IHookDecoratorBuilder<TClass>;
  getter(propertyKey: PropertyKey, arg1?: HookDecoratorArgument, arg2?: HookDecoratorArgument): IHookDecoratorBuilder<TClass>;
  /**
   * Decorates a method and enables class-level and instance-level hooks for it.
   *
   * @param propertyKey The method name.
   * @param arg1 Optional alternative hook name or dynamic hook key.
   * @param arg2 Optional dynamic hook key or alternative hook name.
   * @returns The same builder so you can keep chaining calls.
   */
  method(propertyKey: PropertyKey): IHookDecoratorBuilder<TClass>;
  method(propertyKey: PropertyKey, alternativeName: string): IHookDecoratorBuilder<TClass>;
  method(propertyKey: PropertyKey, dynamicKey: HookKeyDynamic): IHookDecoratorBuilder<TClass>;
  method(propertyKey: PropertyKey, dynamicKeyOrName: HookKeyDynamic | string): IHookDecoratorBuilder<TClass>;
  method(propertyKey: PropertyKey, dynamicKey: HookKeyDynamic, alternativeName: string): IHookDecoratorBuilder<TClass>;
  method(propertyKey: PropertyKey, alternativeName: string, dynamicKey: HookKeyDynamic): IHookDecoratorBuilder<TClass>;
  method(propertyKey: PropertyKey, arg1?: HookDecoratorArgument, arg2?: HookDecoratorArgument): IHookDecoratorBuilder<TClass>;
  /**
   * Decorates a setter and enables the `set <name>` hook for it.
   *
   * @param propertyKey The setter name.
   * @param arg1 Optional alternative hook name or dynamic hook key.
   * @param arg2 Optional dynamic hook key or alternative hook name.
   * @returns The same builder so you can keep chaining calls.
   */
  setter(propertyKey: PropertyKey): IHookDecoratorBuilder<TClass>;
  setter(propertyKey: PropertyKey, alternativeName: string): IHookDecoratorBuilder<TClass>;
  setter(propertyKey: PropertyKey, dynamicKey: HookKeyDynamic): IHookDecoratorBuilder<TClass>;
  setter(propertyKey: PropertyKey, dynamicKeyOrName: HookKeyDynamic | string): IHookDecoratorBuilder<TClass>;
  setter(propertyKey: PropertyKey, dynamicKey: HookKeyDynamic, alternativeName: string): IHookDecoratorBuilder<TClass>;
  setter(propertyKey: PropertyKey, alternativeName: string, dynamicKey: HookKeyDynamic): IHookDecoratorBuilder<TClass>;
  setter(propertyKey: PropertyKey, arg1?: HookDecoratorArgument, arg2?: HookDecoratorArgument): IHookDecoratorBuilder<TClass>;
  /**
   * Finishes the decoration chain and returns the wrapped class constructor.
   *
   * @returns The final decorated class.
   */
  build(): TClass;
}
declare class HookDecoratorBuilder<TClass extends HookDecoratedClass = HookDecoratedClass> implements IHookDecoratorBuilder<TClass> {
  private HookedClass;
  constructor(Class: TClass);
  accessor(propertyKey: PropertyKey): HookDecoratorBuilder<TClass>;
  accessor(propertyKey: PropertyKey, alternativeName: string): HookDecoratorBuilder<TClass>;
  accessor(propertyKey: PropertyKey, dynamicKey: HookKeyDynamic): HookDecoratorBuilder<TClass>;
  accessor(propertyKey: PropertyKey, dynamicKeyOrName: HookKeyDynamic | string): HookDecoratorBuilder<TClass>;
  accessor(propertyKey: PropertyKey, dynamicKey: HookKeyDynamic, alternativeName: string): HookDecoratorBuilder<TClass>;
  accessor(propertyKey: PropertyKey, alternativeName: string, dynamicKey: HookKeyDynamic): HookDecoratorBuilder<TClass>;
  field(propertyKey: PropertyKey): HookDecoratorBuilder<TClass>;
  field(propertyKey: PropertyKey, alternativeName: string): HookDecoratorBuilder<TClass>;
  field(propertyKey: PropertyKey, dynamicKey: HookKeyDynamic): HookDecoratorBuilder<TClass>;
  field(propertyKey: PropertyKey, dynamicKeyOrName: HookKeyDynamic | string): HookDecoratorBuilder<TClass>;
  field(propertyKey: PropertyKey, dynamicKey: HookKeyDynamic, alternativeName: string): HookDecoratorBuilder<TClass>;
  field(propertyKey: PropertyKey, alternativeName: string, dynamicKey: HookKeyDynamic): HookDecoratorBuilder<TClass>;
  getter(propertyKey: PropertyKey): HookDecoratorBuilder<TClass>;
  getter(propertyKey: PropertyKey, alternativeName: string): HookDecoratorBuilder<TClass>;
  getter(propertyKey: PropertyKey, dynamicKey: HookKeyDynamic): HookDecoratorBuilder<TClass>;
  getter(propertyKey: PropertyKey, dynamicKeyOrName: HookKeyDynamic | string): HookDecoratorBuilder<TClass>;
  getter(propertyKey: PropertyKey, dynamicKey: HookKeyDynamic, alternativeName: string): HookDecoratorBuilder<TClass>;
  getter(propertyKey: PropertyKey, alternativeName: string, dynamicKey: HookKeyDynamic): HookDecoratorBuilder<TClass>;
  method(propertyKey: PropertyKey): HookDecoratorBuilder<TClass>;
  method(propertyKey: PropertyKey, alternativeName: string): HookDecoratorBuilder<TClass>;
  method(propertyKey: PropertyKey, dynamicKey: HookKeyDynamic): HookDecoratorBuilder<TClass>;
  method(propertyKey: PropertyKey, dynamicKeyOrName: HookKeyDynamic | string): HookDecoratorBuilder<TClass>;
  method(propertyKey: PropertyKey, dynamicKey: HookKeyDynamic, alternativeName: string): HookDecoratorBuilder<TClass>;
  method(propertyKey: PropertyKey, alternativeName: string, dynamicKey: HookKeyDynamic): HookDecoratorBuilder<TClass>;
  setter(propertyKey: PropertyKey): HookDecoratorBuilder<TClass>;
  setter(propertyKey: PropertyKey, alternativeName: string): HookDecoratorBuilder<TClass>;
  setter(propertyKey: PropertyKey, dynamicKey: HookKeyDynamic): HookDecoratorBuilder<TClass>;
  setter(propertyKey: PropertyKey, dynamicKeyOrName: HookKeyDynamic | string): HookDecoratorBuilder<TClass>;
  setter(propertyKey: PropertyKey, dynamicKey: HookKeyDynamic, alternativeName: string): HookDecoratorBuilder<TClass>;
  setter(propertyKey: PropertyKey, alternativeName: string, dynamicKey: HookKeyDynamic): HookDecoratorBuilder<TClass>;
  build(): TClass;
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
declare function Hooks<TClass extends HookDecoratedClass>(Class: TClass): IHookDecoratorBuilder<TClass>;
declare function Hooks<TClass extends HookDecoratedClass>(Class: TClass): HookDecoratorBuilder<TClass>;
type MiddlewareMethod<A extends any[] = any[], R = any, TThis = unknown> = (this: TThis, next: (...args: A) => R, ...args: A) => R;
type HookNamePropertyKey<N extends HookName> = N extends `get ${infer P}` ? P & PropertyKey : N extends `set ${infer P}` ? P & PropertyKey : N extends `init ${infer P}` ? P & PropertyKey : N extends PropertyKey ? N : never;
type HookPrototype<TObject> = TObject extends (abstract new (...args: any[]) => any) ? TObject extends {
  prototype: infer TPrototype;
} ? TPrototype : never : never;
type ResolveMemberValue<TObject, TName extends PropertyKey> = TObject extends object ? TName extends keyof TObject ? TObject[TName] : TObject extends (abstract new (...args: any[]) => any) ? TName extends keyof HookPrototype<TObject> ? HookPrototype<TObject>[TName] : never : never : never;
type InferHookSignature<TObject, TName extends HookName> = TName extends string ? ResolveMemberValue<TObject, HookNamePropertyKey<TName>> extends (infer Member) ? [Member] extends [never] ? [any[], any] : Member extends ((...args: infer A) => infer R) ? [A, R] : TName extends `get ${string}` ? [[], Member] : TName extends `set ${string}` ? [[Member], void] : TName extends `init ${string}` ? [[Member], Member] : [any[], any] : [any[], any] : [any[], any];
type InferMiddlewareArgs<TObject, TName extends HookName> = InferHookSignature<TObject, TName>[0];
type InferMiddlewareResult<TObject, TName extends HookName> = InferHookSignature<TObject, TName>[1];
type InferMiddlewareThis<TObject, TName extends HookName> = ResolveMemberValue<TObject, HookNamePropertyKey<TName>> extends (infer Member) ? Member extends ((this: infer ThisArg, ...args: any[]) => any) ? ThisArg : unknown : unknown;
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
declare function attach<T extends (...args: any[]) => any>(hookFn: T, fn: MiddlewareMethod<Parameters<T>, ReturnType<T>>): () => void;
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
export { DEFAULT_HOOK_NAME, DecoratorResult, HOOK, Hook, HookDecoratorBuilder, HookKey, HookKeyDynamicFn, HookKeySingle, HookName, Hooks, IHookData, IHookDecoratorBuilder, IHookFn, IHookInspection, IMiddlewareMethods, MetadataHooks, MiddlewareMethod, MiddlewareNext, attach, composeHookKeys, detach, dynamicHookKey, getCurrentHookKeyContext, hook, hookAccessor, hookClass, hookDecorator, hookField, hookGetter, hookMethod, hookSetter, inspectHook, middlewares };
//# sourceMappingURL=index.d.ts.map