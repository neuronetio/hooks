import { HookDecoratedClass, HookDecoratorArgument, HookKeyDynamic, HookPropertyName } from "./hook.js";
//#region src/utilities.d.ts
/**
 * Enables hook support for an existing class without using decorator syntax.
 *
 * This function is the utilities equivalent of `@Hook`. It returns a wrapped constructor
 * that runs all utilities hook initializers for instance members.
 *
 * Always keep the returned class reference:
 * ```ts
 * let UserService = class UserService {};
 * UserService = hookClass(UserService);
 * ```
 *
 * @param Class The class to prepare for utilities hook decoration.
 * @returns The wrapped class constructor that should replace the original binding.
 */
declare function hookClass<TClass extends HookDecoratedClass>(Class: TClass): TClass;
/**
 * Applies hook behavior to a class method without using decorator syntax.
 *
 * This function is the utilities equivalent of `@hook()` for methods.
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
declare function hookMethod<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName): TClass;
declare function hookMethod<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, alternativeName: string): TClass;
declare function hookMethod<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, dynamicKey: HookKeyDynamic): TClass;
declare function hookMethod<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, dynamicKeyOrName: HookKeyDynamic | string): TClass;
declare function hookMethod<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, dynamicKey: HookKeyDynamic, alternativeName: string): TClass;
declare function hookMethod<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, alternativeName: string, dynamicKey: HookKeyDynamic): TClass;
declare function hookMethod<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, arg1?: HookDecoratorArgument, arg2?: HookDecoratorArgument): TClass;
/**
 * Applies hook behavior to a getter without using decorator syntax.
 *
 * This is the utilities equivalent of `@hook()` placed on `get property()`.
 * The created hook name uses the `get ` prefix, for example `get total`.
 *
 * @param Class The class that owns the getter.
 * @param propertyKey The getter name. The function looks for both static and prototype getters.
 * @param arg1 Optional alternative hook name or dynamic hook key.
 * @param arg2 Optional dynamic hook key or alternative hook name.
 * @returns The wrapped class constructor.
 */
declare function hookGetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName): TClass;
declare function hookGetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, alternativeName: string): TClass;
declare function hookGetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, dynamicKey: HookKeyDynamic): TClass;
declare function hookGetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, dynamicKeyOrName: HookKeyDynamic | string): TClass;
declare function hookGetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, dynamicKey: HookKeyDynamic, alternativeName: string): TClass;
declare function hookGetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, alternativeName: string, dynamicKey: HookKeyDynamic): TClass;
declare function hookGetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, arg1?: HookDecoratorArgument, arg2?: HookDecoratorArgument): TClass;
/**
 * Applies hook behavior to a setter without using decorator syntax.
 *
 * This is the utilities equivalent of `@hook()` placed on `set property(value)`.
 * The created hook name uses the `set ` prefix, for example `set total`.
 *
 * @param Class The class that owns the setter.
 * @param propertyKey The setter name. The function looks for both static and prototype setters.
 * @param arg1 Optional alternative hook name or dynamic hook key.
 * @param arg2 Optional dynamic hook key or alternative hook name.
 * @returns The wrapped class constructor.
 */
declare function hookSetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName): TClass;
declare function hookSetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, alternativeName: string): TClass;
declare function hookSetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, dynamicKey: HookKeyDynamic): TClass;
declare function hookSetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, dynamicKeyOrName: HookKeyDynamic | string): TClass;
declare function hookSetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, dynamicKey: HookKeyDynamic, alternativeName: string): TClass;
declare function hookSetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, alternativeName: string, dynamicKey: HookKeyDynamic): TClass;
declare function hookSetter<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, arg1?: HookDecoratorArgument, arg2?: HookDecoratorArgument): TClass;
/**
 * Applies hook behavior to a public field initializer without using decorator syntax.
 *
 * This is the utilities equivalent of `@hook()` placed on a public field.
 * The hook name uses the `init ` prefix, for example `init status`.
 *
 * Use this function before creating new instances. Utilities field decoration updates
 * the value during initialization, not after the field already exists.
 *
 * @param Class The class that owns the field.
 * @param propertyKey The field name. The function supports public instance fields and static fields.
 * @param arg1 Optional alternative hook name or dynamic hook key.
 * @param arg2 Optional dynamic hook key or alternative hook name.
 * @returns The wrapped class constructor.
 */
declare function hookField<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName): TClass;
declare function hookField<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, alternativeName: string): TClass;
declare function hookField<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, dynamicKey: HookKeyDynamic): TClass;
declare function hookField<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, dynamicKeyOrName: HookKeyDynamic | string): TClass;
declare function hookField<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, dynamicKey: HookKeyDynamic, alternativeName: string): TClass;
declare function hookField<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, alternativeName: string, dynamicKey: HookKeyDynamic): TClass;
declare function hookField<TClass extends HookDecoratedClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, arg1?: HookDecoratorArgument, arg2?: HookDecoratorArgument): TClass;
/**
 * Applies hook behavior to an auto-accessor without using decorator syntax.
 *
 * This is the utilities equivalent of `@hook()` placed on `accessor property`.
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
 * Utility functions for hooking into class methods, fields, accessors, and more.
 *
 * These functions allow you to apply hook behavior to class members without using decorator syntax.
 *
 * @example
 * ```ts
 * let UserService = class UserService {
 *   save(user: User) {
 *     // original save logic
 *   }
 * }
 *
 * // Apply hook behavior to the 'save' method
 * UserService = hookUtils.method(UserService, "save");
 *
 * attach(UserService, "save", (next, user) => {
 *   next(user); // Call the original method
 *   console.log("User saved:", user);
 * });
 *
 * const service = new UserService();
 * service.save({ name: "Alice" }); // This will trigger the hook and log "User saved: { name: 'Alice' }"
 * ```
 */
declare const hookUtils: {
  class: typeof hookClass;
  method: typeof hookMethod;
  getter: typeof hookGetter;
  setter: typeof hookSetter;
  field: typeof hookField;
  accessor: typeof hookAccessor;
};
//#endregion
export { hookAccessor, hookClass, hookField, hookGetter, hookMethod, hookSetter, hookUtils };
//# sourceMappingURL=utilities.d.ts.map