import { describe, expect, it } from "vitest";

import { attach, dhk, hook, args, getCurrentHookKeyContext } from "../src";

describe("manual decorators", () => {
  it("instance initializer should work with private fields", () => {
    class Service {
      #prv = "prv";

      val: string = hook([this, Service], "init val", args(this.#prv), (v: string) => {
        return v + " " + this.#prv.toUpperCase();
      })();

      dynVal: string = hook(
        dhk(() => [this, Service]),
        "init val",
        args(this.#prv),
        (v: string) => {
          return v + " " + this.#prv.toUpperCase();
        },
      )();
    }

    attach(Service, "init val", (next, value) => next(value + " init"));
    attach(Service, "init dynVal", (next, value) => next(value + " init"));

    expect(new Service().val).toBe("prv init PRV");
    expect(new Service().dynVal).toBe("prv init PRV");
  });

  it("static initializer should work with private static fields", () => {
    const initVal = Symbol("initVal");
    attach(initVal, "init val", (next, value) => next(value + " init"));

    class Product {
      static #prv = "prv";

      static val: string = hook(initVal, "init val", args(this.#prv), (v: string) => {
        return v + " " + this.#prv.toUpperCase();
      })();
    }

    expect(Product.val).toBe("prv init PRV");
  });

  it("instance methods", () => {
    const sub: string[] = [];
    class Service {
      #instPrv = "prv";

      getVal = hook([this, Service], "getVal", (v: string) => {
        // check nested context
        expect(getCurrentHookKeyContext()).toEqual([this, Service]);
        hook("getValSub", (v: string) => {
          sub.push(v);
          expect(getCurrentHookKeyContext()).toEqual([this, Service]);
          expect(
            hook("getValSubSub", (v: string) => {
              expect(getCurrentHookKeyContext()).toEqual([this, Service]);
              return v + " subSub";
            })(v),
          ).toBe(v + " subSub");
        })("getValSub");

        return v + " " + this.#instPrv.toUpperCase();
      });

      getValWrap(v: string) {
        // check nested context
        return hook([this, Service], "getValWrap", (v: string) => {
          hook("getValWrapSub", (v: string) => {
            sub.push(v);
            expect(getCurrentHookKeyContext()).toEqual([this, Service]);
            expect(
              hook("getValWrapSubSub", (v: string) => {
                expect(getCurrentHookKeyContext()).toEqual([this, Service]);
                return v + " subSub";
              })(v),
            ).toBe(v + " subSub");
          })("getValWrapSub");

          return v + " " + this.#instPrv.toUpperCase();
        })(v);
      }
    }

    const service = new Service();

    attach(service, "getValSub", (next, v) => next(v + " service"));
    attach(Service, "getValSub", (next, v) => next(v + " Service"));
    attach(service, "getValWrapSub", (next, v) => next(v + " service"));
    attach(Service, "getValWrapSub", (next, v) => next(v + " Service"));

    expect(service.getVal("test")).toBe("test PRV");
    attach(service, "getVal", (next, v) => next(v + " service"));
    attach(Service, "getVal", (next, v) => next(v + " Service"));
    expect(service.getVal("test")).toBe("test service Service PRV");

    expect(service.getValWrap("test")).toBe("test PRV");
    attach(service, "getValWrap", (next, v) => next(v + " service"));
    attach(Service, "getValWrap", (next, v) => next(v + " Service"));
    expect(service.getValWrap("test")).toBe("test service Service PRV");

    expect(sub).toEqual([
      "getValSub service Service",
      "getValSub service Service",
      "getValWrapSub service Service",
      "getValWrapSub service Service",
    ]);

    sub.length = 0;

    const otherService = new Service();
    expect(otherService.getVal("test")).toBe("test Service PRV");
    expect(otherService.getValWrap("test")).toBe("test Service PRV");
    expect(sub).toEqual(["getValSub Service", "getValWrapSub Service"]);
  });

  it("static methods should work with private fields", () => {
    const sub: string[] = [];

    class Service {
      static #prv = "prv";

      static getVal = hook(this, "getVal", (v: string) => {
        // check nested context
        expect(getCurrentHookKeyContext()).toEqual(this);
        hook("getValSub", (v: string) => {
          sub.push(v);
          expect(getCurrentHookKeyContext()).toEqual(this);
          expect(
            hook("getValSubSub", (v: string) => {
              expect(getCurrentHookKeyContext()).toEqual(this);
              return v + " subSub";
            })(v),
          ).toBe(v + " subSub");
        })("getValSub");

        return v + " " + this.#prv.toUpperCase();
      });

      static getValWrap(v: string) {
        return hook(this, "getValWrap", (v: string) => {
          hook("getValWrapSub", (v: string) => {
            sub.push(v);
            expect(getCurrentHookKeyContext()).toEqual(this);
            expect(
              hook("getValWrapSubSub", (v: string) => {
                expect(getCurrentHookKeyContext()).toEqual(this);
                return v + " subSub";
              })(v),
            ).toBe(v + " subSub");
          })("getValWrapSub");

          return v + " " + this.#prv.toUpperCase();
        })(v);
      }
    }

    attach(Service, "getValSub", (next, v) => next(v + " Service"));
    attach(Service, "getValWrapSub", (next, v) => next(v + " Service"));

    expect(Service.getVal("test")).toBe("test PRV");
    attach(Service, "getVal", (next, v) => next(v + " attached"));
    expect(Service.getVal("test")).toBe("test attached PRV");

    expect(Service.getValWrap("test")).toBe("test PRV");
    attach(Service, "getValWrap", (next, v) => next(v + " attached"));
    expect(Service.getValWrap("test")).toBe("test attached PRV");

    expect(sub).toEqual(["getValSub Service", "getValSub Service", "getValWrapSub Service", "getValWrapSub Service"]);
  });

  it("should work with getters and setters", () => {
    const sub: string[] = [];

    class Service {
      #prv = "prv";

      get val() {
        return hook([this, Service], "get val", () => {
          // check nested context
          expect(getCurrentHookKeyContext()).toEqual([this, Service]);
          hook("getValSub", (v: string) => {
            sub.push(v);
            expect(getCurrentHookKeyContext()).toEqual([this, Service]);
            expect(
              hook("getValSubSub", (v: string) => {
                expect(getCurrentHookKeyContext()).toEqual([this, Service]);
                return v + " subSub";
              })(v),
            ).toBe(v + " subSub");
          })("getValSub");

          return `${this.#prv} original`;
        })();
      }

      set val(value: string) {
        hook([this, Service], "set val", (v: string) => {
          // check nested context
          expect(getCurrentHookKeyContext()).toEqual([this, Service]);
          hook("setValSub", (v: string) => {
            sub.push(v);
            expect(getCurrentHookKeyContext()).toEqual([this, Service]);
            expect(
              hook("setValSubSub", (v: string) => {
                expect(getCurrentHookKeyContext()).toEqual([this, Service]);
                return v + " subSub";
              })(v),
            ).toBe(v + " subSub");
          })("setValSub");

          this.#prv = v;
        })(value);
      }
    }

    const service = new Service();
    expect(service.val).toBe("prv original");
    service.val = "new";
    expect(service.val).toBe("new original");

    attach(service, "getValSub", (next, v) => next(v + " _get_sub_"));
    attach(Service, "getValSub", (next, v) => next(v + " _GET_SUB_"));
    attach(service, "setValSub", (next, v) => next(v + " _set_sub_"));
    attach(Service, "setValSub", (next, v) => next(v + " _SET_SUB_"));

    attach(service, "get val", (next) => next() + " _get_");
    attach(Service, "get val", (next) => next() + " _GET_");
    expect(service.val).toBe("new original _GET_ _get_");

    attach(service, "set val", (next, v) => next(v + " _set_"));
    attach(Service, "set val", (next, v) => next(v + " _SET_"));
    service.val = "another";
    expect(service.val).toBe("another _set_ _SET_ original _GET_ _get_");

    expect(sub).toEqual([
      "getValSub",
      "setValSub",
      "getValSub",
      "getValSub _get_sub_ _GET_SUB_",
      "setValSub _set_sub_ _SET_SUB_",
      "getValSub _get_sub_ _GET_SUB_",
    ]);
  });

  it("should work with static getters and setters", () => {
    const sub: string[] = [];

    class Service {
      static #prv = "prv";

      static get val() {
        return hook(this, "get val", () => {
          // check nested context
          expect(getCurrentHookKeyContext()).toEqual(this);
          hook("getValSub", (v: string) => {
            sub.push(v);
            expect(getCurrentHookKeyContext()).toEqual(this);
            expect(
              hook("getValSubSub", (v: string) => {
                expect(getCurrentHookKeyContext()).toEqual(this);
                return v + " subSub";
              })(v),
            ).toBe(v + " subSub");
          })("getValSub");

          return `${this.#prv} original`;
        })();
      }

      static set val(value: string) {
        hook(this, "set val", (v: string) => {
          // check nested context
          expect(getCurrentHookKeyContext()).toEqual(this);
          hook("setValSub", (v: string) => {
            sub.push(v);
            expect(getCurrentHookKeyContext()).toEqual(this);
            expect(
              hook("setValSubSub", (v: string) => {
                expect(getCurrentHookKeyContext()).toEqual(this);
                return v + " subSub";
              })(v),
            ).toBe(v + " subSub");
          })("setValSub");

          this.#prv = v;
        })(value);
      }
    }

    expect(Service.val).toBe("prv original");
    Service.val = "new";
    expect(Service.val).toBe("new original");

    attach(Service, "getValSub", (next, v) => next(v + " _get_sub_"));
    attach(Service, "setValSub", (next, v) => next(v + " _set_sub_"));

    attach(Service, "get val", (next) => next() + " _get_");

    expect(Service.val).toBe("new original _get_");

    attach(Service, "set val", (next, v) => next(v + " _set_"));
    Service.val = "another";
    expect(Service.val).toBe("another _set_ original _get_");

    expect(sub).toEqual([
      "getValSub",
      "setValSub",
      "getValSub",
      "getValSub _get_sub_",
      "setValSub _set_sub_",
      "getValSub _get_sub_",
    ]);
  });

  it("should extend class properly", () => {
    class Base {
      test = hook([this, this.constructor], "test", (v: string) => v + " base");
    }
    class Derived extends Base {}
    const derived = new Derived();
    expect(derived.test("hello")).toEqual("hello base");

    attach(Derived, "test", (next, v) => next(v + " derived"));
    expect(derived.test("hello")).toEqual("hello derived base");

    class A {
      test = hook([this, A], "test", (v: string) => v + " A");
    }
    class B extends A {}
    const b = new B();
    expect(b.test("hello")).toEqual("hello A");

    attach(B, "test", (next, v) => next(v + " B"));
    expect(b.test("hello")).toEqual("hello A");
  });
});
