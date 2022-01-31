// Better error objects with codes
// Sourced from https://github.com/vweevers/module-error

interface ErrorOptions {
  code?: string;
  cause?: Error;
  expected?: boolean;
  transient?: boolean;
}

class ModuleError extends Error {
  code: string | undefined;
  expected: boolean | undefined;
  transient: boolean | undefined;
  cause: Error | undefined;
  /**
   * @param {string} message Error message
   * @param {{ code?: string, cause?: Error, expected?: boolean, transient?: boolean }} [options]
   */
  constructor(message: string, options: ErrorOptions) {
    super(message || '');

    if (typeof options === 'object' && options !== null) {
      if (options.code) this.code = String(options.code);
      if (options.expected) this.expected = true;
      if (options.transient) this.transient = true;
      if (options.cause) this.cause = options.cause;
    }

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

class UnexpectedAssetTypeError extends ModuleError {
  constructor(assetType: string) {
    const code = 'UnexpectedAssetTypeError';
    super(`Unexpected asset type ${assetType ?? 'unknown'}`, {
      expected: true,
      code,
    });
    this.name = code;
  }
}

class UnsupportedChainId extends ModuleError {
  constructor(chainId: number) {
    const code = 'UnsupportedChainId';
    super(
      `Unexpected chainId ${chainId}. If you want to use that chain, please provide custom zeroex addresses`,
      {
        expected: true,
        code,
      }
    );
    this.name = code;
  }
}

export { ModuleError, UnexpectedAssetTypeError, UnsupportedChainId };
