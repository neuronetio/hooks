import { hook } from "./hook.js";
import "./index.js";

//#region src/builder.ts
var HookDecoratorBuilder = class {
	HookedClass;
	constructor(Class) {
		this.HookedClass = hook.class(Class);
	}
	run(fn) {
		fn(this.HookedClass);
		return this;
	}
	accessor(propertyKey, arg1, arg2) {
		this.HookedClass = hook.accessor(this.HookedClass, propertyKey, arg1, arg2);
		return this;
	}
	field(propertyKey, arg1, arg2) {
		this.HookedClass = hook.field(this.HookedClass, propertyKey, arg1, arg2);
		return this;
	}
	getter(propertyKey, arg1, arg2) {
		this.HookedClass = hook.getter(this.HookedClass, propertyKey, arg1, arg2);
		return this;
	}
	method(propertyKey, arg1, arg2) {
		this.HookedClass = hook.method(this.HookedClass, propertyKey, arg1, arg2);
		return this;
	}
	setter(propertyKey, arg1, arg2) {
		this.HookedClass = hook.setter(this.HookedClass, propertyKey, arg1, arg2);
		return this;
	}
	get() {
		return this.HookedClass;
	}
	for(hookExpression, alternativeNameOrDynamicKey1, alternativeNameOrDynamicKey2) {
		hook.class(this.HookedClass, hookExpression, alternativeNameOrDynamicKey1, alternativeNameOrDynamicKey2);
		return this;
	}
};
function Hooks(Class) {
	return new HookDecoratorBuilder(Class);
}
hook.builder = Hooks;

//#endregion
export { HookDecoratorBuilder, Hooks };
//# sourceMappingURL=builder.js.map