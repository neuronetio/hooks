import { describe, it, expect } from "vitest";

import { HOOK, hook, attach, Hook, composeHookKeys, dynamicHookKey, getCurrentHookKeyContext } from "../src";

describe("hooks: decorators", () => {
  it("should work with private methods", () => {
    @Hook
    class PrivateMethodsClass {
      constructor() {
        this.#init("x");
        PrivateMethodsClass.#initStatic("x");
      }

      @hook()
      #init(x: string) {
        hook("subInit", null)(x);
        return x + ":init";
      }

      @hook()
      static #initStatic(x: string) {
        hook("subInitStatic", null)(x);
        return x + ":initStatic";
      }

      callInit(x: string) {
        return this.#init(x);
      }
      callInitStatic(x: string) {
        return PrivateMethodsClass.#initStatic(x);
      }
    }

    const init: string[] = [];
    const detach1 = attach(PrivateMethodsClass, "#init", (next, x) => {
      init.push(x);
      return next(x + ":mid1");
    });

    const subInit: string[] = [];
    const detachSub1 = attach(PrivateMethodsClass, "subInit", (next, x) => {
      subInit.push(x);
      return next(x + ":sub");
    });

    const initStatic: string[] = [];
    const detach2 = attach(PrivateMethodsClass, "#initStatic", (next, x) => {
      initStatic.push(x);
      return next(x + ":mid1");
    });

    const subInitStatic: string[] = [];
    const detachSub2 = attach(PrivateMethodsClass, "subInitStatic", (next, x) => {
      subInitStatic.push(x);
      return next(x + ":subStatic");
    });

    const instance = new PrivateMethodsClass();
    expect(init).toEqual(["x"]);
    expect(subInit).toEqual(["x:mid1"]);
    expect(initStatic).toEqual(["x"]);
    expect(subInitStatic).toEqual(["x:mid1"]);

    expect(instance.callInit("y")).toBe("y:mid1:init");
    expect(init).toEqual(["x", "y"]);
    expect(subInit).toEqual(["x:mid1", "y:mid1"]);
    expect(instance.callInitStatic("y")).toBe("y:mid1:initStatic");
    expect(initStatic).toEqual(["x", "y"]);
    expect(subInitStatic).toEqual(["x:mid1", "y:mid1"]);

    detach1();
    detachSub1();
    expect(instance.callInit("z")).toBe("z:init");
    expect(init).toEqual(["x", "y"]);
    expect(subInit).toEqual(["x:mid1", "y:mid1"]);

    detach2();
    detachSub2();
    expect(instance.callInitStatic("z")).toBe("z:initStatic");
    expect(initStatic).toEqual(["x", "y"]);
    expect(subInitStatic).toEqual(["x:mid1", "y:mid1"]);
  });

  it("should work with static methods", () => {
    @Hook
    class StaticMethodsClass {
      @hook()
      static testStatic(x: string) {
        hook("subTestStatic", null)(x);
        return x + ":testStatic";
      }
    }

    expect(StaticMethodsClass.testStatic("x")).toBe("x:testStatic");

    const subLogs: string[] = [];
    const detachSub = attach(StaticMethodsClass, "subTestStatic", (next, x) => {
      subLogs.push(x);
      return next(x + ":sub");
    });

    const detach1 = attach(StaticMethodsClass, "testStatic", (next, x) => {
      return next(x + ":mid1");
    });
    const detach2 = attach(StaticMethodsClass.testStatic, (next, x) => {
      return next(x + ":mid2");
    });
    expect(StaticMethodsClass.testStatic("x")).toBe("x:mid1:mid2:testStatic");
    expect(subLogs).toEqual(["x:mid1:mid2"]);

    detach1();
    expect(StaticMethodsClass.testStatic("x")).toBe("x:mid2:testStatic");
    expect(subLogs).toEqual(["x:mid1:mid2", "x:mid2"]);

    detach2();
    expect(StaticMethodsClass.testStatic("x")).toBe("x:testStatic");
    expect(subLogs).toEqual(["x:mid1:mid2", "x:mid2", "x"]);

    detachSub();
  });

  it("should work with accessors", () => {
    @Hook
    class AccessorsClass {
      #getterSetterValue: string = "myGetterSetterValue";

      @hook()
      get myGetterSetter() {
        hook("myGetterSetterSub", null)();
        return this.#getterSetterValue;
      }

      @hook()
      set myGetterSetter(value: string) {
        hook("myGetterSetterSub", null)();
        this.#getterSetterValue = value;
      }
    }

    const instance = new AccessorsClass();
    expect(instance.myGetterSetter).toBe("myGetterSetterValue");

    let subCalled = 0;
    const detachSub = attach(AccessorsClass, "myGetterSetterSub", (next) => {
      subCalled++;
      return next();
    });

    const detach1 = attach(instance, "get myGetterSetter", (next) => {
      return next("test") + ":getMid1";
    });
    expect(instance.myGetterSetter).toBe("myGetterSetterValue:getMid1");
    expect(subCalled).toBe(1);

    const detach2 = attach(AccessorsClass, "get myGetterSetter", (next) => {
      return next("test") + ":getMid2";
    });
    expect(instance.myGetterSetter).toBe("myGetterSetterValue:getMid2:getMid1");
    expect(subCalled).toBe(2);

    instance.myGetterSetter = "newValue";
    expect(instance.myGetterSetter).toBe("newValue:getMid2:getMid1");
    expect(subCalled).toBe(4); // one for set, one for get in expect

    const detach3 = attach(instance, "set myGetterSetter", (next, value) => {
      return next(value + ":setMid1");
    });
    instance.myGetterSetter = "anotherValue";
    expect(instance.myGetterSetter).toBe("anotherValue:setMid1:getMid2:getMid1");
    expect(subCalled).toBe(6); // one for set, one for get in expect

    const detach4 = attach(AccessorsClass, "set myGetterSetter", (next, value) => {
      return next(value + ":setMid2");
    });
    instance.myGetterSetter = "finalValue";
    expect(instance.myGetterSetter).toBe("finalValue:setMid1:setMid2:getMid2:getMid1");
    expect(subCalled).toBe(8); // one for set, one for get in expect

    detach1();
    detach2();
    detach3();
    detach4();
    detachSub();
    instance.myGetterSetter = "resetValue";
    expect(instance.myGetterSetter).toBe("resetValue");
    expect(subCalled).toBe(8); // no more calls after detachSub (well, actually hook() still calls bottom, but my middleware is detached)
  });

  it("should work with fields", () => {
    @Hook
    class FieldsClass {
      @hook()
      myField = "myFieldValue";
    }

    const instance = new FieldsClass();
    expect(instance.myField).toBe("myFieldValue");

    const detach1 = attach(FieldsClass, "init myField", (next, value) => {
      return next(value + ":initMid1");
    });
    // it will not work because it is for already initialized instance
    const detach2 = attach(instance, "init myField", (next, value) => {
      return next(value + ":initMid2");
    });
    expect(instance.myField).toBe("myFieldValue");

    expect(new FieldsClass().myField).toBe("myFieldValue:initMid1");

    detach1();
    detach2();
    expect(new FieldsClass().myField).toBe("myFieldValue");
  });

  it("should work with methods and sub-hooks", () => {
    @Hook
    class MethodsClass {
      @hook()
      myMethod(x: string) {
        hook("myMethodSub", null)(x);
        return x + ":original";
      }
    }

    const instance = new MethodsClass();
    const classHookData = (MethodsClass.prototype.myMethod as any)[HOOK];
    expect(classHookData).toBeDefined();
    expect(classHookData.name).toBe("myMethod");
    expect(classHookData.key).toBe(MethodsClass);

    const instanceHookData = (instance.myMethod as any)[HOOK];
    expect(instanceHookData).toBeDefined();
    expect(instanceHookData.name).toBe("myMethod");
    expect(instanceHookData.key).toEqual(composeHookKeys(instance, MethodsClass));

    expect(instance.myMethod("a")).toBe("a:original");
    const logs: string[] = [];
    attach(instance.myMethod, (next, x) => {
      logs.push(`instance middleware #1 called with ${x}`);
      return next(x + ":mid1");
    });
    expect(instance.myMethod("a")).toBe("a:mid1:original");

    let subInstanceCalledWith: string[] = [];
    attach(instance.myMethod, "myMethodSub", (next, x) => {
      logs.push(`instance sub middleware #1 called with ${x}`);
      subInstanceCalledWith.push(x);
      return next(x + ":submid1");
    });
    instance.myMethod("b");
    expect(subInstanceCalledWith).toEqual(["b:mid1"]);

    attach(instance, "myMethod", (next, x) => {
      logs.push(`instance middleware #2 called with ${x}`);
      return next(x + ":mid2");
    });
    expect(instance.myMethod("c")).toBe("c:mid1:mid2:original");

    expect(subInstanceCalledWith).toEqual(["b:mid1", "c:mid1:mid2"]);

    subInstanceCalledWith = [];
    logs.length = 0;

    attach(MethodsClass.prototype.myMethod, (next, x) => {
      logs.push(`class byPrototype middleware called with ${x}`);
      return next(x + ":class1");
    });
    attach(MethodsClass, "myMethod", (next, x) => {
      logs.push(`class byMethodName called with ${x}`);
      return next(x + ":class2");
    });

    const subClassCalledWith: string[] = [];
    attach(MethodsClass, "myMethodSub", (next, x) => {
      logs.push(`class sub middleware #2 called with ${x}`);
      subClassCalledWith.push(x);
      return next(x + ":subClass1");
    });

    expect(instance.myMethod("d")).toBe("d:mid1:mid2:class1:class2:original");
    expect(subClassCalledWith).toEqual(["d:mid1:mid2:class1:class2:submid1"]);
    expect(subInstanceCalledWith).toEqual(["d:mid1:mid2:class1:class2"]);
  });

  it("should work with accessor decorators", () => {
    class AccessorClass {
      @hook() accessor myValue: string = "initial";
    }

    expect(new AccessorClass().myValue).toBe("initial");

    attach(AccessorClass, "init myValue", (next, value) => {
      return next(value + ":initMid1");
    });
    expect(new AccessorClass().myValue).toBe("initial:initMid1");

    attach(AccessorClass, "get myValue", (next) => {
      return next() + ":getMid1";
    });
    expect(new AccessorClass().myValue).toBe("initial:initMid1:getMid1");

    const instance1 = new AccessorClass();
    attach(instance1, "get myValue", (next) => {
      return next() + ":getMid2";
    });
    // getMid1:getMid2 because of `next() + "..."` which will first call `next()` with underneath middlewares and after that return ` + "..."` (with values from underneath middlewares)
    // and instance middlewares has higher priority than class middlewares in key composition
    expect(instance1.myValue).toBe("initial:initMid1:getMid1:getMid2");

    instance1.myValue = "newValue";
    expect(instance1.myValue).toBe("newValue:getMid1:getMid2");

    attach(instance1, "set myValue", (next, value) => {
      return next(value + ":setMid1");
    });
    instance1.myValue = "anotherValue";
    expect(instance1.myValue).toBe("anotherValue:setMid1:getMid1:getMid2");

    attach(AccessorClass, "set myValue", (next, value) => {
      return next(value + ":setMid2");
    });
    instance1.myValue = "finalValue";
    // setMid1:setMid2 because setMid1 is attached to the instance which has higher priority than the class in key composition
    expect(instance1.myValue).toBe("finalValue:setMid1:setMid2:getMid1:getMid2");
  });

  it("should work with dynamic hook keys from @hook decorator (method)", () => {
    const dynamicThis: any[] = [];
    @Hook
    class DynamicHookClass {
      @hook(
        dynamicHookKey(function (this: DynamicHookClass) {
          dynamicThis.push(this);
          return composeHookKeys(this, DynamicHookClass);
        }),
      )
      dynamicMethod(x: string) {
        hook("dynamicMethodSub", null)(x);
        return x + ":original";
      }
    }

    expect(dynamicThis).toEqual([]);

    const instance = new DynamicHookClass();

    expect(dynamicThis).toEqual([]);

    expect(instance.dynamicMethod("input")).toBe("input:original");

    expect(dynamicThis).toEqual([instance]);

    let subCalled = 0;
    attach(instance, "dynamicMethodSub", (next, x) => {
      subCalled++;
      return next(x);
    });

    attach(DynamicHookClass, "dynamicMethod", (next, x) => {
      return next(x + ":mid1");
    });

    attach(DynamicHookClass.prototype.dynamicMethod, (next, x) => {
      return next(x + ":mid2");
    });

    expect(() =>
      attach(instance.dynamicMethod, (next, x) => {
        return next(x + ":mid3");
      }),
    ).toThrow("dynamic");

    attach(instance, "dynamicMethod", (next, x) => {
      return next(x + ":mid3");
    });

    expect(dynamicThis).toEqual([instance]);

    expect(instance.dynamicMethod("input")).toBe("input:mid3:mid1:mid2:original");
    expect(subCalled).toBe(1);

    expect(dynamicThis).toEqual([instance, instance]);

    dynamicThis.length = 0; // reset

    class AnotherDynamicHookClass extends DynamicHookClass {}

    const anotherInstance = new AnotherDynamicHookClass();

    expect(dynamicThis).toEqual([]);

    expect(anotherInstance.dynamicMethod("input")).toBe("input:mid1:mid2:original"); // mid3 is for different instance

    attach(anotherInstance, "dynamicMethod", (next, x) => {
      return next(x + ":mid4");
    });

    expect(anotherInstance.dynamicMethod("input")).toBe("input:mid4:mid1:mid2:original");

    expect(dynamicThis).toEqual([anotherInstance, anotherInstance]);

    dynamicThis.length = 0; // reset

    expect(instance.dynamicMethod("input")).toBe("input:mid3:mid1:mid2:original"); // mid4 is for different instance

    expect(dynamicThis).toEqual([instance]);
  });

  it("should work with dynamic hook keys from @hook decorator (accessor)", () => {
    const dynamicThis: any[] = [];
    @Hook
    class DynamicHookClass {
      @hook(
        dynamicHookKey(function (this: DynamicHookClass) {
          dynamicThis.push(this);
          return composeHookKeys(this, DynamicHookClass);
        }),
      )
      accessor myValue: string = "initial";
    }

    attach(DynamicHookClass, "init myValue", (next, value) => {
      return next(value + ":initMid1");
    });

    expect(dynamicThis).toEqual([]);

    const instance = new DynamicHookClass();

    expect(dynamicThis).toEqual([instance]); // "init myValue"

    expect(instance.myValue).toBe("initial:initMid1");

    attach(DynamicHookClass, "get myValue", (next) => {
      return next() + ":getMid1";
    });

    expect(instance.myValue).toBe("initial:initMid1:getMid1");
    expect(instance.myValue).toBe("initial:initMid1:getMid1");

    attach(DynamicHookClass, "set myValue", (next, value) => {
      return next(value + ":setMid1");
    });

    instance.myValue = "newValue";
    expect(instance.myValue).toBe("newValue:setMid1:getMid1");

    attach(instance, "get myValue", (next) => {
      return next() + ":getMid2";
    });
    expect(instance.myValue).toBe("newValue:setMid1:getMid1:getMid2");

    dynamicThis.length = 0; // reset

    class AnotherDynamicHookClass extends DynamicHookClass {}

    const anotherInstance = new AnotherDynamicHookClass();

    expect(dynamicThis).toEqual([anotherInstance]); // "init myValue"
    expect(anotherInstance.myValue).toBe("initial:initMid1:getMid1");

    attach(anotherInstance, "get myValue", (next) => {
      return next() + ":getMid3";
    });
    expect(anotherInstance.myValue).toBe("initial:initMid1:getMid1:getMid3");

    expect(instance.myValue).toBe("newValue:setMid1:getMid1:getMid2"); // should not be affected

    attach(anotherInstance, "set myValue", (next, value) => {
      return next(value + ":setMid2");
    });
    anotherInstance.myValue = "another";
    expect(anotherInstance.myValue).toBe("another:setMid2:setMid1:getMid1:getMid3");
    expect(instance.myValue).toBe("newValue:setMid1:getMid1:getMid2"); // should not be affected

    instance.myValue = "final";
    expect(instance.myValue).toBe("final:setMid1:getMid1:getMid2");
    expect(anotherInstance.myValue).toBe("another:setMid2:setMid1:getMid1:getMid3");
  });

  it("should work with dynamic hook keys from @hook decorator (separate getter and setter)", () => {
    const dynamicThis: any[] = [];
    @Hook
    class DynamicHookClass {
      #value: string = "initial";

      @hook(
        dynamicHookKey(function (this: DynamicHookClass) {
          dynamicThis.push(this);
          return composeHookKeys(this, DynamicHookClass);
        }),
      )
      get myValue(): string {
        hook("myValueGetSub", null)();
        return this.#value;
      }

      @hook(
        dynamicHookKey(function (this: DynamicHookClass) {
          dynamicThis.push(this);
          return composeHookKeys(this, DynamicHookClass);
        }),
      )
      set myValue(value: string) {
        hook("myValueSetSub", null)();
        this.#value = value;
      }
    }

    const instance = new DynamicHookClass();
    expect(dynamicThis).toEqual([]);

    let getSubCalled = 0;
    attach(instance, "myValueGetSub", (next) => {
      getSubCalled++;
      return next();
    });

    let setSubCalled = 0;
    attach(instance, "myValueSetSub", (next) => {
      setSubCalled++;
      return next();
    });

    attach(DynamicHookClass, "get myValue", (next) => {
      return next() + ":getMidClass1";
    });

    attach(instance, "get myValue", (next) => {
      return next() + ":getMidInstance1";
    });

    expect(instance.myValue).toBe("initial:getMidClass1:getMidInstance1");
    expect(getSubCalled).toBe(1);
    expect(dynamicThis).toEqual([instance]);

    attach(DynamicHookClass, "set myValue", (next, value) => {
      return next(value + ":setMidClass1");
    });

    attach(instance, "set myValue", (next, value) => {
      return next(value + ":setMidInstance1");
    });

    instance.myValue = "newValue";
    expect(instance.myValue).toBe("newValue:setMidInstance1:setMidClass1:getMidClass1:getMidInstance1");
    expect(setSubCalled).toBe(1);
    expect(getSubCalled).toBe(2);
    expect(dynamicThis).toEqual([instance, instance, instance]); // 1 for get, 1 for set, 1 for get in expect

    dynamicThis.length = 0; // reset

    class AnotherDynamicHookClass extends DynamicHookClass {}

    const anotherInstance = new AnotherDynamicHookClass();
    expect(dynamicThis).toEqual([]);

    attach(anotherInstance, "get myValue", (next) => {
      return next() + ":getMidInstance2";
    });

    attach(anotherInstance, "set myValue", (next, value) => {
      return next(value + ":setMidInstance2");
    });

    expect(anotherInstance.myValue).toBe("initial:getMidClass1:getMidInstance2");
    anotherInstance.myValue = "anotherValue";
    expect(anotherInstance.myValue).toBe("anotherValue:setMidInstance2:setMidClass1:getMidClass1:getMidInstance2");

    // should not affect the first instance
    expect(instance.myValue).toBe("newValue:setMidInstance1:setMidClass1:getMidClass1:getMidInstance1");
  });

  it("should work with dynamic hook keys from @hook decorator (init)", () => {
    const dynamicThis: any[] = [];
    @Hook
    class DynamicHookClass {
      @hook(
        dynamicHookKey(function (this: DynamicHookClass) {
          dynamicThis.push(this);
          return composeHookKeys(this, DynamicHookClass);
        }),
      )
      myValue: string = "initial";

      @hook(
        "myValue2Alt",
        dynamicHookKey(function (this: DynamicHookClass) {
          return composeHookKeys(this, DynamicHookClass);
        }),
      )
      myValue2: string = "initial2";

      @hook(
        dynamicHookKey(function (this: DynamicHookClass) {
          return composeHookKeys(this, DynamicHookClass);
        }),
        "myValue3Alt",
      )
      myValue3: string = "initial3";
    }

    const instance1 = new DynamicHookClass();
    expect(dynamicThis).toEqual([instance1]); // "init myValue"
    expect(instance1.myValue).toBe("initial");

    attach(DynamicHookClass, "init myValue", (next, value) => {
      return next(value + ":initMidClass1");
    });

    expect(instance1.myValue).toBe("initial");

    const instance2 = new DynamicHookClass();
    expect(dynamicThis).toEqual([instance1, instance2]); // "init myValue"
    expect(instance2.myValue).toBe("initial:initMidClass1");
    expect(instance1.myValue).toBe("initial");
    instance1.myValue = "newValue1";
    expect(instance1.myValue).toBe("newValue1");
    instance2.myValue = "newValue2";
    expect(instance2.myValue).toBe("newValue2");

    expect(instance1.myValue2).toBe("initial2");
    expect(instance1.myValue3).toBe("initial3");

    attach(DynamicHookClass, "init myValue2Alt", (next, value) => {
      return next(value + ":initAlt2");
    });
    attach(DynamicHookClass, "init myValue3Alt", (next, value) => {
      return next(value + ":initAlt3");
    });

    const instance3 = new DynamicHookClass();

    expect(instance3.myValue2).toBe("initial2:initAlt2");
    expect(instance3.myValue3).toBe("initial3:initAlt3");
  });

  it("should work with hooks inside middlewares", () => {
    @Hook
    class InnerHooksClass {
      @hook()
      myMethod(x: string) {
        expect(getCurrentHookKeyContext()).toEqual(composeHookKeys(this, InnerHooksClass));
        return x + ":original";
      }
    }

    const instance = new InnerHooksClass();

    const instanceHookKeys: any[] = [];
    attach(instance, "myMethod", (next, x) => {
      const innerResult = hook("innerHook", (v) => {
        instanceHookKeys.push(getCurrentHookKeyContext());
        return v;
      })(x);
      return next(innerResult + ":mid1");
    });

    const classHookKeys: any[] = [];
    attach(InnerHooksClass, "myMethod", (next, x) => {
      const innerResult = hook("innerHook", (v) => {
        classHookKeys.push(getCurrentHookKeyContext());
        return v;
      })(x);
      return next(innerResult + ":mid2");
    });

    let instanceInnerHookCalled = 0;
    attach(instance, "innerHook", (next, x) => {
      expect(getCurrentHookKeyContext()).toBe(instance);
      instanceInnerHookCalled++;
      return next(x + ":inner");
    });

    expect(instance.myMethod("input")).toBe("input:inner:mid1:mid2:original");
    expect(instanceInnerHookCalled).toBe(1);

    let classInnerHookCalled = 0;
    attach(InnerHooksClass, "innerHook", (next, x) => {
      expect(getCurrentHookKeyContext()).toBe(InnerHooksClass);
      classInnerHookCalled++;
      return next(x + ":inner2");
    });

    expect(instance.myMethod("input")).toBe("input:inner:mid1:inner2:mid2:original");
    expect(instanceInnerHookCalled).toBe(2);
    expect(classInnerHookCalled).toBe(1);

    expect(instanceHookKeys).toEqual([instance, instance]);
    expect(classHookKeys).toEqual([InnerHooksClass, InnerHooksClass]);
  });

  it("should work with hooks inside middlewares (alternative name)", () => {
    @Hook
    class InnerHooksClass {
      @hook("myMethodAlt")
      myMethod(x: string) {
        expect(getCurrentHookKeyContext()).toEqual(composeHookKeys(this, InnerHooksClass));
        return x + ":original";
      }
    }

    const instance = new InnerHooksClass();

    const instanceHookKeys: any[] = [];
    attach(instance, "myMethodAlt", (next, x) => {
      const innerResult = hook("innerHook", (v) => {
        instanceHookKeys.push(getCurrentHookKeyContext());
        return v;
      })(x);
      return next(innerResult + ":mid1");
    });

    const classHookKeys: any[] = [];
    attach(InnerHooksClass, "myMethodAlt", (next, x) => {
      const innerResult = hook("innerHook", (v) => {
        classHookKeys.push(getCurrentHookKeyContext());
        return v;
      })(x);
      return next(innerResult + ":mid2");
    });

    let instanceInnerHookCalled = 0;
    attach(instance, "innerHook", (next, x) => {
      expect(getCurrentHookKeyContext()).toBe(instance);
      instanceInnerHookCalled++;
      return next(x + ":inner");
    });

    expect(instance.myMethod("input")).toBe("input:inner:mid1:mid2:original");
    expect(instanceInnerHookCalled).toBe(1);

    let classInnerHookCalled = 0;
    attach(InnerHooksClass, "innerHook", (next, x) => {
      expect(getCurrentHookKeyContext()).toBe(InnerHooksClass);
      classInnerHookCalled++;
      return next(x + ":inner2");
    });

    expect(instance.myMethod("input")).toBe("input:inner:mid1:inner2:mid2:original");
    expect(instanceInnerHookCalled).toBe(2);
    expect(classInnerHookCalled).toBe(1);

    expect(instanceHookKeys).toEqual([instance, instance]);
    expect(classHookKeys).toEqual([InnerHooksClass, InnerHooksClass]);
  });

  it("should work with hooks inside middlewares and composite keys", () => {
    @Hook
    class InnerHooksClass {
      @hook()
      myMethod(x: string) {
        return x + ":original";
      }
    }

    const instance = new InnerHooksClass();

    attach(instance, "myMethod", (next, x) => {
      const innerResult = hook("innerHook", (v) => v)(x);
      return next(innerResult + ":mid1");
    });

    attach(instance, "innerHook", (next, x) => {
      return next(x + ":inner");
    });

    expect(instance.myMethod("input")).toBe("input:inner:mid1:original");
  });

  it("should work with alternative names: fields", () => {
    class FieldsClass {
      @hook("myFieldAlt")
      myField: string = "initial";
    }

    expect(new FieldsClass().myField).toBe("initial");

    attach(FieldsClass, "init myFieldAlt", (next, value) => {
      return next(value + ":initMid");
    });

    expect(new FieldsClass().myField).toBe("initial:initMid");
  });

  it("should work with alternative names: auto-accessors", () => {
    @Hook
    class AccessorsClass {
      @hook("myAccAlt") accessor myAcc: string = "initial";
      @hook("staticAccAlt") static accessor staticAcc: string = "staticInitial";
    }

    const instance = new AccessorsClass();
    expect(instance.myAcc).toBe("initial");
    expect(AccessorsClass.staticAcc).toBe("staticInitial");

    attach(AccessorsClass, "get myAccAlt", (next) => next() + ":getMid");
    attach(AccessorsClass, "set myAccAlt", (next, val) => next(val + ":setMid"));
    attach(AccessorsClass, "get staticAccAlt", (next) => next() + ":staticGetMid");

    expect(instance.myAcc).toBe("initial:getMid");
    instance.myAcc = "newVal";
    expect(instance.myAcc).toBe("newVal:setMid:getMid");
    expect(AccessorsClass.staticAcc).toBe("staticInitial:staticGetMid");

    // static init
    const acc2Symbol = Symbol("acc2");
    attach(acc2Symbol, "init staticAccAlt", (next, val) => next(val + ":staticInitMid"));
    @Hook
    class AccessorsClass2 {
      @hook(dynamicHookKey(() => acc2Symbol), "staticAccAlt") static accessor staticAcc: string = "staticInitial";
    }
    expect(AccessorsClass2.staticAcc).toBe("staticInitial:staticInitMid");
  });

  it("should work with alternative names: separate getter/setter", () => {
    @Hook
    class GetSetClass {
      static #staticVal = "staticInitial";
      #instanceVal = "initial";

      @hook("staticGetAlt") static get staticVal() {
        return this.#staticVal;
      }
      @hook("staticSetAlt") static set staticVal(v: string) {
        this.#staticVal = v;
      }

      @hook("getAlt") get instanceVal() {
        return this.#instanceVal;
      }
      @hook("setAlt") set instanceVal(v: string) {
        this.#instanceVal = v;
      }
    }

    const instance = new GetSetClass();

    expect(GetSetClass.staticVal).toBe("staticInitial");
    expect(instance.instanceVal).toBe("initial");

    attach(GetSetClass, "get staticGetAlt", (next) => next() + ":staticGetMid");
    attach(GetSetClass, "set staticSetAlt", (next, v) => next(v + ":staticSetMid"));
    attach(instance, "get getAlt", (next) => next() + ":getMid");
    attach(instance, "set setAlt", (next, v) => next(v + ":setMid"));
    attach(GetSetClass, "get getAlt", (next) => next() + ":getMid2");
    attach(GetSetClass, "set setAlt", (next, v) => next(v + ":setMid2"));

    expect(GetSetClass.staticVal).toBe("staticInitial:staticGetMid");
    GetSetClass.staticVal = "newStatic";
    expect(GetSetClass.staticVal).toBe("newStatic:staticSetMid:staticGetMid");

    expect(instance.instanceVal).toBe("initial:getMid2:getMid");
    instance.instanceVal = "newInstance";
    expect(instance.instanceVal).toBe("newInstance:setMid:setMid2:getMid2:getMid");
  });

  it("should work with alternative names: methods", () => {
    @Hook
    class MethodsClass {
      @hook("myMethodAlt")
      myMethod(x: string) {
        return x + ":original";
      }

      @hook("staticMethodAlt")
      static staticMethod(x: string) {
        return x + ":staticOriginal";
      }
    }

    const instance = new MethodsClass();
    expect(instance.myMethod("input")).toBe("input:original");
    expect(MethodsClass.staticMethod("input")).toBe("input:staticOriginal");

    attach(MethodsClass, "myMethodAlt", (next, x) => next(x + ":classMid"));
    attach(instance, "myMethodAlt", (next, x) => next(x + ":instanceMid"));
    attach(MethodsClass, "staticMethodAlt", (next, x) => next(x + ":staticMid"));

    expect(instance.myMethod("input")).toBe("input:instanceMid:classMid:original");
    expect(MethodsClass.staticMethod("input")).toBe("input:staticMid:staticOriginal");
  });

  it("should work with alternative names: private members (instance)", () => {
    @Hook
    class PrivateInstanceClass {
      @hook("prvFieldAlt") #prvField = "initialField";
      @hook("prvAccAlt") accessor #prvAcc = "initialAcc";
      #prvGetSetVal = "initialGetSet";

      @hook("prvGetAlt") get #prvGetter() {
        return this.#prvGetSetVal;
      }
      @hook("prvSetAlt") set #prvSetter(v: string) {
        this.#prvGetSetVal = v;
      }
      @hook("prvMethodAlt") #prvMethod(x: string) {
        return x + ":original";
      }

      public getField() {
        return this.#prvField;
      }
      public getAcc() {
        return this.#prvAcc;
      }
      public setAcc(v: string) {
        this.#prvAcc = v;
      }
      public getVal() {
        return this.#prvGetter;
      }
      public setVal(v: string) {
        this.#prvSetter = v;
      }
      public callMethod(x: string) {
        return this.#prvMethod(x);
      }
    }

    const instance = new PrivateInstanceClass();

    expect(instance.getField()).toBe("initialField");
    expect(instance.getAcc()).toBe("initialAcc");
    expect(instance.getVal()).toBe("initialGetSet");
    expect(instance.callMethod("in")).toBe("in:original");

    attach(instance, "get prvAccAlt", (next) => next() + ":getMidI");
    attach(instance, "set prvAccAlt", (next, v) => next(v + ":setMidI"));
    attach(instance, "get prvGetAlt", (next) => next() + ":getMidI");
    attach(instance, "set prvSetAlt", (next, v) => next(v + ":setMidI"));
    attach(instance, "prvMethodAlt", (next, x) => next(x + ":methodMidI"));

    expect(instance.getAcc()).toBe("initialAcc:getMidI");
    instance.setAcc("newAcc");
    expect(instance.getAcc()).toBe("newAcc:setMidI:getMidI");
    expect(instance.getVal()).toBe("initialGetSet:getMidI");
    instance.setVal("newVal");
    expect(instance.getVal()).toBe("newVal:setMidI:getMidI");
    expect(instance.callMethod("in")).toBe("in:methodMidI:original");

    attach(PrivateInstanceClass, "init prvFieldAlt", (next, v) => next(v + ":initMidC"));
    attach(PrivateInstanceClass, "init prvAccAlt", (next, v) => next(v + ":initMidC"));
    attach(PrivateInstanceClass, "get prvAccAlt", (next) => next() + ":getMidC");
    attach(PrivateInstanceClass, "set prvAccAlt", (next, v) => next(v + ":setMidC"));
    attach(PrivateInstanceClass, "get prvGetAlt", (next) => next() + ":getMidC");
    attach(PrivateInstanceClass, "set prvSetAlt", (next, v) => next(v + ":setMidC"));
    attach(PrivateInstanceClass, "prvMethodAlt", (next, x) => next(x + ":methodMidC"));

    expect(instance.getField()).toBe("initialField");
    expect(instance.getAcc()).toBe("newAcc:setMidI:getMidC:getMidI");
    instance.setAcc("newAcc");
    expect(instance.getAcc()).toBe("newAcc:setMidI:setMidC:getMidC:getMidI"); // because it was set with setMidI before
    expect(instance.getVal()).toBe("newVal:setMidI:getMidC:getMidI");
    instance.setVal("newVal");
    expect(instance.getVal()).toBe("newVal:setMidI:setMidC:getMidC:getMidI");
    expect(instance.callMethod("in")).toBe("in:methodMidI:methodMidC:original");

    const instance2 = new PrivateInstanceClass();
    expect(instance2.getField()).toBe("initialField:initMidC");
    expect(instance2.getAcc()).toBe("initialAcc:initMidC:getMidC");
    instance2.setAcc("newAcc2");
    expect(instance2.getAcc()).toBe("newAcc2:setMidC:getMidC");
    expect(instance2.getVal()).toBe("initialGetSet:getMidC");
    instance2.setVal("newVal2");
    expect(instance2.getVal()).toBe("newVal2:setMidC:getMidC");
    expect(instance2.callMethod("in")).toBe("in:methodMidC:original");
  });

  it("should work with alternative names: private members (static)", () => {
    @Hook
    class PrivateStaticClass {
      @hook("staticPrvFieldAlt") static #prvField = "initialField";
      @hook("staticPrvAccAlt") static accessor #prvAcc = "initialAcc";
      static #prvGetSetVal = "initialGetSet";

      @hook("staticPrvGetAlt") static get #prvGetter() {
        return this.#prvGetSetVal;
      }
      @hook("staticPrvSetAlt") static set #prvSetter(v: string) {
        this.#prvGetSetVal = v;
      }
      @hook("staticPrvMethodAlt") static #prvMethod(x: string) {
        return x + ":original";
      }

      public static getField() {
        return this.#prvField;
      }
      public static getAcc() {
        return this.#prvAcc;
      }
      public static setAcc(v: string) {
        this.#prvAcc = v;
      }
      public static getVal() {
        return this.#prvGetter;
      }
      public static setVal(v: string) {
        this.#prvSetter = v;
      }
      public static callMethod(x: string) {
        return this.#prvMethod(x);
      }
    }

    expect(PrivateStaticClass.getField()).toBe("initialField");
    expect(PrivateStaticClass.getAcc()).toBe("initialAcc");
    expect(PrivateStaticClass.getVal()).toBe("initialGetSet");
    expect(PrivateStaticClass.callMethod("in")).toBe("in:original");

    attach(PrivateStaticClass, "get staticPrvAccAlt", (next) => next() + ":getMid");
    attach(PrivateStaticClass, "set staticPrvAccAlt", (next, v) => next(v + ":setMid"));
    attach(PrivateStaticClass, "get staticPrvGetAlt", (next) => next() + ":getMid");
    attach(PrivateStaticClass, "set staticPrvSetAlt", (next, v) => next(v + ":setMid"));
    attach(PrivateStaticClass, "staticPrvMethodAlt", (next, x) => next(x + ":methodMid"));

    expect(PrivateStaticClass.getAcc()).toBe("initialAcc:getMid");
    PrivateStaticClass.setAcc("newAcc");
    expect(PrivateStaticClass.getAcc()).toBe("newAcc:setMid:getMid");

    expect(PrivateStaticClass.getVal()).toBe("initialGetSet:getMid");
    PrivateStaticClass.setVal("newVal");
    expect(PrivateStaticClass.getVal()).toBe("newVal:setMid:getMid");

    expect(PrivateStaticClass.callMethod("in")).toBe("in:methodMid:original");
  });

  it("should work with dynamic hook keys on all remaining decorator targets and verify correct this context", () => {
    const dynamicTracks: { target: string; self: any }[] = [];

    // track helper inside the test
    function track(target: string) {
      return dynamicHookKey(function (this: any) {
        dynamicTracks.push({ target, self: this });
        if (this.constructor !== Function) {
          return composeHookKeys(this, this.constructor);
        }
        return composeHookKeys(this);
      });
    }

    @Hook
    class AllRemainingTargetsClass {
      // 1. Static Public Method
      @hook(track("staticPublicMethod"))
      static staticPublicMethod(x: string) {
        return x + ":orig";
      }

      // 2. Private Method (non-static)
      @hook(track("privateMethod"))
      #privateMethod(x: string) {
        return x + ":orig";
      }

      public callPrivateMethod(x: string) {
        return this.#privateMethod(x);
      }

      // 3. Static Private Method
      @hook(track("staticPrivateMethod"))
      static #staticPrivateMethod(x: string) {
        return x + ":orig";
      }

      static callStaticPrivateMethod(x: string) {
        return this.#staticPrivateMethod(x);
      }

      // 4. Static Public Accessor
      @hook(track("staticPublicAccessor"))
      static accessor staticPublicAcc: string = "staticAccVal";

      // 5. Private Accessor (non-static)
      @hook(track("privateAccessor"))
      accessor #privateAcc: string = "privAccVal";

      public getPrivateAcc() {
        return this.#privateAcc;
      }
      public setPrivateAcc(v: string) {
        this.#privateAcc = v;
      }

      // 6. Static Private Accessor
      @hook(track("staticPrivateAccessor"))
      static accessor #staticPrivateAcc: string = "staticPrivAccVal";

      static getStaticPrivateAcc() {
        return this.#staticPrivateAcc;
      }
      static setStaticPrivateAcc(v: string) {
        this.#staticPrivateAcc = v;
      }

      // 7. Static Public Field
      @hook(track("staticPublicField"))
      static staticPublicField: string = "staticFieldVal";

      // 8. Private Field (non-static)
      @hook(track("privateField"))
      #privateField: string = "privFieldVal";

      public getPrivateField() {
        return this.#privateField;
      }

      // 9. Static Private Field
      @hook(track("staticPrivateField"))
      static #staticPrivateField: string = "staticPrivFieldVal";

      static getStaticPrivateField() {
        return this.#staticPrivateField;
      }

      // 10. Static Public Getter/Setter
      static #staticPublicGetSetVal = "staticGetSetVal";
      @hook(track("staticPublicGetter"))
      static get staticPublicGet() {
        return this.#staticPublicGetSetVal;
      }

      @hook(track("staticPublicSetter"))
      static set staticPublicSet(v: string) {
        this.#staticPublicGetSetVal = v;
      }

      // 11. Private Getter/Setter
      #privGetSetVal = "privGetSetVal";
      @hook(track("privateGetter"))
      get #privateGet() {
        return this.#privGetSetVal;
      }

      @hook(track("privateSetter"))
      set #privateSet(v: string) {
        this.#privGetSetVal = v;
      }

      public getPrivateGet() {
        return this.#privateGet;
      }
      public setPrivateSet(v: string) {
        this.#privateSet = v;
      }

      // 12. Static Private Getter/Setter
      static #staticPrivGetSetVal = "staticPrivGetSetVal";
      @hook(track("staticPrivateGetter"))
      static get #staticPrivateGet() {
        return this.#staticPrivGetSetVal;
      }

      @hook(track("staticPrivateSetter"))
      static set #staticPrivateSet(v: string) {
        this.#staticPrivGetSetVal = v;
      }

      static getStaticPrivateGet() {
        return this.#staticPrivateGet;
      }
      static setStaticPrivateSet(v: string) {
        this.#staticPrivateSet = v;
      }
    }

    // A. Verify static initializers executed on class definition
    const staticInitializers = dynamicTracks.filter((t) => t.self === AllRemainingTargetsClass);
    expect(staticInitializers.some((t) => t.target === "staticPublicField")).toBe(true);
    expect(staticInitializers.some((t) => t.target === "staticPrivateField")).toBe(true);
    expect(staticInitializers.some((t) => t.target === "staticPublicAccessor")).toBe(true);
    expect(staticInitializers.some((t) => t.target === "staticPrivateAccessor")).toBe(true);

    // Clear tracks for clean run of triggers
    dynamicTracks.length = 0;

    // 1. Static Public Method
    expect(AllRemainingTargetsClass.staticPublicMethod("hello")).toBe("hello:orig");
    expect(dynamicTracks).toContainEqual({ target: "staticPublicMethod", self: AllRemainingTargetsClass });
    dynamicTracks.length = 0;

    // 2. Private Method (non-static)
    const instance = new AllRemainingTargetsClass();

    // Instantiating triggers: privateField (init), privateAccessor (init)
    const instanceInitializers = dynamicTracks.filter((t) => t.self === instance);
    expect(instanceInitializers.some((t) => t.target === "privateField")).toBe(true);
    expect(instanceInitializers.some((t) => t.target === "privateAccessor")).toBe(true);
    dynamicTracks.length = 0;

    expect(instance.callPrivateMethod("world")).toBe("world:orig");
    expect(dynamicTracks).toContainEqual({ target: "privateMethod", self: instance });
    dynamicTracks.length = 0;

    // 3. Static Private Method
    expect(AllRemainingTargetsClass.callStaticPrivateMethod("stat")).toBe("stat:orig");
    expect(dynamicTracks).toContainEqual({ target: "staticPrivateMethod", self: AllRemainingTargetsClass });
    dynamicTracks.length = 0;

    // 4. Static Public Accessor
    expect(AllRemainingTargetsClass.staticPublicAcc).toBe("staticAccVal");
    expect(dynamicTracks).toContainEqual({ target: "staticPublicAccessor", self: AllRemainingTargetsClass });
    dynamicTracks.length = 0;

    AllRemainingTargetsClass.staticPublicAcc = "newStaticAcc";
    expect(AllRemainingTargetsClass.staticPublicAcc).toBe("newStaticAcc");
    expect(dynamicTracks).toContainEqual({ target: "staticPublicAccessor", self: AllRemainingTargetsClass });
    dynamicTracks.length = 0;

    // 5. Private Accessor (non-static)
    expect(instance.getPrivateAcc()).toBe("privAccVal");
    expect(dynamicTracks).toContainEqual({ target: "privateAccessor", self: instance });
    dynamicTracks.length = 0;

    instance.setPrivateAcc("newPrivAcc");
    expect(instance.getPrivateAcc()).toBe("newPrivAcc");
    expect(dynamicTracks).toContainEqual({ target: "privateAccessor", self: instance });
    dynamicTracks.length = 0;

    // 6. Static Private Accessor
    expect(AllRemainingTargetsClass.getStaticPrivateAcc()).toBe("staticPrivAccVal");
    expect(dynamicTracks).toContainEqual({ target: "staticPrivateAccessor", self: AllRemainingTargetsClass });
    dynamicTracks.length = 0;

    AllRemainingTargetsClass.setStaticPrivateAcc("newStaticPrivAcc");
    expect(AllRemainingTargetsClass.getStaticPrivateAcc()).toBe("newStaticPrivAcc");
    expect(dynamicTracks).toContainEqual({ target: "staticPrivateAccessor", self: AllRemainingTargetsClass });
    dynamicTracks.length = 0;

    // 7. Static Public Field
    expect(AllRemainingTargetsClass.staticPublicField).toBe("staticFieldVal");

    // 8. Private Field (non-static)
    expect(instance.getPrivateField()).toBe("privFieldVal");

    // 9. Static Private Field
    expect(AllRemainingTargetsClass.getStaticPrivateField()).toBe("staticPrivFieldVal");

    // 10. Static Public Getter & Setter
    expect(AllRemainingTargetsClass.staticPublicGet).toBe("staticGetSetVal");
    expect(dynamicTracks).toContainEqual({ target: "staticPublicGetter", self: AllRemainingTargetsClass });
    dynamicTracks.length = 0;

    AllRemainingTargetsClass.staticPublicSet = "newStaticGetSet";
    expect(AllRemainingTargetsClass.staticPublicGet).toBe("newStaticGetSet");
    expect(dynamicTracks).toContainEqual({ target: "staticPublicSetter", self: AllRemainingTargetsClass });
    dynamicTracks.length = 0;

    // 11. Private Getter & Setter (non-static)
    expect(instance.getPrivateGet()).toBe("privGetSetVal");
    expect(dynamicTracks).toContainEqual({ target: "privateGetter", self: instance });
    dynamicTracks.length = 0;

    instance.setPrivateSet("newPrivGetSet");
    expect(instance.getPrivateGet()).toBe("newPrivGetSet");
    expect(dynamicTracks).toContainEqual({ target: "privateSetter", self: instance });
    dynamicTracks.length = 0;

    // 12. Static Private Getter & Setter
    expect(AllRemainingTargetsClass.getStaticPrivateGet()).toBe("staticPrivGetSetVal");
    expect(dynamicTracks).toContainEqual({ target: "staticPrivateGetter", self: AllRemainingTargetsClass });
    dynamicTracks.length = 0;

    AllRemainingTargetsClass.setStaticPrivateSet("newStaticPrivGetSet");
    expect(AllRemainingTargetsClass.getStaticPrivateGet()).toBe("newStaticPrivGetSet");
    expect(dynamicTracks).toContainEqual({ target: "staticPrivateSetter", self: AllRemainingTargetsClass });
    dynamicTracks.length = 0;

    // Middlewares validation for static and private members to ensure interception works with dynamic composite hook keys
    attach(AllRemainingTargetsClass, "staticPublicMethod", (next, x) => next(x + ":intercepted"));
    expect(AllRemainingTargetsClass.staticPublicMethod("test")).toBe("test:intercepted:orig");

    attach(instance, "#privateMethod", (next, x) => next(x + ":intercepted"));
    expect(instance.callPrivateMethod("test")).toBe("test:intercepted:orig");

    attach(AllRemainingTargetsClass, "get staticPublicGet", (next) => next() + ":intercepted");
    expect(AllRemainingTargetsClass.staticPublicGet).toBe("newStaticGetSet:intercepted");
  });

  it("should work with alternativeName and dynamicKey in both argument orders on all decorator targets and verify correct this context", () => {
    const altTracks: { target: string; self: any }[] = [];

    function trackAlt(target: string) {
      return dynamicHookKey(function (this: any) {
        altTracks.push({ target, self: this });
        if (this.constructor !== Function) {
          return composeHookKeys(this, this.constructor);
        }
        return composeHookKeys(this);
      });
    }

    @Hook
    class AlternativeAndDynamicClass {
      // 1. Public Method - order (alternativeName, dynamicKey)
      @hook("methodAlt1", trackAlt("methodAlt1"))
      method1(x: string) {
        return x + ":orig1";
      }

      // 2. Static Public Method - order (dynamicKey, alternativeName)
      @hook(trackAlt("staticMethodAlt2"), "staticMethodAlt2")
      static staticMethod2(x: string) {
        return x + ":orig2";
      }

      // 3. Private Method - order (alternativeName, dynamicKey)
      @hook("privMethodAlt1", trackAlt("privMethodAlt1"))
      #privMethod1(x: string) {
        return x + ":orig1";
      }

      public callPrivMethod1(x: string) {
        return this.#privMethod1(x);
      }

      // 4. Static Private Method - order (dynamicKey, alternativeName)
      @hook(trackAlt("staticPrivMethodAlt2"), "staticPrivMethodAlt2")
      static #staticPrivMethod2(x: string) {
        return x + ":orig2";
      }

      static callStaticPrivMethod2(x: string) {
        return this.#staticPrivMethod2(x);
      }

      // 5. Public Accessor - order (alternativeName, dynamicKey)
      @hook("accAlt1", trackAlt("accAlt1"))
      accessor acc1: string = "valAcc1";

      // 6. Static Public Accessor - order (dynamicKey, alternativeName)
      @hook(trackAlt("staticAccAlt2"), "staticAccAlt2")
      static accessor staticAcc2: string = "valStaticAcc2";

      // 7. Private Accessor - order (alternativeName, dynamicKey)
      @hook("privAccAlt1", trackAlt("privAccAlt1"))
      accessor #privAcc1: string = "valPrivAcc1";

      public getPrivAcc1() {
        return this.#privAcc1;
      }
      public setPrivAcc1(v: string) {
        this.#privAcc1 = v;
      }

      // 8. Static Private Accessor - order (dynamicKey, alternativeName)
      @hook(trackAlt("staticPrivAccAlt2"), "staticPrivAccAlt2")
      static accessor #staticPrivAcc2: string = "valStaticPrivAcc2";

      static getStaticPrivAcc2() {
        return this.#staticPrivAcc2;
      }
      static setStaticPrivAcc2(v: string) {
        this.#staticPrivAcc2 = v;
      }

      // 9. Public Field - order (alternativeName, dynamicKey)
      @hook("fieldAlt1", trackAlt("fieldAlt1"))
      field1: string = "valField1";

      // 10. Static Public Field - order (dynamicKey, alternativeName)
      @hook(trackAlt("staticFieldAlt2"), "staticFieldAlt2")
      static staticField2: string = "valStaticField2";

      // 11. Private Field - order (alternativeName, dynamicKey)
      @hook("privFieldAlt1", trackAlt("privFieldAlt1"))
      #privField1: string = "valPrivField1";

      public getPrivField1() {
        return this.#privField1;
      }

      // 12. Static Private Field - order (dynamicKey, alternativeName)
      @hook(trackAlt("staticPrivFieldAlt2"), "staticPrivFieldAlt2")
      static #staticPrivField2: string = "valStaticPrivField2";

      static getStaticPrivField2() {
        return this.#staticPrivField2;
      }

      // 13. Public Getter/Setter - order (alternativeName, dynamicKey)
      #getSetVal1 = "valGetSet1";
      @hook("getSetAlt1", trackAlt("getSetAlt1"))
      get getSet1() {
        return this.#getSetVal1;
      }

      @hook("getSetAlt1", trackAlt("getSetAlt1"))
      set getSet1(v: string) {
        this.#getSetVal1 = v;
      }

      // 14. Static Public Getter/Setter - order (dynamicKey, alternativeName)
      static #staticGetSetVal2 = "valStaticGetSet2";
      @hook(trackAlt("staticGetSetAlt2"), "staticGetSetAlt2")
      static get staticGetSet2() {
        return this.#staticGetSetVal2;
      }

      @hook(trackAlt("staticGetSetAlt2"), "staticGetSetAlt2")
      static set staticGetSet2(v: string) {
        this.#staticGetSetVal2 = v;
      }

      // 15. Private Getter/Setter - order (alternativeName, dynamicKey)
      #privGetSetVal1 = "valPrivGetSet1";
      @hook("privGetSetAlt1", trackAlt("privGetSetAlt1"))
      get #privGetSet1() {
        return this.#privGetSetVal1;
      }

      @hook("privGetSetAlt1", trackAlt("privGetSetAlt1"))
      set #privGetSet1(v: string) {
        this.#privGetSetVal1 = v;
      }

      public getPrivGetSet1() {
        return this.#privGetSet1;
      }
      public setPrivGetSet1(v: string) {
        this.#privGetSet1 = v;
      }

      // 16. Static Private Getter/Setter - order (dynamicKey, alternativeName)
      static #staticPrivGetSetVal2 = "valStaticPrivGetSet2";
      @hook(trackAlt("staticPrivGetSetAlt2"), "staticPrivGetSetAlt2")
      static get #staticPrivGetSet2() {
        return this.#staticPrivGetSetVal2;
      }

      @hook(trackAlt("staticPrivGetSetAlt2"), "staticPrivGetSetAlt2")
      static set #staticPrivGetSet2(v: string) {
        this.#staticPrivGetSetVal2 = v;
      }

      static getStaticPrivGetSet2() {
        return this.#staticPrivGetSet2;
      }
      static setStaticPrivGetSet2(v: string) {
        this.#staticPrivGetSet2 = v;
      }
    }

    // A. Verify static fields / accessors run at class initialization
    const staticInitializers = altTracks.filter((t) => t.self === AlternativeAndDynamicClass);
    expect(staticInitializers.some((t) => t.target === "staticAccAlt2")).toBe(true);
    expect(staticInitializers.some((t) => t.target === "staticPrivAccAlt2")).toBe(true);
    expect(staticInitializers.some((t) => t.target === "staticFieldAlt2")).toBe(true);
    expect(staticInitializers.some((t) => t.target === "staticPrivFieldAlt2")).toBe(true);
    altTracks.length = 0;

    // 1. Public Method - order (alternativeName, dynamicKey)
    const instance = new AlternativeAndDynamicClass();

    // Instantiation triggers field and accessor inits
    const instanceInitializers = altTracks.filter((t) => t.self === instance);
    expect(instanceInitializers.some((t) => t.target === "accAlt1")).toBe(true);
    expect(instanceInitializers.some((t) => t.target === "privAccAlt1")).toBe(true);
    expect(instanceInitializers.some((t) => t.target === "fieldAlt1")).toBe(true);
    expect(instanceInitializers.some((t) => t.target === "privFieldAlt1")).toBe(true);
    altTracks.length = 0;

    expect(instance.method1("hello")).toBe("hello:orig1");
    expect(altTracks).toContainEqual({ target: "methodAlt1", self: instance });
    altTracks.length = 0;

    // 2. Static Public Method - order (dynamicKey, alternativeName)
    expect(AlternativeAndDynamicClass.staticMethod2("stat")).toBe("stat:orig2");
    expect(altTracks).toContainEqual({ target: "staticMethodAlt2", self: AlternativeAndDynamicClass });
    altTracks.length = 0;

    // 3. Private Method - order (alternativeName, dynamicKey)
    expect(instance.callPrivMethod1("world")).toBe("world:orig1");
    expect(altTracks).toContainEqual({ target: "privMethodAlt1", self: instance });
    altTracks.length = 0;

    // 4. Static Private Method - order (dynamicKey, alternativeName)
    expect(AlternativeAndDynamicClass.callStaticPrivMethod2("staticworld")).toBe("staticworld:orig2");
    expect(altTracks).toContainEqual({ target: "staticPrivMethodAlt2", self: AlternativeAndDynamicClass });
    altTracks.length = 0;

    // 5. Public Accessor - order (alternativeName, dynamicKey)
    expect(instance.acc1).toBe("valAcc1");
    expect(altTracks).toContainEqual({ target: "accAlt1", self: instance });
    altTracks.length = 0;

    instance.acc1 = "valAcc1_new";
    expect(instance.acc1).toBe("valAcc1_new");
    expect(altTracks).toContainEqual({ target: "accAlt1", self: instance });
    altTracks.length = 0;

    // 6. Static Public Accessor - order (dynamicKey, alternativeName)
    expect(AlternativeAndDynamicClass.staticAcc2).toBe("valStaticAcc2");
    expect(altTracks).toContainEqual({ target: "staticAccAlt2", self: AlternativeAndDynamicClass });
    altTracks.length = 0;

    AlternativeAndDynamicClass.staticAcc2 = "valStaticAcc2_new";
    expect(AlternativeAndDynamicClass.staticAcc2).toBe("valStaticAcc2_new");
    expect(altTracks).toContainEqual({ target: "staticAccAlt2", self: AlternativeAndDynamicClass });
    altTracks.length = 0;

    // 7. Private Accessor - order (alternativeName, dynamicKey)
    expect(instance.getPrivAcc1()).toBe("valPrivAcc1");
    expect(altTracks).toContainEqual({ target: "privAccAlt1", self: instance });
    altTracks.length = 0;

    instance.setPrivAcc1("valPrivAcc1_new");
    expect(instance.getPrivAcc1()).toBe("valPrivAcc1_new");
    expect(altTracks).toContainEqual({ target: "privAccAlt1", self: instance });
    altTracks.length = 0;

    // 8. Static Private Accessor - order (dynamicKey, alternativeName)
    expect(AlternativeAndDynamicClass.getStaticPrivAcc2()).toBe("valStaticPrivAcc2");
    expect(altTracks).toContainEqual({ target: "staticPrivAccAlt2", self: AlternativeAndDynamicClass });
    altTracks.length = 0;

    AlternativeAndDynamicClass.setStaticPrivAcc2("valStaticPrivAcc2_new");
    expect(AlternativeAndDynamicClass.getStaticPrivAcc2()).toBe("valStaticPrivAcc2_new");
    expect(altTracks).toContainEqual({ target: "staticPrivAccAlt2", self: AlternativeAndDynamicClass });
    altTracks.length = 0;

    // 9. Public Field - order (alternativeName, dynamicKey)
    expect(instance.field1).toBe("valField1");

    // 10. Static Public Field - order (dynamicKey, alternativeName)
    expect(AlternativeAndDynamicClass.staticField2).toBe("valStaticField2");

    // 11. Private Field - order (alternativeName, dynamicKey)
    expect(instance.getPrivField1()).toBe("valPrivField1");

    // 12. Static Private Field - order (dynamicKey, alternativeName)
    expect(AlternativeAndDynamicClass.getStaticPrivField2()).toBe("valStaticPrivField2");

    // 13. Public Getter/Setter - order (alternativeName, dynamicKey)
    expect(instance.getSet1).toBe("valGetSet1");
    expect(altTracks).toContainEqual({ target: "getSetAlt1", self: instance });
    altTracks.length = 0;

    instance.getSet1 = "valGetSet1_new";
    expect(instance.getSet1).toBe("valGetSet1_new");
    expect(altTracks).toContainEqual({ target: "getSetAlt1", self: instance });
    altTracks.length = 0;

    // 14. Static Public Getter/Setter - order (dynamicKey, alternativeName)
    expect(AlternativeAndDynamicClass.staticGetSet2).toBe("valStaticGetSet2");
    expect(altTracks).toContainEqual({ target: "staticGetSetAlt2", self: AlternativeAndDynamicClass });
    altTracks.length = 0;

    AlternativeAndDynamicClass.staticGetSet2 = "valStaticGetSet2_new";
    expect(AlternativeAndDynamicClass.staticGetSet2).toBe("valStaticGetSet2_new");
    expect(altTracks).toContainEqual({ target: "staticGetSetAlt2", self: AlternativeAndDynamicClass });
    altTracks.length = 0;

    // 15. Private Getter/Setter - order (alternativeName, dynamicKey)
    expect(instance.getPrivGetSet1()).toBe("valPrivGetSet1");
    expect(altTracks).toContainEqual({ target: "privGetSetAlt1", self: instance });
    altTracks.length = 0;

    instance.setPrivGetSet1("valPrivGetSet1_new");
    expect(instance.getPrivGetSet1()).toBe("valPrivGetSet1_new");
    expect(altTracks).toContainEqual({ target: "privGetSetAlt1", self: instance });
    altTracks.length = 0;

    // 16. Static Private Getter/Setter - order (dynamicKey, alternativeName)
    expect(AlternativeAndDynamicClass.getStaticPrivGetSet2()).toBe("valStaticPrivGetSet2");
    expect(altTracks).toContainEqual({ target: "staticPrivGetSetAlt2", self: AlternativeAndDynamicClass });
    altTracks.length = 0;

    AlternativeAndDynamicClass.setStaticPrivGetSet2("valStaticPrivGetSet2_new");
    expect(AlternativeAndDynamicClass.getStaticPrivGetSet2()).toBe("valStaticPrivGetSet2_new");
    expect(altTracks).toContainEqual({ target: "staticPrivGetSetAlt2", self: AlternativeAndDynamicClass });
    altTracks.length = 0;

    // Interception / middle attachment testing to make sure the target name used is the alternativeName
    attach(instance, "methodAlt1", (next, x) => next(x + ":intercepted"));
    expect(instance.method1("test1")).toBe("test1:intercepted:orig1");

    attach(AlternativeAndDynamicClass, "staticMethodAlt2", (next, x) => next(x + ":intercepted"));
    expect(AlternativeAndDynamicClass.staticMethod2("test2")).toBe("test2:intercepted:orig2");

    attach(instance, "privMethodAlt1", (next, x) => next(x + ":intercepted"));
    expect(instance.callPrivMethod1("test3")).toBe("test3:intercepted:orig1");

    attach(AlternativeAndDynamicClass, "staticPrivMethodAlt2", (next, x) => next(x + ":intercepted"));
    expect(AlternativeAndDynamicClass.callStaticPrivMethod2("test4")).toBe("test4:intercepted:orig2");

    attach(instance, "get accAlt1", (next) => next() + ":intercepted");
    expect(instance.acc1).toBe("valAcc1_new:intercepted");

    attach(AlternativeAndDynamicClass, "get staticAccAlt2", (next) => next() + ":intercepted");
    expect(AlternativeAndDynamicClass.staticAcc2).toBe("valStaticAcc2_new:intercepted");

    attach(instance, "get privAccAlt1", (next) => next() + ":intercepted");
    expect(instance.getPrivAcc1()).toBe("valPrivAcc1_new:intercepted");

    attach(AlternativeAndDynamicClass, "get staticPrivAccAlt2", (next) => next() + ":intercepted");
    expect(AlternativeAndDynamicClass.getStaticPrivAcc2()).toBe("valStaticPrivAcc2_new:intercepted");

    attach(AlternativeAndDynamicClass, "init fieldAlt1", (next, val) => next(val + ":intercepted"));
    const inst2 = new AlternativeAndDynamicClass();
    expect(inst2.field1).toBe("valField1:intercepted");
  });
});
