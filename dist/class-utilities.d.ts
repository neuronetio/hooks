import { AnyClass, DynamicKeyOrAlternativeName, HookClassExpression, HookKeyDynamic, HookPropertyName } from "./shared.js";
//#region src/class-utilities.d.ts
declare module "./hook.js" {
  interface HookApi {
    init: typeof hookInit;
  }
}
declare function hookInit<HDC extends AnyClass, Instance extends InstanceType<HDC>>(instance: Instance, ...args: any[]): any;
declare module "./hook.js" {
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
/**
 * Applies hook behavior to a class method.
 *
 * @param Class The class that owns the method.
 * @param propertyKey The method name. The function looks for both static and prototype methods.
 * @param alternativeName_dynamicKey Optional alternative hook name or dynamic hook key.
 * @param dynamicKey_alternativeName Optional dynamic hook key or alternative hook name.
 * @returns The wrapped class constructor.
 */
declare function hookMethod<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName): TClass;
declare function hookMethod<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, alternativeName: string): TClass;
declare function hookMethod<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, dynamicKey: HookKeyDynamic): TClass;
declare function hookMethod<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, dynamicKeyOrName: HookKeyDynamic | string): TClass;
declare function hookMethod<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, dynamicKey: HookKeyDynamic, alternativeName: string): TClass;
declare function hookMethod<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, alternativeName: string, dynamicKey: HookKeyDynamic): TClass;
declare function hookMethod<TClass extends AnyClass, TName extends HookPropertyName<TClass>>(Class: TClass, propertyKey: TName, arg1?: DynamicKeyOrAlternativeName, arg2?: DynamicKeyOrAlternativeName): TClass;
declare module "./hook.js" {
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
declare module "./hook.js" {
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
declare module "./hook.js" {
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
declare module "./hook.js" {
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
declare module "./hook.js" {
  interface HookApi {
    class: typeof hookClass;
  }
}
declare function hookClass<TClass extends AnyClass>(Class: TClass, expression?: string & HookClassExpression<TClass>): TClass;
//#endregion
export { hookAccessor, hookClass, hookField, hookGetter, hookInit, hookMethod, hookSetter };
//# sourceMappingURL=class-utilities.d.ts.map