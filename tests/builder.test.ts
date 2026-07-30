import { describe, expect, it } from "vitest";

import { attach, Hooks, HookDecoratorBuilder } from "../src";

describe("builder", () => {
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

    expect(instance instanceof MixedClass).toBe(true);

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
});
