import { AnyClass, DynamicKeyOrAlternativeName, HookClassExpression, HookKeyDynamic, HookPropertyName } from "./shared.js";
//#region src/class-utilities.d.ts
declare module "@neuronet/hooks" {
  interface HookApi {
    /**
     * Initializes hook-decorated instance properties and runs the constructor hook.
     *
     * Call this at the end of the constructor to trigger all `init` middlewares
     * registered on the class via {@link hookField} or {@link hookAccessor}.
     *
     * If you `return hook.init(this, ...)` from the constructor, a `constructor` middleware
     * can replace the instance entirely by returning a different object — useful when you
     * need to swap the instance for a proxy or a subclass.
     *
     * @param instance The newly created instance — pass `this` from inside the constructor.
     * @param args Arguments forwarded to the constructor hook.
     * @returns The instance after all initializers and the constructor hook have run.
     */
    init: typeof hookInit;
  }
}
/**
 * Initializes hook-decorated instance properties and runs the constructor hook.
 *
 * Call this at the end of the constructor to trigger all `init` middlewares
 * registered on the class via {@link hookField} or {@link hookAccessor}.
 *
 * If you `return hook.init(this, ...)` from the constructor, a `constructor` middleware
 * can replace the instance entirely by returning a different object — useful when you
 * need to swap the instance for a proxy or a subclass.
 *
 * @param instance The newly created instance — pass `this` from inside the constructor.
 * @param args Arguments forwarded to the constructor hook.
 * @returns The instance after all initializers and the constructor hook have run.
 */
declare function hookInit<HDC extends AnyClass, Instance extends InstanceType<HDC>>(instance: Instance, ...args: any[]): any;
declare module "@neuronet/hooks" {
  interface HookApi {
    /**
     * Applies hook behavior to a class method.
     *
     * @param Class The class that owns the method.
     * @param propertyKey The method name. The function looks for both static and prototype methods.
     * @param alternativeName_dynamicKey Optional alternative hook name or dynamic hook key.
     * @param dynamicKey_alternativeName Optional dynamic hook key or alternative hook name.
     * @returns The wrapped class constructor.
     */
    method: typeof hookMethod;
  }
}
declare function hookMethod<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName): TClass;
declare function hookMethod<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, alternativeName: string): TClass;
declare function hookMethod<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, dynamicKey: HookKeyDynamic): TClass;
declare function hookMethod<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, dynamicKeyOrName: HookKeyDynamic | string): TClass;
declare function hookMethod<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, dynamicKey: HookKeyDynamic, alternativeName: string): TClass;
declare function hookMethod<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, alternativeName: string, dynamicKey: HookKeyDynamic): TClass;
declare function hookMethod<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, arg1?: DynamicKeyOrAlternativeName, arg2?: DynamicKeyOrAlternativeName): TClass;
declare module "@neuronet/hooks" {
  interface HookApi {
    /**
     * Applies hook behavior to a getter.
     *
     * @param Class The class that owns the getter.
     * @param propertyKey The getter name. The function looks for both static and prototype getters.
     * @param alternativeName_dynamicKey Optional alternative hook name or dynamic hook key.
     * @param dynamicKey_alternativeName Optional dynamic hook key or alternative hook name.
     * @returns The wrapped class constructor.
     */
    getter: typeof hookGetter;
  }
}
/**
 * Applies hook behavior to a getter.
 *
 * @param Class The class that owns the getter.
 * @param propertyKey The getter name. The function looks for both static and prototype getters.
 * @param alternativeName_dynamicKey Optional alternative hook name or dynamic hook key.
 * @param dynamicKey_alternativeName Optional dynamic hook key or alternative hook name.
 * @returns The wrapped class constructor.
 */
declare function hookGetter<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName): TClass;
declare function hookGetter<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, alternativeName: string): TClass;
declare function hookGetter<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, dynamicKey: HookKeyDynamic): TClass;
declare function hookGetter<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, dynamicKeyOrName: HookKeyDynamic | string): TClass;
declare function hookGetter<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, dynamicKey: HookKeyDynamic, alternativeName: string): TClass;
declare function hookGetter<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, alternativeName: string, dynamicKey: HookKeyDynamic): TClass;
declare function hookGetter<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, arg1?: DynamicKeyOrAlternativeName, arg2?: DynamicKeyOrAlternativeName): TClass;
declare module "@neuronet/hooks" {
  interface HookApi {
    /**
     * Applies hook behavior to a setter.
     *
     * @param Class The class that owns the setter.
     * @param propertyKey The setter name. The function looks for both static and prototype setters.
     * @param alternativeName_dynamicKey Optional alternative hook name or dynamic hook key.
     * @param dynamicKey_alternativeName Optional dynamic hook key or alternative hook name.
     * @returns The wrapped class constructor.
     */
    setter: typeof hookSetter;
  }
}
/**
 * Applies hook behavior to a setter.
 *
 * @param Class The class that owns the setter.
 * @param propertyKey The setter name. The function looks for both static and prototype setters.
 * @param alternativeName_dynamicKey Optional alternative hook name or dynamic hook key.
 * @param dynamicKey_alternativeName Optional dynamic hook key or alternative hook name.
 * @returns The wrapped class constructor.
 */
