import type { AnyClass, HookPropertyName, HookKeyDynamic, DynamicKeyOrAlternativeName } from "./index.js";
import { hook } from "./index.js";

/**
 * Fluent builder for decorating existing classes without decorator syntax.
 *
 * The builder is useful when you want to decorate several members in one place
 * and finish with a single `build()` call.
 */
export interface IHookDecoratorBuilder<TClass extends AnyClass = AnyClass> {
  /**
   * Instantly runs a function that will use the wrapped class.
   * You can use it to attach middleware before decorating with field or accessors.
   *
   * @param fn { (Class: TClass) => void }
   */
  run(fn: (Class: TClass) => void): IHookDecoratorBuilder<TClass>;

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
    arg1?: DynamicKeyOrAlternativeName,
    arg2?: DynamicKeyOrAlternativeName,
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
    arg1?: DynamicKeyOrAlternativeName,
    arg2?: DynamicKeyOrAlternativeName,
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
    arg1?: DynamicKeyOrAlternativeName,
    arg2?: DynamicKeyOrAlternativeName,
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
    arg1?: DynamicKeyOrAlternativeName,
    arg2?: DynamicKeyOrAlternativeName,
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
    arg1?: DynamicKeyOrAlternativeName,
    arg2?: DynamicKeyOrAlternativeName,
  ): IHookDecoratorBuilder<TClass>;
  /**
   * Finishes the decoration chain and returns the wrapped class constructor.
   *
   * @returns The final decorated class.
   */
  get(): TClass;
}

export class HookDecoratorBuilder<TClass extends AnyClass = AnyClass> implements IHookDecoratorBuilder<TClass> {
  private HookedClass: TClass;

  constructor(Class: TClass) {
    this.HookedClass = hook.class(Class);
  }

  run(fn: (Class: TClass) => void): IHookDecoratorBuilder<TClass> {
    fn(this.HookedClass);
    return this;
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
    arg1?: DynamicKeyOrAlternativeName,
    arg2?: DynamicKeyOrAlternativeName,
  ): this {
    this.HookedClass = hook.accessor(this.HookedClass, propertyKey, arg1, arg2);
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
    arg1?: DynamicKeyOrAlternativeName,
    arg2?: DynamicKeyOrAlternativeName,
  ): this {
    this.HookedClass = hook.field(this.HookedClass, propertyKey, arg1, arg2);
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
    arg1?: DynamicKeyOrAlternativeName,
    arg2?: DynamicKeyOrAlternativeName,
  ): this {
    this.HookedClass = hook.getter(this.HookedClass, propertyKey, arg1, arg2);
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
    arg1?: DynamicKeyOrAlternativeName,
    arg2?: DynamicKeyOrAlternativeName,
  ): this {
    this.HookedClass = hook.method(this.HookedClass, propertyKey, arg1, arg2);
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
    arg1?: DynamicKeyOrAlternativeName,
    arg2?: DynamicKeyOrAlternativeName,
  ): this {
    this.HookedClass = hook.setter(this.HookedClass, propertyKey, arg1, arg2);
    return this;
  }

  get(): TClass {
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
export function Hooks<TClass extends AnyClass>(Class: TClass): IHookDecoratorBuilder<TClass>;
export function Hooks<TClass extends AnyClass>(Class: TClass): HookDecoratorBuilder<TClass>;
export function Hooks<TClass extends AnyClass>(Class: TClass): IHookDecoratorBuilder<TClass> {
  return new HookDecoratorBuilder(Class);
}

declare module "@neuronet/hooks" {
  interface HookApi {
    builder: typeof Hooks;
  }
}

hook.builder = Hooks;
