import ExportError from './ExportError.js';

class HttpError extends ExportError {
  constructor(message, status) {
    super(message);
    this.status = this.statusCode = status;
  }

  setStatus(status) {
    this.status = status;
    return this;
  }
}

export default HttpError;
