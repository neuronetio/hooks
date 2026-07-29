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
      return next() + ":getMid1";
    });
    expect(instance.myGetterSetter).toBe("myGetterSetterValue:getMid1");
    expect(subCalled).toBe(1);

    const detach2 = attach(AccessorsClass, "get myGetterSetter", (next) => {
      return next() + ":getMid2";
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

  describe("Alternative Name and Dynamic Key Decorators (public)", () => {
    it("should work with alternativeName only on methods", () => {
      @Hook
      class AlternativeNameOnlyMethodClass {
        @hook("methodAltOnly")
        method(x: string) {
          return x + ":orig";
        }
      }

      const instance = new AlternativeNameOnlyMethodClass();
      expect(instance.method("hello")).toBe("hello:orig");
      attach(instance, "methodAltOnly", (next, x) => next(x + ":intercepted"));
      expect(instance.method("hello")).toBe("hello:intercepted:orig");
    });

    it("should work with dynamicKey only on methods", () => {
      const tracks: { target: string; self: any }[] = [];

      function track(target: string) {
        return dynamicHookKey(function (this: any) {
          tracks.push({ target, self: this });
          return composeHookKeys(this, this.constructor);
        });
      }

      @Hook
      class DynamicKeyOnlyMethodClass {
        @hook(track("dynamicOnlyMethod"))
        method(x: string) {
          return x + ":orig";
        }
      }

      const instance = new DynamicKeyOnlyMethodClass();
      expect(instance.method("hello")).toBe("hello:orig");
      attach(instance, "method", (next, x) => next(x + ":intercepted"));
      expect(instance.method("hello")).toBe("hello:intercepted:orig");
      expect(tracks).toContainEqual({ target: "dynamicOnlyMethod", self: instance });
    });

    it("should work with alternativeName and dynamicKey on methods", () => {
      const tracks: { target: string; self: any }[] = [];

      function track(target: string) {
        return dynamicHookKey(function (this: any) {
          tracks.push({ target, self: this });
          return composeHookKeys(this, this.constructor);
        });
      }

      @Hook
      class AlternativeAndDynamicMethodClass {
        @hook("methodAltAndDynamic", track("methodAltAndDynamic"))
        method(x: string) {
          return x + ":orig";
        }
      }

      const instance = new AlternativeAndDynamicMethodClass();
      expect(instance.method("hello")).toBe("hello:orig");
      attach(instance, "methodAltAndDynamic", (next, x) => next(x + ":intercepted"));
      expect(instance.method("hello")).toBe("hello:intercepted:orig");
      expect(tracks).toContainEqual({ target: "methodAltAndDynamic", self: instance });
    });

    it("should work with dynamicKey and alternativeName on methods", () => {
      const tracks: { target: string; self: any }[] = [];

      function track(target: string) {
        return dynamicHookKey(function (this: any) {
          tracks.push({ target, self: this });
          return composeHookKeys(this, this.constructor);
        });
      }

      @Hook
      class DynamicAndAlternativeMethodClass {
        @hook(track("dynamicAndAlternativeMethod"), "methodDynamicAndAlternative")
        method(x: string) {
          return x + ":orig";
        }
      }

      const instance = new DynamicAndAlternativeMethodClass();
      expect(instance.method("hello")).toBe("hello:orig");
      attach(instance, "methodDynamicAndAlternative", (next, x) => next(x + ":intercepted"));
      expect(instance.method("hello")).toBe("hello:intercepted:orig");
      expect(tracks).toContainEqual({ target: "dynamicAndAlternativeMethod", self: instance });
    });

    it("should work with alternativeName only on accessors", () => {
      @Hook
      class AlternativeNameOnlyAccessorClass {
        @hook("accAltOnly")
        accessor acc: string = "initial";
      }

      const instance = new AlternativeNameOnlyAccessorClass();
      expect(instance.acc).toBe("initial");
      attach(instance, "get accAltOnly", (next) => next() + ":getMid");
      attach(instance, "set accAltOnly", (next, value) => next(value + ":setMid"));
      expect(instance.acc).toBe("initial:getMid");
      instance.acc = "updated";
      expect(instance.acc).toBe("updated:setMid:getMid");
    });

    it("should work with dynamicKey only on accessors", () => {
      const tracks: { target: string; self: any }[] = [];

      function track(target: string) {
        return dynamicHookKey(function (this: any) {
          tracks.push({ target, self: this });
          return composeHookKeys(this, this.constructor);
        });
      }

      @Hook
      class DynamicKeyOnlyAccessorClass {
        @hook(track("dynamicOnlyAccessor"))
        accessor acc: string = "initial";
      }

      const instance = new DynamicKeyOnlyAccessorClass();
      expect(instance.acc).toBe("initial");
      attach(instance, "get acc", (next) => next() + ":getMid");
      attach(instance, "set acc", (next, value) => next(value + ":setMid"));
      expect(instance.acc).toBe("initial:getMid");
      instance.acc = "updated";
      expect(instance.acc).toBe("updated:setMid:getMid");
      expect(tracks).toContainEqual({ target: "dynamicOnlyAccessor", self: instance });
    });

    it("should work with alternativeName and dynamicKey on accessors", () => {
      const tracks: { target: string; self: any }[] = [];

      function track(target: string) {
        return dynamicHookKey(function (this: any) {
          tracks.push({ target, self: this });
          return composeHookKeys(this, this.constructor);
        });
      }

      @Hook
      class AlternativeAndDynamicAccessorClass {
        @hook("accAltAndDynamic", track("accAltAndDynamic"))
        accessor acc: string = "initial";
      }

      const instance = new AlternativeAndDynamicAccessorClass();
      expect(instance.acc).toBe("initial");
      attach(instance, "get accAltAndDynamic", (next) => next() + ":getMid");
      attach(instance, "set accAltAndDynamic", (next, value) => next(value + ":setMid"));
      expect(instance.acc).toBe("initial:getMid");
      instance.acc = "updated";
      expect(instance.acc).toBe("updated:setMid:getMid");
      expect(tracks).toContainEqual({ target: "accAltAndDynamic", self: instance });
    });

    it("should work with dynamicKey and alternativeName on accessors", () => {
      const tracks: { target: string; self: any }[] = [];

      function track(target: string) {
        return dynamicHookKey(function (this: any) {
          tracks.push({ target, self: this });
          return composeHookKeys(this, this.constructor);
        });
      }

      @Hook
      class DynamicAndAlternativeAccessorClass {
        @hook(track("dynamicAndAlternativeAccessor"), "accDynamicAndAlternative")
        accessor acc: string = "initial";
      }

      const instance = new DynamicAndAlternativeAccessorClass();
      expect(instance.acc).toBe("initial");
      attach(instance, "get accDynamicAndAlternative", (next) => next() + ":getMid");
      attach(instance, "set accDynamicAndAlternative", (next, value) => next(value + ":setMid"));
      expect(instance.acc).toBe("initial:getMid");
      instance.acc = "updated";
      expect(instance.acc).toBe("updated:setMid:getMid");
      expect(tracks).toContainEqual({ target: "dynamicAndAlternativeAccessor", self: instance });
    });

    it("should work with alternativeName only on fields", () => {
      @Hook
      class AlternativeNameOnlyFieldClass {
        @hook("fieldAltOnly")
        field = "initial";
      }

      expect(new AlternativeNameOnlyFieldClass().field).toBe("initial");
      attach(AlternativeNameOnlyFieldClass, "init fieldAltOnly", (next, value) => next(value + ":initMid"));
      const instance = new AlternativeNameOnlyFieldClass();
      expect(instance.field).toBe("initial:initMid");
    });

    it("should work with dynamicKey only on fields", () => {
      const tracks: { target: string; self: any }[] = [];

      function track(target: string) {
        return dynamicHookKey(function (this: any) {
          tracks.push({ target, self: this });
          return composeHookKeys(this, this.constructor);
        });
      }

      @Hook
      class DynamicKeyOnlyFieldClass {
        @hook(track("dynamicOnlyField"))
        field = "initial";
      }

      expect(new DynamicKeyOnlyFieldClass().field).toBe("initial");
      attach(DynamicKeyOnlyFieldClass, "init field", (next, value) => next(value + ":initMid"));
      const instance = new DynamicKeyOnlyFieldClass();
      expect(instance.field).toBe("initial:initMid");
      expect(tracks).toContainEqual({ target: "dynamicOnlyField", self: instance });
    });

    it("should work with alternativeName and dynamicKey on fields", () => {
      const tracks: { target: string; self: any }[] = [];

      function track(target: string) {
        return dynamicHookKey(function (this: any) {
          tracks.push({ target, self: this });
          return composeHookKeys(this, this.constructor);
        });
      }

      @Hook
      class AlternativeAndDynamicFieldClass {
        @hook("fieldAltAndDynamic", track("fieldAltAndDynamic"))
        field = "initial";
      }

      expect(new AlternativeAndDynamicFieldClass().field).toBe("initial");
      attach(AlternativeAndDynamicFieldClass, "init fieldAltAndDynamic", (next, value) => next(value + ":initMid"));
      const instance = new AlternativeAndDynamicFieldClass();
      expect(instance.field).toBe("initial:initMid");
      expect(tracks).toContainEqual({ target: "fieldAltAndDynamic", self: instance });
    });

    it("should work with dynamicKey and alternativeName on fields", () => {
      const tracks: { target: string; self: any }[] = [];

      function track(target: string) {
        return dynamicHookKey(function (this: any) {
          tracks.push({ target, self: this });
          return composeHookKeys(this, this.constructor);
        });
      }

      @Hook
      class DynamicAndAlternativeFieldClass {
        @hook(track("dynamicAndAlternativeField"), "fieldDynamicAndAlternative")
        field = "initial";
      }

      expect(new DynamicAndAlternativeFieldClass().field).toBe("initial");
      attach(DynamicAndAlternativeFieldClass, "init fieldDynamicAndAlternative", (next, value) =>
        next(value + ":initMid"),
      );
      const instance = new DynamicAndAlternativeFieldClass();
      expect(instance.field).toBe("initial:initMid");
      expect(tracks).toContainEqual({ target: "dynamicAndAlternativeField", self: instance });
    });

    it("should work with alternativeName only on getter/setter pairs", () => {
      @Hook
      class AlternativeNameOnlyGetSetClass {
        #value = "initial";

        @hook("valueAltOnly")
        get value() {
          return this.#value;
        }

        @hook("valueAltOnly")
        set value(v: string) {
          this.#value = v;
        }
      }

      const instance = new AlternativeNameOnlyGetSetClass();
      expect(instance.value).toBe("initial");
      attach(instance, "get valueAltOnly", (next) => next() + ":getMid");
      attach(instance, "set valueAltOnly", (next, value) => next(value + ":setMid"));
      expect(instance.value).toBe("initial:getMid");
      instance.value = "updated";
      expect(instance.value).toBe("updated:setMid:getMid");

      // should not affect anything
      attach(instance, "valueAltOnly", (next, value) => next(value + ":setMid2"));
      instance.value = "updated2";
      expect(instance.value).toBe("updated2:setMid:getMid");
    });

    it("should work with dynamicKey only on getter/setter pairs", () => {
      const tracks: { target: string; self: any }[] = [];

      function track(target: string) {
        return dynamicHookKey(function (this: any) {
          tracks.push({ target, self: this });
          return composeHookKeys(this, this.constructor);
        });
      }

      @Hook
      class DynamicKeyOnlyGetSetClass {
        #value = "initial";

        @hook(track("dynamicOnlyGetSet"))
        get value() {
          return this.#value;
        }

        @hook(track("dynamicOnlyGetSet"))
        set value(v: string) {
          this.#value = v;
        }
      }

      const instance = new DynamicKeyOnlyGetSetClass();
      expect(instance.value).toBe("initial");
      attach(instance, "get value", (next) => next() + ":getMid");
      attach(instance, "set value", (next, value) => next(value + ":setMid"));
      expect(instance.value).toBe("initial:getMid");
      instance.value = "updated";
      expect(instance.value).toBe("updated:setMid:getMid");
      expect(tracks).toContainEqual({ target: "dynamicOnlyGetSet", self: instance });
    });

    it("should work with alternativeName and dynamicKey on getter/setter pairs", () => {
      const tracks: { target: string; self: any }[] = [];

      function track(target: string) {
        return dynamicHookKey(function (this: any) {
          tracks.push({ target, self: this });
          return composeHookKeys(this, this.constructor);
        });
      }

      @Hook
      class AlternativeAndDynamicGetSetClass {
        #value = "initial";

        @hook("valueAltAndDynamic", track("valueAltAndDynamic"))
        get value() {
          return this.#value;
        }

        @hook("valueAltAndDynamic", track("valueAltAndDynamic"))
        set value(v: string) {
          this.#value = v;
        }
      }

      const instance = new AlternativeAndDynamicGetSetClass();
      expect(instance.value).toBe("initial");
      attach(instance, "get valueAltAndDynamic", (next) => next() + ":getMid");
      attach(instance, "set valueAltAndDynamic", (next, value) => next(value + ":setMid"));
      expect(instance.value).toBe("initial:getMid");
      instance.value = "updated";
      expect(instance.value).toBe("updated:setMid:getMid");
      expect(tracks).toContainEqual({ target: "valueAltAndDynamic", self: instance });
    });

    it("should work with dynamicKey and alternativeName on getter/setter pairs", () => {
      const tracks: { target: string; self: any }[] = [];

      function track(target: string) {
        return dynamicHookKey(function (this: any) {
          tracks.push({ target, self: this });
          return composeHookKeys(this, this.constructor);
        });
      }

      @Hook
      class DynamicAndAlternativeGetSetClass {
        #value = "initial";

        @hook(track("dynamicAndAlternativeGetSet"), "valueDynamicAndAlternative")
        get value() {
          return this.#value;
        }

        @hook(track("dynamicAndAlternativeGetSet"), "valueDynamicAndAlternative")
        set value(v: string) {
          this.#value = v;
        }
      }

      const instance = new DynamicAndAlternativeGetSetClass();
      expect(instance.value).toBe("initial");
      attach(instance, "get valueDynamicAndAlternative", (next) => next() + ":getMid");
      attach(instance, "set valueDynamicAndAlternative", (next, value) => next(value + ":setMid"));
      expect(instance.value).toBe("initial:getMid");
      instance.value = "updated";
      expect(instance.value).toBe("updated:setMid:getMid");
      expect(tracks).toContainEqual({ target: "dynamicAndAlternativeGetSet", self: instance });
    });
  });

  describe("Alternative Name and Dynamic Key Decorators (static)", () => {
    function track(target: string) {
      return dynamicHookKey(function (this: any) {
        tracks.push({ target, self: this });
        if (this.constructor !== Function) {
          return composeHookKeys(this, this.constructor);
        }
        return composeHookKeys(this);
      });
    }

    const tracks: { target: string; self: any }[] = [];

    it("should work with alternativeName only on static methods", () => {
      @Hook
      class AlternativeNameOnlyStaticMethodClass {
        @hook("methodAltOnly")
        static method(x: string) {
          return x + ":orig";
        }
      }

      expect(AlternativeNameOnlyStaticMethodClass.method("hello")).toBe("hello:orig");
      attach(AlternativeNameOnlyStaticMethodClass, "methodAltOnly", (next, x) => next(x + ":intercepted"));
      expect(AlternativeNameOnlyStaticMethodClass.method("hello")).toBe("hello:intercepted:orig");
    });

    it("should work with dynamicKey only on static methods", () => {
      tracks.length = 0;

      @Hook
      class DynamicKeyOnlyStaticMethodClass {
        @hook(track("dynamicOnlyStaticMethod"))
        static method(x: string) {
          return x + ":orig";
        }
      }

      expect(DynamicKeyOnlyStaticMethodClass.method("hello")).toBe("hello:orig");
      attach(DynamicKeyOnlyStaticMethodClass, "method", (next, x) => next(x + ":intercepted"));
      expect(DynamicKeyOnlyStaticMethodClass.method("hello")).toBe("hello:intercepted:orig");
      expect(tracks).toContainEqual({ target: "dynamicOnlyStaticMethod", self: DynamicKeyOnlyStaticMethodClass });
    });

    it("should work with alternativeName and dynamicKey on static methods", () => {
      tracks.length = 0;

      @Hook
      class AlternativeAndDynamicStaticMethodClass {
        @hook("methodAltAndDynamic", track("methodAltAndDynamic"))
        static method(x: string) {
          return x + ":orig";
        }
      }

      expect(AlternativeAndDynamicStaticMethodClass.method("hello")).toBe("hello:orig");
      attach(AlternativeAndDynamicStaticMethodClass, "methodAltAndDynamic", (next, x) => next(x + ":intercepted"));
      expect(AlternativeAndDynamicStaticMethodClass.method("hello")).toBe("hello:intercepted:orig");
      expect(tracks).toContainEqual({ target: "methodAltAndDynamic", self: AlternativeAndDynamicStaticMethodClass });
    });

    it("should work with dynamicKey and alternativeName on static methods", () => {
      tracks.length = 0;

      @Hook
      class DynamicAndAlternativeStaticMethodClass {
        @hook(track("dynamicAndAlternativeStaticMethod"), "methodDynamicAndAlternative")
        static method(x: string) {
          return x + ":orig";
        }
      }

      expect(DynamicAndAlternativeStaticMethodClass.method("hello")).toBe("hello:orig");
      attach(DynamicAndAlternativeStaticMethodClass, "methodDynamicAndAlternative", (next, x) =>
        next(x + ":intercepted"),
      );
      expect(DynamicAndAlternativeStaticMethodClass.method("hello")).toBe("hello:intercepted:orig");
      expect(tracks).toContainEqual({
        target: "dynamicAndAlternativeStaticMethod",
        self: DynamicAndAlternativeStaticMethodClass,
      });
    });

    it("should work with alternativeName only on static accessors", () => {
      @Hook
      class AlternativeNameOnlyStaticAccessorClass {
        @hook("accAltOnly")
        static accessor acc: string = "initial";
      }

      expect(AlternativeNameOnlyStaticAccessorClass.acc).toBe("initial");
      attach(AlternativeNameOnlyStaticAccessorClass, "get accAltOnly", (next) => next() + ":getMid");
      attach(AlternativeNameOnlyStaticAccessorClass, "set accAltOnly", (next, value) => next(value + ":setMid"));
      expect(AlternativeNameOnlyStaticAccessorClass.acc).toBe("initial:getMid");
      AlternativeNameOnlyStaticAccessorClass.acc = "updated";
      expect(AlternativeNameOnlyStaticAccessorClass.acc).toBe("updated:setMid:getMid");
    });

    it("should work with dynamicKey only on static accessors", () => {
      tracks.length = 0;

      @Hook
      class DynamicKeyOnlyStaticAccessorClass {
        @hook(track("dynamicOnlyStaticAccessor"))
        static accessor acc: string = "initial";
      }

      expect(DynamicKeyOnlyStaticAccessorClass.acc).toBe("initial");
      attach(DynamicKeyOnlyStaticAccessorClass, "get acc", (next) => next() + ":getMid");
      attach(DynamicKeyOnlyStaticAccessorClass, "set acc", (next, value) => next(value + ":setMid"));
      expect(DynamicKeyOnlyStaticAccessorClass.acc).toBe("initial:getMid");
      DynamicKeyOnlyStaticAccessorClass.acc = "updated";
      expect(DynamicKeyOnlyStaticAccessorClass.acc).toBe("updated:setMid:getMid");
      expect(tracks).toContainEqual({ target: "dynamicOnlyStaticAccessor", self: DynamicKeyOnlyStaticAccessorClass });
    });

    it("should work with alternativeName and dynamicKey on static accessors", () => {
      tracks.length = 0;

      @Hook
      class AlternativeAndDynamicStaticAccessorClass {
        @hook("accAltAndDynamic", track("accAltAndDynamic"))
        static accessor acc: string = "initial";
      }

      expect(AlternativeAndDynamicStaticAccessorClass.acc).toBe("initial");
      attach(AlternativeAndDynamicStaticAccessorClass, "get accAltAndDynamic", (next) => next() + ":getMid");
      attach(AlternativeAndDynamicStaticAccessorClass, "set accAltAndDynamic", (next, value) =>
        next(value + ":setMid"),
      );
      expect(AlternativeAndDynamicStaticAccessorClass.acc).toBe("initial:getMid");
      AlternativeAndDynamicStaticAccessorClass.acc = "updated";
      expect(AlternativeAndDynamicStaticAccessorClass.acc).toBe("updated:setMid:getMid");
      expect(tracks).toContainEqual({ target: "accAltAndDynamic", self: AlternativeAndDynamicStaticAccessorClass });
    });

    it("should work with dynamicKey and alternativeName on static accessors", () => {
      tracks.length = 0;

      @Hook
      class DynamicAndAlternativeStaticAccessorClass {
        @hook(track("dynamicAndAlternativeStaticAccessor"), "accDynamicAndAlternative")
        static accessor acc: string = "initial";
      }

      expect(DynamicAndAlternativeStaticAccessorClass.acc).toBe("initial");
      attach(DynamicAndAlternativeStaticAccessorClass, "get accDynamicAndAlternative", (next) => next() + ":getMid");
      attach(DynamicAndAlternativeStaticAccessorClass, "set accDynamicAndAlternative", (next, value) =>
        next(value + ":setMid"),
      );
      expect(DynamicAndAlternativeStaticAccessorClass.acc).toBe("initial:getMid");
      DynamicAndAlternativeStaticAccessorClass.acc = "updated";
      expect(DynamicAndAlternativeStaticAccessorClass.acc).toBe("updated:setMid:getMid");
      expect(tracks).toContainEqual({
        target: "dynamicAndAlternativeStaticAccessor",
        self: DynamicAndAlternativeStaticAccessorClass,
      });
    });

    it("should work with alternativeName only on static fields", () => {
      @Hook
      class AlternativeNameOnlyStaticFieldClass {
        @hook("fieldAltOnly")
        static field = "initial";
      }

      expect(AlternativeNameOnlyStaticFieldClass.field).toBe("initial");
    });

    it("should work with dynamicKey only on static fields", () => {
      tracks.length = 0;

      @Hook
      class DynamicKeyOnlyStaticFieldClass {
        @hook(track("dynamicOnlyStaticField"))
        static field = "initial";
      }

      expect(DynamicKeyOnlyStaticFieldClass.field).toBe("initial");
      expect(tracks).toContainEqual({ target: "dynamicOnlyStaticField", self: DynamicKeyOnlyStaticFieldClass });
    });

    it("should work with alternativeName and dynamicKey on static fields", () => {
      tracks.length = 0;

      @Hook
      class AlternativeAndDynamicStaticFieldClass {
        @hook("fieldAltAndDynamic", track("fieldAltAndDynamic"))
        static field = "initial";
      }

      expect(AlternativeAndDynamicStaticFieldClass.field).toBe("initial");
      expect(tracks).toContainEqual({ target: "fieldAltAndDynamic", self: AlternativeAndDynamicStaticFieldClass });
    });

    it("should work with dynamicKey and alternativeName on static fields", () => {
      tracks.length = 0;

      @Hook
      class DynamicAndAlternativeStaticFieldClass {
        @hook(track("dynamicAndAlternativeStaticField"), "fieldDynamicAndAlternative")
        static field = "initial";
      }

      expect(DynamicAndAlternativeStaticFieldClass.field).toBe("initial");
      expect(tracks).toContainEqual({
        target: "dynamicAndAlternativeStaticField",
        self: DynamicAndAlternativeStaticFieldClass,
      });
    });

    it("should work with alternativeName only on static getter/setter pairs", () => {
      @Hook
      class AlternativeNameOnlyStaticGetSetClass {
        static #value = "initial";

        @hook("valueAltOnly")
        static get value() {
          return this.#value;
        }

        @hook("valueAltOnly")
        static set value(v: string) {
          this.#value = v;
        }
      }

      expect(AlternativeNameOnlyStaticGetSetClass.value).toBe("initial");
      attach(AlternativeNameOnlyStaticGetSetClass, "get valueAltOnly", (next) => next() + ":getMid");
      attach(AlternativeNameOnlyStaticGetSetClass, "set valueAltOnly", (next, value) => next(value + ":setMid"));
      expect(AlternativeNameOnlyStaticGetSetClass.value).toBe("initial:getMid");
      AlternativeNameOnlyStaticGetSetClass.value = "updated";
      expect(AlternativeNameOnlyStaticGetSetClass.value).toBe("updated:setMid:getMid");
    });

    it("should work with dynamicKey only on static getter/setter pairs", () => {
      tracks.length = 0;

      @Hook
      class DynamicKeyOnlyStaticGetSetClass {
        static #value = "initial";

        @hook(track("dynamicOnlyStaticGetSet"))
        static get value() {
          return this.#value;
        }

        @hook(track("dynamicOnlyStaticGetSet"))
        static set value(v: string) {
          this.#value = v;
        }
      }

      expect(DynamicKeyOnlyStaticGetSetClass.value).toBe("initial");
      attach(DynamicKeyOnlyStaticGetSetClass, "get value", (next) => next() + ":getMid");
      attach(DynamicKeyOnlyStaticGetSetClass, "set value", (next, value) => next(value + ":setMid"));
      expect(DynamicKeyOnlyStaticGetSetClass.value).toBe("initial:getMid");
      DynamicKeyOnlyStaticGetSetClass.value = "updated";
      expect(DynamicKeyOnlyStaticGetSetClass.value).toBe("updated:setMid:getMid");
      expect(tracks).toContainEqual({ target: "dynamicOnlyStaticGetSet", self: DynamicKeyOnlyStaticGetSetClass });
    });

    it("should work with alternativeName and dynamicKey on static getter/setter pairs", () => {
      tracks.length = 0;

      @Hook
      class AlternativeAndDynamicStaticGetSetClass {
        static #value = "initial";

        @hook("valueAltAndDynamic", track("valueAltAndDynamic"))
        static get value() {
          return this.#value;
        }

        @hook("valueAltAndDynamic", track("valueAltAndDynamic"))
        static set value(v: string) {
          this.#value = v;
        }
      }

      expect(AlternativeAndDynamicStaticGetSetClass.value).toBe("initial");
      attach(AlternativeAndDynamicStaticGetSetClass, "get valueAltAndDynamic", (next) => next() + ":getMid");
      attach(AlternativeAndDynamicStaticGetSetClass, "set valueAltAndDynamic", (next, value) =>
        next(value + ":setMid"),
      );
      expect(AlternativeAndDynamicStaticGetSetClass.value).toBe("initial:getMid");
      AlternativeAndDynamicStaticGetSetClass.value = "updated";
      expect(AlternativeAndDynamicStaticGetSetClass.value).toBe("updated:setMid:getMid");
      expect(tracks).toContainEqual({ target: "valueAltAndDynamic", self: AlternativeAndDynamicStaticGetSetClass });
    });

    it("should work with dynamicKey and alternativeName on static getter/setter pairs", () => {
      tracks.length = 0;

      @Hook
      class DynamicAndAlternativeStaticGetSetClass {
        static #value = "initial";

        @hook(track("dynamicAndAlternativeStaticGetSet"), "valueDynamicAndAlternative")
        static get value() {
          return this.#value;
        }

        @hook(track("dynamicAndAlternativeStaticGetSet"), "valueDynamicAndAlternative")
        static set value(v: string) {
          this.#value = v;
        }
      }

      expect(DynamicAndAlternativeStaticGetSetClass.value).toBe("initial");
      attach(DynamicAndAlternativeStaticGetSetClass, "get valueDynamicAndAlternative", (next) => next() + ":getMid");
      attach(DynamicAndAlternativeStaticGetSetClass, "set valueDynamicAndAlternative", (next, value) =>
        next(value + ":setMid"),
      );
      expect(DynamicAndAlternativeStaticGetSetClass.value).toBe("initial:getMid");
      DynamicAndAlternativeStaticGetSetClass.value = "updated";
      expect(DynamicAndAlternativeStaticGetSetClass.value).toBe("updated:setMid:getMid");
      expect(tracks).toContainEqual({
        target: "dynamicAndAlternativeStaticGetSet",
        self: DynamicAndAlternativeStaticGetSetClass,
      });
    });
  });

  describe("Alternative Name and Dynamic Key Decorators (private)", () => {
    function track(target: string) {
      return dynamicHookKey(function (this: any) {
        tracks.push({ target, self: this });
        return composeHookKeys(this, this.constructor);
      });
    }

    const tracks: { target: string; self: any }[] = [];

    it("should work with alternativeName only on private methods", () => {
      @Hook
      class AlternativeNameOnlyPrivateMethodClass {
        @hook("methodAltOnly")
        #method(x: string) {
          return x + ":orig";
        }

        public callMethod(x: string) {
          return this.#method(x);
        }
      }

      const instance = new AlternativeNameOnlyPrivateMethodClass();
      expect(instance.callMethod("hello")).toBe("hello:orig");
      attach(instance, "methodAltOnly", (next, x) => next(x + ":intercepted"));
      expect(instance.callMethod("hello")).toBe("hello:intercepted:orig");
    });

    it("should work with dynamicKey only on private methods", () => {
      tracks.length = 0;

      @Hook
      class DynamicKeyOnlyPrivateMethodClass {
        @hook(track("dynamicOnlyPrivateMethod"))
        #method(x: string) {
          return x + ":orig";
        }

        public callMethod(x: string) {
          return this.#method(x);
        }
      }

      const instance = new DynamicKeyOnlyPrivateMethodClass();
      expect(instance.callMethod("hello")).toBe("hello:orig");
      attach(instance, "#method", (next, x) => next(x + ":intercepted"));
      expect(instance.callMethod("hello")).toBe("hello:intercepted:orig");
      expect(tracks).toContainEqual({ target: "dynamicOnlyPrivateMethod", self: instance });
    });

    it("should work with alternativeName and dynamicKey on private methods", () => {
      tracks.length = 0;

      @Hook
      class AlternativeAndDynamicPrivateMethodClass {
        @hook("methodAltAndDynamic", track("methodAltAndDynamic"))
        #method(x: string) {
          return x + ":orig";
        }

        public callMethod(x: string) {
          return this.#method(x);
        }
      }

      const instance = new AlternativeAndDynamicPrivateMethodClass();
      expect(instance.callMethod("hello")).toBe("hello:orig");
      attach(instance, "methodAltAndDynamic", (next, x) => next(x + ":intercepted"));
      expect(instance.callMethod("hello")).toBe("hello:intercepted:orig");
      expect(tracks).toContainEqual({ target: "methodAltAndDynamic", self: instance });
    });

    it("should work with dynamicKey and alternativeName on private methods", () => {
      tracks.length = 0;

      @Hook
      class DynamicAndAlternativePrivateMethodClass {
        @hook(track("dynamicAndAlternativePrivateMethod"), "methodDynamicAndAlternative")
        #method(x: string) {
          return x + ":orig";
        }

        public callMethod(x: string) {
          return this.#method(x);
        }
      }

      const instance = new DynamicAndAlternativePrivateMethodClass();
      expect(instance.callMethod("hello")).toBe("hello:orig");
      attach(instance, "methodDynamicAndAlternative", (next, x) => next(x + ":intercepted"));
      expect(instance.callMethod("hello")).toBe("hello:intercepted:orig");
      expect(tracks).toContainEqual({ target: "dynamicAndAlternativePrivateMethod", self: instance });
    });

    it("should work with alternativeName only on private accessors", () => {
      @Hook
      class AlternativeNameOnlyPrivateAccessorClass {
        @hook("accAltOnly")
        accessor #acc: string = "initial";

        public getAcc() {
          return this.#acc;
        }

        public setAcc(v: string) {
          this.#acc = v;
        }
      }

      const instance = new AlternativeNameOnlyPrivateAccessorClass();
      expect(instance.getAcc()).toBe("initial");
      attach(instance, "get accAltOnly", (next) => next() + ":getMid");
      attach(instance, "set accAltOnly", (next, value) => next(value + ":setMid"));
      expect(instance.getAcc()).toBe("initial:getMid");
      instance.setAcc("updated");
      expect(instance.getAcc()).toBe("updated:setMid:getMid");
    });

    it("should work with dynamicKey only on private accessors", () => {
      tracks.length = 0;

      @Hook
      class DynamicKeyOnlyPrivateAccessorClass {
        @hook(track("dynamicOnlyPrivateAccessor"))
        accessor #acc: string = "initial";

        public getAcc() {
          return this.#acc;
        }

        public setAcc(v: string) {
          this.#acc = v;
        }
      }

      const instance = new DynamicKeyOnlyPrivateAccessorClass();
      expect(instance.getAcc()).toBe("initial");
      attach(instance, "get #acc", (next) => next() + ":getMid");
      attach(instance, "set #acc", (next, value) => next(value + ":setMid"));
      expect(instance.getAcc()).toBe("initial:getMid");
      instance.setAcc("updated");
      expect(instance.getAcc()).toBe("updated:setMid:getMid");
      expect(tracks).toContainEqual({ target: "dynamicOnlyPrivateAccessor", self: instance });
    });

    it("should work with alternativeName and dynamicKey on private accessors", () => {
      tracks.length = 0;

      @Hook
      class AlternativeAndDynamicPrivateAccessorClass {
        @hook("accAltAndDynamic", track("accAltAndDynamic"))
        accessor #acc: string = "initial";

        public getAcc() {
          return this.#acc;
        }

        public setAcc(v: string) {
          this.#acc = v;
        }
      }

      const instance = new AlternativeAndDynamicPrivateAccessorClass();
      expect(instance.getAcc()).toBe("initial");
      attach(instance, "get accAltAndDynamic", (next) => next() + ":getMid");
      attach(instance, "set accAltAndDynamic", (next, value) => next(value + ":setMid"));
      expect(instance.getAcc()).toBe("initial:getMid");
      instance.setAcc("updated");
      expect(instance.getAcc()).toBe("updated:setMid:getMid");
      expect(tracks).toContainEqual({ target: "accAltAndDynamic", self: instance });
    });

    it("should work with dynamicKey and alternativeName on private accessors", () => {
      tracks.length = 0;

      @Hook
      class DynamicAndAlternativePrivateAccessorClass {
        @hook(track("dynamicAndAlternativePrivateAccessor"), "accDynamicAndAlternative")
        accessor #acc: string = "initial";

        public getAcc() {
          return this.#acc;
        }

        public setAcc(v: string) {
          this.#acc = v;
        }
      }

      const instance = new DynamicAndAlternativePrivateAccessorClass();
      expect(instance.getAcc()).toBe("initial");
      attach(instance, "get accDynamicAndAlternative", (next) => next() + ":getMid");
      attach(instance, "set accDynamicAndAlternative", (next, value) => next(value + ":setMid"));
      expect(instance.getAcc()).toBe("initial:getMid");
      instance.setAcc("updated");
      expect(instance.getAcc()).toBe("updated:setMid:getMid");
      expect(tracks).toContainEqual({ target: "dynamicAndAlternativePrivateAccessor", self: instance });
    });

    it("should work with alternativeName only on private fields", () => {
      @Hook
      class AlternativeNameOnlyPrivateFieldClass {
        @hook("fieldAltOnly")
        #field = "initial";

        public getField() {
          return this.#field;
        }
      }

      const instance = new AlternativeNameOnlyPrivateFieldClass();
      expect(instance.getField()).toBe("initial");
    });

    it("should work with dynamicKey only on private fields", () => {
      tracks.length = 0;

      @Hook
      class DynamicKeyOnlyPrivateFieldClass {
        @hook(track("dynamicOnlyPrivateField"))
        #field = "initial";

        public getField() {
          return this.#field;
        }
      }

      const instance = new DynamicKeyOnlyPrivateFieldClass();
      expect(instance.getField()).toBe("initial");
      expect(tracks).toContainEqual({ target: "dynamicOnlyPrivateField", self: instance });
    });

    it("should work with alternativeName and dynamicKey on private fields", () => {
      tracks.length = 0;

      @Hook
      class AlternativeAndDynamicPrivateFieldClass {
        @hook("fieldAltAndDynamic", track("fieldAltAndDynamic"))
        #field = "initial";

        public getField() {
          return this.#field;
        }
      }

      const instance = new AlternativeAndDynamicPrivateFieldClass();
      expect(instance.getField()).toBe("initial");
      expect(tracks).toContainEqual({ target: "fieldAltAndDynamic", self: instance });
    });

    it("should work with dynamicKey and alternativeName on private fields", () => {
      tracks.length = 0;

      @Hook
      class DynamicAndAlternativePrivateFieldClass {
        @hook(track("dynamicAndAlternativePrivateField"), "fieldDynamicAndAlternative")
        #field = "initial";

        public getField() {
          return this.#field;
        }
      }

      const instance = new DynamicAndAlternativePrivateFieldClass();
      expect(instance.getField()).toBe("initial");
      expect(tracks).toContainEqual({ target: "dynamicAndAlternativePrivateField", self: instance });
    });

    it("should work with alternativeName only on private getter/setter pairs", () => {
      @Hook
      class AlternativeNameOnlyPrivateGetSetClass {
        #value = "initial";

        @hook("valueAltOnly")
        get #valueGet() {
          return this.#value;
        }

        @hook("valueAltOnly")
        set #valueSet(v: string) {
          this.#value = v;
        }

        public getValue() {
          return this.#valueGet;
        }

        public setValue(v: string) {
          this.#valueSet = v;
        }
      }

      const instance = new AlternativeNameOnlyPrivateGetSetClass();
      expect(instance.getValue()).toBe("initial");
      attach(instance, "get valueAltOnly", (next) => next() + ":getMid");
      attach(instance, "set valueAltOnly", (next, value) => next(value + ":setMid"));
      expect(instance.getValue()).toBe("initial:getMid");
      instance.setValue("updated");
      expect(instance.getValue()).toBe("updated:setMid:getMid");
    });

    it("should work with dynamicKey only on private getter/setter pairs", () => {
      tracks.length = 0;

      @Hook
      class DynamicKeyOnlyPrivateGetSetClass {
        #value = "initial";

        @hook(track("dynamicOnlyPrivateGetSet"))
        get #valueGet() {
          return this.#value;
        }

        @hook(track("dynamicOnlyPrivateGetSet"))
        set #valueSet(v: string) {
          this.#value = v;
        }

        public getValue() {
          return this.#valueGet;
        }

        public setValue(v: string) {
          this.#valueSet = v;
        }
      }

      const instance = new DynamicKeyOnlyPrivateGetSetClass();
      expect(instance.getValue()).toBe("initial");
      attach(instance, "get #valueGet", (next) => next() + ":getMid");
      attach(instance, "set #valueSet", (next, value) => next(value + ":setMid"));
      expect(instance.getValue()).toBe("initial:getMid");
      instance.setValue("updated");
      expect(instance.getValue()).toBe("updated:setMid:getMid");
      expect(tracks).toContainEqual({ target: "dynamicOnlyPrivateGetSet", self: instance });
    });

    it("should work with alternativeName and dynamicKey on private getter/setter pairs", () => {
      tracks.length = 0;

      @Hook
      class AlternativeAndDynamicPrivateGetSetClass {
        #value = "initial";

        @hook("valueAltAndDynamic", track("valueAltAndDynamic"))
        get #valueGet() {
          return this.#value;
        }

        @hook("valueAltAndDynamic", track("valueAltAndDynamic"))
        set #valueSet(v: string) {
          this.#value = v;
        }

        public getValue() {
          return this.#valueGet;
        }

        public setValue(v: string) {
          this.#valueSet = v;
        }
      }

      const instance = new AlternativeAndDynamicPrivateGetSetClass();
      expect(instance.getValue()).toBe("initial");
      attach(instance, "get valueAltAndDynamic", (next) => next() + ":getMid");
      attach(instance, "set valueAltAndDynamic", (next, value) => next(value + ":setMid"));
      expect(instance.getValue()).toBe("initial:getMid");
      instance.setValue("updated");
      expect(instance.getValue()).toBe("updated:setMid:getMid");
      expect(tracks).toContainEqual({ target: "valueAltAndDynamic", self: instance });
    });

    it("should work with dynamicKey and alternativeName on private getter/setter pairs", () => {
      tracks.length = 0;

      @Hook
      class DynamicAndAlternativePrivateGetSetClass {
        #value = "initial";

        @hook(track("dynamicAndAlternativePrivateGetSet"), "valueDynamicAndAlternative")
        get #valueGet() {
          return this.#value;
        }

        @hook(track("dynamicAndAlternativePrivateGetSet"), "valueDynamicAndAlternative")
        set #valueSet(v: string) {
          this.#value = v;
        }

        public getValue() {
          return this.#valueGet;
        }

        public setValue(v: string) {
          this.#valueSet = v;
        }
      }

      const instance = new DynamicAndAlternativePrivateGetSetClass();
      expect(instance.getValue()).toBe("initial");
      attach(instance, "get valueDynamicAndAlternative", (next) => next() + ":getMid");
      attach(instance, "set valueDynamicAndAlternative", (next, value) => next(value + ":setMid"));
      expect(instance.getValue()).toBe("initial:getMid");
      instance.setValue("updated");
      expect(instance.getValue()).toBe("updated:setMid:getMid");
      expect(tracks).toContainEqual({ target: "dynamicAndAlternativePrivateGetSet", self: instance });
    });
  });

  describe("Alternative Name and Dynamic Key Decorators (static private)", () => {
    function track(target: string) {
      return dynamicHookKey(function (this: any) {
        tracks.push({ target, self: this });
        if (this.constructor !== Function) {
          return composeHookKeys(this, this.constructor);
        }
        return composeHookKeys(this);
      });
    }

    const tracks: { target: string; self: any }[] = [];

    it("should work with alternativeName only on static private methods", () => {
      @Hook
      class AlternativeNameOnlyStaticPrivateMethodClass {
        @hook("methodAltOnly")
        static #method(x: string) {
          return x + ":orig";
        }

        static callMethod(x: string) {
          return this.#method(x);
        }
      }

      expect(AlternativeNameOnlyStaticPrivateMethodClass.callMethod("hello")).toBe("hello:orig");
      attach(AlternativeNameOnlyStaticPrivateMethodClass, "methodAltOnly", (next, x) => next(x + ":intercepted"));
      expect(AlternativeNameOnlyStaticPrivateMethodClass.callMethod("hello")).toBe("hello:intercepted:orig");
    });

    it("should work with dynamicKey only on static private methods", () => {
      tracks.length = 0;

      @Hook
      class DynamicKeyOnlyStaticPrivateMethodClass {
        @hook(track("dynamicOnlyStaticPrivateMethod"))
        static #method(x: string) {
          return x + ":orig";
        }

        static callMethod(x: string) {
          return this.#method(x);
        }
      }

      expect(DynamicKeyOnlyStaticPrivateMethodClass.callMethod("hello")).toBe("hello:orig");
      attach(DynamicKeyOnlyStaticPrivateMethodClass, "#method", (next, x) => next(x + ":intercepted"));
      expect(DynamicKeyOnlyStaticPrivateMethodClass.callMethod("hello")).toBe("hello:intercepted:orig");
      expect(tracks).toContainEqual({
        target: "dynamicOnlyStaticPrivateMethod",
        self: DynamicKeyOnlyStaticPrivateMethodClass,
      });
    });

    it("should work with alternativeName and dynamicKey on static private methods", () => {
      tracks.length = 0;

      @Hook
      class AlternativeAndDynamicStaticPrivateMethodClass {
        @hook("methodAltAndDynamic", track("methodAltAndDynamic"))
        static #method(x: string) {
          return x + ":orig";
        }

        static callMethod(x: string) {
          return this.#method(x);
        }
      }

      expect(AlternativeAndDynamicStaticPrivateMethodClass.callMethod("hello")).toBe("hello:orig");
      attach(AlternativeAndDynamicStaticPrivateMethodClass, "methodAltAndDynamic", (next, x) =>
        next(x + ":intercepted"),
      );
      expect(AlternativeAndDynamicStaticPrivateMethodClass.callMethod("hello")).toBe("hello:intercepted:orig");
      expect(tracks).toContainEqual({
        target: "methodAltAndDynamic",
        self: AlternativeAndDynamicStaticPrivateMethodClass,
      });
    });

    it("should work with dynamicKey and alternativeName on static private methods", () => {
      tracks.length = 0;

      @Hook
      class DynamicAndAlternativeStaticPrivateMethodClass {
        @hook(track("dynamicAndAlternativeStaticPrivateMethod"), "methodDynamicAndAlternative")
        static #method(x: string) {
          return x + ":orig";
        }

        static callMethod(x: string) {
          return this.#method(x);
        }
      }

      expect(DynamicAndAlternativeStaticPrivateMethodClass.callMethod("hello")).toBe("hello:orig");
      attach(DynamicAndAlternativeStaticPrivateMethodClass, "methodDynamicAndAlternative", (next, x) =>
        next(x + ":intercepted"),
      );
      expect(DynamicAndAlternativeStaticPrivateMethodClass.callMethod("hello")).toBe("hello:intercepted:orig");
      expect(tracks).toContainEqual({
        target: "dynamicAndAlternativeStaticPrivateMethod",
        self: DynamicAndAlternativeStaticPrivateMethodClass,
      });
    });

    it("should work with alternativeName only on static private accessors", () => {
      @Hook
      class AlternativeNameOnlyStaticPrivateAccessorClass {
        @hook("accAltOnly")
        static accessor #acc: string = "initial";

        static getAcc() {
          return this.#acc;
        }

        static setAcc(v: string) {
          this.#acc = v;
        }
      }

      expect(AlternativeNameOnlyStaticPrivateAccessorClass.getAcc()).toBe("initial");
      attach(AlternativeNameOnlyStaticPrivateAccessorClass, "get accAltOnly", (next) => next() + ":getMid");
      attach(AlternativeNameOnlyStaticPrivateAccessorClass, "set accAltOnly", (next, value) => next(value + ":setMid"));
      expect(AlternativeNameOnlyStaticPrivateAccessorClass.getAcc()).toBe("initial:getMid");
      AlternativeNameOnlyStaticPrivateAccessorClass.setAcc("updated");
      expect(AlternativeNameOnlyStaticPrivateAccessorClass.getAcc()).toBe("updated:setMid:getMid");
    });

    it("should work with dynamicKey only on static private accessors", () => {
      tracks.length = 0;

      @Hook
      class DynamicKeyOnlyStaticPrivateAccessorClass {
        @hook(track("dynamicOnlyStaticPrivateAccessor"))
        static accessor #acc: string = "initial";

        static getAcc() {
          return this.#acc;
        }

        static setAcc(v: string) {
          this.#acc = v;
        }
      }

      expect(DynamicKeyOnlyStaticPrivateAccessorClass.getAcc()).toBe("initial");
      attach(DynamicKeyOnlyStaticPrivateAccessorClass, "get #acc", (next) => next() + ":getMid");
      attach(DynamicKeyOnlyStaticPrivateAccessorClass, "set #acc", (next, value) => next(value + ":setMid"));
      expect(DynamicKeyOnlyStaticPrivateAccessorClass.getAcc()).toBe("initial:getMid");
      DynamicKeyOnlyStaticPrivateAccessorClass.setAcc("updated");
      expect(DynamicKeyOnlyStaticPrivateAccessorClass.getAcc()).toBe("updated:setMid:getMid");
      expect(tracks).toContainEqual({
        target: "dynamicOnlyStaticPrivateAccessor",
        self: DynamicKeyOnlyStaticPrivateAccessorClass,
      });
    });

    it("should work with alternativeName and dynamicKey on static private accessors", () => {
      tracks.length = 0;

      @Hook
      class AlternativeAndDynamicStaticPrivateAccessorClass {
        @hook("accAltAndDynamic", track("accAltAndDynamic"))
        static accessor #acc: string = "initial";

        static getAcc() {
          return this.#acc;
        }

        static setAcc(v: string) {
          this.#acc = v;
        }
      }

      expect(AlternativeAndDynamicStaticPrivateAccessorClass.getAcc()).toBe("initial");
      attach(AlternativeAndDynamicStaticPrivateAccessorClass, "get accAltAndDynamic", (next) => next() + ":getMid");
      attach(AlternativeAndDynamicStaticPrivateAccessorClass, "set accAltAndDynamic", (next, value) =>
        next(value + ":setMid"),
      );
      expect(AlternativeAndDynamicStaticPrivateAccessorClass.getAcc()).toBe("initial:getMid");
      AlternativeAndDynamicStaticPrivateAccessorClass.setAcc("updated");
      expect(AlternativeAndDynamicStaticPrivateAccessorClass.getAcc()).toBe("updated:setMid:getMid");
      expect(tracks).toContainEqual({
        target: "accAltAndDynamic",
        self: AlternativeAndDynamicStaticPrivateAccessorClass,
      });
    });

    it("should work with dynamicKey and alternativeName on static private accessors", () => {
      tracks.length = 0;

      @Hook
      class DynamicAndAlternativeStaticPrivateAccessorClass {
        @hook(track("dynamicAndAlternativeStaticPrivateAccessor"), "accDynamicAndAlternative")
        static accessor #acc: string = "initial";

        static getAcc() {
          return this.#acc;
        }

        static setAcc(v: string) {
          this.#acc = v;
        }
      }

      expect(DynamicAndAlternativeStaticPrivateAccessorClass.getAcc()).toBe("initial");
      attach(
        DynamicAndAlternativeStaticPrivateAccessorClass,
        "get accDynamicAndAlternative",
        (next) => next() + ":getMid",
      );
      attach(DynamicAndAlternativeStaticPrivateAccessorClass, "set accDynamicAndAlternative", (next, value) =>
        next(value + ":setMid"),
      );
      expect(DynamicAndAlternativeStaticPrivateAccessorClass.getAcc()).toBe("initial:getMid");
      DynamicAndAlternativeStaticPrivateAccessorClass.setAcc("updated");
      expect(DynamicAndAlternativeStaticPrivateAccessorClass.getAcc()).toBe("updated:setMid:getMid");
      expect(tracks).toContainEqual({
        target: "dynamicAndAlternativeStaticPrivateAccessor",
        self: DynamicAndAlternativeStaticPrivateAccessorClass,
      });
    });

    it("should work with alternativeName only on static private fields", () => {
      @Hook
      class AlternativeNameOnlyStaticPrivateFieldClass {
        @hook("fieldAltOnly")
        static #field = "initial";

        static getField() {
          return this.#field;
        }
      }

      expect(AlternativeNameOnlyStaticPrivateFieldClass.getField()).toBe("initial");
    });

    it("should work with dynamicKey only on static private fields", () => {
      tracks.length = 0;

      @Hook
      class DynamicKeyOnlyStaticPrivateFieldClass {
        @hook(track("dynamicOnlyStaticPrivateField"))
        static #field = "initial";

        static getField() {
          return this.#field;
        }
      }

      expect(DynamicKeyOnlyStaticPrivateFieldClass.getField()).toBe("initial");
      expect(tracks).toContainEqual({
        target: "dynamicOnlyStaticPrivateField",
        self: DynamicKeyOnlyStaticPrivateFieldClass,
      });
    });

    it("should work with alternativeName and dynamicKey on static private fields", () => {
      tracks.length = 0;

      @Hook
      class AlternativeAndDynamicStaticPrivateFieldClass {
        @hook("fieldAltAndDynamic", track("fieldAltAndDynamic"))
        static #field = "initial";

        static getField() {
          return this.#field;
        }
      }

      expect(AlternativeAndDynamicStaticPrivateFieldClass.getField()).toBe("initial");
      expect(tracks).toContainEqual({
        target: "fieldAltAndDynamic",
        self: AlternativeAndDynamicStaticPrivateFieldClass,
      });
    });

    it("should work with dynamicKey and alternativeName on static private fields", () => {
      tracks.length = 0;

      @Hook
      class DynamicAndAlternativeStaticPrivateFieldClass {
        @hook(track("dynamicAndAlternativeStaticPrivateField"), "fieldDynamicAndAlternative")
        static #field = "initial";

        static getField() {
          return this.#field;
        }
      }

      expect(DynamicAndAlternativeStaticPrivateFieldClass.getField()).toBe("initial");
      expect(tracks).toContainEqual({
        target: "dynamicAndAlternativeStaticPrivateField",
        self: DynamicAndAlternativeStaticPrivateFieldClass,
      });
    });

    it("should work with alternativeName only on static private getter/setter pairs", () => {
      @Hook
      class AlternativeNameOnlyStaticPrivateGetSetClass {
        static #value = "initial";

        @hook("valueAltOnly")
        static get #valueGet() {
          return this.#value;
        }

        @hook("valueAltOnly")
        static set #valueSet(v: string) {
          this.#value = v;
        }

        static getValue() {
          return this.#valueGet;
        }

        static setValue(v: string) {
          this.#valueSet = v;
        }
      }

      expect(AlternativeNameOnlyStaticPrivateGetSetClass.getValue()).toBe("initial");
      attach(AlternativeNameOnlyStaticPrivateGetSetClass, "get valueAltOnly", (next) => next() + ":getMid");
      attach(AlternativeNameOnlyStaticPrivateGetSetClass, "set valueAltOnly", (next, value) => next(value + ":setMid"));
      expect(AlternativeNameOnlyStaticPrivateGetSetClass.getValue()).toBe("initial:getMid");
      AlternativeNameOnlyStaticPrivateGetSetClass.setValue("updated");
      expect(AlternativeNameOnlyStaticPrivateGetSetClass.getValue()).toBe("updated:setMid:getMid");
    });

    it("should work with dynamicKey only on static private getter/setter pairs", () => {
      tracks.length = 0;

      @Hook
      class DynamicKeyOnlyStaticPrivateGetSetClass {
        static #value = "initial";

        @hook(track("dynamicOnlyStaticPrivateGetSet"))
        static get #valueGet() {
          return this.#value;
        }

        @hook(track("dynamicOnlyStaticPrivateGetSet"))
        static set #valueSet(v: string) {
          this.#value = v;
        }

        static getValue() {
          return this.#valueGet;
        }

        static setValue(v: string) {
          this.#valueSet = v;
        }
      }

      expect(DynamicKeyOnlyStaticPrivateGetSetClass.getValue()).toBe("initial");
      attach(DynamicKeyOnlyStaticPrivateGetSetClass, "get #valueGet", (next) => next() + ":getMid");
      attach(DynamicKeyOnlyStaticPrivateGetSetClass, "set #valueSet", (next, value) => next(value + ":setMid"));
      expect(DynamicKeyOnlyStaticPrivateGetSetClass.getValue()).toBe("initial:getMid");
      DynamicKeyOnlyStaticPrivateGetSetClass.setValue("updated");
      expect(DynamicKeyOnlyStaticPrivateGetSetClass.getValue()).toBe("updated:setMid:getMid");
      expect(tracks).toContainEqual({
        target: "dynamicOnlyStaticPrivateGetSet",
        self: DynamicKeyOnlyStaticPrivateGetSetClass,
      });
    });

    it("should work with alternativeName and dynamicKey on static private getter/setter pairs", () => {
      tracks.length = 0;

      @Hook
      class AlternativeAndDynamicStaticPrivateGetSetClass {
        static #value = "initial";

        @hook("valueAltAndDynamic", track("valueAltAndDynamic"))
        static get #valueGet() {
          return this.#value;
        }

        @hook("valueAltAndDynamic", track("valueAltAndDynamic"))
        static set #valueSet(v: string) {
          this.#value = v;
        }

        static getValue() {
          return this.#valueGet;
        }

        static setValue(v: string) {
          this.#valueSet = v;
        }
      }

      expect(AlternativeAndDynamicStaticPrivateGetSetClass.getValue()).toBe("initial");
      attach(AlternativeAndDynamicStaticPrivateGetSetClass, "get valueAltAndDynamic", (next) => next() + ":getMid");
      attach(AlternativeAndDynamicStaticPrivateGetSetClass, "set valueAltAndDynamic", (next, value) =>
        next(value + ":setMid"),
      );
      expect(AlternativeAndDynamicStaticPrivateGetSetClass.getValue()).toBe("initial:getMid");
      AlternativeAndDynamicStaticPrivateGetSetClass.setValue("updated");
      expect(AlternativeAndDynamicStaticPrivateGetSetClass.getValue()).toBe("updated:setMid:getMid");
      expect(tracks).toContainEqual({
        target: "valueAltAndDynamic",
        self: AlternativeAndDynamicStaticPrivateGetSetClass,
      });
    });

    it("should work with dynamicKey and alternativeName on static private getter/setter pairs", () => {
      tracks.length = 0;

      @Hook
      class DynamicAndAlternativeStaticPrivateGetSetClass {
        static #value = "initial";

        @hook(track("dynamicAndAlternativeStaticPrivateGetSet"), "valueDynamicAndAlternative")
        static get #valueGet() {
          return this.#value;
        }

        @hook(track("dynamicAndAlternativeStaticPrivateGetSet"), "valueDynamicAndAlternative")
        static set #valueSet(v: string) {
          this.#value = v;
        }

        static getValue() {
          return this.#valueGet;
        }

        static setValue(v: string) {
          this.#valueSet = v;
        }
      }

      expect(DynamicAndAlternativeStaticPrivateGetSetClass.getValue()).toBe("initial");
      attach(
        DynamicAndAlternativeStaticPrivateGetSetClass,
        "get valueDynamicAndAlternative",
        (next) => next() + ":getMid",
      );
      attach(DynamicAndAlternativeStaticPrivateGetSetClass, "set valueDynamicAndAlternative", (next, value) =>
        next(value + ":setMid"),
      );
      expect(DynamicAndAlternativeStaticPrivateGetSetClass.getValue()).toBe("initial:getMid");
      DynamicAndAlternativeStaticPrivateGetSetClass.setValue("updated");
      expect(DynamicAndAlternativeStaticPrivateGetSetClass.getValue()).toBe("updated:setMid:getMid");
      expect(tracks).toContainEqual({
        target: "dynamicAndAlternativeStaticPrivateGetSet",
        self: DynamicAndAlternativeStaticPrivateGetSetClass,
      });
    });
  });
});
