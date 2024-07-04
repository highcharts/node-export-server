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

  it('removes standalone foreignObject element', () => {
    const input = '<foreignObject>The foreignObject element</foreignObject>';
    const output = sanitize(input);
    expect(output).toBe('');
  });

  it('removes foreignObject element along with the containing iframe and b tags', () => {
    const input =
      "<foreignObject><iframe src=''></iframe><b>Hello</b></foreignObject>";
    const output = sanitize(input);
    expect(output).toBe('');
  });

  it('does not remove foreignObject element from SVG', () => {
    const input =
      '<svg><foreignObject>The foreignObject tag</foreignObject></svg>';
    const output = sanitize(input);
    expect(output).toBe(
      '<svg><foreignObject>The foreignObject tag</foreignObject></svg>'
    );
  });

  it('does not remove foreignObject with HTML tag inside from SVG', () => {
    const input =
      '<svg><foreignObject><span>HTML element</span></foreignObject></svg>';
    const output = sanitize(input);
    expect(output).toBe(
      '<svg><foreignObject><span>HTML element</span></foreignObject></svg>'
    );
  });

  it('removes iframe tag and leaves b tag inside foreignObject element from SVG', () => {
    const input =
      "<svg><foreignObject><iframe src='<internal AWS UP>'></iframe><b>Hello</b></foreignObject></svg>";
    const output = sanitize(input);
    expect(output).toBe(
      '<svg><foreignObject><b>Hello</b></foreignObject></svg>'
    );
  });
});
