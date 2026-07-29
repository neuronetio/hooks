//#region src/index.ts
const PREFIX = `[@neuronet/hooks]`;
const DEFAULT_HOOK_NAME = Symbol("DEFAULT_HOOK_NAME");
/**
* Hook property key used to store hook metadata on functions and classes.
*/
const HOOK = Symbol("HOOK");
const noop = (..._args) => {};
const identity = (value) => value;
/**
* Represents a composition of multiple hook keys.
* Used to support hierarchical or multi-layered hook contexts.
*/
var HookKeyComposite = class HookKeyComposite {
	keys;
	constructor(keys = []) {
		this.keys = keys;
	}
	/**
	* Flattens the composite keys into a single-level array of non-composite keys.
	* @param keys The keys to flatten. Defaults to the keys of this composite.
	* @returns An array of non-composite hook keys.
	*/
	flat(keys = this.keys) {
		const result = [];
		for (const key of keys) if (key instanceof HookKeyComposite) result.push(...key.flat(key.keys));
		else result.push(key);
		return result;
	}
	/**
	* Iterates over all non-composite keys in this composite (recursive).
	*/
	*[Symbol.iterator]() {
		for (const key of this.keys) if (key instanceof HookKeyComposite) yield* key;
		else yield key;
	}
};
/**
* Composes multiple hook keys into a single composite key.
* Useful for scenarios where a hook should trigger middleware attached to multiple contexts
* (e.g., an instance and its class).
*
* @param keys The hook keys to compose.
* @returns A new HookKeyComposite instance.
*/
function composeHookKeys(...keys) {
	return new HookKeyComposite(keys);
}
/**
* Represents a hook key that is resolved dynamically at runtime.
* The key is resolved by calling the provided function, usually with the `this` context
* of the hooked method.
*/
var HookKeyDynamic = class {
	fn;
	constructor(fn) {
		this.fn = fn;
	}
};
/**
* Creates a dynamic hook key.
*
* @param fn A function that returns a HookKey.
* @returns A new HookKeyDynamic instance.
*/
function dynamicHookKey(fn) {
	return new HookKeyDynamic(fn);
}
let currentHookKey = null;
/**
* Retrieves the hook key context for the currently executing hook.
* This is useful for inferring the hook key when it's not explicitly provided.
*
* @returns The current HookKey or null if no hook is executing.
*/
function getCurrentHookKeyContext() {
	return currentHookKey;
}
function hook(arg1, arg2, arg3, arg4) {
	if (arg1 === void 0) return hookDecorator();
	if ((arg1 instanceof HookKeyDynamic || typeof arg1 === "string") && arg2 === void 0) return hookDecorator(arg1);
	if (typeof arg1 === "string" && arg2 instanceof HookKeyDynamic && arg3 === void 0) return hookDecorator(arg2, arg1);
	if (arg1 instanceof HookKeyDynamic && typeof arg2 === "string" && arg3 === void 0) return hookDecorator(arg2, arg1);
	let key;
	let name = DEFAULT_HOOK_NAME;
	let argsOverride = void 0;
	let fn;
	if (arg4 !== void 0) {
		key = arg1;
		name = arg2;
		argsOverride = arg3;
		fn = arg4 || noop;
	} else if (arg3 !== void 0) if (typeof arg1 === "string") {
		if (!currentHookKey) throw new Error(`${PREFIX} Hook key must be provided or inferred from the context.`);
		key = currentHookKey;
		name = arg1;
		argsOverride = arg2;
		fn = arg3 || noop;
	} else {
		key = arg1;
		if (typeof arg2 === "string" || typeof arg2 === "symbol") {
			name = arg2;
			fn = arg3 || noop;
		} else {
			argsOverride = arg2;
			fn = arg3 || noop;
		}
	}
	else if (arg2 !== void 0) if (typeof arg1 === "string") {
		if (!currentHookKey) throw new Error(`${PREFIX} Hook key must be provided or inferred from the context.`);
		key = currentHookKey;
		name = arg1;
		fn = arg2 || noop;
	} else if (Array.isArray(arg1)) {
		argsOverride = arg1;
		fn = arg2 || noop;
		key = fn;
	} else {
		key = arg1;
		fn = arg2 || noop;
	}
	else {
		fn = arg1 || noop;
		key = fn;
	}
	const _hookData = {
		origin: fn,
		key,
		name,
		args: argsOverride
	};
	function runHook(...args) {
		let key = _hookData.key;
		const oldHookKey = currentHookKey;
		while (key instanceof HookKeyDynamic) key = key.fn.call(this);
		currentHookKey = key;
		let next = _hookData.origin;
		if (key instanceof HookKeyComposite) {
			const keyComposite = key;
			if (keyComposite.keys.length === 0) {
				const callArgs = argsOverride || args;
				const result = _hookData.origin.apply(this, callArgs);
				currentHookKey = oldHookKey;
				return result;
			}
			const flat = keyComposite.flat();
			let i = 1;
			key = flat[0];
			next = (...args) => {
				if (i < keyComposite.keys.length) return runMiddleware(flat[i++], _hookData.name, next, this, ...args);
				else return _hookData.origin.apply(this, args);
			};
		}
		const result = runMiddleware(key, _hookData.name, next, this, ...argsOverride || args);
		currentHookKey = oldHookKey;
		return result;
	}
	runHook[HOOK] = _hookData;
	return runHook;
}
/**
* A class decorator that enables hook support for the class.
* It initializes metadata required for `@hook()` decorated members to work correctly,
* ensuring that middleware can be attached to both the class and its instances.
*
* @param _Class The class constructor.
* @param context The class decorator context.
*/
function Hook(_Class, context) {
	context.addInitializer(function() {
		const hooks = context.metadata.hooks || [];
		for (const propertyKey of hooks) {
			const hooked = this.prototype[propertyKey];
			if (hooked && hooked[HOOK] === void 0) hooked[HOOK] = {
				origin: hooked,
				key: this,
				name: propertyKey
			};
		}
	});
}
const MANUAL_HOOK_STATE = Symbol("[hook][manual-state]");
/**
* Normalizes optional manual decorator arguments into one predictable object.
*
* Internal helpers accept the same flexible argument order as `hook()` and `@hook()`.
* This function converts those variants into a simple `{ dynamicKey, alternativeName }` shape.
*
* @param arg1 The first optional manual decorator argument.
* @param arg2 The second optional manual decorator argument.
* @returns The normalized options used by the internal manual decoration helpers.
*/
function resolveHookDecoratorOptions(arg1, arg2) {
	if (typeof arg1 === "string") return {
		alternativeName: arg1,
		dynamicKey: arg2 instanceof HookKeyDynamic ? arg2 : void 0
	};
	return {
		dynamicKey: arg1 instanceof HookKeyDynamic ? arg1 : void 0,
		alternativeName: typeof arg2 === "string" ? arg2 : void 0
	};
}
/**
* Creates a lazy hook wrapper for members that should initialize on first use.
*
* This keeps the runtime behavior close to decorator semantics. The actual hook function
* is created only when the member is called for the first time on a concrete receiver.
*
* @param propertyKey The original member key, used to store the cached wrapped function.
* @param hookName The public hook name used by `attach()`.
* @param value The original member implementation.
* @param dynamicKey Optional runtime key resolver.
* @returns A function that lazily creates and reuses the wrapped hook for one receiver.
*/
function createLazyHookInvoker(propertyKey, hookName, value, dynamicKey) {
	const hookKey = Symbol(`[hook][${String(propertyKey)}]`);
	return function runHook(...args) {
		if (!this[hookKey]) this[hookKey] = hook(dynamicKey ?? composeHookKeys(this, this.constructor), hookName, value.bind(this));
		return this[hookKey](...args);
	};
}
/**
* Creates the three hook handlers used by accessor-style members.
*
* Auto-accessors expose separate `get`, `set`, and `init` entry points. This helper builds
* all three wrappers so the manual API and the decorator API share the same naming and behavior.
*
* @param propertyKey The original accessor key.
* @param hookName The public hook base name.
* @param get The original getter implementation.
* @param set The original setter implementation.
* @param dynamicKey Optional runtime key resolver.
* @returns An object with lazy hook handlers for `get`, `set`, and `init`.
*/
function createAccessorDecoratorHooks(propertyKey, hookName, get, set, dynamicKey) {
	const getHookKey = Symbol(`[hook][get ${String(propertyKey)}]`);
	const setHookKey = Symbol(`[hook][set ${String(propertyKey)}]`);
	const initHookKey = Symbol(`[hook][init ${String(propertyKey)}]`);
	return {
		get: function runHook(...args) {
			if (!this[getHookKey]) this[getHookKey] = hook(dynamicKey ?? composeHookKeys(this, this.constructor), "get " + String(hookName), get.bind(this));
			return this[getHookKey](...args);
		},
		set: function runHook(...args) {
			if (!this[setHookKey]) this[setHookKey] = hook(dynamicKey ?? composeHookKeys(this, this.constructor), "set " + String(hookName), set.bind(this));
			return this[setHookKey](...args);
		},
		init: function runHook(initialValue) {
			if (!this[initHookKey]) this[initHookKey] = hook(dynamicKey ?? composeHookKeys(this, this.constructor), "init " + String(hookName), identity);
			return this[initHookKey](initialValue);
		}
	};
}
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
function hookDecorator(dynamicKey, alternativeName) {
	const resolvedOptions = resolveHookDecoratorOptions(dynamicKey, alternativeName);
	dynamicKey = resolvedOptions.dynamicKey;
	alternativeName = resolvedOptions.alternativeName;
	return function decorate(value, context) {
		let propertyKey = context.name;
		let hookName = alternativeName || propertyKey;
		if (!context.private && context.kind === "method") {
			const metadata = context.metadata;
			(metadata.hooks || (metadata.hooks = [])).push(propertyKey);
			context.addInitializer(function() {
				if (context.static) this[propertyKey] = hook(dynamicKey ?? this, hookName, value.bind(this));
				else this[propertyKey] = hook(dynamicKey ?? composeHookKeys(this, this.constructor), hookName, value.bind(this));
			});
			return value;
		}
		if (context.kind === "accessor") {
			const { get, set } = value;
			return createAccessorDecoratorHooks(propertyKey, hookName, get, set, dynamicKey);
		}
		if (context.kind === "field") {
			propertyKey = "init " + String(propertyKey);
			hookName = "init " + String(hookName);
			value = identity;
		} else if (context.kind === "getter") {
			propertyKey = "get " + String(propertyKey);
			hookName = "get " + String(hookName);
		} else if (context.kind === "setter") {
			propertyKey = "set " + String(propertyKey);
			hookName = "set " + String(hookName);
		}
		return createLazyHookInvoker(propertyKey, hookName, value, dynamicKey);
	};
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
	const decorate = hookDecorator(arg1, arg2);
	const { context, initializers } = createManualMethodContext(propertyKey, isStatic);
	const decoratedMethod = decorate(descriptor.value, context);
	if (isStatic) {
		Object.defineProperty(state.Class, propertyKey, {
			...descriptor,
			value: decoratedMethod
		});
		for (const initializer of initializers) initializer.call(state.Class);
		return state.Class;
	}
	const { alternativeName } = resolveHookDecoratorOptions(arg1, arg2);
	const hookName = alternativeName ?? propertyKey;
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
	const { descriptor, target } = resolveMemberDescriptor(state.Class, propertyKey, (candidate) => typeof candidate?.get === "function", "hookGetter");
	const { dynamicKey, alternativeName } = resolveHookDecoratorOptions(arg1, arg2);
	const hookName = alternativeName ?? propertyKey;
	Object.defineProperty(target, propertyKey, {
		...descriptor,
		get: createLazyHookInvoker("get " + String(propertyKey), "get " + String(hookName), descriptor.get, dynamicKey)
	});
	return state.Class;
}
function hookSetter(Class, propertyKey, arg1, arg2) {
	const state = ensureManualHookState(Class);
	const { descriptor, target } = resolveMemberDescriptor(state.Class, propertyKey, (candidate) => typeof candidate?.set === "function", "hookSetter");
	const { dynamicKey, alternativeName } = resolveHookDecoratorOptions(arg1, arg2);
	const hookName = alternativeName ?? propertyKey;
	Object.defineProperty(target, propertyKey, {
		...descriptor,
		set: createLazyHookInvoker("set " + String(propertyKey), "set " + String(hookName), descriptor.set, dynamicKey)
	});
	return state.Class;
}
function hookField(Class, propertyKey, arg1, arg2) {
	const state = ensureManualHookState(Class);
	const isStatic = resolveFieldPlacement(state.Class, propertyKey);
	const { dynamicKey, alternativeName } = resolveHookDecoratorOptions(arg1, arg2);
	const hookName = alternativeName ?? propertyKey;
	const runInitializer = createLazyHookInvoker("init " + String(propertyKey), "init " + String(hookName), identity, dynamicKey);
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
	const { dynamicKey, alternativeName } = resolveHookDecoratorOptions(arg1, arg2);
	const hookName = alternativeName ?? propertyKey;
	const staticDescriptor = Object.getOwnPropertyDescriptor(state.Class, propertyKey);
	const instanceDescriptor = Object.getOwnPropertyDescriptor(state.Class.prototype, propertyKey);
	if (typeof staticDescriptor?.get === "function" && typeof staticDescriptor?.set === "function") {
		const originalGet = staticDescriptor.get;
		const originalSet = staticDescriptor.set;
		const decoratedAccessor = createAccessorDecoratorHooks(propertyKey, hookName, originalGet, originalSet, dynamicKey);
		const initializedKey = Symbol(`[hook][manual-initialized ${String(propertyKey)}]`);
		const ensureInitialized = function runHookAccessorInitializer() {
			if (this[initializedKey]) return;
			const initialValue = originalGet.call(this);
			const nextValue = decoratedAccessor.init.call(this, initialValue);
			originalSet.call(this, nextValue);
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
		const decoratedAccessor = createAccessorDecoratorHooks(propertyKey, hookName, originalGet, originalSet, dynamicKey);
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
	const decoratedAccessor = createAccessorDecoratorHooks(propertyKey, hookName, originalGet, originalSet, dynamicKey);
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
var HookDecoratorBuilder = class {
	HookedClass;
	constructor(Class) {
		this.HookedClass = hookClass(Class);
	}
	accessor(propertyKey, arg1, arg2) {
		this.HookedClass = hookAccessor(this.HookedClass, propertyKey, arg1, arg2);
		return this;
	}
	field(propertyKey, arg1, arg2) {
		this.HookedClass = hookField(this.HookedClass, propertyKey, arg1, arg2);
		return this;
	}
	getter(propertyKey, arg1, arg2) {
		this.HookedClass = hookGetter(this.HookedClass, propertyKey, arg1, arg2);
		return this;
	}
	method(propertyKey, arg1, arg2) {
		this.HookedClass = hookMethod(this.HookedClass, propertyKey, arg1, arg2);
		return this;
	}
	setter(propertyKey, arg1, arg2) {
		this.HookedClass = hookSetter(this.HookedClass, propertyKey, arg1, arg2);
		return this;
	}
	build() {
		return this.HookedClass;
	}
};
function Hooks(Class) {
	return new HookDecoratorBuilder(Class);
}
const middlewares = /* @__PURE__ */ new WeakMap();
function attach(arg1, arg2, arg3) {
	let key;
	let name = DEFAULT_HOOK_NAME;
	let fn;
	const maybeHook = arg1[HOOK];
	if (maybeHook) {
		key = maybeHook.key;
		name = maybeHook.name;
	} else key = arg1;
	if (arg3) {
		name = arg2;
		fn = arg3;
	} else if (typeof arg2 === "function") fn = arg2;
	else throw new Error(`${PREFIX}[attach] Invalid arguments`);
	if (key instanceof HookKeyDynamic) throw new Error(`${PREFIX}[attach] Cannot attach middleware to dynamic hook key. Use static hook key or composite keys instead.`);
	if (key instanceof HookKeyComposite) key = key.flat()[0];
	const methods = middlewares.getOrInsert(key, {});
	let method = methods[name];
	if (!method) {
		method = [];
		methods[name] = method;
	}
	method.push(fn);
	return () => detach(key, name, fn);
}
/**
* Inspects a hook function and returns its metadata and middleware statistics.
*
* @param hookFn The hook function to inspect.
* @returns Metadata about the hook, including its key, name, and middleware count.
* @throws Error if the provided function is not a valid hook function.
*/
function inspectHook(hookFn) {
	const maybeHook = hookFn[HOOK];
	if (!maybeHook) throw new Error(`${PREFIX}[inspectHook] Hook function metadata not found.`);
	const methods = middlewares.get(maybeHook.key);
	const middlewareNames = Object.keys(methods || {});
	const middlewareCount = middlewareNames.reduce((count, methodName) => {
		return count + (methods?.[methodName]?.length || 0);
	}, 0);
	return {
		key: maybeHook.key,
		name: maybeHook.name,
		middlewareCount,
		middlewareNames
	};
}
/**
* Detaches a specific middleware function from a hook.
*
* @param key The hook key.
* @param name The hook name.
* @param fn The middleware function to remove.
*/
function detach(key, name, fn) {
	const methods = middlewares.get(key);
	if (!methods) return;
	const method = methods[name];
	if (!method) return;
	const index = method.indexOf(fn);
	if (index !== -1) {
		method.splice(index, 1);
		if (method.length === 0) {
			delete methods[name];
			if (Object.keys(methods).length === 0) middlewares.delete(key);
		}
	}
}
/**
* Internally runs middleware chain for a specific hook.
*
* @param key The single hook key to run middleware for.
* @param name The hook name.
* @param next The next function in the chain (either original function or next level composite).
* @param thisArg The `this` context for the execution.
* @param args The arguments passed to the hook.
* @returns The result of the execution.
*/
function runMiddleware(key, name, next, thisArg, ...args) {
	const actualNext = next || noop;
	const oldHookKey = currentHookKey;
	const methods = middlewares.get(key);
	if (!methods) {
		currentHookKey = oldHookKey;
		return actualNext.apply(thisArg, args);
	}
	const method = methods[name];
	if (!method) {
		currentHookKey = oldHookKey;
		return actualNext.apply(thisArg, args);
	}
	currentHookKey = key;
	let index = 0;
	const runner = (...runnerArgs) => {
		if (index < method.length) return method[index++].call(thisArg, runner, ...runnerArgs);
		else {
			currentHookKey = oldHookKey;
			return actualNext.apply(thisArg, runnerArgs);
		}
	};
	return runner(...args);
}

//#endregion
export { DEFAULT_HOOK_NAME, HOOK, Hook, HookDecoratorBuilder, Hooks, attach, composeHookKeys, detach, dynamicHookKey, getCurrentHookKeyContext, hook, hookAccessor, hookClass, hookDecorator, hookField, hookGetter, hookMethod, hookSetter, inspectHook, middlewares };
//# sourceMappingURL=index.js.map