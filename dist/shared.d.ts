//#region src/shared.d.ts
type HookKeySingle = symbol | Function | object;
type HookKeyComposite = [HookKeySingle, ...HookKeySingle[]];
type HookKeyOrKeys = HookKeyComposite | HookKeySingle;
type HookName = string | symbol;
declare const PREFIX = "[@neuronet/hooks]";
declare const HOOK_CLASS_STATE: unique symbol;
declare const DEFAULT_HOOK_NAME: unique symbol;
/**
 * Hook property key used to store hook metadata on functions and classes.
 */
declare const HOOK_DATA: unique symbol;
declare const noop: (..._args: any[]) => any;
type HookKeyDynamicFn = () => HookKeyOrKeys;
type MetadataHooks = (string | symbol)[];
/**
 * Represents a hook key that is resolved dynamically at runtime.
 * The key is resolved by calling the provided function, usually with the `this` context
 * of the hooked method.
 */
declare class HookKeyDynamic {
  fn: HookKeyDynamicFn;
  constructor(fn: HookKeyDynamicFn);
}
/**
 * Creates a dynamic hook key.
 *
 * @param fn A function that returns a HookKey.
 * @returns A new HookKeyDynamic instance.
 */
declare function dynamicHookKey(fn: HookKeyDynamicFn): HookKeyDynamic;
/**
 * Metadata stored on a hook function.
 */
interface IHookData<A extends any[] = any[], R = any> {
  /** The original function being hooked. */
  origin: (...args: A) => R;
  /** The key associated with this hook. */
  keyOrKeys: HookKeyOrKeys;
  /** The name of the hook. */
  name: HookName;
  /** Optional arguments override. */
  argsProvider?: ArgumentsProvider<A>;
}
/**
 * An alias for `dynamicHookKey` to provide a shorter and more convenient name.
 *
 * Creates a dynamic hook key.
 *
 * @param fn A function that returns a HookKey.
 * @returns A new HookKeyDynamic instance.
 */
declare const dhk: typeof dynamicHookKey;
/**
 * A utility class to provide the arguments passed to the middleware and hook functions.
 */
declare class ArgumentsProvider<A extends any[] = any[]> {
  args: () => A;
  constructor(args: A | (() => A));
}
type ArgumentsFromProvider<AP extends ArgumentsProvider<any[]>> = AP extends ArgumentsProvider<infer A> ? A : never;
/**
 * Creates an ArgumentsProvider instance to provide the arguments passed to the middleware and hook functions.
 */
declare function argsProvider<A extends any[]>(dynamicArgs: () => A): ArgumentsProvider<A>;
declare function argsProvider<A extends any[]>(...args: A): ArgumentsProvider<A>;
declare const args: typeof argsProvider;
/**
 * A function wrapped in a hook.
 */
