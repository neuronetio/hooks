import { ArgumentsProvider, DEFAULT_HOOK_NAME, HOOK_DATA, HookKeyDynamic, PREFIX, _identity, noop } from "./shared.js";

//#region src/hook.ts
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
function hookBase(arg1, arg2, arg3, arg4) {
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
	runHook[HOOK_DATA] = _hookData;
	return runHook;
}
const hook = hookBase;
/**
* Used to inherit middlewares from the base class.
* It traverses down the prototype chain and collects all constructors.
*
* @param classOrInstance The class or instance whose prototype chain should be inspected.
* @returns All constructors found on the class or instance's prototype chain, excluding native `Object`.
*/
function inherit(classOrInstance) {
	const constructors = [];
	if (!(typeof classOrInstance === "function" && classOrInstance.prototype !== void 0)) constructors.push(classOrInstance);
	let Class = classOrInstance.prototype?.constructor ?? Object.getPrototypeOf(classOrInstance)?.constructor;
	while (Class && Class.prototype !== void 0) {
		constructors.push(Class);
		Class = Object.getPrototypeOf(Class);
	}
	return constructors;
}
hook.inherit = inherit;
/**
* A class decorator that enables hook support for the class.
* It initializes metadata required for `@hook()` decorated members to work correctly,
* ensuring that middleware can be attached to both the class and its instances.
*/
function Hook() {
	return function HookClass(_Class, context) {
		context.addInitializer(function() {
			const hooks = context.metadata.hooks || [];
			for (const propertyKey of hooks) {
				const hooked = this.prototype[propertyKey];
				if (hooked && hooked[HOOK_DATA] === void 0) hooked[HOOK_DATA] = {
					origin: hooked,
					keyOrKeys: this,
					name: propertyKey
				};
			}
		});
	};
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
* @param bindTo Optional value to bind the original member to instead of `this`.
*               Because for class proxy, static methods `this` are pointing to the proxy (not the class).
*               And if we are trying to access #private property from within a proxy context there will be an error.
*               And of course we want the proxy to behave like a real transparent thing.
* @param inheritFrom Optional value to inherit from instead of `this`.
* @returns A function that lazily creates and reuses the wrapped hook for one receiver.
*
* @internal
*/
function _createHookInvoker(propertyKey, hookName, value, dynamicKey, bindTo, inheritFrom) {
	const hookKey = Symbol(`${PREFIX}[hook][${String(propertyKey)}]`);
	return function runHook(...args) {
		if (!this[hookKey]) this[hookKey] = hook(dynamicKey ?? inherit(inheritFrom ?? this), hookName, value.bind(bindTo ?? this));
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
function _createAccessorDecorator(isStatic, propertyKey, hookName, get, set, dynamicKey, owner) {
	const getHookKey = Symbol(`${PREFIX}[get ${String(propertyKey)}]`);
	const setHookKey = Symbol(`${PREFIX}[set ${String(propertyKey)}]`);
	const initHookKey = Symbol(`${PREFIX}[init ${String(propertyKey)}]`);
	const prefix = isStatic ? "static " : "";
	return {
		get: function runHook(...args) {
			if (!this[getHookKey]) {
				const receiver = owner ?? this;
				this[getHookKey] = hook(dynamicKey ?? inherit(receiver), prefix + "get " + String(hookName), get.bind(receiver));
			}
			return this[getHookKey](...args);
		},
		set: function runHook(...args) {
			if (!this[setHookKey]) {
				const receiver = owner ?? this;
				this[setHookKey] = hook(dynamicKey ?? inherit(receiver), prefix + "set " + String(hookName), set.bind(receiver));
			}
			return this[setHookKey](...args);
		},
		init: function runHook(initialValue) {
			if (!this[initHookKey]) {
				const receiver = owner ?? this;
				this[initHookKey] = hook(dynamicKey ?? inherit(receiver), prefix + "init " + String(hookName), _identity);
			}
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
				if (context.static) this[propertyKey] = hook(dynamicKey ?? inherit(this), "static " + String(hookName), value.bind(this));
				else this[propertyKey] = hook(dynamicKey ?? inherit(this), hookName, value.bind(this));
			});
			return value;
		}
		if (context.kind === "accessor") {
			const { get, set } = value;
			return _createAccessorDecorator(context.static, propertyKey, hookName, get, set, dynamicKey);
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
		if (context.static) {
			propertyKey = "static " + String(propertyKey);
			hookName = "static " + String(hookName);
		}
		return _createHookInvoker(propertyKey, hookName, value, dynamicKey);
	};
}
const middleware = /* @__PURE__ */ new WeakMap();
/**
* Attaches a middleware to a named hook on a key.
*
* A middleware wraps the hook's original function. It receives `next` (the next function in
* the chain) plus the call args, and can modify args, short-circuit, or alter the result.
* Middleware run in the order they were added.
*
* @param keyOrKeys The hook key (symbol, object, or function) or keys (array of hook keys) to attach to.
* @param name The hook name.
* @param fn The middleware to attach.
* @returns A function that detaches the middleware.
*/
/**
* Attaches a middleware to a hook function or hook key.
*
* A middleware wraps the hook's original function. It receives `next` (the next function in
* the chain) plus the call args, and can modify args, short-circuit, or alter the result.
* Middleware run in the order they were added.
*
* Supported forms:
* - `attach(hookFn, fn)` — attach to a hook function.
* - `attach(key, fn)` — attach to a hook key.
* - `attach(key, name, fn)` — attach to a named hook on a key.
* - `attach(hookFn, name, fn)` — attach to a named hook on a hook function.
*
* @param arg1 The hook function or hook key.
* @param arg2 The hook name or middleware.
* @param arg3 Optional middleware (when a hook name is given).
* @returns A function that detaches the middleware.
*/
function attach(arg1, arg2, arg3) {
	let key;
	let name = DEFAULT_HOOK_NAME;
	let fn;
	if (typeof arg1 !== "function" && typeof arg1 !== "object" && typeof arg1 !== "symbol" && !Array.isArray(arg1)) return noop;
	if (arg1 === null) return noop;
	const maybeHook = arg1[HOOK_DATA];
	if (maybeHook) {
		key = maybeHook.keyOrKeys;
		name = maybeHook.name;
	} else key = arg1;
	if (arg3) {
		name = arg2;
		fn = arg3;
	} else if (typeof arg2 === "function") fn = arg2;
	else throw new Error(`${PREFIX}[attach] Invalid arguments.`);
	if (Array.isArray(key)) {
		if (key.length === 0) return noop;
		key = key[0];
	}
	if (key instanceof HookKeyDynamic) throw new Error(`${PREFIX}[attach] Cannot attach middleware to dynamic hook key. Use static hook key or composite keys instead.`);
	if (key === null) return noop;
	if (typeof name === "string" && name.startsWith("!")) name = name.substring(1);
	let methods = middleware.get(key);
	if (!methods) {
		methods = Object.create(null);
		middleware.set(key, methods);
	}
	let method = methods[name];
	if (!method) {
		method = [];
		methods[name] = method;
	}
	method.push(fn);
	return () => detach(key, name, fn);
}
hook.attach = attach;
/**
* Inspects a hook function and returns its metadata and middleware statistics.
*
* @param hookFn The hook function to inspect.
* @returns Metadata about the hook, including its key, name, and middleware count.
* @throws Error if the provided function is not a valid hook function.
*/
function inspectHook(hookFn) {
	const maybeHook = hookFn[HOOK_DATA];
	if (!maybeHook) throw new Error(`${PREFIX}[inspectHook] Hook function metadata not found.`);
	const methods = middleware.get(maybeHook.keyOrKeys);
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
	const methods = middleware.get(key);
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
	const methods = middleware.get(key);
	if (!methods) return;
	const method = methods[name];
	if (!method) return;
	const index = method.indexOf(fn);
	if (index !== -1) {
		method.splice(index, 1);
		if (method.length === 0) {
			delete methods[name];
			if (Object.keys(methods).length === 0) middleware.delete(key);
		}
	}
}
let middlewareEnabled = true;
/**
* Temporarily disables middleware execution for the duration of the provided function.
*
* This is useful when you want to run `super.someMethod` without triggering any attached middleware again, or want to see the original result.
*
* @param fn The function to execute without middleware.
* @returns The result of the executed function.
*/
function bypassMiddleware(fn) {
	const oldMiddlewareEnabled = middlewareEnabled;
	middlewareEnabled = false;
	try {
		return fn();
	} finally {
		middlewareEnabled = oldMiddlewareEnabled;
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
	if (!middlewareEnabled || key === null) return next?.apply(thisArg, args);
	const actualNext = next || noop;
	const oldHookKey = currentHookKey;
	const methods = middleware.get(key);
	if (!methods) return actualNext.apply(thisArg, args);
	const method = methods[name];
	if (!method) return actualNext.apply(thisArg, args);
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
export { Hook, _createAccessorDecorator, _createHookInvoker, _resolveHookDecoratorOptions, attach, bypassMiddleware, detach, getCurrentHookKeyContext, getMiddleware, hook, hookDecorator, inherit, inspectHook, middleware };
//# sourceMappingURL=hook.js.map