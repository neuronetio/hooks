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

export type HookDecoratorArgument = HookKeyDynamic | string;
export type HookDecoratedClass = new (...args: any[]) => any;

export interface IHookDecoratorOptions {
  dynamicKey?: HookKeyDynamic;
  alternativeName?: string;
}

export interface IAccessorDecoratorHooks {
  get: (...args: any[]) => any;
  set: (...args: any[]) => any;
  init: (initialValue: any) => any;
}

export type HookClassStaticPropertyName<TClass extends HookDecoratedClass> = Exclude<
  Extract<keyof TClass, PropertyKey>,
  "prototype"
>;

export type HookClassInstancePropertyName<TClass extends HookDecoratedClass> = Extract<
  keyof InstanceType<TClass> | "constructor",
  PropertyKey
>;

export type HookClassPropertyName<TClass extends HookDecoratedClass> =
  | HookClassStaticPropertyName<TClass>
  | HookClassInstancePropertyName<TClass>;

export type HookDecorName<TClass extends HookDecoratedClass> =
  | HookClassInstancePropertyName<TClass>
  | `static ${string & HookClassStaticPropertyName<TClass>}`;

export type StrictHookClassExpression<TClass extends HookDecoratedClass> =
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

export type HookClassExpression<TClass extends HookDecoratedClass> =
  | StrictHookClassExpression<TClass>
  | LooseHookClassExpression;

export interface IHookClassUtilitiesState {
  instanceInitializers: Array<(instance: any) => void>;
}