declare function hookSetter<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName): TClass;
declare function hookSetter<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, alternativeName: string): TClass;
declare function hookSetter<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, dynamicKey: HookKeyDynamic): TClass;
declare function hookSetter<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, dynamicKeyOrName: HookKeyDynamic | string): TClass;
declare function hookSetter<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, dynamicKey: HookKeyDynamic, alternativeName: string): TClass;
declare function hookSetter<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, alternativeName: string, dynamicKey: HookKeyDynamic): TClass;
declare function hookSetter<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, arg1?: DynamicKeyOrAlternativeName, arg2?: DynamicKeyOrAlternativeName): TClass;
declare module "@neuronet/hooks" {
  interface HookApi {
    /**
     * Applies hook behavior to a field initializer.
     *
     * Use this function before creating new instances. Utilities field decoration updates
     * the value during initialization, not after the field already exists.
     *
     * @param Class The class that owns the field.
     * @param propertyKey The field name. The function supports public instance fields and static fields.
     * @param alternativeName_dynamicKey Optional alternative hook name or dynamic hook key.
     * @param dynamicKey_alternativeName Optional dynamic hook key or alternative hook name.
     * @returns The wrapped class constructor.
     */
    field: typeof hookField;
  }
}
/**
 * Applies hook behavior to a field initializer.
 *
 * Use this function before creating new instances. Utilities field decoration updates
 * the value during initialization, not after the field already exists.
 *
 * @param Class The class that owns the field.
 * @param propertyKey The field name. The function supports public instance fields and static fields.
 * @param alternativeName_dynamicKey Optional alternative hook name or dynamic hook key.
 * @param dynamicKey_alternativeName Optional dynamic hook key or alternative hook name.
 * @returns The wrapped class constructor.
 */
declare function hookField<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName): TClass;
declare function hookField<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, alternativeName: string): TClass;
declare function hookField<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, dynamicKey: HookKeyDynamic): TClass;
declare function hookField<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, dynamicKeyOrName: HookKeyDynamic | string): TClass;
declare function hookField<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, dynamicKey: HookKeyDynamic, alternativeName: string): TClass;
declare function hookField<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, alternativeName: string, dynamicKey: HookKeyDynamic): TClass;
declare function hookField<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, arg1?: DynamicKeyOrAlternativeName, arg2?: DynamicKeyOrAlternativeName): TClass;
declare module "@neuronet/hooks" {
  interface HookApi {
    /**
     * Applies hook behavior to field as an accessor.
     *
     * Thanks to this decorator, you can create middlewares for `init <property>`, `get <property>`, and `set <property>`.
     * It is a field, getter, and setter in one.
     *
     * @param Class The class that owns the accessor.
     * @param propertyKey The accessor name. The function supports instance and static auto-accessors.
     * @param alternativeName_dynamicKey Optional alternative hook name or dynamic hook key.
     * @param dynamicKey_alternativeName Optional dynamic hook key or alternative hook name.
     * @returns The wrapped class constructor.
     */
    accessor: typeof hookAccessor;
  }
}
/**
 * Applies hook behavior to field as an accessor.
 *
 * Thanks to this decorator, you can create middlewares for `init <property>`, `get <property>`, and `set <property>`.
 * It is a field, getter, and setter in one.
 *
 * @param Class The class that owns the accessor.
 * @param propertyKey The accessor name. The function supports instance and static auto-accessors.
 * @param alternativeName_dynamicKey Optional alternative hook name or dynamic hook key.
 * @param dynamicKey_alternativeName Optional dynamic hook key or alternative hook name.
 * @returns The wrapped class constructor.
 */