interface IHookFn<A extends any[] = any[], R = any, CallArgs extends any[] = A> {
  (...args: CallArgs): R;
  /** Metadata for the hook. */
  [HOOK_DATA]: IHookData<A, R>;
}
type DynamicKeyOrAlternativeName = HookKeyDynamic | string;
type AnyClass = abstract new (...args: any[]) => any;
interface IHookDecoratorOptions {
  dynamicKey?: HookKeyDynamic;
  alternativeName?: string;
}
interface IAccessorDecoratorHooks {
  get: (...args: any[]) => any;
  set: (...args: any[]) => any;
  init: (initialValue: any) => any;
}
type HookClassStaticPropertyName<TClass extends AnyClass> = Exclude<Extract<keyof TClass, string>, "prototype">;
type HookClassInstancePropertyName<TClass extends AnyClass> = Extract<keyof InstanceType<TClass> | "constructor", string>;
type HookPropertyName<TClass extends object> = TClass extends AnyClass ? HookClassInstancePropertyName<TClass> | `static ${string & HookClassStaticPropertyName<TClass>}` : TClass extends {
  constructor: infer C;
} ? C extends AnyClass ? HookClassInstancePropertyName<C> : never : never;
type StrictHookClassExpression<TClass extends AnyClass> = `init ${string & HookClassInstancePropertyName<TClass>}` | `get ${string & HookClassInstancePropertyName<TClass>}` | `set ${string & HookClassInstancePropertyName<TClass>}` | `accessor ${string & HookClassInstancePropertyName<TClass>}` | `method ${string & HookClassInstancePropertyName<TClass>}` | `static init ${string & HookClassStaticPropertyName<TClass>}` | `static get ${string & HookClassStaticPropertyName<TClass>}` | `static set ${string & HookClassStaticPropertyName<TClass>}` | `static accessor ${string & HookClassStaticPropertyName<TClass>}` | `static method ${string & HookClassStaticPropertyName<TClass>}`;
type LooseHookClassExpression = `!init ${string}` | `!get ${string}` | `!set ${string}` | `!accessor ${string}` | `!method ${string}` | `!static init ${string}` | `!static get ${string}` | `!static set ${string}` | `!static accessor ${string}` | `!static method ${string}`;
type HookClassExpression<TClass extends object> = TClass extends AnyClass ? StrictHookClassExpression<TClass> | LooseHookClassExpression : TClass extends {
  constructor: infer C;
} ? C extends AnyClass ? StrictHookClassExpression<C> | LooseHookClassExpression : C : never;
interface IHookClassUtilitiesState {
  instanceInitializers: Array<(instance: any) => void>;
}
type StrictHookExpPropertyKey<N extends HookName> = N extends `get ${infer P}` ? P & PropertyKey : N extends `set ${infer P}` ? P & PropertyKey : N extends `init ${infer P}` ? P & PropertyKey : N extends `method ${infer P}` ? P & PropertyKey : N extends `static get ${infer P}` ? P & PropertyKey : N extends `static set ${infer P}` ? P & PropertyKey : N extends `static init ${infer P}` ? P & PropertyKey : N extends `static method ${infer P}` ? P & PropertyKey : N extends `static ${infer P}` ? P & PropertyKey : N extends PropertyKey ? N : never;
type LooseHookExpPropertyKey<N extends HookName> = N extends `!get ${infer P}` ? P & PropertyKey : N extends `!set ${infer P}` ? P & PropertyKey : N extends `!init ${infer P}` ? P & PropertyKey : N extends `!method ${infer P}` ? P & PropertyKey : N extends `!static get ${infer P}` ? P & PropertyKey : N extends `!static set ${infer P}` ? P & PropertyKey : N extends `!static init ${infer P}` ? P & PropertyKey : N extends `!static method ${infer P}` ? P & PropertyKey : N extends `!static ${infer P}` ? P & PropertyKey : N extends PropertyKey ? N : never;
type IsStrictHookExp<N extends HookName> = StrictHookExpPropertyKey<N> extends N ? false : StrictHookExpPropertyKey<N> extends (infer P) ? P extends `#${string}` ? false : true : true;
type IsLooseHookExp<N extends HookName> = LooseHookExpPropertyKey<N> extends N ? false : true;
type HookPrototype<TObject> = TObject extends (abstract new (...args: any[]) => any) ? TObject extends {
  prototype: infer TPrototype;
} ? TPrototype : never : never;
type ResolveMemberValue<TObject extends object | symbol, TName extends PropertyKey> = TObject extends object ? TName extends keyof TObject ? TObject[TName] : TObject extends AnyClass ? TName extends keyof HookPrototype<TObject> ? HookPrototype<TObject>[TName] : never : never : never;
type HookExpPropertyKey<N extends HookName> = StrictHookExpPropertyKey<N> | LooseHookExpPropertyKey<N>;
type InferHookSignature<TObject extends object | symbol, TName extends HookName> = TName extends string ? IsLooseHookExp<TName> extends true ? [any[], any] : ResolveMemberValue<TObject, HookExpPropertyKey<TName>> extends (infer Member) ? [Member] extends [never] ? IsStrictHookExp<TName> extends true ? never : [any[], any] : Member extends {
  [HOOK_DATA]: infer HookData;
} ? HookData extends {
  origin: infer Origin;
} ? Origin extends ((...args: infer A) => infer R) ? [A, R] : [any[], any] : [any[], any] : Member extends ((...args: infer A) => infer R) ? [A, R] : TName extends `get ${string}` ? [[], Member] : TName extends `set ${string}` ? [[Member], void] : TName extends `init ${string}` ? [[Member], Member] : TName extends `method ${string}` ? "method" : TName extends `static init ${string}` ? [[Member], Member] : TName extends `static get ${string}` ? [[], Member] : TName extends `static set ${string}` ? [[Member], Member] : [any[], any] : [any[], any] : [any[], any];
type InferMiddlewareArgs<TObject extends object, TName extends HookName> = InferHookSignature<TObject, TName>[0];
type InferMiddlewareResult<TObject extends object, TName extends HookName> = InferHookSignature<TObject, TName>[1];
type InferMiddlewareThis<TObject extends object, TName extends HookName> = ResolveMemberValue<TObject, HookExpPropertyKey<TName>> extends (infer Member) ? [Member] extends [never] ? unknown : Member extends {
  [HOOK_DATA]: infer HookData;
} ? HookData extends {
  origin: infer Origin;
} ? Origin extends ((this: infer ThisArg, ...args: any[]) => any) ? ThisArg : unknown : unknown : Member extends ((this: infer ThisArg, ...args: any[]) => any) ? ThisArg : unknown : unknown;
//#endregion
export { AnyClass, ArgumentsFromProvider, ArgumentsProvider, DEFAULT_HOOK_NAME, DynamicKeyOrAlternativeName, HOOK_CLASS_STATE, HOOK_DATA, HookClassExpression, HookClassInstancePropertyName, HookClassStaticPropertyName, HookExpPropertyKey, HookKeyComposite, HookKeyDynamic, HookKeyDynamicFn, HookKeyOrKeys, HookKeySingle, HookName, HookPropertyName, HookPrototype, IAccessorDecoratorHooks, IHookClassUtilitiesState, IHookData, IHookDecoratorOptions, IHookFn, InferHookSignature, InferMiddlewareArgs, InferMiddlewareResult, InferMiddlewareThis, IsLooseHookExp, IsStrictHookExp, LooseHookClassExpression, LooseHookExpPropertyKey, MetadataHooks, PREFIX, ResolveMemberValue, StrictHookClassExpression, StrictHookExpPropertyKey, args, argsProvider, dhk, dynamicHookKey, noop };
//# sourceMappingURL=shared.d.ts.map