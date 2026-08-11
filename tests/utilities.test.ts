import { describe, expect, it } from "vitest";

import type { IHookData } from "../src";
import {
  HOOK_DATA,
  attach,
  dynamicHookKey,
  getCurrentHookKeyContext,
  hook,
  HOOK_CLASS_STATE,
  HookKeyDynamic,
  dhk,
} from "../src";

describe("hooks: class utilities", () => {
  describe("class", () => {
    it("should create hook class state", () => {
      class MyClass {}
      hook.class(MyClass);
      const state = (MyClass as any)[HOOK_CLASS_STATE];
      expect(state).toBeDefined();
    });

    it("should have the same name as the original class", () => {
      const MyClass = hook.class(class MyClass {});
      expect(MyClass.name).toBe("MyClass");
    });

    it("should work with instanceof & constructor", () => {
      class Original {}
      const MyClass = hook.class(Original);
      const instance = new MyClass();
      expect(instance instanceof MyClass).toBe(true);
      expect(instance instanceof Original).toBe(true);
      expect(instance.constructor).toBe(Original);
    });

    it("prototype should be the same as the original class", () => {
      const original = class MyClass {};
      const MyClass = hook.class(original);
      expect(MyClass.prototype).toBe(original.prototype);
    });

    it("should have exact the same static members as the original class", () => {
      const original = class MyClass {
        static staticValue = {};
      };
      const MyClass = hook.class(original);
      expect(MyClass.staticValue).toBe(original.staticValue);
    });

    it("inherit function should return proper class hierarchy", () => {
      class O1 {}
      const A = hook.class(O1);

      const aa = new A();
      expect(hook.inherit(aa)).toEqual([aa, O1]);

      class B extends A {}
      class C extends B {}
      class D extends C {}
      const d = new D();
      expect(hook.inherit(d)).toEqual([d, D, C, B, O1]); // only instance & hooked classes are returned
      expect(hook.inherit(A)).toEqual([O1]);
      const a = new A();
      expect(hook.inherit(a)).toEqual([a, O1]);

      class O2 {}
      class A2O extends O2 {}
      const A2 = hook.class(A2O);
      class B2O extends A2 {}
      const B2 = hook.class(B2O);
      class C2O extends B2 {}
      const C2 = hook.class(C2O);
      const c2 = new C2();
      expect(hook.inherit(c2)).toEqual([c2, C2O, B2O, A2O, O2]);
      expect(hook.inherit(B2)).toEqual([B2O, A2O, O2]);
      expect(hook.inherit(B2O)).toEqual([B2O, A2O, O2]);
      const b20 = new B2O();
      expect(hook.inherit(b20)).toEqual([b20, B2O, A2O, O2]);

      class O3 {}
      class A3 extends O3 {}
      class B3 extends A3 {}
      class C3 extends B3 {}
      class D3 extends C3 {}
      const D3Hooked = hook.class(D3);
      const d3Hooked = new D3Hooked();
      expect(hook.inherit(d3Hooked)).toEqual([d3Hooked, D3, C3, B3, A3, O3]);

      let inherited: any[] = [];
      let constructorInherited: any[] = [];

      class Dyn {
        constructor() {
          constructorInherited = hook.inherit(this);
        }

        myMethod = hook(
          dhk(function (this: any) {
            inherited = hook.inherit(this);
            return inherited;
          }),
          "test",
          () => {},
        );
      }
      const dyn = new Dyn();
      dyn.myMethod();
      expect(inherited).toEqual([dyn, Dyn]);
      expect(constructorInherited).toEqual([dyn, Dyn]);

      inherited = [];
      constructorInherited = [];
      const DynHooked = hook.class(Dyn);
      const dynHooked = new DynHooked();
      dynHooked.myMethod();
      expect(inherited).toEqual([dynHooked, Dyn]);
      expect(constructorInherited).toEqual([dynHooked, Dyn]);
    });

    it("should work with sub-classing", () => {
      class MyClass {
        method() {
          return "ok";
        }

        static staticMethod() {
          return "ok";
        }
      }

      const original = new MyClass();
      expect(original.method()).toBe("ok");
      expect(MyClass.staticMethod()).toBe("ok");

      hook.method(MyClass, "method");

      attach(MyClass, "method", (next) => next() + " MyClass_mid");

      expect(original.method()).toBe("ok MyClass_mid");

      const myClassInstance = new MyClass();
      expect(myClassInstance.method()).toBe("ok MyClass_mid");

      class SubClass extends MyClass {}
      const subClassInstance = new SubClass();

      expect(subClassInstance instanceof SubClass).toBe(true);
      expect(subClassInstance instanceof MyClass).toBe(true);

      attach(MyClass, "method", (next) => next() + " MyClass_mid2");

      expect(subClassInstance.method()).toBe("ok MyClass_mid2 MyClass_mid");

      attach(SubClass, "method", (next) => next() + " subMid");

      expect(subClassInstance.method()).toBe("ok MyClass_mid2 MyClass_mid subMid");

      attach(SubClass, "method", (_next) => "short-circuit");

      expect(subClassInstance.method()).toBe("short-circuit subMid");
    });
  });

  describe("fields", () => {
    it("should work with instance fields", () => {
      class FieldsClass {
        myField = "myFieldValue";

        constructor() {
          hook.init(this);
        }
      }

      hook.field(FieldsClass, "myField");

      const instance = new FieldsClass();
      expect(instance.myField).toBe("myFieldValue");

      const detach1 = attach(FieldsClass, "init myField", (next, value) => {
        return next(value + " initMid1");
      });
      const detach2 = hook.attach(instance, "init myField", (next, value) => {
        return next(value + " initMid2");
      });
      expect(instance.myField).toBe("myFieldValue");

      expect(new FieldsClass().myField).toBe("myFieldValue initMid1");

      detach1();
      detach2();
      expect(new FieldsClass().myField).toBe("myFieldValue");
    });

    it("should work with static fields", () => {
      // class must be decorated before middleware is attached to get proper class
      let StaticMembersClass = hook.class(
        class Origin {
          static staticField = "staticField";
        },
      );

      // need to be declared before hookUtils.field is called, otherwise the init hook will not be called
      attach(StaticMembersClass, "static init staticFieldAlt", (next, value) => next(value + ":fieldInit"));

      hook.field(StaticMembersClass, "staticField", "staticFieldAlt");

      expect(StaticMembersClass.staticField).toBe("staticField:fieldInit");
    });

    it("should work with dynamic hook keys & alternative name for instance fields", () => {
      const dynamicThis: any[] = [];

      const DynamicHookClass = hook.class(
        class {
          myValue: string = "initial";
          constructor() {
            hook.init(this);
          }
        },
      );

      hook.field(
        DynamicHookClass,
        "myValue",
        "myValueAlt",
        dynamicHookKey(function (this: InstanceType<typeof DynamicHookClass>) {
          dynamicThis.push(this);
          return hook.inherit(this);
        }),
      );

      attach(DynamicHookClass, "init myValue", (next, value) => {
        return next(value + ":ERROR");
      });

      attach(DynamicHookClass, "init myValueAlt", (next, value) => {
        return next(value + ":initAcc");
      });

      const instance = new DynamicHookClass();
      expect(instance.myValue).toBe("initial:initAcc");
      expect(dynamicThis).toEqual([instance]);

      instance.myValue = "next";

      expect(instance.myValue).toBe("next");
      expect(dynamicThis).toEqual([instance]);
    });

    it("should work with dynamic hook keys & alternative name for static fields", () => {
      const dynamicThis: any[] = [];
      class Origin {
        static myValue: string = "initial";
      }
      const DynamicHookClass = hook.class(Origin);

      attach(DynamicHookClass, "static init myValue", (next, value) => {
        return next(value + ":ERROR");
      });

      attach(DynamicHookClass, "static init myValueAlt", (next, value) => {
        return next(value + ":initAcc");
      });

      expect(Origin.myValue).toBe("initial");

      hook.field(
        DynamicHookClass,
        "static myValue",
        "myValueAlt",
        dynamicHookKey(function (this: typeof DynamicHookClass) {
          dynamicThis.push(this);
          return hook.inherit(this);
        }),
      );

      expect(DynamicHookClass.myValue).toBe("initial:initAcc");
      expect(dynamicThis).toEqual([DynamicHookClass]);

      DynamicHookClass.myValue = "next";

      expect(DynamicHookClass.myValue).toBe("next");
      expect(dynamicThis).toEqual([DynamicHookClass]);
    });

    it("should throw if field is called on getter, setter, method or constructor", () => {
      const TestClass = hook.class(
        class TestClass {
          get g() {
            return 8;
          }
          set s(v: any) {}
          method() {}
        },
      );
      expect(() => hook.field(TestClass, "g")).toThrow("field");
      expect(() => hook.field(TestClass, "s")).toThrow("field");
      expect(() => hook.field(TestClass, "method")).toThrow("field");
      expect(() => hook.field(TestClass, "constructor")).toThrow("field");
    });
  });

  describe("accessors", () => {
    it("should work with instance accessor decorators", () => {
      class Origin {
        myValue: string = "initial";
        constructor() {
          hook.init(this);
        }
      }
      const AccessorClass = hook.class(Origin);

      hook.accessor(AccessorClass, "myValue");

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

    it("should work with static accessors decorators", () => {
      class StaticAccessorClass {
        static field = 10;
      }

      attach(StaticAccessorClass, "static init fieldAlt", (next, value) => next(value + 1));
      attach(StaticAccessorClass, "static get fieldAlt", (next) => next() * 2);
      attach(StaticAccessorClass, "static set fieldAlt", (next, value) => next(value + 3));

      hook.accessor(StaticAccessorClass, "static field", "fieldAlt");

      expect(StaticAccessorClass.field).toBe(22);
      StaticAccessorClass.field = 7;
      expect(StaticAccessorClass.field).toBe(20);
    });

    it("should work with dynamic hook keys for accessors", () => {
      const dynamicThis: any[] = [];

      class DynamicHookClass {
        myValue: string = "initial";
        constructor() {
          hook.init(this);
        }
      }

      hook.accessor(
        DynamicHookClass,
        "myValue",
        dynamicHookKey(function (this: InstanceType<typeof DynamicHookClass>) {
          dynamicThis.push(this);
          return hook.inherit(this);
        }),
      );

      attach(DynamicHookClass, "init myValue", (next, value) => {
        return next(value + ":initAcc");
      });
      attach(DynamicHookClass, "get myValue", (next) => {
        return next() + ":getClass";
      });
      attach(DynamicHookClass, "set myValue", (next, value) => {
        return next(value + ":setClass");
      });

      const instance = new DynamicHookClass();
      expect(instance.myValue).toBe("initial:initAcc:getClass");
      expect(dynamicThis).toEqual([instance, instance]);

      instance.myValue = "next";

      expect(instance.myValue).toBe("next:setClass:getClass");
      expect(dynamicThis).toEqual([instance, instance, instance, instance]);

      attach(instance, "get myValue", (next) => {
        return next() + ":getInstance";
      });
      attach(instance, "set myValue", (next, value) => {
        return next(value + ":setInstance");
      });
      instance.myValue = "nextI";
      expect(instance.myValue).toBe("nextI:setInstance:setClass:getClass:getInstance");
      expect(dynamicThis).toEqual([instance, instance, instance, instance, instance, instance]);
    });

    it("accessor should work with static accessors and should read private values", () => {
      const initVal = Symbol("initVal");
      attach(initVal, "static init val", (next, value) => next(value + " init"));

      let Product = class Product {
        static #prv = " prv";

        static val: string = hook(initVal, "static init val", (v: string) => {
          return v + this.#prv;
        })("test");
      };

      expect(Product.val).toBe("test init prv");

      Product = hook.accessor(Product, "static val");
      attach(Product, "static get val", (next) => next() + " getter");
      attach(Product, "static set val", (next, value) => next(value + " setter"));

      expect(Product.val).toBe("test init prv getter");
      Product.val = "mod";
      expect(Product.val).toBe("mod setter getter");
    });

    it("accessor should inherit init on static member", () => {
      class _Product_ {
        static price: number = 0;
      }

      attach(_Product_, "static init price", (next, value) => next(value + 1));

      const Product = hook.class(_Product_);
      hook.accessor(Product, "static price");

      attach(Product, "static get price", (next) => next() + 10);
      attach(Product, "static set price", (next, value) => next(value + 20));

      expect(Product.price).toBe(11); // 0 + 1 + 10 = 11
      Product.price = 2;
      expect(Product.price).toBe(32); // 2 + 20 + 10 = 32
    });

    // TODO: accessor with getter & setter on instance & static
  });

  describe("getters and setters", () => {
    it("hookGetter & hookSetter should work with static setters and getters", () => {
      class Counter {
        static #value = 0;

        static set value(next: number) {
          this.#value = next;
        }

        static get value() {
          return this.#value;
        }
      }

      expect(Counter.value).toBe(0);

      hook.class(Counter, "static get value");

      //hook.setter(Counter, "value");
      attach(Counter, "static get value", (next) => next() + 1);
      //attach(Counter, "set value", (next, value) => next(value + 1));
      expect(Counter.value).toBe(1);
      // Counter.value = 2;
      // expect(Counter.value).toBe(4); // 2 + 1 + 1 = 4
    });

    it("should work with getters&setters and private fields", () => {
      const AccessorsClass = hook.class(
        class AccessorsClass {
          #getterSetterValue: string = "myGetterSetterValue";

          get myGetterSetter() {
            hook("myGetterSetterSub", null)();
            return this.#getterSetterValue;
          }

          set myGetterSetter(value: string) {
            hook("myGetterSetterSub", null)();
            this.#getterSetterValue = value;
          }
        },
      );

      hook.getter(AccessorsClass, "myGetterSetter");
      hook.setter(AccessorsClass, "myGetterSetter");

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

      DynamicHookClass = hook.getter(DynamicHookClass, "myValue", track);
      DynamicHookClass = hook.setter(DynamicHookClass, "myValue", track);

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
  });

  describe("methods", () => {
    it("should work with static methods", () => {
      class Origin {
        static testStatic(x: string) {
          hook("subTestStatic", null)(x);
          return x + ":testStatic";
        }
      }

      const StaticMethodsClass = hook.method(Origin, "static testStatic");

      expect(StaticMethodsClass.testStatic("x")).toBe("x:testStatic");

      const subLogs: string[] = [];
      const detachSub = attach(StaticMethodsClass, "subTestStatic", (next, x) => {
        subLogs.push(x);
        return next(x + ":sub");
      });

      const detach1 = attach(StaticMethodsClass, "static testStatic", (next, x) => {
        return next(x + ":mid1");
      });

      const detach2 = attach(StaticMethodsClass.testStatic, (next, x) => {
        return next(x + ":mid2");
      });

      const keys = (StaticMethodsClass.testStatic as any)[HOOK_DATA].keyOrKeys;

      expect(keys).toEqual(hook.inherit(StaticMethodsClass));

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

    it("should work with methods and sub-hooks", () => {
      class Origin {
        myMethod(x: string) {
          hook("myMethodSub", null)(x);
          return x + ":original";
        }
      }

      const MethodsClass = hook.method(Origin, "myMethod");

      const instance = new MethodsClass();
      const classHookData = (MethodsClass.prototype.myMethod as any)[HOOK_DATA] as IHookData;

      expect(classHookData).toBeDefined();
      expect(classHookData.name).toBe("myMethod");
      expect(classHookData.keyOrKeys).toBeInstanceOf(HookKeyDynamic);

      const instanceHookData = (instance.myMethod as any)[HOOK_DATA] as IHookData;
      expect(instanceHookData).toBeDefined();
      expect(instanceHookData.name).toBe("myMethod");

      expect(instanceHookData.keyOrKeys).toBeInstanceOf(HookKeyDynamic);

      expect(instance.myMethod("a")).toBe("a:original");
      const logs: string[] = [];
      attach(instance, "myMethod", (next, x) => {
        logs.push(`instance middleware #1 called with ${x}`);
        return next(x + ":mid1");
      });
      expect(instance.myMethod("a")).toBe("a:mid1:original");

      let subInstanceCalledWith: string[] = [];
      attach(instance, "myMethodSub", (next, x) => {
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

      attach(MethodsClass, "myMethod", (next, x) => {
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

    it("should work when a decorated method is used during construction", () => {
      const calls: string[] = [];
      class Origin {
        constructor() {
          calls.push(this.myMethod("x"));
        }

        myMethod(x: string) {
          return x + ":original";
        }
      }

      const ConstructorCallClass = hook.class(Origin);
      expect((Origin as any)[HOOK_CLASS_STATE]).toBeDefined();

      hook.method(ConstructorCallClass, "myMethod");

      attach(ConstructorCallClass, "myMethod", (next, x) => {
        return next(x + ":class");
      });

      const instance = new ConstructorCallClass();

      expect(calls).toEqual(["x:class:original"]);
      expect(Object.hasOwn(instance, "myMethod")).toBe(false);
    });

    it("hookMethod should work with method and private access", () => {
      class Origin {
        #privateValue = " private";
        myMethod(x: string) {
          return x + this.#privateValue;
        }
      }
      const instance = new Origin();
      expect(instance.myMethod("test")).toBe("test private");

      hook.method(Origin, "myMethod");

      attach(Origin, "myMethod", (next, x) => next(x + " attached"));

      // attached because the prototype was changed
      expect(instance.myMethod("test")).toBe("test attached private");

      attach(Origin, "myMethod", (next, x) => next(x + " origin_affected"));
      expect(instance.myMethod("test")).toBe("test attached origin_affected private");

      const afterInstance = new Origin();
      expect(afterInstance.myMethod("test")).toBe("test attached origin_affected private");
    });

    it("hookMethod should work with static method and private access", () => {
      let Counter = class Counter {
        static #privateValue = " private";
        static myMethod(x: string) {
          return x + this.#privateValue;
        }
      };
      expect(Counter.myMethod("test")).toBe("test private");
      Counter = hook.method(Counter, "static myMethod");
      attach(Counter, "static myMethod", (next, x) => next(x + " attached"));
      expect(Counter.myMethod("test")).toBe("test attached private");
    });

    it("instanceof should work on both Proxy and Origin", () => {
      class Origin {
        myMethod(x: string) {
          return x + ":original";
        }
      }
      attach(Origin, "myMethod", (next, x) => next(x + ":mid1"));
      const MyClass = hook.method(Origin, "myMethod");
      const instance = new MyClass();
      expect(instance instanceof MyClass).toBe(true);
      expect(instance instanceof Origin).toBe(true);
      expect(instance.constructor).toBe(Origin);
      expect(Origin.prototype).toBe(MyClass.prototype);
      expect(instance.myMethod("input")).toBe("input:mid1:original");
    });

    it("should work with dynamic hook keys for methods", () => {
      const dynamicThis: any[] = [];
      let DynamicHookClass = class DynamicHookClass {
        dynamicMethod(x: string) {
          hook("dynamicMethodSub", null)(x);
          return x + ":original";
        }
      };

      DynamicHookClass = hook.method(
        DynamicHookClass,
        "dynamicMethod",
        dynamicHookKey(function (this: InstanceType<typeof DynamicHookClass>) {
          dynamicThis.push(this);
          return hook.inherit(this);
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

      expect(() =>
        attach(DynamicHookClass.prototype.dynamicMethod, (next, x) => {
          return next(x + ":mid2");
        }),
      ).toThrow("dynamic");

      attach(DynamicHookClass, "dynamicMethod", (next, x) => {
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

    it("should get the correct hook key from instance inside dynamicHookKey", () => {
      let MyClass = class MyClass {
        myKey = Symbol("myKey");

        myMethod() {
          return "ok";
        }
      };

      MyClass = hook.method(
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
  });

  describe("other", () => {
    it("should work with hooks inside middlewares", () => {
      let InnerHooksClass = class InnerHooksClass {
        myMethod(x: string) {
          expect([...(getCurrentHookKeyContext() as any)]).toEqual(hook.inherit(this));
          return x + ":original";
        }
      };

      InnerHooksClass = hook.method(InnerHooksClass, "myMethod");

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

    it("should reject invalid manual member kinds", () => {
      class InvalidClass {
        field = "field";

        get onlyGetter() {
          return this.field;
        }
      }

      class StaticFieldClassFn {
        static bad() {
          return "bad";
        }
      }

      expect(() => hook.method(InvalidClass, "field")).toThrow("[class-utilities][method]");
      expect(() => hook.getter(InvalidClass, "field")).toThrow("[class-utilities][getter]");
      expect(() => hook.setter(InvalidClass, "field")).toThrow("[class-utilities][setter]");
      expect(() => hook.accessor(InvalidClass, "onlyGetter")).toThrow("[class-utilities][accessor]");
      expect(() => hook.field(InvalidClass, "constructor")).toThrow("[class-utilities][field]");
      expect(() => hook.field(StaticFieldClassFn, "bad")).not.toThrow("[class-utilities][field]");
      expect(() => hook.accessor(StaticFieldClassFn, "bad")).not.toThrow("[class-utilities][accessor]");
    });

    it("should work without reassigning the class", () => {
      class MyClass {
        field = "field";
        static staticField = "staticField";

        constructor() {
          hook.init(this);
        }

        myMethod(x: string) {
          return x + ":original";
        }
      }

      attach(MyClass, "init staticField", (next, value) => next(value + ":init"));

      hook.field(MyClass, "field");
      hook.field(MyClass, "staticField");
      hook.method(MyClass, "myMethod");

      attach(MyClass, "init field", (next, value) => next(value + ":init"));
      attach(MyClass, "myMethod", (next, x) => next(x + ":mid"));

      const instance = new MyClass();
      expect(instance.field).toBe("field:init");
      expect(instance.myMethod("input")).toBe("input:mid:original");
    });

    it("should work with `constructor` middleware", () => {
      const constructorCalled: string[] = [];

      class Origin {
        constructor(x: string) {
          hook.init(this, x);
          constructorCalled.push(x);
        }
      }

      attach(Origin, "constructor", (next, x) => {
        constructorCalled.push(x + " mid");
        return next(x);
      });

      const _instance = new Origin("original");
      expect(constructorCalled).toEqual(["original mid", "original"]);
    });
  });

  describe("static prefix", () => {
    it("should work with `static ` prefix for methods", () => {
      class Origin {
        static testStatic(x: string) {
          return x + ":testStatic";
        }
      }

      const StaticMethodsClass = hook.method(Origin, "static testStatic");

      attach(StaticMethodsClass, "static testStatic", (next, x) => {
        return next(x + ":mid1");
      });

      expect(StaticMethodsClass.testStatic("x")).toBe("x:mid1:testStatic");
    });

    it("should work with `static ` prefix for fields", () => {
      class Origin {
        static staticField = "staticField";
      }

      attach(Origin, "static init staticField", (next, value) => next(value + ":init"));

      hook.field(Origin, "static staticField");

      expect(Origin.staticField).toBe("staticField:init");
    });

    it("should work with `static ` prefix for getters and setters", () => {
      class CounterBase {
        static #value = 0;

        static set value(next: number) {
          this.#value = next;
        }

        static get value() {
          return this.#value;
        }
      }

      const Counter = hook.class(CounterBase);

      hook.getter(Counter, "static value");
      hook.setter(Counter, "static value");

      attach(Counter, "static get value", (next) => next() + 1);
      attach(Counter, "static set value", (next, value) => next(value + 1));

      expect(Counter.value).toBe(1);
      Counter.value = 2;
      expect(Counter.value).toBe(4); // 2 + 1 + 1 = 4
    });

    it("should work with `static ` prefix for accessors", () => {
      class Origin {
        static field = 10;
      }

      attach(Origin, "static init field", (next, value) => next(value + 1));
      attach(Origin, "static get field", (next) => next() * 2);
      attach(Origin, "static set field", (next, value) => next(value + 3));

      hook.accessor(Origin, "static field");

      expect(Origin.field).toBe(22); // (10 + 1) * 2 = 22
      Origin.field = 7;
      expect(Origin.field).toBe(20); // (7 + 3) * 2 = 20
    });
  });
});
