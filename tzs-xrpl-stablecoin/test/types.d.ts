/// <reference types="jest" />

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveBeenCalled(): R;
      toHaveBeenCalledWith(...args: any[]): R;
      toHaveProperty(property: string, value?: any): R;
      toBe(expected: any): R;
      toEqual(expected: any): R;
      toResolve(): R;
      toReject(): R;
    }
  }
}

export {};
