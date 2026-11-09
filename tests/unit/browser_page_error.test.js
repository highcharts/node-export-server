import { jest } from '@jest/globals';
import { handlePageError } from '../../lib/browser.js';
import { setLogLevel } from '../../lib/logger.js';

setLogLevel(0);

describe('page error handler', () => {
  it('handles the page closing while displaying an error', async () => {
    let closed = false;
    const page = {
      isClosed: () => closed,
      $eval: jest.fn(async () => {
        closed = true;
        throw new Error('Target closed');
      })
    };

    await expect(
      handlePageError(page, new Error('chart error'))
    ).resolves.toBeUndefined();
    expect(page.$eval).toHaveBeenCalledTimes(1);
  });

  it('handles display failures while the page is still open', async () => {
    const page = {
      isClosed: () => false,
      $eval: jest.fn().mockRejectedValue(new Error('missing container'))
    };

    await expect(
      handlePageError(page, new Error('chart error'))
    ).resolves.toBeUndefined();
  });

  it('does not evaluate on an already closed page', async () => {
    const page = { isClosed: () => true, $eval: jest.fn() };
    await handlePageError(page, new Error('chart error'));
    expect(page.$eval).not.toHaveBeenCalled();
  });
});
