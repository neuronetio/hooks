import { describe, expect, it } from "vitest";

import { attach, hook, inherit, dhk, Hooks, HookDecoratorBuilder } from "../src";

describe("builder", () => {
  it("should expose a builder class and support overloads for fluent decoration", () => {
    let BuilderClass = class BuilderClass {
      field = "field";
      acc: string = "initial";

      myMethod(x: string) {
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

    let runCalled = false;
    const decorated = builder
      .method("myMethod", "methodAlt")
      .run(() => {
        runCalled = true;
      })
      .field("field", "fieldAlt")
      .accessor("acc", "accAlt")
      .getter("value", "valueAlt")
      .setter("value", "valueAlt")
      .get();

    expect(runCalled).toBe(true);
    expect(decorated).toBe(BuilderClass);
    const instance = new decorated();
    expect(instance).toBeInstanceOf(BuilderClass);
  });

  it("should work with alternative names and builder", () => {
    class MixedClass {
      static staticValueStore = "staticInitial";
      #value = "initial";

      field = "field";
      acc: string = "initialAcc";

      constructor() {
        hook.init(this);
      }

      myMethod(x: string) {
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
    }

    Hooks(MixedClass)
      .method("myMethod", "methodAlt")
      .method("static staticMethod", "staticMethodAlt")
      .field("field", "fieldAlt")
      .accessor("acc", "accAlt")
      .getter("value", "valueAlt")
      .setter("value", "valueAlt")
      .getter("static staticVal", "staticGetAlt")
      .setter("static staticVal", "staticSetAlt");

    const instance = new MixedClass();

    expect(instance instanceof MixedClass).toBe(true);

    attach(MixedClass, "!method methodAlt", (next, x) => next(x + ":classMid"));
    attach(instance, "!method methodAlt", (next, x) => next(x + ":instanceMid"));
    attach(MixedClass, "!static method staticMethodAlt", (next, x) => next(x + ":staticMid"));
    attach(MixedClass, "!init fieldAlt", (next, value) => next(value + ":fieldInit"));
    attach(MixedClass, "!init accAlt", (next, value) => next(value + ":accInit"));
    attach(instance, "!get accAlt", (next) => next() + ":getAcc");
    attach(instance, "!set accAlt", (next, value) => next(value + ":setAcc"));
    attach(instance, "!get valueAlt", (next) => next() + ":getValue");
    attach(instance, "!set valueAlt", (next, value) => next(value + ":setValue"));
    attach(MixedClass, "!static get staticGetAlt", (next) => next() + ":staticGet");
    attach(MixedClass, "!static set staticSetAlt", (next, value) => next(value + ":staticSet"));

    expect(instance.myMethod("input")).toBe("input:instanceMid:classMid:orig");
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

  it("should wrap class instantly", () => {
    const API = Hooks(
      class API {
        myMethod(x: string) {
          return x + " orig";
        }
      },
    )
      .method("myMethod")
      .get();

    attach(API, "method myMethod", (next, x) => next(x + " mid"));
    expect(new API().myMethod("input")).toBe("input mid orig");
  });

  it("should work with 'for' method for multiple hooks", () => {
    class MixedClass {
      static staticValueStore = "staticInitial";
      #value = "initial";

      field = "field";
      acc: string = "initialAcc";

      constructor() {
        hook.init(this);
      }

      myMethod(x: string) {
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
    }

    let dynRun: any[] = [];
    const dynKey = dhk(function (this: MixedClass) {
      dynRun.push(this);
      return inherit(this);
    });

    attach(MixedClass, "!static init staticInitAlt", (next, x) => next(x + ":init"));

    Hooks(MixedClass)
      .for("method myMethod", "methodAlt", dynKey)
      .for("static method staticMethod", dynKey, "staticMethodAlt")
      .for("static init staticValueStore", dynKey, "staticInitAlt")
      .for("init field", "fieldAlt", dynKey)
      .for("accessor acc", dynKey, "accAlt")
      .for("get value", "valueAlt", dynKey)
      .for("set value", dynKey, "valueAlt")
      .for("static get staticVal", "staticGetAlt", dynKey)
      .for("static set staticVal", dynKey, "staticSetAlt");

    expect(dynRun).toEqual([MixedClass]); // init staticValueStore
    expect(MixedClass.staticValueStore).toBe("staticInitial:init");
    dynRun.length = 0; // reset for further checks

    const instance = new MixedClass();

    expect(dynRun).toEqual([instance, instance]); // init field, accessor acc
    dynRun.length = 0; // reset for further checks

    expect(instance instanceof MixedClass).toBe(true);

    attach(MixedClass, "!method methodAlt", (next, x) => next(x + ":classMid"));
    attach(instance, "!method methodAlt", (next, x) => next(x + ":instanceMid"));
    attach(MixedClass, "!static method staticMethodAlt", (next, x) => next(x + ":staticMid"));
    attach(MixedClass, "!init fieldAlt", (next, value) => next(value + ":fieldInit"));
    attach(MixedClass, "!init accAlt", (next, value) => next(value + ":accInit"));
    attach(instance, "!get accAlt", (next) => next() + ":getAcc");
    attach(instance, "!set accAlt", (next, value) => next(value + ":setAcc"));
    attach(instance, "!get valueAlt", (next) => next() + ":getValue");
    attach(instance, "!set valueAlt", (next, value) => next(value + ":setValue"));
    attach(MixedClass, "!static get staticGetAlt", (next) => next() + ":staticGet");
    attach(MixedClass, "!static set staticSetAlt", (next, value) => next(value + ":staticSet"));

    expect(instance.myMethod("input")).toBe("input:instanceMid:classMid:orig");
    expect(dynRun).toEqual([instance]);
    dynRun.length = 0;
    expect(MixedClass.staticMethod("input")).toBe("input:staticMid:staticOrig");
    expect(dynRun).toEqual([MixedClass]); // static method and static get
    dynRun.length = 0;

    const initialized = new MixedClass();
    expect(dynRun).toEqual([initialized, initialized]); // init field and accessor acc
    dynRun.length = 0;

    expect(initialized.field).toBe("field:fieldInit");
    expect(initialized.acc).toBe("initialAcc:accInit");
    expect(dynRun).toEqual([initialized]); // acc get
    dynRun.length = 0;

    expect(instance.acc).toBe("initialAcc:getAcc");
    expect(dynRun).toEqual([instance]); // acc get
    dynRun.length = 0;

    instance.acc = "updatedAcc";
    expect(dynRun).toEqual([instance]); // acc set
    dynRun.length = 0;
    expect(instance.acc).toBe("updatedAcc:setAcc:getAcc");
    expect(dynRun).toEqual([instance]); // acc get
    dynRun.length = 0;

    expect(instance.value).toBe("initial:getValue");
    expect(dynRun).toEqual([instance]); // value get
    dynRun.length = 0;

    instance.value = "updatedValue";
    expect(dynRun).toEqual([instance]); // value set
    dynRun.length = 0;

    expect(instance.value).toBe("updatedValue:setValue:getValue");
    expect(dynRun).toEqual([instance]); // value get
    dynRun.length = 0;

    expect(MixedClass.staticVal).toBe("staticInitial:init:staticGet");
    expect(dynRun).toEqual([MixedClass]); // static get
    dynRun.length = 0;

    MixedClass.staticVal = "updatedStatic";
    expect(dynRun).toEqual([MixedClass]); // static set
    dynRun.length = 0;

    expect(MixedClass.staticVal).toBe("updatedStatic:staticSet:staticGet");
    expect(dynRun).toEqual([MixedClass]); // static get
  });
});
