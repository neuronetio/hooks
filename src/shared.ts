export type HookKeySingle = symbol | Function | object;
export type HookKeyComposite = [HookKeySingle, ...HookKeySingle[]]; // at least one key is required, otherwise ts may have problems with type inference
export type HookKeyOrKeys = HookKeyComposite | HookKeySingle;
export type HookName = string | symbol;

export const PREFIX = `[@neuronet/hooks]`;
export const HOOK_CLASS_STATE = Symbol(`${PREFIX}[class_state]`);
export const DEFAULT_HOOK_NAME = Symbol("[default_hook_name]");

/**
 * Hook property key used to store hook metadata on functions and classes.
 */
export const HOOK_DATA = Symbol(`${PREFIX}[hook_data]`);

export const noop = (..._args: any[]): any => {};

/**
 * @internal
 */
export const _identity = <T>(value: T): T => value;

export type HookKeyDynamicFn = () => HookKeyOrKeys;

export type MetadataHooks = (string | symbol)[];

/**
 * Represents a hook key that is resolved dynamically at runtime.
 * The key is resolved by calling the provided function, usually with the `this` context
 * of the hooked method.
 */
export class HookKeyDynamic {
  fn: HookKeyDynamicFn;

  constructor(fn: HookKeyDynamicFn) {
    this.fn = fn;
  }
}

/**
 * Creates a dynamic hook key.
 *
 * @param fn A function that returns a HookKey.
 * @returns A new HookKeyDynamic instance.
 */
export function dynamicHookKey(fn: HookKeyDynamicFn): HookKeyDynamic {
  return new HookKeyDynamic(fn);
}

/**
 * Metadata stored on a hook function.
 */
