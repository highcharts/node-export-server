import errorHandler from '../../lib/server/error.js';
import { setLogLevel } from '../../lib/logger.js';

// Keep the suite quiet - the clamp below logs at error level by design
setLogLevel(0);

// The module registers its middlewares through app.use rather than exporting
// them, so collect them from a stand-in app. The last one registered is the
// middleware that writes the response.
const registered = [];
errorHandler({ use: (middleware) => registered.push(middleware) });
const returnError = registered[registered.length - 1];

/**
 * Builds a minimal stand-in for an Express response that records what was done
 * to it.
 *
 * @param {Object} options - Options for the stand-in.
 * @param {boolean} options.headersSent - Whether the response has already begun.
 *
 * @returns {Object} The stand-in response.
 */
const makeResponse = ({ headersSent = false } = {}) => ({
  headersSent,
  statusCode: null,
  body: null,
  ended: false,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
  end() {
    this.ended = true;
    return this;
  }
});

describe('server error middleware', () => {
  it('defaults to 400 when the error carries no status', () => {
    const response = makeResponse();
    returnError(new Error('no status here'), {}, response, () => {});

    expect(response.statusCode).toBe(400);
    expect(response.body.statusCode).toBe(400);
  });

  it('preserves a 4xx status', () => {
    const response = makeResponse();
    const error = new Error('unauthorized');
    error.statusCode = 401;

    returnError(error, {}, response, () => {});

    expect(response.statusCode).toBe(401);
  });

  // This server must never answer with a 5xx. The status is not always ours:
  // errors are wrapped as they travel up the stack, and a wrapped error from an
  // outbound HTTP call can carry any status a remote gave us.
  it.each([500, 502, 503, 504, 599])(
    'clamps the out-of-contract status %i to 400',
    (status) => {
      const response = makeResponse();
      const error = new Error('should not escape as a 5xx');
      error.statusCode = status;

      returnError(error, {}, response, () => {});

      expect(response.statusCode).toBe(400);
      expect(response.body.statusCode).toBe(400);
    }
  );

  it('clamps a status below the valid range to 400', () => {
    const response = makeResponse();
    const error = new Error('nonsense status');
    error.statusCode = 12;

    returnError(error, {}, response, () => {});

    expect(response.statusCode).toBe(400);
  });

  it('never answers with a 5xx for any status an error might carry', () => {
    for (let status = 100; status <= 599; status++) {
      const response = makeResponse();
      const error = new Error('sweep');
      error.statusCode = status;

      returnError(error, {}, response, () => {});

      expect(response.statusCode).toBeLessThan(500);
      expect(response.body.statusCode).toBeLessThan(500);
    }
  });

  it('includes the errorCode when the error carries one', () => {
    const response = makeResponse();
    const error = new Error('at capacity');
    error.statusCode = 400;
    error.errorCode = 'EXPORT_QUEUE_FULL';

    returnError(error, {}, response, () => {});

    expect(response.body.errorCode).toBe('EXPORT_QUEUE_FULL');
  });

  it('omits the errorCode entirely when the error carries none', () => {
    const response = makeResponse();
    returnError(new Error('plain'), {}, response, () => {});

    expect('errorCode' in response.body).toBe(false);
  });

  // Handing the error onwards once the response has begun would let Express's
  // own handler take over, which answers 500.
  it('ends the response without touching the status when headers are sent', () => {
    const response = makeResponse({ headersSent: true });
    const error = new Error('too late to set a status');
    error.statusCode = 500;

    returnError(error, {}, response, () => {});

    expect(response.ended).toBe(true);
    expect(response.statusCode).toBeNull();
    expect(response.body).toBeNull();
  });
});
