import { hookAccessor, hookClass, hookField, hookGetter, hookMethod, hookSetter } from "./utilities.js";

//#region src/builder.ts
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

//#endregion
export { HookDecoratorBuilder, Hooks };
//# sourceMappingURL=builder.js.map