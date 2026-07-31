import type {
  HookDecoratedClass,
  HookDecoratorArgument,
  HookDecoratorContext,
  HookKeyDynamic,
  HookName,
  HookPropertyName,
} from "./index.js";
import {
  _resolveHookDecoratorOptions,
  _createAccessorDecorator,
  _createHookInvoker,
  hook,
  hookDecorator,
  _identity,
} from "./index.js";

const PREFIX = `[@neuronet/hooks][hookUtils]`;

interface IUtilitiesHookState<TClass extends HookDecoratedClass = HookDecoratedClass> {
  Class: TClass;
  originalClass: HookDecoratedClass;
  instanceInitializers: Array<(instance: any) => void>;
}

const UTILITIES_HOOK_STATE = Symbol("[hook][utilities-state]");

/**
 * Builds a lightweight method decorator context for the utilities API.
 *
 * Utilities decoration does not run through the JavaScript decorator runtime, so this helper
 * creates the subset of `ClassMemberDecoratorContext` that `hookDecorator()` needs.
 * It also collects initializer callbacks so they can be replayed later.
 *
 * @param propertyKey The method name.
 * @param isStatic Tells the utilities context whether the method is static.
 * @returns A synthetic decorator context and the initializer list collected from it.
 */
function createUtilitiesMethodContext(
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
 * Returns the cached utilities hook runtime state for a class, creating it when needed.
 *
 * The state stores a wrapped constructor and the list of instance initializers that should
 * run after each new instance is created. This is the foundation of the utilities decoration API.
 *
 * @param Class The class being prepared for utilities decoration.
 * @returns The shared runtime state for that class.
 */
function ensureUtilitiesHookState<TClass extends HookDecoratedClass>(Class: TClass): IUtilitiesHookState<TClass> {
  const existingState = (Class as any)[UTILITIES_HOOK_STATE] as IUtilitiesHookState<TClass> | undefined;
  if (existingState) {
    return existingState;
  }

  const instanceInitializers: IUtilitiesHookState<TClass>["instanceInitializers"] = [];
  const HookedClass = new Proxy(Class as HookDecoratedClass, {
    construct(target, args, newTarget) {
      const instance = Reflect.construct(target, args, newTarget);
      for (const initializer of instanceInitializers) {
        initializer(instance);
      }
      return instance;
    },
  }) as TClass;

  const state: IUtilitiesHookState<TClass> = {
    Class: HookedClass,
    originalClass: Class as HookDecoratedClass,
    instanceInitializers,
  };

  (HookedClass as any)[UTILITIES_HOOK_STATE] = state;
  (Class as any)[UTILITIES_HOOK_STATE] = state;
  HookedClass.prototype.constructor = HookedClass;

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
      throw new Error(`${PREFIX}[field] Member "${String(propertyKey)}" is not a field.`);
    }

    return true;
  }

  const instanceDescriptor = Object.getOwnPropertyDescriptor(Class.prototype, propertyKey);
  if (instanceDescriptor) {
    throw new Error(`${PREFIX}[field] Member "${String(propertyKey)}" is not a field.`);
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
export function hookClass<TClass extends HookDecoratedClass>(Class: TClass): TClass {
  return ensureUtilitiesHookState(Class).Class;
}

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
  const state = ensureUtilitiesHookState(Class);
  const { descriptor, isStatic } = resolveMemberDescriptor(
    state.Class,
    propertyKey,
    (candidate) => typeof candidate?.value === "function",
    "method",
  );
  const { dynamicKey, alternativeName } = _resolveHookDecoratorOptions(arg1, arg2);
  const hookName = (alternativeName ?? propertyKey) as HookName;

  if (isStatic) {
    const wrappedMethod = hook(dynamicKey ?? state.Class, hookName, descriptor.value.bind(state.originalClass));

    Object.defineProperty(state.Class, propertyKey, {
      ...descriptor,
      value: wrappedMethod,
    });

    return state.Class;
  }

  const decorate = hookDecorator(arg1 as any, arg2 as any);
  const { context, initializers } = createUtilitiesMethodContext(propertyKey, isStatic);
  const decoratedMethod = decorate(descriptor.value, context);
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
 * This is the utilities equivalent of `@hook()` placed on `get property()`.
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
  const state = ensureUtilitiesHookState(Class);
  const { descriptor, target, isStatic } = resolveMemberDescriptor(
    state.Class,
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

  return state.Class;
}

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
  const state = ensureUtilitiesHookState(Class);
  const { descriptor, target, isStatic } = resolveMemberDescriptor(
    state.Class,
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

  return state.Class;
}

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
  const state = ensureUtilitiesHookState(Class);
  const isStatic = resolveFieldPlacement(state.Class, propertyKey);
  const { dynamicKey, alternativeName } = _resolveHookDecoratorOptions(arg1, arg2);
  const hookName = (alternativeName ?? propertyKey) as HookName;
  const runInitializer = _createHookInvoker(
    "init " + String(propertyKey),
    "init " + String(hookName),
    _identity,
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
  const state = ensureUtilitiesHookState(Class);
  const { dynamicKey, alternativeName } = _resolveHookDecoratorOptions(arg1, arg2);
  const hookName = (alternativeName ?? propertyKey) as HookName;
  const staticDescriptor = Object.getOwnPropertyDescriptor(state.Class, propertyKey);
  const instanceDescriptor = Object.getOwnPropertyDescriptor(state.Class.prototype, propertyKey);

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
    const initializedKey = Symbol(`[hook][utilities-initialized ${String(propertyKey)}]`);
    const ensureInitialized = function runHookAccessorInitializer(this: any) {
      if (this[initializedKey]) {
        return;
      }

      const initialValue = originalGet.call(state.originalClass);
      const nextValue = decoratedAccessor.init.call(this, initialValue);
      originalSet.call(state.originalClass, nextValue);
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
    const decoratedAccessor = _createAccessorDecorator(propertyKey, hookName, originalGet, originalSet, dynamicKey);
    const initializedKey = Symbol(`[hook][utilities-initialized ${String(propertyKey)}]`);
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
      `${PREFIX}[accessor] Could not find a compatible member named "${String(propertyKey)}" on the class or its prototype.`,
    );
  }

  if (
    staticDescriptor &&
    (typeof staticDescriptor.value === "function" ||
      typeof staticDescriptor.get === "function" ||
      typeof staticDescriptor.set === "function")
  ) {
    throw new Error(
      `${PREFIX}[accessor] Could not find a compatible member named "${String(propertyKey)}" on the class or its prototype.`,
    );
  }

  const storageKey = Symbol(`[hook][accessor-storage ${String(propertyKey)}]`);
  const originalGet = function getFieldBackedAccessorValue(this: any) {
    return this[storageKey];
  };
  const originalSet = function setFieldBackedAccessorValue(this: any, value: any) {
    this[storageKey] = value;
  };
  const decoratedAccessor = _createAccessorDecorator(propertyKey, hookName, originalGet, originalSet, dynamicKey);
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
export const hookUtils = {
  class: hookClass,
  method: hookMethod,
  getter: hookGetter,
  setter: hookSetter,
  field: hookField,
  accessor: hookAccessor,
};
