class ExportError extends Error {
  constructor(message) {
    super();
    this.message = message;
    this.stackMessage = message;
  }

  setError(error) {
    this.error = error;
    if (error.name) {
      this.name = error.name;
    }
    if (error.statusCode) {
      this.statusCode = error.statusCode;
    }
    if (error.stack) {
      this.stackMessage = error.message;
      this.stack = error.stack;
    }
    return this;
  }
}

export default ExportError;
