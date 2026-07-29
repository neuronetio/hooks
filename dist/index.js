//#region src/index.ts
const PREFIX = `[@neuronet/hooks]`;
const DEFAULT_HOOK_NAME = Symbol("DEFAULT_HOOK_NAME");
/**
* Hook property key used to store hook metadata on functions and classes.
*/
const HOOK = Symbol("HOOK");
const noop = (..._args) => {};
var HookKeyComposite = class HookKeyComposite {
	keys;
	constructor(keys = []) {
		this.keys = keys;
	}
	flat(keys = this.keys) {
		const result = [];
		for (const key of keys) if (key instanceof HookKeyComposite) result.push(...key.flat(key.keys));
		else result.push(key);
		return result;
	}
	*[Symbol.iterator]() {
		for (const key of this.keys) if (key instanceof HookKeyComposite) yield* key;
		else yield key;
	}
};
function composeHookKeys(...keys) {
	return new HookKeyComposite(keys);
}
var HookKeyDynamic = class {
	fn;
	constructor(fn) {
		this.fn = fn;
	}
};
function dynamicHookKey(fn) {
	return new HookKeyDynamic(fn);
}
let currentHookKey = null;
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
function hookDecorator(dynamicKey, alternativeName) {
	if (typeof dynamicKey === "string") {
		const _str = dynamicKey;
		dynamicKey = alternativeName;
		alternativeName = _str;
	}
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
				init: function runHook(...args) {
					if (!this[initHookKey]) this[initHookKey] = hook(dynamicKey ?? composeHookKeys(this, this.constructor), "init " + String(hookName), (initialValue) => initialValue);
					return this[initHookKey](...args);
				}
			};
		}
		if (context.kind === "field") {
			propertyKey = "init " + String(propertyKey);
			hookName = "init " + String(hookName);
			value = (initialValue) => initialValue;
		} else if (context.kind === "getter") {
			propertyKey = "get " + String(propertyKey);
			hookName = "get " + String(hookName);
		} else if (context.kind === "setter") {
			propertyKey = "set " + String(propertyKey);
			hookName = "set " + String(hookName);
		}
		const hookKey = Symbol(`[hook][${String(propertyKey)}]`);
		return function runHook(...args) {
			if (!this[hookKey]) this[hookKey] = hook(dynamicKey ?? composeHookKeys(this, this.constructor), hookName, value.bind(this));
			return this[hookKey](...args);
		};
	};
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
export { DEFAULT_HOOK_NAME, HOOK, Hook, attach, composeHookKeys, detach, dynamicHookKey, getCurrentHookKeyContext, hook, hookDecorator, inspectHook, middlewares };
//# sourceMappingURL=index.js.map