import { HOOK_CLASS_STATE, PREFIX, _identity, dhk } from "./shared.js";
import { _createAccessorDecorator, _createHookInvoker, _resolveHookDecoratorOptions, hook, inherit } from "./hook.js";
import "./index.js";

//#region src/class-utilities.ts
const SUB_PREFIX = "[class-utilities]";
/**
* Returns the cached utilities hook runtime state for a class, creating it when needed.
*
* The state stores a wrapped constructor and the list of instance initializers that should
* run after each new instance is created. This is the foundation of the utilities decoration API.
*
* @param Class The class being prepared for utilities decoration.
* @returns The shared runtime state for that class.
*/
function classUtilitiesState(Class) {
	if (Object.hasOwn(Class, HOOK_CLASS_STATE)) return Class[HOOK_CLASS_STATE];
	const state = { instanceInitializers: [] };
	Class[HOOK_CLASS_STATE] = state;
	return state;
}
/**
* Parses an optional leading `"static "` prefix from a property key.
*
* When a hook utility receives a string key like `"static myMethod"`, the `static`
* prefix forces the utility to operate on the static member named `"myMethod"`.
* Keys that do not start with the prefix (including symbol keys) are returned untouched.
*
* @param propertyKey The raw property key passed to a hook utility.
* @returns The parsed static flag together with the stripped member key.
*/
function parseStaticPrefix(propertyKey) {
	if (typeof propertyKey === "string" && propertyKey.startsWith("static ")) return {
		static: true,
		key: propertyKey.slice(7)
	};
	return {
		static: false,
		key: propertyKey
	};
}
/**
* Resolves a member descriptor while honouring an optional `"static "` prefix.
*
* When the prefix is present, the member is looked up only on the class (static
* members) and the result is forced to be treated as static. Otherwise the regular
* static-then-prototype resolution is used.
*
* @param Class The class being inspected.
* @param propertyKey The member name, optionally prefixed with `"static "`.
* @param validate A predicate that confirms the descriptor matches the expected member kind.
* @param apiName The public API name used in the error message.
* @returns The matching descriptor together with its target, static flag, and stripped key.
*/
function resolveMemberDescriptorWithStatic(Class, propertyKey, validate, apiName) {
	const { static: forceStatic, key } = parseStaticPrefix(propertyKey);
	if (forceStatic) {
		const descriptor = Object.getOwnPropertyDescriptor(Class, key);
		if (!validate(descriptor)) throw new Error(`${PREFIX}${SUB_PREFIX}[${apiName}] Could not find a compatible member named "${String(key)}" on the class or its prototype.`);
		return {
			descriptor,
			isStatic: true,
			target: Class,
			key
		};
	}
	const instanceDescriptor = Object.getOwnPropertyDescriptor(Class.prototype, propertyKey);
	if (validate(instanceDescriptor)) return {
		descriptor: instanceDescriptor,
		isStatic: false,
		target: Class.prototype,
		key
	};
	throw new Error(`${PREFIX}${SUB_PREFIX}[${apiName}] Could not find a compatible member named "${String(key)}" on the class or its prototype.`);
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
function hookInit(instance, ...args) {
	const state = instance.constructor[HOOK_CLASS_STATE];
	const ctrHook = hook(inherit(instance), "constructor", function(..._args) {
		return this;
	});
	if (!state) return ctrHook.apply(instance, args);
	for (const initialize of state.instanceInitializers) initialize(instance);
	return ctrHook.apply(instance, args);
}
hook.init = hookInit;
function hookMethod(Class, propertyKey, arg1, arg2) {
	classUtilitiesState(Class);
	const { descriptor, isStatic, key } = resolveMemberDescriptorWithStatic(Class, propertyKey, (candidate) => typeof candidate?.value === "function", "method");
	const { dynamicKey, alternativeName } = _resolveHookDecoratorOptions(arg1, arg2);
	const hookName = alternativeName ?? key;
	if (isStatic) {
		Class[key] = hook(dynamicKey ?? inherit(Class), "static method " + String(hookName), descriptor.value.bind(Class));
		return Class;
	}
	function defaultKey() {
		return inherit(this);
	}
	Class.prototype[key] = hook(dynamicKey ?? dhk(defaultKey), "method " + String(hookName), descriptor.value);
	return Class;
}
hook.method = hookMethod;
function hookGetter(Class, propertyKey, arg1, arg2) {
	classUtilitiesState(Class);
	const { descriptor, target, isStatic, key } = resolveMemberDescriptorWithStatic(Class, propertyKey, (candidate) => typeof candidate?.get === "function", "getter");
	const { dynamicKey, alternativeName } = _resolveHookDecoratorOptions(arg1, arg2);
	const hookName = alternativeName ?? key;
	const prefix = isStatic ? "static get " : "get ";
	Object.defineProperty(target, key, {
		...descriptor,
		get: _createHookInvoker(prefix + String(key), prefix + String(hookName), descriptor.get, dynamicKey, isStatic ? Class : void 0)
	});
	return Class;
}
hook.getter = hookGetter;
function hookSetter(Class, propertyKey, arg1, arg2) {
	classUtilitiesState(Class);
	const { descriptor, target, isStatic, key } = resolveMemberDescriptorWithStatic(Class, propertyKey, (candidate) => typeof candidate?.set === "function", "setter");
	const { dynamicKey, alternativeName } = _resolveHookDecoratorOptions(arg1, arg2);
	const hookName = alternativeName ?? key;
	const prefix = isStatic ? "static set " : "set ";
	Object.defineProperty(target, key, {
		...descriptor,
		set: _createHookInvoker(prefix + String(key), prefix + String(hookName), descriptor.set, dynamicKey, isStatic ? Class : void 0)
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
function isStaticField(Class, propertyKey) {
	const { static: asStatic, key } = parseStaticPrefix(propertyKey);
	if (asStatic) {
		const staticDescriptor = Object.getOwnPropertyDescriptor(Class, key);
		if (staticDescriptor) {
			if (typeof staticDescriptor.value === "function" || typeof staticDescriptor.get === "function" || typeof staticDescriptor.set === "function") throw new Error(`${PREFIX}${SUB_PREFIX}[field] Member "${String(key)}" is not a field.`);
			return {
				isStatic: true,
				key
			};
		} else throw new Error(`${PREFIX}${SUB_PREFIX}[field] Member "${String(key)}" is not static.`);
	}
	const instanceDescriptor = Object.getOwnPropertyDescriptor(Class.prototype, key);
	if (instanceDescriptor) {
		if (typeof instanceDescriptor.value === "function" || typeof instanceDescriptor.get === "function" || typeof instanceDescriptor.set === "function") throw new Error(`${PREFIX}${SUB_PREFIX}[field] Member "${String(key)}" is not a field.`);
	}
	return {
		isStatic: asStatic,
		key
	};
}
function hookField(Class, propertyKey, arg1, arg2) {
	const { isStatic, key } = isStaticField(Class, propertyKey);
	const { dynamicKey, alternativeName } = _resolveHookDecoratorOptions(arg1, arg2);
	const hookName = alternativeName ?? key;
	const prefix = isStatic ? "static init " : "init ";
	const runInitializer = _createHookInvoker(prefix + String(key), prefix + String(hookName), _identity, dynamicKey);
	if (isStatic) {
		Class[key] = runInitializer.call(Class, Class[key]);
		return Class;
	}
	classUtilitiesState(Class).instanceInitializers.push((instance) => {
		instance[key] = runInitializer.call(instance, instance[key]);
	});
	return Class;
}
hook.field = hookField;
function hookAccessor(Class, propertyKey, arg1, arg2) {
	const state = classUtilitiesState(Class);
	const { static: isStatic, key } = parseStaticPrefix(propertyKey);
	const { dynamicKey, alternativeName } = _resolveHookDecoratorOptions(arg1, arg2);
	const hookName = alternativeName ?? key;
	const staticDescriptor = Object.getOwnPropertyDescriptor(Class, key);
	if (isStatic && typeof staticDescriptor?.get === "function" && typeof staticDescriptor?.set === "function") {
		const originalGet = staticDescriptor.get;
		const originalSet = staticDescriptor.set;
		const decoratedAccessor = _createAccessorDecorator(isStatic, key, "static " + String(key), originalGet, originalSet, dynamicKey, Class);
		const initializedKey = Symbol(`${PREFIX}[initialized ${String(key)}]`);
		function ensureInitialized() {
			if (this[initializedKey]) return;
			const initialValue = originalGet.call(Class);
			const nextValue = decoratedAccessor.init.call(this, initialValue);
			originalSet.call(Class, nextValue);
			this[initializedKey] = true;
		}
		Object.defineProperty(Class, key, {
			...staticDescriptor,
			get: function getHookedAccessor(...args) {
				ensureInitialized.call(Class);
				return decoratedAccessor.get.apply(this, args);
			},
			set: function setHookedAccessor(...args) {
				ensureInitialized.call(Class);
				return decoratedAccessor.set.apply(this, args);
			}
		});
		ensureInitialized.call(Class);
		return Class;
	}
	const instanceDescriptor = Object.getOwnPropertyDescriptor(Class.prototype, key);
	if (!isStatic && typeof instanceDescriptor?.get === "function" && typeof instanceDescriptor?.set === "function") {
		const originalGet = instanceDescriptor.get;
		const originalSet = instanceDescriptor.set;
		const decoratedAccessor = _createAccessorDecorator(isStatic, key, hookName, originalGet, originalSet, dynamicKey);
		const initializedKey = Symbol(`${PREFIX}[initialized ${String(key)}]`);
		function ensureInitialized() {
			if (this[initializedKey]) return;
			const initialValue = originalGet.call(this);
			const nextValue = decoratedAccessor.init.call(this, initialValue);
			originalSet.call(this, nextValue);
			this[initializedKey] = true;
		}
		Object.defineProperty(Class.prototype, key, {
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
		return Class;
	}
	if (isStatic && staticDescriptor === void 0 || isStatic && staticDescriptor && (typeof staticDescriptor.get === "function" || typeof staticDescriptor.set === "function") || !isStatic && instanceDescriptor && (typeof instanceDescriptor.get === "function" || typeof instanceDescriptor.set === "function")) throw new Error(`${PREFIX}${SUB_PREFIX}[accessor] Could not find a compatible member named "${String(key)}" on the class or its prototype.`);
	const descriptor = staticDescriptor ?? instanceDescriptor;
	const valueKey = Symbol(`${PREFIX}[accessor-value ${String(key)}]`);
	function originalGet() {
		return this[valueKey];
	}
	function originalSet(value) {
		this[valueKey] = value;
	}
	const decoratedAccessor = _createAccessorDecorator(isStatic, key, hookName, originalGet, originalSet, dynamicKey);
	const target = isStatic ? Class : Class.prototype;
	Object.defineProperty(target, key, {
		configurable: descriptor?.configurable ?? true,
		enumerable: descriptor?.enumerable ?? true,
		get: function getHookedFieldAccessor(...args) {
			return decoratedAccessor.get.apply(this, args);
		},
		set: function setHookedFieldAccessor(...args) {
			return decoratedAccessor.set.apply(this, args);
		}
	});
	if (isStatic) {
		const nextValue = decoratedAccessor.init.call(Class, staticDescriptor?.value);
		originalSet.call(Class, nextValue);
		return Class;
	}
	state.instanceInitializers.push((instance) => {
		const initialValue = instance[key];
		delete instance[key];
		const nextValue = decoratedAccessor.init.call(instance, initialValue);
		originalSet.call(instance, nextValue);
	});
	return Class;
}
hook.accessor = hookAccessor;
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
function hookClass(Class, expression, alternativeNameOrDynamicKey1, alternativeNameOrDynamicKey2) {
	if (typeof expression !== "string") {
		classUtilitiesState(Class);
		return Class;
	}
	if (expression.startsWith("!")) expression = expression.slice(1);
	const parts = expression.split(" ");
	let isStatic = false;
	let type = "init";
	let name = "";
	switch (parts.length) {
		case 2: {
			const parts0 = parts[0];
			if (parts0 === "method" || parts0 === "init" || parts0 === "get" || parts0 === "set" || parts0 === "accessor") {
				isStatic = false;
				type = parts0;
				name = parts[1];
			} else throw new Error(`${PREFIX}${SUB_PREFIX}[hookClass] Invalid expression: "${expression}".`);
			break;
		}
		case 3: {
			if (parts[0] !== "static") throw new Error(`${PREFIX}${SUB_PREFIX}[hookClass] Invalid expression: "${expression}".`);
			isStatic = true;
			const parts1 = parts[1];
			if (parts1 === "method" || parts1 === "init" || parts1 === "get" || parts1 === "set" || parts1 === "accessor") {
				type = parts1;
				name = parts[2];
			} else throw new Error(`${PREFIX}${SUB_PREFIX}[hookClass] Invalid expression: "${expression}".`);
			break;
		}
		default: throw new Error(`${PREFIX}${SUB_PREFIX}[hookClass] Invalid expression: "${expression}".`);
	}
	switch (type) {
		case "init": return hookField(Class, (isStatic ? "static " : "") + String(name), alternativeNameOrDynamicKey1, alternativeNameOrDynamicKey2);
		case "get": return hookGetter(Class, (isStatic ? "static " : "") + String(name), alternativeNameOrDynamicKey1, alternativeNameOrDynamicKey2);
		case "set": return hookSetter(Class, (isStatic ? "static " : "") + String(name), alternativeNameOrDynamicKey1, alternativeNameOrDynamicKey2);
		case "accessor": return hookAccessor(Class, (isStatic ? "static " : "") + String(name), alternativeNameOrDynamicKey1, alternativeNameOrDynamicKey2);
		case "method": return hookMethod(Class, (isStatic ? "static " : "") + String(name), alternativeNameOrDynamicKey1, alternativeNameOrDynamicKey2);
	}
	/* v8 ignore next 1 */
	return Class;
}
hook.class = hookClass;

//#endregion
export { hookAccessor, hookClass, hookField, hookGetter, hookInit, hookMethod, hookSetter };
//# sourceMappingURL=class-utilities.js.map