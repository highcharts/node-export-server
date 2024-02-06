class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = this.statusCode = status;
    this.message = message;
  }

  setStatus(status) {
    this.status = status;
    return this;
  }

  setError(error) {
    this.error = error;
    if (error.stack) {
      this.stack = error.stack;
    }
    return this;
  }
}

export default HttpError;
