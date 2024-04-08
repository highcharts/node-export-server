import { sanitize } from '../../lib/sanitize.js';

describe('sanitize', () => {
  it('removes simple script tags', () => {
    const input = '<script>alert("xss");</script> Hello World!';
    const output = sanitize(input);
    expect(output).toBe('Hello World!');
  });

  it('removes nested script tags', () => {
    const input = '<div><script><script>alert("xss");</script></script></div>';
    const output = sanitize(input);
    expect(output).toBe('<div></div>');
  });

  it('removes script tags with attributes', () => {
    const input =
      '<script type="text/javascript">alert("xss");</script> Hello World!';
    const output = sanitize(input);
    expect(output).toBe('Hello World!');
  });

  it('removes script tags regardless of case', () => {
    const input = '<ScRiPt>alert("xss");</sCrIpT> Hello World!';
    const output = sanitize(input);
    expect(output).toBe('Hello World!');
  });

  it('removes multiple script tags', () => {
    const input =
      'Hello <script>alert("xss");</script> World!<script>alert("again");</script>';
    const output = sanitize(input);
    expect(output).toBe('Hello  World!');
  });

  it('does not remove non-script tags', () => {
    const input = '<div>Hello World!</div>';
    const output = sanitize(input);
    expect(output).toBe('<div>Hello World!</div>');
  });

  it('handles malformed script tags', () => {
    const input = '<script>alert("xss")</script';
    const output = sanitize(input);
    expect(output).toBe('');
  });
});
