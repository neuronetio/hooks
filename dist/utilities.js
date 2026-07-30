import { _createAccessorDecoratorHooks, _createLazyHookInvoker, _identity, _resolveHookDecoratorOptions, hook, hookDecorator } from "./hook.js";

//#region src/utilities.ts
const PREFIX = `[@neuronet/hooks]`;
const MANUAL_HOOK_STATE = Symbol("[hook][manual-state]");
/**
* Builds a lightweight method decorator context for the manual API.
*
* Manual decoration does not run through the JavaScript decorator runtime, so this helper
* creates the subset of `ClassMemberDecoratorContext` that `hookDecorator()` needs.
* It also collects initializer callbacks so they can be replayed later.
*
* @param propertyKey The method name.
* @param isStatic Tells the manual context whether the method is static.
* @returns A synthetic decorator context and the initializer list collected from it.
*/
function createManualMethodContext(propertyKey, isStatic) {
	const initializers = [];
	return {
		initializers,
		context: {
			kind: "method",
			name: propertyKey,
			static: isStatic,
			private: false,
			metadata: {},
			addInitializer(initializer) {
				initializers.push(initializer);
			}
		}
	};
}
/**
* Returns the cached manual hook runtime state for a class, creating it when needed.
*
* The state stores a wrapped constructor and the list of instance initializers that should
* run after each new instance is created. This is the foundation of the manual decoration API.
*
* @param Class The class being prepared for manual decoration.
* @returns The shared runtime state for that class.
*/
function ensureManualHookState(Class) {
	const existingState = Class[MANUAL_HOOK_STATE];
	if (existingState) return existingState;
	const instanceInitializers = [];
	const HookedClass = new Proxy(Class, { construct(target, args, newTarget) {
		const instance = Reflect.construct(target, args, newTarget);
		for (const initializer of instanceInitializers) initializer(instance);
		return instance;
	} });
	const state = {
		Class: HookedClass,
		originalClass: Class,
		instanceInitializers
	};
	HookedClass[MANUAL_HOOK_STATE] = state;
	Class[MANUAL_HOOK_STATE] = state;
	HookedClass.prototype.constructor = HookedClass;
	return state;
}
/**
* Finds a member descriptor on the class or its prototype and validates its shape.
*
* Manual decoration can target either static members or instance members. This helper checks
* both locations, returns the first compatible descriptor, and throws a clear error otherwise.
*
* @param Class The class being inspected.
* @param propertyKey The member name to find.
* @param validate A predicate that confirms the descriptor matches the expected member kind.
* @param apiName The public API name used in the error message.
* @returns The matching descriptor together with its target and static flag.
*/
function resolveMemberDescriptor(Class, propertyKey, validate, apiName) {
	const staticDescriptor = Object.getOwnPropertyDescriptor(Class, propertyKey);
	if (validate(staticDescriptor)) return {
		descriptor: staticDescriptor,
		isStatic: true,
		target: Class
	};
	const instanceDescriptor = Object.getOwnPropertyDescriptor(Class.prototype, propertyKey);
	if (validate(instanceDescriptor)) return {
		descriptor: instanceDescriptor,
		isStatic: false,
		target: Class.prototype
	};
	throw new Error(`${PREFIX}[${apiName}] Could not find a compatible member named "${String(propertyKey)}" on the class or its prototype.`);
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
function resolveFieldPlacement(Class, propertyKey) {
	const staticDescriptor = Object.getOwnPropertyDescriptor(Class, propertyKey);
	if (staticDescriptor) {
		if (typeof staticDescriptor.value === "function" || typeof staticDescriptor.get === "function" || typeof staticDescriptor.set === "function") throw new Error(`${PREFIX}[hookField] Member "${String(propertyKey)}" is not a field.`);
		return true;
	}
	if (Object.getOwnPropertyDescriptor(Class.prototype, propertyKey)) throw new Error(`${PREFIX}[hookField] Member "${String(propertyKey)}" is not a field.`);
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
function isPrototypeReceiver(value) {
	return Boolean(value && value.constructor && value === value.constructor.prototype);
}
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
function hookClass(Class) {
	return ensureManualHookState(Class).Class;
}
function hookMethod(Class, propertyKey, arg1, arg2) {
	const state = ensureManualHookState(Class);
	const { descriptor, isStatic } = resolveMemberDescriptor(state.Class, propertyKey, (candidate) => typeof candidate?.value === "function", "hookMethod");
	const { dynamicKey, alternativeName } = _resolveHookDecoratorOptions(arg1, arg2);
	const hookName = alternativeName ?? propertyKey;
	if (isStatic) {
		const wrappedMethod = hook(dynamicKey ?? state.Class, hookName, descriptor.value.bind(state.originalClass));
		Object.defineProperty(state.Class, propertyKey, {
			...descriptor,
			value: wrappedMethod
		});
		return state.Class;
	}
	const decorate = hookDecorator(arg1, arg2);
	const { context, initializers } = createManualMethodContext(propertyKey, isStatic);
	const decoratedMethod = decorate(descriptor.value, context);
	const classHook = hook(state.Class, hookName, decoratedMethod);
	const runInitializers = function runHookMethodInitializers() {
		for (const initializer of initializers) initializer.call(this);
	};
	Object.defineProperty(state.Class.prototype, propertyKey, {
		configurable: descriptor.configurable,
		enumerable: descriptor.enumerable,
		get: function getHookedMethod() {
			if (isPrototypeReceiver(this)) return classHook;
			if (!Object.prototype.hasOwnProperty.call(this, propertyKey)) runInitializers.call(this);
			return this[propertyKey];
		},
		set: function setHookedMethod(value) {
			Object.defineProperty(this, propertyKey, {
				value,
				writable: true,
				configurable: true,
				enumerable: descriptor.enumerable
			});
		}
	});
	state.instanceInitializers.push((instance) => {
		if (!Object.prototype.hasOwnProperty.call(instance, propertyKey)) runInitializers.call(instance);
	});
	return state.Class;
}
function hookGetter(Class, propertyKey, arg1, arg2) {
	const state = ensureManualHookState(Class);
	const { descriptor, target, isStatic } = resolveMemberDescriptor(state.Class, propertyKey, (candidate) => typeof candidate?.get === "function", "hookGetter");
	const { dynamicKey, alternativeName } = _resolveHookDecoratorOptions(arg1, arg2);
	const hookName = alternativeName ?? propertyKey;
	Object.defineProperty(target, propertyKey, {
		...descriptor,
		get: _createLazyHookInvoker("get " + String(propertyKey), "get " + String(hookName), descriptor.get, dynamicKey, isStatic ? state.originalClass : void 0)
	});
	return state.Class;
}
function hookSetter(Class, propertyKey, arg1, arg2) {
	const state = ensureManualHookState(Class);
	const { descriptor, target, isStatic } = resolveMemberDescriptor(state.Class, propertyKey, (candidate) => typeof candidate?.set === "function", "hookSetter");
	const { dynamicKey, alternativeName } = _resolveHookDecoratorOptions(arg1, arg2);
	const hookName = alternativeName ?? propertyKey;
	Object.defineProperty(target, propertyKey, {
		...descriptor,
		set: _createLazyHookInvoker("set " + String(propertyKey), "set " + String(hookName), descriptor.set, dynamicKey, isStatic ? state.originalClass : void 0)
	});
	return state.Class;
}
function hookField(Class, propertyKey, arg1, arg2) {
	const state = ensureManualHookState(Class);
	const isStatic = resolveFieldPlacement(state.Class, propertyKey);
	const { dynamicKey, alternativeName } = _resolveHookDecoratorOptions(arg1, arg2);
	const hookName = alternativeName ?? propertyKey;
	const runInitializer = _createLazyHookInvoker("init " + String(propertyKey), "init " + String(hookName), _identity, dynamicKey);
	if (isStatic) {
		state.Class[propertyKey] = runInitializer.call(state.Class, state.Class[propertyKey]);
		return state.Class;
	}
	state.instanceInitializers.push((instance) => {
		instance[propertyKey] = runInitializer.call(instance, instance[propertyKey]);
	});
	return state.Class;
}
function hookAccessor(Class, propertyKey, arg1, arg2) {
	const state = ensureManualHookState(Class);
	const { dynamicKey, alternativeName } = _resolveHookDecoratorOptions(arg1, arg2);
	const hookName = alternativeName ?? propertyKey;
	const staticDescriptor = Object.getOwnPropertyDescriptor(state.Class, propertyKey);
	const instanceDescriptor = Object.getOwnPropertyDescriptor(state.Class.prototype, propertyKey);
	if (typeof staticDescriptor?.get === "function" && typeof staticDescriptor?.set === "function") {
		const originalGet = staticDescriptor.get;
		const originalSet = staticDescriptor.set;
		const decoratedAccessor = _createAccessorDecoratorHooks(propertyKey, hookName, originalGet, originalSet, dynamicKey, state.originalClass);
		const initializedKey = Symbol(`[hook][manual-initialized ${String(propertyKey)}]`);
		const ensureInitialized = function runHookAccessorInitializer() {
			if (this[initializedKey]) return;
			const initialValue = originalGet.call(state.originalClass);
			const nextValue = decoratedAccessor.init.call(this, initialValue);
			originalSet.call(state.originalClass, nextValue);
			this[initializedKey] = true;
		};
		Object.defineProperty(state.Class, propertyKey, {
			...staticDescriptor,
			get: function getHookedAccessor(...args) {
				ensureInitialized.call(this);
				return decoratedAccessor.get.apply(this, args);
			},
			set: function setHookedAccessor(...args) {
				ensureInitialized.call(this);
				return decoratedAccessor.set.apply(this, args);
			}
		});
		ensureInitialized.call(state.Class);
		return state.Class;
	}
	if (typeof instanceDescriptor?.get === "function" && typeof instanceDescriptor?.set === "function") {
		const originalGet = instanceDescriptor.get;
		const originalSet = instanceDescriptor.set;
		const decoratedAccessor = _createAccessorDecoratorHooks(propertyKey, hookName, originalGet, originalSet, dynamicKey);
		const initializedKey = Symbol(`[hook][manual-initialized ${String(propertyKey)}]`);
		const ensureInitialized = function runHookAccessorInitializer() {
			if (this[initializedKey]) return;
			const initialValue = originalGet.call(this);
			const nextValue = decoratedAccessor.init.call(this, initialValue);
			originalSet.call(this, nextValue);
			this[initializedKey] = true;
		};
		Object.defineProperty(state.Class.prototype, propertyKey, {
			...instanceDescriptor,
			get: function getHookedAccessor(...args) {
				ensureInitialized.call(this);
				return decoratedAccessor.get.apply(this, args);
			},
			set: function setHookedAccessor(...args) {
				ensureInitialized.call(this);
				return decoratedAccessor.set.apply(this, args);
			}
		});
		state.instanceInitializers.push((instance) => {
			ensureInitialized.call(instance);
		});
		return state.Class;
	}
	if (instanceDescriptor) throw new Error(`${PREFIX}[hookAccessor] Could not find a compatible member named "${String(propertyKey)}" on the class or its prototype.`);
	if (staticDescriptor && (typeof staticDescriptor.value === "function" || typeof staticDescriptor.get === "function" || typeof staticDescriptor.set === "function")) throw new Error(`${PREFIX}[hookAccessor] Could not find a compatible member named "${String(propertyKey)}" on the class or its prototype.`);
	const storageKey = Symbol(`[hook][accessor-storage ${String(propertyKey)}]`);
	const originalGet = function getFieldBackedAccessorValue() {
		return this[storageKey];
	};
	const originalSet = function setFieldBackedAccessorValue(value) {
		this[storageKey] = value;
	};
	const decoratedAccessor = _createAccessorDecoratorHooks(propertyKey, hookName, originalGet, originalSet, dynamicKey);
	const isStatic = Boolean(staticDescriptor);
	const target = isStatic ? state.Class : state.Class.prototype;
	Object.defineProperty(target, propertyKey, {
		configurable: staticDescriptor?.configurable ?? true,
		enumerable: staticDescriptor?.enumerable ?? true,
		get: function getHookedFieldAccessor(...args) {
			return decoratedAccessor.get.apply(this, args);
		},
		set: function setHookedFieldAccessor(...args) {
			return decoratedAccessor.set.apply(this, args);
		}
	});
	if (isStatic) {
		const nextValue = decoratedAccessor.init.call(state.Class, staticDescriptor.value);
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

//#endregion
export { hookAccessor, hookClass, hookField, hookGetter, hookMethod, hookSetter };
//# sourceMappingURL=utilities.js.map