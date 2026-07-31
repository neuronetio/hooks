import { describe, expect, it } from "vitest";

import { attach, dhk, hook } from "../src";

describe("use case", () => {
  it("should work with parent-child class hierarchy", () => {
    class Child {
      parent: Parent | null = null;

      greet = hook(
        dhk(() => {
          if (this.parent) {
            return [this.parent, Parent, this, Child];
          }
          return [this, Child];
        }),
        "greet",
        (name: string) => `Hello, ${name}`,
      );
    }

    class Parent {
      injected: Child | null = null;

      inject(child: Child) {
        this.injected = child;
        child.parent = this;
      }
    }

    const child = new Child();
    const parent = new Parent();

    expect(child.greet("Rafal")).toBe("Hello, Rafal");
    attach(child, "greet", (next, name) => next(name + " child_instance"));
    attach(Child, "greet", (next, name) => next(name + " child_class"));
    expect(child.greet("Rafal")).toBe("Hello, Rafal child_instance child_class");

    attach(parent, "greet", (next, name) => next(name + " parent_instance"));
    attach(Parent, "greet", (next, name) => next(name + " parent_class"));
    expect(child.greet("Rafal")).toBe("Hello, Rafal child_instance child_class");

    parent.inject(child);
    expect(child.greet("Rafal")).toBe("Hello, Rafal parent_instance parent_class child_instance child_class");
  });

  it("should work with logging utility", () => {
    class Child {
      #parent: Parent | null = null;

      greet = hook(
        dhk(() => {
          if (this.#parent) {
            return [this.#parent, Parent, this, Child];
          }
          return [this, Child];
        }),
        "greet",
        (name: string) => `Hello, ${name}`,
      );

      setParent(parent: Parent) {
        this.#parent = parent;
      }
    }

    class Parent {
      injected: Child[] = [];

      inject(child: Child) {
        this.injected.push(child);
        child.setParent(this);
      }
    }

    const logs: string[] = [];

    function log(next: (name: string) => string, level: string, name: string) {
      logs.push(`[LOG] middleware ${level} called with name: ${name}`);
      const result = next(name);
      logs.push(`[LOG] middleware ${level} returned: ${result}`);
      return result;
    }

    const parent = new Parent();

    // attach middleware to concrete parent instance
    attach(parent, "greet", (next, name) => log(next, "parent_instance", name));

    const child = new Child();
    child.greet("Alice");

    expect(logs).toEqual([]);

    parent.inject(child);
    child.greet("Alice");
    expect(logs).toEqual([
      "[LOG] middleware parent_instance called with name: Alice",
      "[LOG] middleware parent_instance returned: Hello, Alice",
    ]);
  });
});
