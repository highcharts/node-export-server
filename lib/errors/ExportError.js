class ExportError extends Error {
  /**
   * @param {string} message
   * @param {number} [statusCode]
   */
  constructor(message, statusCode) {
    super();
    this.message = message;
    this.stackMessage = message;

    if (this.statusCode) {
      this.statusCode = statusCode;
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
    if (error.stack) {
      this.stackMessage = error.message;
      this.stack = error.stack;
    }
    return this;
  }
}

export default ExportError;
