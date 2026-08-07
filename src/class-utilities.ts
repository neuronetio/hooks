import type { HookDecoratedClass, HookDecoratorArgument, HookKeyDynamic, HookName, HookPropertyName } from "./hook.js";
import {
  _resolveHookDecoratorOptions,
  _createAccessorDecorator,
  _createHookInvoker,
  hook,
  inherit,
  _identity,
  HOOK_CLASS_STATE,
  PREFIX,
  dhk,
} from "./hook.js";

const SUB_PREFIX = "[class-utilities]";

export interface IHookClassUtilitiesState {
  instanceInitializers: Array<(instance: any) => void>;
}

/**
 * Returns the cached utilities hook runtime state for a class, creating it when needed.
 *
 * The state stores a wrapped constructor and the list of instance initializers that should
 * run after each new instance is created. This is the foundation of the utilities decoration API.
 *
 * @param Class The class being prepared for utilities decoration.
 * @returns The shared runtime state for that class.
 */
function classUtilitiesState<TClass extends HookDecoratedClass>(Class: TClass): IHookClassUtilitiesState {
  if (Object.hasOwn(Class, HOOK_CLASS_STATE)) {
    return (Class as any)[HOOK_CLASS_STATE] as IHookClassUtilitiesState;
  }
  const instanceInitializers: IHookClassUtilitiesState["instanceInitializers"] = [];
  const state: IHookClassUtilitiesState = {
    instanceInitializers,
  };
  (Class as any)[HOOK_CLASS_STATE] = state;
  return state;
}