export interface IHookData<A extends any[] = any[], R = any> {
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
export const dhk = dynamicHookKey;

/**
 * A utility class to provide the arguments passed to the middleware and hook functions.
 */
export class ArgumentsProvider<A extends any[] = any[]> {
  args: () => A;
  constructor(args: A | (() => A)) {
    this.args = typeof args === "function" ? args : () => args;
  }
}

export type ArgumentsFromProvider<AP extends ArgumentsProvider<any[]>> =
  AP extends ArgumentsProvider<infer A> ? A : never;

/**
 * Creates an ArgumentsProvider instance to provide the arguments passed to the middleware and hook functions.
 */
export function argsProvider<A extends any[]>(dynamicArgs: () => A): ArgumentsProvider<A>;
export function argsProvider<A extends any[]>(...args: A): ArgumentsProvider<A>;
export function argsProvider<A extends any[]>(...args: any[]): ArgumentsProvider<A> {
  return new ArgumentsProvider(args.length === 1 && typeof args[0] === "function" ? args[0] : args);
}

export const args = argsProvider;

/**
 * A function wrapped in a hook.
 */
export interface IHookFn<A extends any[] = any[], R = any, CallArgs extends any[] = A> {
  (...args: CallArgs): R;
  /** Metadata for the hook. */
  [HOOK_DATA]: IHookData<A, R>;
}

export type DynamicKeyOrAlternativeName = HookKeyDynamic | string;
export type AnyClass = abstract new (...args: any[]) => any;

export interface IHookDecoratorOptions {
  dynamicKey?: HookKeyDynamic;
  alternativeName?: string;
}

export interface IAccessorDecoratorHooks {
  get: (...args: any[]) => any;
  set: (...args: any[]) => any;
  init: (initialValue: any) => any;
}

export type HookClassStaticPropertyName<TClass extends AnyClass> = Exclude<Extract<keyof TClass, string>, "prototype">;

export type HookClassInstancePropertyName<TClass extends AnyClass> = Extract<
  keyof InstanceType<TClass> | "constructor",
  string
>;

export type HookPropertyName<TClass extends object> = TClass extends AnyClass
  ? HookClassInstancePropertyName<TClass> | `static ${string & HookClassStaticPropertyName<TClass>}`
  : TClass extends { constructor: infer C }
    ? C extends AnyClass
      ? HookClassInstancePropertyName<C>
      : never
    : never;

export type StrictHookClassExpression<TClass extends AnyClass> =
  | `init ${string & HookClassInstancePropertyName<TClass>}`
  | `get ${string & HookClassInstancePropertyName<TClass>}`
  | `set ${string & HookClassInstancePropertyName<TClass>}`
  | `accessor ${string & HookClassInstancePropertyName<TClass>}`
  | `method ${string & HookClassInstancePropertyName<TClass>}`
  | `static init ${string & HookClassStaticPropertyName<TClass>}`
  | `static get ${string & HookClassStaticPropertyName<TClass>}`
  | `static set ${string & HookClassStaticPropertyName<TClass>}`
  | `static accessor ${string & HookClassStaticPropertyName<TClass>}`
  | `static method ${string & HookClassStaticPropertyName<TClass>}`;

export type LooseHookClassExpression =
  | `!init ${string}`
  | `!get ${string}`
  | `!set ${string}`
  | `!accessor ${string}`
  | `!method ${string}`
  | `!static init ${string}`
  | `!static get ${string}`
  | `!static set ${string}`
  | `!static accessor ${string}`
  | `!static method ${string}`;

export type HookClassExpression<TClass extends object> = TClass extends AnyClass
  ? StrictHookClassExpression<TClass> | LooseHookClassExpression
  : TClass extends { constructor: infer C }
    ? C extends AnyClass
      ? StrictHookClassExpression<C> | LooseHookClassExpression
      : C
    : never;

export interface IHookClassUtilitiesState {
  instanceInitializers: Array<(instance: any) => void>;
}

export type StrictHookExpPropertyKey<N extends HookName> = N extends `get ${infer P}`
  ? P & PropertyKey
  : N extends `set ${infer P}`
    ? P & PropertyKey
    : N extends `init ${infer P}`
      ? P & PropertyKey
      : N extends `method ${infer P}`
        ? P & PropertyKey
        : N extends `static get ${infer P}`
          ? P & PropertyKey
          : N extends `static set ${infer P}`
            ? P & PropertyKey
            : N extends `static init ${infer P}`
              ? P & PropertyKey
              : N extends `static method ${infer P}`
                ? P & PropertyKey
                : N extends `static ${infer P}`
                  ? P & PropertyKey
                  : N extends PropertyKey
                    ? N
                    : never;

export type LooseHookExpPropertyKey<N extends HookName> = N extends `!get ${infer P}`
  ? P & PropertyKey
  : N extends `!set ${infer P}`
    ? P & PropertyKey
    : N extends `!init ${infer P}`
      ? P & PropertyKey
      : N extends `!method ${infer P}`
        ? P & PropertyKey
        : N extends `!static get ${infer P}`
          ? P & PropertyKey
          : N extends `!static set ${infer P}`
            ? P & PropertyKey
            : N extends `!static init ${infer P}`
              ? P & PropertyKey
              : N extends `!static method ${infer P}`
                ? P & PropertyKey
                : N extends `!static ${infer P}`
                  ? P & PropertyKey
                  : N extends PropertyKey
                    ? N
                    : never;

export type IsStrictHookExp<N extends HookName> =
  StrictHookExpPropertyKey<N> extends N
    ? false
    : StrictHookExpPropertyKey<N> extends infer P
      ? P extends `#${string}`
        ? false
        : true
      : true;

export type IsLooseHookExp<N extends HookName> = LooseHookExpPropertyKey<N> extends N ? false : true;

export type HookPrototype<TObject> = TObject extends abstract new (...args: any[]) => any
  ? TObject extends { prototype: infer TPrototype }
    ? TPrototype
    : never
  : never;

export type ResolveMemberValue<TObject extends object | symbol, TName extends PropertyKey> = TObject extends object
  ? TName extends keyof TObject
    ? TObject[TName]
    : TObject extends AnyClass
      ? TName extends keyof HookPrototype<TObject>
        ? HookPrototype<TObject>[TName]
        : never
      : never
  : never;

export type HookExpPropertyKey<N extends HookName> = StrictHookExpPropertyKey<N> | LooseHookExpPropertyKey<N>;

export type InferHookSignature<TObject extends object | symbol, TName extends HookName> = TName extends string
  ? IsLooseHookExp<TName> extends true
    ? [any[], any]
    : ResolveMemberValue<TObject, HookExpPropertyKey<TName>> extends infer Member
      ? [Member] extends [never]
        ? IsStrictHookExp<TName> extends true
          ? never
          : [any[], any]
        : Member extends { [HOOK_DATA]: infer HookData }
          ? HookData extends { origin: infer Origin }
            ? Origin extends (...args: infer A) => infer R
              ? [A, R]
              : [any[], any]
            : [any[], any]
          : Member extends (...args: infer A) => infer R
            ? [A, R]
            : TName extends `get ${string}`
              ? [[], Member]
              : TName extends `set ${string}`
                ? [[Member], void]
                : TName extends `init ${string}`
                  ? [[Member], Member]
                  : TName extends `method ${string}`
                    ? "method"
                    : TName extends `static init ${string}`
                      ? [[Member], Member]
                      : TName extends `static get ${string}`
                        ? [[], Member]
                        : TName extends `static set ${string}`
                          ? [[Member], Member]
                          : [any[], any]
      : [any[], any]
  : [any[], any];

export type InferMiddlewareArgs<TObject extends object, TName extends HookName> = InferHookSignature<TObject, TName>[0];
export type InferMiddlewareResult<TObject extends object, TName extends HookName> = InferHookSignature<
  TObject,
  TName
>[1];
export type InferMiddlewareThis<TObject extends object, TName extends HookName> =
  ResolveMemberValue<TObject, HookExpPropertyKey<TName>> extends infer Member
    ? [Member] extends [never]
      ? unknown
      : Member extends { [HOOK_DATA]: infer HookData }
        ? HookData extends { origin: infer Origin }
          ? Origin extends (this: infer ThisArg, ...args: any[]) => any
            ? ThisArg
            : unknown
          : unknown
        : Member extends (this: infer ThisArg, ...args: any[]) => any
          ? ThisArg
          : unknown
    : unknown;
