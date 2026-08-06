import type { HookDecoratedClass, HookDecoratorArgument, HookKeyDynamic, HookName, HookPropertyName } from "./hook.js";
import {
  _resolveHookDecoratorOptions,
  _createAccessorDecorator,
  _createHookInvoker,
  hook,
  inherit,
  _identity,
  HOOK_CLASS_UTILITIES_STATE,
} from "./hook.js";
import { MADE_WITH_PROXY } from "./index.js";

const PREFIX = `[@neuronet/hooks][class-utilities]`;

interface IHookClassUtilitiesState<TClass extends HookDecoratedClass = HookDecoratedClass> {
  ClassProxy: TClass;
  originalClass: HookDecoratedClass;
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
function classUtilitiesState<TClass extends HookDecoratedClass>(Class: TClass): IHookClassUtilitiesState<TClass> {
  if (Object.hasOwn(Class, HOOK_CLASS_UTILITIES_STATE)) {
    return (Class as any)[HOOK_CLASS_UTILITIES_STATE] as IHookClassUtilitiesState<TClass>;
  }

  const instanceInitializers: IHookClassUtilitiesState<TClass>["instanceInitializers"] = [];
  const ClassProxy = new Proxy(Class as HookDecoratedClass, {
    construct(target, args, newTarget) {
      return hook(inherit(target), "constructor", (..._args: any[]) => {
        const instance = Reflect.construct(target, args, newTarget);
        (instance as any)[MADE_WITH_PROXY] = ClassProxy;
        for (const initializer of instanceInitializers) {
          initializer(instance);
        }
        return instance;
      })(...args);
    },
  }) as TClass;

  const state: IHookClassUtilitiesState<TClass> = {
    ClassProxy: ClassProxy,
    originalClass: Class as HookDecoratedClass,
    instanceInitializers,
  };

  (ClassProxy as any)[HOOK_CLASS_UTILITIES_STATE] = state;
  (Class as any)[HOOK_CLASS_UTILITIES_STATE] = state;

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
  const origin = ((Class as any)[HOOK_CLASS_UTILITIES_STATE] as IHookClassUtilitiesState).originalClass;
  const staticDescriptor = Object.getOwnPropertyDescriptor(origin, propertyKey);
  if (validate(staticDescriptor)) {
    return {
      descriptor: staticDescriptor!,
      isStatic: true,
      target: Class,
    };
  }

  const instanceDescriptor = Object.getOwnPropertyDescriptor(origin.prototype, propertyKey);
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

declare module "./hook.js" {
  interface HookApi {
    /**
     * Enables hook support for an existing class.
     * Returns a class that is an extension of the original class and has support for hooks.
     *
     * @param Class The class to prepare for utilities hook decoration.
     * @returns The wrapped class constructor that should replace the original binding.
     */
    class: typeof hookClass;
  }
}
/**
 * Enables hook support for an existing class.
 * Returns a class that is an extension of the original class and has support for hooks.
 *
 * @param Class The class to prepare for utilities hook decoration.
 * @returns The wrapped class constructor that should replace the original binding.
 */
export function hookClass<TClass extends HookDecoratedClass>(Class: TClass): TClass {
  return classUtilitiesState(Class).ClassProxy;
}
hook.class = hookClass;

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
  const state = classUtilitiesState(Class);
  const { descriptor, isStatic } = resolveMemberDescriptor(
    state.ClassProxy,
    propertyKey,
    (candidate) => typeof candidate?.value === "function",
    "method",
  );
  const { dynamicKey, alternativeName } = _resolveHookDecoratorOptions(arg1, arg2);
  const hookName = (alternativeName ?? propertyKey) as HookName;

  if (isStatic) {
    Object.defineProperty(state.originalClass, propertyKey, {
      ...descriptor,
      value: hook(dynamicKey ?? inherit(state.originalClass), hookName, descriptor.value.bind(state.originalClass)),
    });

    return state.ClassProxy;
  }

  // because the user may use attach(Class.prototype.method, ...)
  // - in that case they don't need to provide keys or a name, as it is extracted from the hook (hook_data)
  // so we need to register such an empty hook to store the relevant data
  Object.defineProperty(state.originalClass.prototype, propertyKey, {
    ...descriptor,
    value: hook(dynamicKey ?? inherit(state.originalClass), hookName, descriptor.value),
  });

  state.instanceInitializers.push((instance) => {
    // because prototype doesn't have access to instance, we need to bind it to instance again
    // to apply correct instance middlewares
    instance[propertyKey] = hook(dynamicKey ?? inherit(instance), hookName, descriptor.value.bind(instance));
  });

  return state.ClassProxy;
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
  const state = classUtilitiesState(Class);
  const { descriptor, target, isStatic } = resolveMemberDescriptor(
    state.ClassProxy,
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
      isStatic ? state.originalClass : undefined, // undefined means default
    ),
  });

  return state.ClassProxy;
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
  const state = classUtilitiesState(Class);
  const { descriptor, target, isStatic } = resolveMemberDescriptor(
    state.ClassProxy,
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
      isStatic ? state.originalClass : undefined,
    ),
  });

  return state.ClassProxy;
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
  const origin = ((Class as any)[HOOK_CLASS_UTILITIES_STATE] as IHookClassUtilitiesState).originalClass;
  const staticDescriptor = Object.getOwnPropertyDescriptor(origin, propertyKey);
  if (staticDescriptor) {
    if (typeof staticDescriptor.get === "function" || typeof staticDescriptor.set === "function") {
      throw new Error(`${PREFIX}[field] Member "${String(propertyKey)}" is not a field.`);
    }

    return true;
  }

  const instanceDescriptor = Object.getOwnPropertyDescriptor(origin.prototype, propertyKey);
  if (instanceDescriptor) {
    if (
      typeof instanceDescriptor.value === "function" ||
      typeof instanceDescriptor.get === "function" ||
      typeof instanceDescriptor.set === "function"
    ) {
      throw new Error(`${PREFIX}[field] Member "${String(propertyKey)}" is not a field.`);
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
  const state = classUtilitiesState(Class);
  const isStatic = isStaticField(state.originalClass, propertyKey);
  const { dynamicKey, alternativeName } = _resolveHookDecoratorOptions(arg1, arg2);
  const hookName = (alternativeName ?? propertyKey) as HookName;
  const runInitializer = _createHookInvoker(
    "init " + String(propertyKey),
    "init " + String(hookName),
    _identity,
    dynamicKey,
  );

  if (isStatic) {
    const originalClass: any = state.originalClass;
    originalClass[propertyKey] = runInitializer.call(originalClass, originalClass[propertyKey]);
    return state.ClassProxy;
  }
  state.instanceInitializers.push((instance) => {
    instance[propertyKey] = runInitializer.call(instance, instance[propertyKey]);
  });

  return state.ClassProxy;
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
  const staticDescriptor = Object.getOwnPropertyDescriptor(state.originalClass, propertyKey);
  const instanceDescriptor = Object.getOwnPropertyDescriptor(state.originalClass.prototype, propertyKey);

  if (typeof staticDescriptor?.get === "function" && typeof staticDescriptor?.set === "function") {
    const originalGet = staticDescriptor.get;
    const originalSet = staticDescriptor.set;
    const decoratedAccessor = _createAccessorDecorator(
      propertyKey,
      hookName,
      originalGet,
      originalSet,
      dynamicKey,
      state.originalClass,
    );
    const initializedKey = Symbol(`${PREFIX}[initialized ${String(propertyKey)}]`);
    function ensureInitialized(this: any) {
      if (this[initializedKey]) {
        return;
      }

      const initialValue = originalGet.call(state.originalClass);
      const nextValue = decoratedAccessor.init.call(this, initialValue);
      originalSet.call(state.originalClass, nextValue);
      this[initializedKey] = true;
    }

    Object.defineProperty(state.originalClass, propertyKey, {
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

    ensureInitialized.call(state.ClassProxy);
    return state.ClassProxy;
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

    Object.defineProperty(state.originalClass.prototype, propertyKey, {
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

    return state.ClassProxy;
  }

  if (
    (staticDescriptor && (typeof staticDescriptor.get === "function" || typeof staticDescriptor.set === "function")) ||
    (instanceDescriptor &&
      (typeof instanceDescriptor.get === "function" || typeof instanceDescriptor.set === "function"))
  ) {
    throw new Error(
      `${PREFIX}[accessor] Could not find a compatible member named "${String(propertyKey)}" on the class or its prototype. If a getter exists, a setter must also exist, and vice versa.`,
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
  const target = isStatic ? state.originalClass : state.originalClass.prototype;

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
    const nextValue = decoratedAccessor.init.call(state.originalClass, staticDescriptor!.value);
    originalSet.call(state.originalClass, nextValue);
    return state.ClassProxy;
  }

  state.instanceInitializers.push((instance) => {
    const initialValue = instance[propertyKey];
    delete instance[propertyKey];
    const nextValue = decoratedAccessor.init.call(instance, initialValue);
    originalSet.call(instance, nextValue);
  });

  return state.ClassProxy;
}
hook.accessor = hookAccessor;