/**
 * Finds a member descriptor on the class or its prototype and validates its shape.
 *
 * Utilities decoration can target either static members or instance members. This helper checks
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
    `${PREFIX}${SUB_PREFIX}[${apiName}] Could not find a compatible member named "${String(propertyKey)}" on the class or its prototype.`,
  );
}

declare module "./hook.js" {
  interface HookApi {
    class: typeof hookClass;
  }
}
export function hookClass<TClass extends HookDecoratedClass>(Class: TClass): any {
  classUtilitiesState(Class);
  return Class;
}
hook.class = hookClass;

declare module "./hook.js" {
  interface HookApi {
    init: typeof hookInit;
  }
}
export function hookInit<HDC extends HookDecoratedClass, Instance extends InstanceType<HDC>>(
  instance: Instance,
  ...args: any[]
): any {
  const state: IHookClassUtilitiesState = instance.constructor[HOOK_CLASS_STATE];
  const ctrHook = hook(inherit(instance), "constructor", function (this: any, ..._args: any[]) {
    return this;
  });
  if (!state) return ctrHook.apply(instance, args);
  for (const initialize of state.instanceInitializers) {
    initialize(instance);
  }
  return ctrHook.apply(instance, args);
}
hook.init = hookInit;

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
  classUtilitiesState(Class);
  const { descriptor, isStatic } = resolveMemberDescriptor(
    Class,
    propertyKey,
    (candidate) => typeof candidate?.value === "function",
    "method",
  );
  const { dynamicKey, alternativeName } = _resolveHookDecoratorOptions(arg1, arg2);
  const hookName = (alternativeName ?? propertyKey) as HookName;

  if (isStatic) {
    // Object.defineProperty(state.originalClass, propertyKey, {
    //   ...descriptor,
    //   value: hook(dynamicKey ?? inherit(state.proxyClass), hookName, descriptor.value.bind(state.originalClass)),
    // });
    (Class as any)[propertyKey] = hook(dynamicKey ?? inherit(Class), hookName, descriptor.value.bind(Class));
    return Class;
  }

  function defaultKey(this: any) {
    return inherit(this);
  }
  Class.prototype[propertyKey] = hook(dynamicKey ?? dhk(defaultKey), hookName, descriptor.value);

  // because the user may use attach(Class.prototype.method, ...)
  // - in that case they don't need to provide keys or a name, as it is extracted from the hook (hook_data)
  // so we need to register such an empty hook to store the relevant data
  // Object.defineProperty(state.originalClass.prototype, propertyKey, {
  //   ...descriptor,
  //   value: hook(dynamicKey ?? inherit(state.proxyClass), hookName, descriptor.value),
  // });

  // state.instanceInitializers.push((instance) => {
  //   // because prototype doesn't have access to instance, we need to bind it to instance again
  //   // to apply correct instance middlewares
  //   instance[propertyKey] = hook(dynamicKey ?? inherit(instance), hookName, descriptor.value.bind(instance));
  // });

  return Class;
}
hook.method = hookMethod;

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
  classUtilitiesState(Class);
  const { descriptor, target, isStatic } = resolveMemberDescriptor(
    Class,
    propertyKey,
    (candidate) => typeof candidate?.get === "function",
    "getter",
  );
  const { dynamicKey, alternativeName } = _resolveHookDecoratorOptions(arg1, arg2);
  const hookName = (alternativeName ?? propertyKey) as HookName;

  Object.defineProperty(target, propertyKey, {
    ...descriptor,
    get: _createHookInvoker(
      "get " + String(propertyKey),
      "get " + String(hookName),
      descriptor.get!,
      dynamicKey,
      isStatic ? Class : undefined, // undefined means default
    ),
  });

  return Class;
}
hook.getter = hookGetter;

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
  classUtilitiesState(Class);
  const { descriptor, target, isStatic } = resolveMemberDescriptor(
    Class,
    propertyKey,
    (candidate) => typeof candidate?.set === "function",
    "setter",
  );
  const { dynamicKey, alternativeName } = _resolveHookDecoratorOptions(arg1, arg2);
  const hookName = (alternativeName ?? propertyKey) as HookName;

  Object.defineProperty(target, propertyKey, {
    ...descriptor,
    set: _createHookInvoker(
      "set " + String(propertyKey),
      "set " + String(hookName),
      descriptor.set!,
      dynamicKey,
      isStatic ? Class : undefined,
    ),
  });

  return Class;
}
hook.setter = hookSetter;

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
function isStaticField(Class: HookDecoratedClass, propertyKey: PropertyKey) {
  const staticDescriptor = Object.getOwnPropertyDescriptor(Class, propertyKey);
  if (staticDescriptor) {
    if (typeof staticDescriptor.get === "function" || typeof staticDescriptor.set === "function") {
      throw new Error(`${PREFIX}${SUB_PREFIX}[field] Member "${String(propertyKey)}" is not a field.`);
    }

    return true;
  }

  const instanceDescriptor = Object.getOwnPropertyDescriptor(Class.prototype, propertyKey);
  if (instanceDescriptor) {
    if (
      typeof instanceDescriptor.value === "function" ||
      typeof instanceDescriptor.get === "function" ||
      typeof instanceDescriptor.set === "function"
    ) {
      throw new Error(`${PREFIX}${SUB_PREFIX}[field] Member "${String(propertyKey)}" is not a field.`);
    }
  }

  return false;
}

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
  const isStatic = isStaticField(Class, propertyKey);
  const { dynamicKey, alternativeName } = _resolveHookDecoratorOptions(arg1, arg2);
  const hookName = (alternativeName ?? propertyKey) as HookName;
  const runInitializer = _createHookInvoker(
    "init " + String(propertyKey),
    "init " + String(hookName),
    _identity,
    dynamicKey,
  );

  if (isStatic) {
    (Class as any)[propertyKey] = runInitializer.call(Class, (Class as any)[propertyKey]);
    return Class;
  }

  const state = classUtilitiesState(Class);
  state.instanceInitializers.push((instance) => {
    instance[propertyKey] = runInitializer.call(instance, instance[propertyKey]);
  });

  return Class;
}
hook.field = hookField;

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
  const state = classUtilitiesState(Class);
  const { dynamicKey, alternativeName } = _resolveHookDecoratorOptions(arg1, arg2);
  const hookName = (alternativeName ?? propertyKey) as HookName;
  const staticDescriptor = Object.getOwnPropertyDescriptor(Class, propertyKey);
  const instanceDescriptor = Object.getOwnPropertyDescriptor(Class.prototype, propertyKey);

  if (typeof staticDescriptor?.get === "function" && typeof staticDescriptor?.set === "function") {
    const originalGet = staticDescriptor.get;
    const originalSet = staticDescriptor.set;
    const decoratedAccessor = _createAccessorDecorator(
      propertyKey,
      hookName,
      originalGet,
      originalSet,
      dynamicKey,
      Class,
    );
    const initializedKey = Symbol(`${PREFIX}[initialized ${String(propertyKey)}]`);
    function ensureInitialized(this: any) {
      if (this[initializedKey]) {
        return;
      }

      const initialValue = originalGet.call(Class);
      const nextValue = decoratedAccessor.init.call(this, initialValue);
      originalSet.call(Class, nextValue);
      this[initializedKey] = true;
    }

    Object.defineProperty(Class, propertyKey, {
      ...staticDescriptor,
      get: function getHookedAccessor(this: any, ...args: any[]) {
        ensureInitialized.call(Class); // Class because `this` is always original class not the proxy
        return decoratedAccessor.get.apply(this, args);
      },
      set: function setHookedAccessor(this: any, ...args: any[]) {
        ensureInitialized.call(Class);
        return decoratedAccessor.set.apply(this, args);
      },
    });

    ensureInitialized.call(Class);
    return Class;
  }

  if (typeof instanceDescriptor?.get === "function" && typeof instanceDescriptor?.set === "function") {
    const originalGet = instanceDescriptor.get;
    const originalSet = instanceDescriptor.set;
    const decoratedAccessor = _createAccessorDecorator(propertyKey, hookName, originalGet, originalSet, dynamicKey);
    const initializedKey = Symbol(`${PREFIX}[initialized ${String(propertyKey)}]`);
    function ensureInitialized(this: any) {
      if (this[initializedKey]) {
        return;
      }

      const initialValue = originalGet.call(this);
      const nextValue = decoratedAccessor.init.call(this, initialValue);
      originalSet.call(this, nextValue);
      this[initializedKey] = true;
    }

    Object.defineProperty(Class.prototype, propertyKey, {
      ...instanceDescriptor,
      get: function getHookedAccessor(this: any, ...args: any[]) {
        ensureInitialized.call(this); // inherit on instance will figure things out
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

    return Class;
  }

  if (
    (staticDescriptor && (typeof staticDescriptor.get === "function" || typeof staticDescriptor.set === "function")) ||
    (instanceDescriptor &&
      (typeof instanceDescriptor.get === "function" || typeof instanceDescriptor.set === "function"))
  ) {
    throw new Error(
      `${PREFIX}${SUB_PREFIX}[accessor] Could not find a compatible member named "${String(propertyKey)}" on the class or its prototype. If a getter exists, a setter must also exist, and vice versa.`,
    );
  }

  const descriptor = staticDescriptor ?? instanceDescriptor;

  const storageKey = Symbol(`${PREFIX}[accessor-storage ${String(propertyKey)}]`);
  function originalGet(this: any) {
    return this[storageKey];
  }
  function originalSet(this: any, value: any) {
    this[storageKey] = value;
  }
  const decoratedAccessor = _createAccessorDecorator(propertyKey, hookName, originalGet, originalSet, dynamicKey);
  const isStatic = !!staticDescriptor;
  const target = isStatic ? Class : Class.prototype;

  Object.defineProperty(target, propertyKey, {
    configurable: descriptor?.configurable ?? true,
    enumerable: descriptor?.enumerable ?? true,
    get: function getHookedFieldAccessor(this: any, ...args: any[]) {
      return decoratedAccessor.get.apply(this, args);
    },
    set: function setHookedFieldAccessor(this: any, ...args: any[]) {
      return decoratedAccessor.set.apply(this, args);
    },
  });

  if (isStatic) {
    const nextValue = decoratedAccessor.init.call(Class, staticDescriptor!.value);
    originalSet.call(Class, nextValue);
    return Class;
  }

  state.instanceInitializers.push((instance) => {
    const initialValue = instance[propertyKey];
    delete instance[propertyKey];
    const nextValue = decoratedAccessor.init.call(instance, initialValue);
    originalSet.call(instance, nextValue);
  });

  return Class;
}
hook.accessor = hookAccessor;
