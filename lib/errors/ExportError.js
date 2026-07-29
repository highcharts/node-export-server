class ExportError extends Error {
  constructor(message, errorCode = false) {
    super();
    this.message = message;
    this.stackMessage = message;

    if (errorCode) {
      this.errorCode = errorCode;
    }
  }

  setError(error) {
    this.error = error;
    if (error.name) {
      this.name = error.name;
    }
    if (error.statusCode) {
      this.statusCode = error.statusCode;
    }
    // NOTE: Carry a machine readable code up from the wrapped error. Errors are
    //       wrapped as they travel up the stack, and without this the reason a
    //       request failed would be lost at the first wrap, leaving only the
    //       message to tell a capacity problem from a bad request.
    if (error.errorCode && !this.errorCode) {
      this.errorCode = error.errorCode;
    }
    if (error.stack) {
      this.stackMessage = error.message;
      this.stack = error.stack;
    }
    return this;
  }

  setCode(errorCode) {
    this.errorCode = errorCode;
    return this;
  }
}

export default ExportError;
