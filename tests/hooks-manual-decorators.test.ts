import { describe, expect, it } from "vitest";

import {
  HOOK,
  attach,
  composeHookKeys,
  Hooks,
  dynamicHookKey,
  getCurrentHookKeyContext,
  HookDecoratorBuilder,
  hook,
  hookAccessor,
  hookClass,
  hookField,
  hookGetter,
  hookMethod,
  hookSetter,
} from "../src";

describe("hooks: manual decorators", () => {
  it("should work with static methods", () => {
    let StaticMethodsClass = class StaticMethodsClass {
      static testStatic(x: string) {
        hook("subTestStatic", null)(x);
        return x + ":testStatic";
      }
    };

    StaticMethodsClass = hookMethod(StaticMethodsClass, "testStatic");

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

  it("should work with fields", () => {
    let FieldsClass = class FieldsClass {
      myField = "myFieldValue";
    };

    FieldsClass = hookField(FieldsClass, "myField");

    const instance = new FieldsClass();
    expect(instance.myField).toBe("myFieldValue");

    const detach1 = attach(FieldsClass, "init myField", (next, value) => {
      return next(value + ":initMid1");
    });
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
    let MethodsClass = class MethodsClass {
      myMethod(x: string) {
        hook("myMethodSub", null)(x);
        return x + ":original";
      }
    };

    MethodsClass = hookMethod(MethodsClass, "myMethod");

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

  it("should lazily create the instance method hook when a decorated method is used during construction", () => {
    const calls: string[] = [];
    let ConstructorCallClass = class ConstructorCallClass {
      constructor() {
        calls.push(this.myMethod("x"));
      }

      myMethod(x: string) {
        return x + ":original";
      }
    };

    ConstructorCallClass = hookMethod(ConstructorCallClass, "myMethod");

    attach(ConstructorCallClass, "myMethod", (next, x) => {
      return next(x + ":class");
    });

    const instance = new ConstructorCallClass();
    expect(calls).toEqual(["x:class:original"]);
    expect(Object.prototype.hasOwnProperty.call(instance, "myMethod")).toBe(true);

    const prototypeGetter = Object.getOwnPropertyDescriptor(ConstructorCallClass.prototype, "myMethod")!.get!;
    expect(prototypeGetter.call(instance)).toBe(instance.myMethod);
  });

  it("should work with accessor decorators", () => {
    let AccessorClass = class AccessorClass {
      accessor myValue: string = "initial";
    };

    AccessorClass = hookAccessor(AccessorClass, "myValue");

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
    expect(instance1.myValue).toBe("finalValue:setMid1:setMid2:getMid1:getMid2");
  });

  it("should create accessors for plain instance fields", () => {
    let AccessorClass = class AccessorClass {
      field: any = 10;
    };

    AccessorClass = hookAccessor(AccessorClass, "field");

    expect(new AccessorClass().field).toBe(10);

    attach(AccessorClass, "init field", (next, value) => next(value + 1));
    attach(AccessorClass, "get field", (next) => next() * 2);

    const instance = new AccessorClass();
    expect(instance.field).toBe(22);

    attach(instance, "set field", (next, value) => next(value + 3));
    instance.field = 7;
    expect(instance.field).toBe(20);
  });

  it("should create accessors for plain static fields", () => {
    let StaticAccessorClass = hookClass(
      class StaticAccessorClass {
        static field = 10;
      },
    );

    attach(StaticAccessorClass, "init fieldAlt", (next, value) => next(value + 1));
    attach(StaticAccessorClass, "get fieldAlt", (next) => next() * 2);
    attach(StaticAccessorClass, "set fieldAlt", (next, value) => next(value + 3));

    StaticAccessorClass = hookAccessor(StaticAccessorClass, "field", "fieldAlt");

    expect(StaticAccessorClass.field).toBe(22);
    StaticAccessorClass.field = 7;
    expect(StaticAccessorClass.field).toBe(20);
  });

  it("should work with accessors", () => {
    let AccessorsClass = class AccessorsClass {
      #getterSetterValue: string = "myGetterSetterValue";

      get myGetterSetter() {
        hook("myGetterSetterSub", null)();
        return this.#getterSetterValue;
      }

      set myGetterSetter(value: string) {
        hook("myGetterSetterSub", null)();
        this.#getterSetterValue = value;
      }
    };

    AccessorsClass = hookSetter(hookGetter(AccessorsClass, "myGetterSetter"), "myGetterSetter");

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
    expect(subCalled).toBe(4);

    const detach3 = attach(instance, "set myGetterSetter", (next, value) => {
      return next(value + ":setMid1");
    });
    instance.myGetterSetter = "anotherValue";
    expect(instance.myGetterSetter).toBe("anotherValue:setMid1:getMid2:getMid1");
    expect(subCalled).toBe(6);

    const detach4 = attach(AccessorsClass, "set myGetterSetter", (next, value) => {
      return next(value + ":setMid2");
    });
    instance.myGetterSetter = "finalValue";
    expect(instance.myGetterSetter).toBe("finalValue:setMid1:setMid2:getMid2:getMid1");
    expect(subCalled).toBe(8);

    detach1();
    detach2();
    detach3();
    detach4();
    detachSub();
    instance.myGetterSetter = "resetValue";
    expect(instance.myGetterSetter).toBe("resetValue");
    expect(subCalled).toBe(8);
  });

  it("should work with dynamic hook keys for methods", () => {
    const dynamicThis: any[] = [];
    let DynamicHookClass = class DynamicHookClass {
      dynamicMethod(x: string) {
        hook("dynamicMethodSub", null)(x);
        return x + ":original";
      }
    };

    DynamicHookClass = hookMethod(
      DynamicHookClass,
      "dynamicMethod",
      dynamicHookKey(function (this: InstanceType<typeof DynamicHookClass>) {
        dynamicThis.push(this);
        return composeHookKeys(this, DynamicHookClass);
      }),
    );

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

    expect(instance.dynamicMethod("input")).toBe("input:mid3:mid1:mid2:original");
    expect(subCalled).toBe(1);
    expect(dynamicThis).toEqual([instance, instance]);
  });

  it("should work with dynamic hook keys for accessors and fields", () => {
    const dynamicThis: any[] = [];
    let DynamicHookClass = class DynamicHookClass {
      accessor myValue: string = "initial";
      myField: string = "field";
    };

    DynamicHookClass = hookField(
      hookAccessor(
        DynamicHookClass,
        "myValue",
        dynamicHookKey(function (this: InstanceType<typeof DynamicHookClass>) {
          dynamicThis.push(this);
          return composeHookKeys(this, DynamicHookClass);
        }),
      ),
      "myField",
      dynamicHookKey(function (this: InstanceType<typeof DynamicHookClass>) {
        dynamicThis.push(this);
        return composeHookKeys(this, DynamicHookClass);
      }),
    );

    attach(DynamicHookClass, "init myValue", (next, value) => {
      return next(value + ":initAcc");
    });
    attach(DynamicHookClass, "init myField", (next, value) => {
      return next(value + ":initField");
    });
    attach(DynamicHookClass, "get myValue", (next) => {
      return next() + ":getClass";
    });

    const instance = new DynamicHookClass();
    expect(instance.myValue).toBe("initial:initAcc:getClass");
    expect(instance.myField).toBe("field:initField");
    expect(dynamicThis).toEqual([instance, instance, instance]);

    attach(instance, "get myValue", (next) => {
      return next() + ":getInstance";
    });
    attach(instance, "set myValue", (next, value) => {
      return next(value + ":setInstance");
    });
    instance.myValue = "next";
    expect(instance.myValue).toBe("next:setInstance:getClass:getInstance");
  });

  it("should work with dynamic hook keys for separate getters and setters", () => {
    const dynamicThis: any[] = [];
    let DynamicHookClass = class DynamicHookClass {
      #value: string = "initial";

      get myValue() {
        hook("myValueGetSub", null)();
        return this.#value;
      }

      set myValue(value: string) {
        hook("myValueSetSub", null)();
        this.#value = value;
      }
    };

    const track = dynamicHookKey(function (this: InstanceType<typeof DynamicHookClass>) {
      dynamicThis.push(this);
      return composeHookKeys(this, DynamicHookClass);
    });

    DynamicHookClass = hookSetter(hookGetter(DynamicHookClass, "myValue", track), "myValue", track);

    const instance = new DynamicHookClass();
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
  });

  it("should get the correct hook key from instance inside dynamicHookKey", () => {
    let MyClass = class MyClass {
      myKey = Symbol("myKey");

      myMethod() {
        return "ok";
      }
    };

    MyClass = hookMethod(
      MyClass,
      "myMethod",
      dynamicHookKey(function (this: InstanceType<typeof MyClass>) {
        return this.myKey;
      }),
    );

    const instance = new MyClass();
    expect(instance.myMethod()).toBe("ok");

    attach(instance.myKey, "myMethod", (next) => "intercepted " + next());

    expect(instance.myMethod()).toBe("intercepted ok");
  });

  it("should work with hooks inside middlewares", () => {
    let InnerHooksClass = class InnerHooksClass {
      myMethod(x: string) {
        expect([...(getCurrentHookKeyContext() as any)]).toEqual([this, this.constructor]);
        return x + ":original";
      }
    };

    InnerHooksClass = hookMethod(InnerHooksClass, "myMethod");

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

  it("should expose a builder class and support overloads for fluent decoration", () => {
    let BuilderClass = class BuilderClass {
      field = "field";
      acc: string = "initial";

      method(x: string) {
        return x + ":orig";
      }

      get value() {
        return "value";
      }

      set value(v: string) {
        void v;
      }
    };

    const builder = Hooks(BuilderClass);
    expect(builder).toBeInstanceOf(HookDecoratorBuilder);

    const decorated = builder
      .method("method", "methodAlt")
      .field("field", "fieldAlt")
      .accessor("acc", "accAlt")
      .getter("value", "valueAlt")
      .setter("value", "valueAlt")
      .build();

    expect(decorated).not.toBe(BuilderClass);
    const instance = new decorated();
    expect(instance).toBeInstanceOf(BuilderClass);
  });

  it("should work with alternative names and builder DX", () => {
    let MixedClass = class MixedClass {
      static staticValueStore = "staticInitial";
      #value = "initial";

      field = "field";
      acc: string = "initialAcc";

      method(x: string) {
        return x + ":orig";
      }

      static staticMethod(x: string) {
        return x + ":staticOrig";
      }

      get value() {
        return this.#value;
      }

      set value(v: string) {
        this.#value = v;
      }

      static get staticVal() {
        return this.staticValueStore;
      }

      static set staticVal(v: string) {
        this.staticValueStore = v;
      }
    };

    MixedClass = Hooks(MixedClass)
      .method("method", "methodAlt")
      .method("staticMethod", "staticMethodAlt")
      .field("field", "fieldAlt")
      .accessor("acc", "accAlt")
      .getter("value", "valueAlt")
      .setter("value", "valueAlt")
      .getter("staticVal", "staticGetAlt")
      .setter("staticVal", "staticSetAlt")
      .build();

    const instance = new MixedClass();

    attach(MixedClass, "methodAlt", (next, x) => next(x + ":classMid"));
    attach(instance, "methodAlt", (next, x) => next(x + ":instanceMid"));
    attach(MixedClass, "staticMethodAlt", (next, x) => next(x + ":staticMid"));
    attach(MixedClass, "init fieldAlt", (next, value) => next(value + ":fieldInit"));
    attach(MixedClass, "init accAlt", (next, value) => next(value + ":accInit"));
    attach(instance, "get accAlt", (next) => next() + ":getAcc");
    attach(instance, "set accAlt", (next, value) => next(value + ":setAcc"));
    attach(instance, "get valueAlt", (next) => next() + ":getValue");
    attach(instance, "set valueAlt", (next, value) => next(value + ":setValue"));
    attach(MixedClass, "get staticGetAlt", (next) => next() + ":staticGet");
    attach(MixedClass, "set staticSetAlt", (next, value) => next(value + ":staticSet"));

    expect(instance.method("input")).toBe("input:instanceMid:classMid:orig");
    expect(MixedClass.staticMethod("input")).toBe("input:staticMid:staticOrig");

    const initialized = new MixedClass();
    expect(initialized.field).toBe("field:fieldInit");
    expect(initialized.acc).toBe("initialAcc:accInit");

    expect(instance.acc).toBe("initialAcc:getAcc");
    instance.acc = "updatedAcc";
    expect(instance.acc).toBe("updatedAcc:setAcc:getAcc");

    expect(instance.value).toBe("initial:getValue");
    instance.value = "updatedValue";
    expect(instance.value).toBe("updatedValue:setValue:getValue");

    expect(MixedClass.staticVal).toBe("staticInitial:staticGet");
    MixedClass.staticVal = "updatedStatic";
    expect(MixedClass.staticVal).toBe("updatedStatic:staticSet:staticGet");
  });

  it("should work with static fields and accessors when middleware is attached before decoration", () => {
    let StaticMembersClass = hookClass(
      class StaticMembersClass {
        static staticField = "staticField";
        static accessor staticAcc: string = "staticAcc";
      },
    );

    attach(StaticMembersClass, "init staticFieldAlt", (next, value) => next(value + ":fieldInit"));
    attach(StaticMembersClass, "init staticAccAlt", (next, value) => next(value + ":accInit"));
    attach(StaticMembersClass, "get staticAccAlt", (next) => next() + ":getAcc");
    attach(StaticMembersClass, "set staticAccAlt", (next, value) => next(value + ":setAcc"));

    StaticMembersClass = hookField(StaticMembersClass, "staticField", "staticFieldAlt");
    StaticMembersClass = hookAccessor(StaticMembersClass, "staticAcc", "staticAccAlt");

    expect(StaticMembersClass.staticField).toBe("staticField:fieldInit");
    expect(StaticMembersClass.staticAcc).toBe("staticAcc:accInit:getAcc");
    StaticMembersClass.staticAcc = "next";
    expect(StaticMembersClass.staticAcc).toBe("next:setAcc:getAcc");
  });

  it("should reject invalid manual member kinds", () => {
    class InvalidClass {
      field = "field";

      get onlyGetter() {
        return this.field;
      }
    }

    class InvalidStaticFieldClass {
      static bad() {
        return "bad";
      }
    }

    expect(() => hookMethod(InvalidClass, "field")).toThrow("hookMethod");
    expect(() => hookGetter(InvalidClass, "field")).toThrow("hookGetter");
    expect(() => hookSetter(InvalidClass, "field")).toThrow("hookSetter");
    expect(() => hookAccessor(InvalidClass, "onlyGetter")).toThrow("hookAccessor");
    expect(() => hookField(InvalidClass, "constructor")).toThrow("hookField");
    expect(() => hookField(InvalidStaticFieldClass, "bad")).toThrow("hookField");
    expect(() => hookAccessor(InvalidStaticFieldClass, "bad")).toThrow("hookAccessor");
  });
});
