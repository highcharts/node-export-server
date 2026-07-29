import ExportError from './ExportError.js';

class HttpError extends ExportError {
  constructor(message, status, errorCode = false) {
    super(message, errorCode);
    this.status = this.statusCode = status;
  }

  setStatus(status) {
    this.status = status;
    return this;
  }
}

export default HttpError;
