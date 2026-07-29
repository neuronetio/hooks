//#region src/index.d.ts
declare const DEFAULT_HOOK_NAME: unique symbol;
/**
 * Hook property key used to store hook metadata on functions and classes.
 */
declare const HOOK: unique symbol;
declare class HookKeyComposite {
  keys: HookKey[];
  constructor(keys?: HookKey[]);
  flat(keys?: HookKey[]): Exclude<HookKey, HookKeyComposite>[];
  [Symbol.iterator](): Generator<HookKey, void, undefined>;
}
declare function composeHookKeys(...keys: HookKey[]): HookKey;
type HookKeyDynamicFn = () => HookKey;
declare class HookKeyDynamic {
  fn: HookKeyDynamicFn;
  constructor(fn: HookKeyDynamicFn);
}
declare function dynamicHookKey(fn: HookKeyDynamicFn): HookKeyDynamic;
type HookKeySingle = symbol | Function | (Record<PropertyKey, any> & ({
  length?: never;
} | {
  push?: never;
} | {
  pop?: never;
} | {
  splice?: never;
}));
/**
 * HookKey can be a symbol, an object, or a function (but not an array).
 * It is used to identify a specific hook context.
 */
type HookKey = HookKeySingle | HookKeyComposite;
type HookName = string | symbol;
interface IHookData<A extends any[] = any[], R = any> {
  origin: (...args: A) => R;
  key: HookKey;
  name: HookName;
  args?: A;
}
interface IHookFn<A extends any[] = any[], R = any, CallArgs extends any[] = A> {
  (...args: CallArgs): R;
  [HOOK]: IHookData<A, R>;
}
type MetadataHooks = (string | symbol)[];
declare function getCurrentHookKeyContext(): HookKey | null;
/**
 * Creates a hook function that can be used to dynamically and externally add or remove middleware without any further modifications to the function itself.
 * It may also be used as a decorator for class methods, accessors, and fields.
 */
declare function hook(): ReturnType<typeof hookDecorator>;
declare function hook(alternativeName: string): ReturnType<typeof hookDecorator>;
declare function hook(dynamic: HookKeyDynamic): ReturnType<typeof hookDecorator>;
declare function hook(alternativeName: string, dynamic: HookKeyDynamic): ReturnType<typeof hookDecorator>;
declare function hook(dynamic: HookKeyDynamic, alternativeName: string): ReturnType<typeof hookDecorator>;
declare function hook<A extends any[], R>(fn: ((...args: A) => R) | null): IHookFn<A, R>;
declare function hook<A extends any[], R>(args: A, fn: ((...args: A) => R) | null): IHookFn<A, R, []>;
declare function hook<A extends any[], R>(name: HookName, fn: ((...args: A) => R) | null): IHookFn<A, R>;
declare function hook<A extends any[], R>(name: HookName, args: A, fn: ((...args: A) => R) | null): IHookFn<A, R, []>;
declare function hook<A extends any[], R>(key: HookKey, fn: ((...args: A) => R) | null): IHookFn<A, R>;
declare function hook<A extends any[], R>(key: HookKey, args: A, fn: ((...args: A) => R) | null): IHookFn<A, R, []>;
declare function hook<A extends any[], R>(key: HookKey, name: HookName, fn: ((...args: A) => R) | null): IHookFn<A, R>;
declare function hook<A extends any[], R>(key: HookKey, name: HookName, args: A, fn: ((...args: A) => R) | null): IHookFn<A, R, []>;
declare function Hook(_Class: any, context: ClassDecoratorContext): void;
type DecoratorResult = (value: any, context: ClassMemberDecoratorContext) => any;
/**
 * Decorator for class methods that wraps the method in a hook.
 * Supports only ECMA TC39 Stage 3+ decorators.
 */
declare function hookDecorator(): DecoratorResult;
declare function hookDecorator(dynamicKey: HookKeyDynamic): DecoratorResult;
declare function hookDecorator(alternativeName: string): DecoratorResult;
declare function hookDecorator(dynamicKeyOrName: HookKeyDynamic | string): DecoratorResult;
declare function hookDecorator(dynamicKey: HookKeyDynamic, alternativeName: string): DecoratorResult;
declare function hookDecorator(alternativeName: string, dynamicKey: HookKeyDynamic): DecoratorResult;
type MiddlewareMethod<A extends any[] = any[], R = any> = (next: (...args: A) => R, ...args: A) => R;
type HookNamePropertyKey<N extends HookName> = N extends `get ${infer P}` ? P & PropertyKey : N extends `set ${infer P}` ? P & PropertyKey : N extends `init ${infer P}` ? P & PropertyKey : N extends PropertyKey ? N : never;
type HookPrototype<TObject> = TObject extends (abstract new (...args: any[]) => any) ? TObject extends {
  prototype: infer TPrototype;
} ? TPrototype : never : never;
type ResolveMemberValue<TObject, TName extends PropertyKey> = TObject extends object ? TName extends keyof TObject ? TObject[TName] : TObject extends (abstract new (...args: any[]) => any) ? TName extends keyof HookPrototype<TObject> ? HookPrototype<TObject>[TName] : never : never : never;
type InferHookSignature<TObject, TName extends HookName> = TName extends string ? ResolveMemberValue<TObject, HookNamePropertyKey<TName>> extends (infer Member) ? [Member] extends [never] ? [any[], any] : Member extends ((...args: infer A) => infer R) ? [A, R] : TName extends `get ${string}` ? [[], Member] : TName extends `set ${string}` ? [[Member], void] : TName extends `init ${string}` ? [[Member], Member] : [any[], any] : [any[], any] : [any[], any];
type InferMiddlewareArgs<TObject, TName extends HookName> = InferHookSignature<TObject, TName>[0];
type InferMiddlewareResult<TObject, TName extends HookName> = InferHookSignature<TObject, TName>[1];
interface IMiddlewareMethods {
  [key: string | symbol]: MiddlewareMethod[];
}
declare const middlewares: WeakMap<HookKey, IMiddlewareMethods>;
declare function attach<T extends (...args: any[]) => any>(hookFn: T, fn: MiddlewareMethod<Parameters<T>, ReturnType<T>>): () => void;
declare function attach<A extends any[] = any[], R = any>(key: HookKey, fn: MiddlewareMethod<A, R>): () => void;
declare function attach<TObject, TName extends HookName>(key: TObject, name: TName, fn: MiddlewareMethod<InferMiddlewareArgs<TObject, TName>, InferMiddlewareResult<TObject, TName>>): () => void;
declare function attach(key: HookKey, name: HookName, fn: MiddlewareMethod<any[], unknown>): () => void;
declare function detach(key: HookKey, name: HookName, fn: MiddlewareMethod): void;
type MiddlewareNext<A extends any[] = any[], R = any> = ((...args: A) => R) | null;
//#endregion
export { DEFAULT_HOOK_NAME, DecoratorResult, HOOK, Hook, HookKey, HookKeyDynamicFn, HookKeySingle, HookName, IHookData, IHookFn, IMiddlewareMethods, MetadataHooks, MiddlewareMethod, MiddlewareNext, attach, composeHookKeys, detach, dynamicHookKey, getCurrentHookKeyContext, hook, hookDecorator, middlewares };
//# sourceMappingURL=index.d.ts.map