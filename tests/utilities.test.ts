import { describe, expect, it } from "vitest";

import type { IHookData } from "../src";
import { HOOK, attach, dynamicHookKey, getCurrentHookKeyContext, hook, hookUtils } from "../src";

describe("hooks: manual decorators", () => {
  it("should work with static methods", () => {
    let StaticMethodsClass = class StaticMethodsClass {
      static testStatic(x: string) {
        hook("subTestStatic", null)(x);
        return x + ":testStatic";
      }
    };

    StaticMethodsClass = hookUtils.method(StaticMethodsClass, "testStatic");

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

    FieldsClass = hookUtils.field(FieldsClass, "myField");

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

    MethodsClass = hookUtils.method(MethodsClass, "myMethod");

    const instance = new MethodsClass();
    const classHookData = (MethodsClass.prototype.myMethod as any)[HOOK] as IHookData;
    expect(classHookData).toBeDefined();
    expect(classHookData.name).toBe("myMethod");
    expect(classHookData.keyOrKeys).toBe(MethodsClass);

    const instanceHookData = (instance.myMethod as any)[HOOK] as IHookData;
    expect(instanceHookData).toBeDefined();
    expect(instanceHookData.name).toBe("myMethod");
    expect(instanceHookData.keyOrKeys).toEqual([instance, MethodsClass]);

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

    ConstructorCallClass = hookUtils.method(ConstructorCallClass, "myMethod");

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

    AccessorClass = hookUtils.accessor(AccessorClass, "myValue");

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

    AccessorClass = hookUtils.accessor(AccessorClass, "field");

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
    let StaticAccessorClass = hookUtils.class(
      class StaticAccessorClass {
        static field = 10;
      },
    );

    attach(StaticAccessorClass, "init fieldAlt", (next, value) => next(value + 1));
    attach(StaticAccessorClass, "get fieldAlt", (next) => next() * 2);
    attach(StaticAccessorClass, "set fieldAlt", (next, value) => next(value + 3));

    StaticAccessorClass = hookUtils.accessor(StaticAccessorClass, "field", "fieldAlt");

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

    AccessorsClass = hookUtils.getter(AccessorsClass, "myGetterSetter");
    AccessorsClass = hookUtils.setter(AccessorsClass, "myGetterSetter");

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

  it("hookAccessor should work with static accessors and should read private values", () => {
    const initVal = Symbol("initVal");
    attach(initVal, "init val", (next, value) => next(value + " init"));

    let Product = class Product {
      static #prv = " prv";

      static val: string = hook(initVal, "init val", (v: string) => {
        return v + this.#prv;
      })("test");
    };

    expect(Product.val).toBe("test init prv");

    Product = hookUtils.accessor(Product, "val");
    attach(Product, "get val", (next) => next() + " getter");
    attach(Product, "set val", (next, value) => next(value + " setter"));

    expect(Product.val).toBe("test init prv getter");
    Product.val = "mod";
    expect(Product.val).toBe("mod setter getter");
  });

  it("hookAccessor should not use init on static member before hookAccessor is applied", () => {
    let Product = class Product {
      static price: number = 0;
    };
    attach(Product, "init price", (next, value) => next(value + 1));
    Product = hookUtils.accessor(Product, "price");
    attach(Product, "get price", (next) => next() + 10);
    attach(Product, "set price", (next, value) => next(value + 20));

    expect(Product.price).toBe(10); // 0 + 10 = 10
    Product.price = 2;
    expect(Product.price).toBe(32); // 2 + 20 + 10 = 32
  });

  it("hookGetter & hookSetter should work with static setters and getters", () => {
    let Counter = class Counter {
      static #value = 0;

      static set value(next: number) {
        this.#value = next;
      }

      static get value() {
        return this.#value;
      }
    };

    expect(Counter.value).toBe(0);

    Counter = hookUtils.getter(Counter, "value");
    Counter = hookUtils.setter(Counter, "value");
    attach(Counter, "get value", (next) => next() + 1);
    attach(Counter, "set value", (next, value) => next(value + 1));
    expect(Counter.value).toBe(1);
    Counter.value = 2;
    expect(Counter.value).toBe(4); // 2 + 1 + 1 = 4
  });

  it("hookMethod should work with method and private access", () => {
    let Counter = class Counter {
      #privateValue = " private";
      myMethod(x: string) {
        return x + this.#privateValue;
      }
    };
    const instance = new Counter();
    expect(instance.myMethod("test")).toBe("test private");
    Counter = hookUtils.method(Counter, "myMethod");
    attach(Counter, "myMethod", (next, x) => next(x + " attached"));
    expect(instance.myMethod("test")).toBe("test attached private");
  });

  it("hookMethod should work with static method and private access", () => {
    let Counter = class Counter {
      static #privateValue = " private";
      static myMethod(x: string) {
        return x + this.#privateValue;
      }
    };
    expect(Counter.myMethod("test")).toBe("test private");
    Counter = hookUtils.method(Counter, "myMethod");
    attach(Counter, "myMethod", (next, x) => next(x + " attached"));
    expect(Counter.myMethod("test")).toBe("test attached private");
  });

  it("hookMethod middleware should not be applied when attached before hookMethod is used", () => {
    let MyClass = class MyClass {
      myMethod(x: string) {
        return x + ":original";
      }
    };
    const origin = MyClass;
    attach(MyClass, "myMethod", (next, x) => next(x + ":mid1"));
    MyClass = hookUtils.method(MyClass, "myMethod");
    const instance = new MyClass();
    expect(instance instanceof MyClass).toBe(true);
    expect(instance instanceof origin).toBe(true);
    expect(instance.myMethod("input")).toBe("input:original");
  });

  it("should work with dynamic hook keys for methods", () => {
    const dynamicThis: any[] = [];
    let DynamicHookClass = class DynamicHookClass {
      dynamicMethod(x: string) {
        hook("dynamicMethodSub", null)(x);
        return x + ":original";
      }
    };

    DynamicHookClass = hookUtils.method(
      DynamicHookClass,
      "dynamicMethod",
      dynamicHookKey(function (this: InstanceType<typeof DynamicHookClass>) {
        dynamicThis.push(this);
        return [this, DynamicHookClass];
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

    DynamicHookClass = hookUtils.accessor(
      DynamicHookClass,
      "myValue",
      dynamicHookKey(function (this: InstanceType<typeof DynamicHookClass>) {
        dynamicThis.push(this);
        return [this, DynamicHookClass];
      }),
    );
    DynamicHookClass = hookUtils.field(
      DynamicHookClass,
      "myField",
      dynamicHookKey(function (this: InstanceType<typeof DynamicHookClass>) {
        dynamicThis.push(this);
        return [this, DynamicHookClass];
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
      return [this, DynamicHookClass];
    });

    DynamicHookClass = hookUtils.getter(DynamicHookClass, "myValue", track);
    DynamicHookClass = hookUtils.setter(DynamicHookClass, "myValue", track);

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

    MyClass = hookUtils.method(
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

    InnerHooksClass = hookUtils.method(InnerHooksClass, "myMethod");

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

  it("should work with static fields and accessors when middleware is attached before decoration", () => {
    let StaticMembersClass = hookUtils.class(
      class StaticMembersClass {
        static staticField = "staticField";
        static accessor staticAcc: string = "staticAcc";
      },
    );

    attach(StaticMembersClass, "init staticFieldAlt", (next, value) => next(value + ":fieldInit"));
    attach(StaticMembersClass, "init staticAccAlt", (next, value) => next(value + ":accInit"));
    attach(StaticMembersClass, "get staticAccAlt", (next) => next() + ":getAcc");
    attach(StaticMembersClass, "set staticAccAlt", (next, value) => next(value + ":setAcc"));

    StaticMembersClass = hookUtils.field(StaticMembersClass, "staticField", "staticFieldAlt");
    StaticMembersClass = hookUtils.accessor(StaticMembersClass, "staticAcc", "staticAccAlt");

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

    expect(() => hookUtils.method(InvalidClass, "field")).toThrow("[hookUtils][method]");
    expect(() => hookUtils.getter(InvalidClass, "field")).toThrow("[hookUtils][getter]");
    expect(() => hookUtils.setter(InvalidClass, "field")).toThrow("[hookUtils][setter]");
    expect(() => hookUtils.accessor(InvalidClass, "onlyGetter")).toThrow("[hookUtils][accessor]");
    expect(() => hookUtils.field(InvalidClass, "constructor")).toThrow("[hookUtils][field]");
    expect(() => hookUtils.field(InvalidStaticFieldClass, "bad")).toThrow("[hookUtils][field]");
    expect(() => hookUtils.accessor(InvalidStaticFieldClass, "bad")).toThrow("[hookUtils][accessor]");
  });
});