declare function hookAccessor<TClass extends AnyClass>(Class: TClass, propertyKey: PropertyKey): TClass;
declare function hookAccessor<TClass extends AnyClass>(Class: TClass, propertyKey: PropertyKey, alternativeName: string): TClass;
declare function hookAccessor<TClass extends AnyClass>(Class: TClass, propertyKey: PropertyKey, dynamicKey: HookKeyDynamic): TClass;
declare function hookAccessor<TClass extends AnyClass>(Class: TClass, propertyKey: PropertyKey, dynamicKeyOrName: HookKeyDynamic | string): TClass;
declare function hookAccessor<TClass extends AnyClass>(Class: TClass, propertyKey: PropertyKey, dynamicKey: HookKeyDynamic, alternativeName: string): TClass;
declare function hookAccessor<TClass extends AnyClass>(Class: TClass, propertyKey: PropertyKey, alternativeName: string, dynamicKey: HookKeyDynamic): TClass;
declare function hookAccessor<TClass extends AnyClass>(Class: TClass, propertyKey: PropertyKey, arg1?: DynamicKeyOrAlternativeName, arg2?: DynamicKeyOrAlternativeName): TClass;
declare module "@neuronet/hooks" {
  interface HookApi {
    /**
     * Applies hook behavior to a class member using a string expression.
     *
     * The expression is a space-separated string describing the member kind and name:
     *
     * - `"method myMethod"` — hooks the prototype method `myMethod`.
     * - `"static method myMethod"` — hooks the static method `myMethod`.
     * - `"init myField"` — hooks the field initializer for `myField`.
     *   Requires `return hook.init(this, ...)` at the end of the constructor.
     * - `"static init myField"` — hooks the static field initializer. Because the class
     *   being defined cannot yet be used as a hook key, this variant is rarely practical.
     *   A more common approach is to use a separately defined key and call {@link hookField}
     *   directly.
     * - `"get myProp"` / `"static get myProp"` — hooks the getter.
     * - `"set myProp"` / `"static set myProp"` — hooks the setter.
     * - `"accessor myProp"` / `"static accessor myProp"` — hooks the initializer, getter,
     *   and setter all at once (equivalent to calling {@link hookAccessor}). It is a shorthand
     *   for `init ...`, `get ...`, and `set ...` combined. Works both on existing getter/setter
     *   pairs and on plain fields — in the latter case it creates the getter and setter itself.
     *
     *
     * Prefix the expression with `!` (e.g. `"!init myField"`) to opt out of strict
     * TypeScript checking for the member name.
     *
     * The third and fourth arguments accept an alternative name and/or a dynamic hook key
     * in any order:
     *
     * - **Alternative name** replaces the original member name in the hook key. Useful
     *   when building `Parent → Child` class hierarchies dynamically — for example,
     *   `hook.class(Child, "method myMethod", "Child_myMethod")` lets you call
     *   `attach(Parent, "Child_myMethod", ...)` to target exactly that middleware.
     *
     * - **Dynamic hook key** lets you decide at call time which set of middlewares runs.
     *   Instead of attaching and detaching middlewares you change the key, keeping all
     *   middlewares permanently attached while controlling which ones are active.
     *
     * @param Class The class to apply hook behavior to.
     * @param expression The member expression describing the kind and name of the member.
     * @param alternativeNameOrDynamicKey1 Optional alternative hook name or dynamic hook key.
     * @param alternativeNameOrDynamicKey2 Optional dynamic hook key or alternative hook name.
     * @returns The same class constructor, modified in place.
     */
    class: typeof hookClass;
  }
}
/**
 * Applies hook behavior to a class member using a string expression.
 *
 * The expression is a space-separated string describing the member kind and name:
 *
 * - `"method myMethod"` — hooks the prototype method `myMethod`.
 * - `"static method myMethod"` — hooks the static method `myMethod`.
 * - `"init myField"` — hooks the field initializer for `myField`.
 *   Requires `return hook.init(this, ...)` at the end of the constructor.
 * - `"static init myField"` — hooks the static field initializer. Because the class
 *   being defined cannot yet be used as a hook key, this variant is rarely practical.
 *   A more common approach is to use a separately defined key and call {@link hookField}
 *   directly.
 * - `"get myProp"` / `"static get myProp"` — hooks the getter.
 * - `"set myProp"` / `"static set myProp"` — hooks the setter.
 * - `"accessor myProp"` / `"static accessor myProp"` — hooks the initializer, getter,
 *   and setter all at once (equivalent to calling {@link hookAccessor}). It is a shorthand
 *   for `init ...`, `get ...`, and `set ...` combined. Works both on existing getter/setter
 *   pairs and on plain fields — in the latter case it creates the getter and setter itself.
 *
 *
 * Prefix the expression with `!` (e.g. `"!init myField"`) to opt out of strict
 * TypeScript checking for the member name.
 *
 * The third and fourth arguments accept an alternative name and/or a dynamic hook key
 * in any order:
 *
 * - **Alternative name** replaces the original member name in the hook key. Useful
 *   when building `Parent → Child` class hierarchies dynamically — for example,
 *   `hook.class(Child, "method myMethod", "Child_myMethod")` lets you call
 *   `attach(Parent, "Child_myMethod", ...)` to target exactly that middleware.
 *
 * - **Dynamic hook key** lets you decide at call time which set of middlewares runs.
 *   Instead of attaching and detaching middlewares you change the key, keeping all
 *   middlewares permanently attached while controlling which ones are active.
 *
 * @param Class The class to apply hook behavior to.
 * @param expression The member expression describing the kind and name of the member.
 * @param alternativeNameOrDynamicKey1 Optional alternative hook name or dynamic hook key.
 * @param alternativeNameOrDynamicKey2 Optional dynamic hook key or alternative hook name.
 * @returns The same class constructor, modified in place.
 */
declare function hookClass<TClass extends AnyClass>(Class: TClass, expression?: string & HookClassExpression<TClass>, alternativeNameOrDynamicKey1?: string | HookKeyDynamic, alternativeNameOrDynamicKey2?: string | HookKeyDynamic): TClass;
//#endregion
export { hookAccessor, hookClass, hookField, hookGetter, hookInit, hookMethod, hookSetter };
//# sourceMappingURL=class-utilities.d.ts.map