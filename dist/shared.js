//#region src/shared.ts
const PREFIX = `[@neuronet/hooks]`;
const HOOK_CLASS_STATE = Symbol(`${PREFIX}[class_state]`);
const DEFAULT_HOOK_NAME = Symbol("[default_hook_name]");
/**
* Hook property key used to store hook metadata on functions and classes.
*/
const HOOK_DATA = Symbol(`${PREFIX}[hook_data]`);
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

//#endregion
export { ArgumentsProvider, DEFAULT_HOOK_NAME, HOOK_CLASS_STATE, HOOK_DATA, HookKeyDynamic, PREFIX, _identity, args, argsProvider, dhk, dynamicHookKey, noop };
//# sourceMappingURL=shared.js.map