//#region src/hook.ts
const PREFIX = `[@neuronet/hooks]`;
const DEFAULT_HOOK_NAME = Symbol("DEFAULT_HOOK_NAME");
/**
* Hook property key used to store hook metadata on functions and classes.
*/
const HOOK = Symbol("HOOK");
const noop = (..._args) => {};
/**
* @internal
*/
const _identity = (value) => value;
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
/**
* An alias for `dynamicHookKey` to provide a shorter and more convenient name.
*
* Creates a dynamic hook key.
*
* @param fn A function that returns a HookKey.
* @returns A new HookKeyDynamic instance.
*/
const dhk = dynamicHookKey;
/**
* A utility class to provide the arguments passed to the middleware and hook functions.
*/
var ArgumentsProvider = class {
	args;
	constructor(args) {
		this.args = typeof args === "function" ? args : () => args;
	}
};
function argsProvider(...args) {
	return new ArgumentsProvider(args.length === 1 && typeof args[0] === "function" ? args[0] : args);
}
const args = argsProvider;
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
	let keyOrKeys;
	let name = DEFAULT_HOOK_NAME;
	let argsProv = void 0;
	let fn;
	if (arg4 !== void 0) {
		keyOrKeys = arg1;
		name = arg2;
		argsProv = arg3;
		fn = arg4 || noop;
	} else if (arg3 !== void 0) if (typeof arg1 === "string") {
		if (!currentHookKey) throw new Error(`${PREFIX} Hook key must be provided or inferred from the context.`);
		keyOrKeys = currentHookKey;
		name = arg1;
		argsProv = arg2;
		fn = arg3 || noop;
	} else {
		keyOrKeys = arg1;
		if (typeof arg2 === "string" || typeof arg2 === "symbol") {
			name = arg2;
			fn = arg3 || noop;
		} else {
			argsProv = arg2;
			fn = arg3 || noop;
		}
	}
	else if (arg2 !== void 0) if (typeof arg1 === "string") {
		if (!currentHookKey) throw new Error(`${PREFIX} Hook key must be provided or inferred from the context.`);
		keyOrKeys = currentHookKey;
		name = arg1;
		fn = arg2 || noop;
	} else if (arg1 instanceof ArgumentsProvider) {
		argsProv = arg1;
		fn = arg2 || noop;
		if (fn === noop && !currentHookKey) throw new Error(`${PREFIX} Hook key must be provided or inferred from the context.`);
		keyOrKeys = fn;
	} else {
		keyOrKeys = arg1;
		fn = arg2 || noop;
	}
	else {
		fn = arg1 || noop;
		keyOrKeys = fn;
	}
	const _hookData = {
		origin: fn,
		keyOrKeys,
		name,
		argsProvider: argsProv
	};
	function runHook(...args) {
		let key = _hookData.keyOrKeys;
		const oldHookKey = currentHookKey;
		while (key instanceof HookKeyDynamic) key = key.fn.call(this);
		currentHookKey = key;
		let next = _hookData.origin;
		if (Array.isArray(key)) {
			if (key.length === 0) {
				const callArgs = argsProv?.args.call(this) || args;
				const result = _hookData.origin.apply(this, callArgs);
				currentHookKey = oldHookKey;
				return result;
			}
			let i = 1;
			const _keys = key;
			key = _keys[0];
			next = (...args) => {
				if (i < _keys.length) return runMiddleware(_keys[i++], _hookData.name, next, this, ...args);
				else return _hookData.origin.apply(this, args);
			};
		}
		const result = runMiddleware(key, _hookData.name, next, this, ...argsProv?.args.call(this) || args);
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
				keyOrKeys: this,
				name: propertyKey
			};
		}
	});
}
/**
* Normalizes optional manual decorator arguments into one predictable object.
*
* Internal helpers accept the same flexible argument order as `hook()` and `@hook()`.
* This function converts those variants into a simple `{ dynamicKey, alternativeName }` shape.
*
* @param arg1 The first optional manual decorator argument.
* @param arg2 The second optional manual decorator argument.
* @returns The normalized options used by the internal manual decoration helpers.
*
* @internal
*/
function _resolveHookDecoratorOptions(arg1, arg2) {
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
* Creates a hook wrapper for members that should initialize on first use.
*
* This keeps the runtime behavior close to decorator semantics. The actual hook function
* is created only when the member is called for the first time on a concrete receiver.
*
* @param propertyKey The original member key, used to store the cached wrapped function.
* @param hookName The public hook name used by `attach()`.
* @param value The original member implementation.
* @param dynamicKey Optional runtime key resolver.
* @param owner Optional owner to bind the original member to, instead of the receiver.
* @returns A function that lazily creates and reuses the wrapped hook for one receiver.
*
* @internal
*/
function _createHookInvoker(propertyKey, hookName, value, dynamicKey, owner) {
	const hookKey = Symbol(`[hook][${String(propertyKey)}]`);
	return function runHook(...args) {
		if (!this[hookKey]) {
			const receiver = owner ?? this;
			this[hookKey] = hook(dynamicKey ?? [this, this.constructor], hookName, value.bind(receiver));
		}
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
* @param owner Optional owner to bind the original member to, instead of `this`.
* @returns An object with lazy hook handlers for `get`, `set`, and `init`.
*
* @internal
*/
function _createAccessorDecorator(propertyKey, hookName, get, set, dynamicKey, owner) {
	const getHookKey = Symbol(`[hook][get ${String(propertyKey)}]`);
	const setHookKey = Symbol(`[hook][set ${String(propertyKey)}]`);
	const initHookKey = Symbol(`[hook][init ${String(propertyKey)}]`);
	return {
		get: function runHook(...args) {
			if (!this[getHookKey]) {
				const receiver = owner ?? this;
				this[getHookKey] = hook(dynamicKey ?? [this, this.constructor], "get " + String(hookName), get.bind(receiver));
			}
			return this[getHookKey](...args);
		},
		set: function runHook(...args) {
			if (!this[setHookKey]) {
				const receiver = owner ?? this;
				this[setHookKey] = hook(dynamicKey ?? [this, this.constructor], "set " + String(hookName), set.bind(receiver));
			}
			return this[setHookKey](...args);
		},
		init: function runHook(initialValue) {
			if (!this[initHookKey]) this[initHookKey] = hook(dynamicKey ?? [this, this.constructor], "init " + String(hookName), _identity);
			return this[initHookKey](initialValue);
		}
	};
}
function hookDecorator(dynamicKey, alternativeName) {
	const resolvedOptions = _resolveHookDecoratorOptions(dynamicKey, alternativeName);
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
				else this[propertyKey] = hook(dynamicKey ?? [this, this.constructor], hookName, value.bind(this));
			});
			return value;
		}
		if (context.kind === "accessor") {
			const { get, set } = value;
			return _createAccessorDecorator(propertyKey, hookName, get, set, dynamicKey);
		}
		if (context.kind === "field") {
			propertyKey = "init " + String(propertyKey);
			hookName = "init " + String(hookName);
			value = _identity;
		} else if (context.kind === "getter") {
			propertyKey = "get " + String(propertyKey);
			hookName = "get " + String(hookName);
		} else if (context.kind === "setter") {
			propertyKey = "set " + String(propertyKey);
			hookName = "set " + String(hookName);
		}
		return _createHookInvoker(propertyKey, hookName, value, dynamicKey);
	};
}
const middlewares = /* @__PURE__ */ new WeakMap();
function attach(arg1, arg2, arg3) {
	let key;
	let name = DEFAULT_HOOK_NAME;
	let fn;
	const maybeHook = arg1[HOOK];
	if (maybeHook) {
		key = maybeHook.keyOrKeys;
		name = maybeHook.name;
	} else key = arg1;
	if (arg3) {
		name = arg2;
		fn = arg3;
	} else if (typeof arg2 === "function") fn = arg2;
	else throw new Error(`${PREFIX}[attach] Invalid arguments`);
	if (key instanceof HookKeyDynamic) throw new Error(`${PREFIX}[attach] Cannot attach middleware to dynamic hook key. Use static hook key or composite keys instead.`);
	if (Array.isArray(key)) {
		if (key.length === 0) return noop;
		key = key[0];
	}
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
	const methods = middlewares.get(maybeHook.keyOrKeys);
	const middlewareNames = Object.keys(methods || {});
	const middlewareCount = middlewareNames.reduce((count, methodName) => {
		return count + (methods?.[methodName]?.length || 0);
	}, 0);
	return {
		key: maybeHook.keyOrKeys,
		name: maybeHook.name,
		middlewareCount,
		middlewareNames
	};
}
function getMiddleware(key, name) {
	const methods = middlewares.get(key);
	if (!methods) return [];
	const method = methods[name];
	if (!method) return [];
	return [...method];
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
export { ArgumentsProvider, DEFAULT_HOOK_NAME, HOOK, Hook, HookKeyDynamic, _createAccessorDecorator, _createHookInvoker, _identity, _resolveHookDecoratorOptions, args, argsProvider, attach, detach, dhk, dynamicHookKey, getCurrentHookKeyContext, getMiddleware, hook, hookDecorator, inspectHook, middlewares, noop };
//# sourceMappingURL=hook.js.map