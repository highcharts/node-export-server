import {
  clearText,
  fixType,
  roundNumber,
  toBoolean,
  isCorrectJSON,
  isObject,
  isObjectEmpty,
  isPrivateRangeUrlFound
} from '../../lib/utils';

describe('clearText', () => {
  it('replaces multiple spaces with a single space and trims the text', () => {
    const input = '  This   is  a test    ';
    const expected = 'This is a test';
    expect(clearText(input)).toBe(expected);
  });
});

describe('fixType', () => {
  it('corrects the export type based on file extension', () => {
    expect(fixType('image/jpeg', 'output.png')).toBe('png');
  });

  it('returns the original type if no outfile is provided', () => {
    expect(fixType('pdf')).toBe('pdf');
  });
});

describe('roundNumber', () => {
  it('rounds a number to the specified precision', () => {
    expect(roundNumber(3.14159, 2)).toBe(3.14);
    expect(roundNumber(0.1 + 0.2, 1)).toBe(0.3);
  });
});

describe('toBoolean', () => {
  it('converts various values to their boolean equivalent', () => {
    expect(toBoolean('true')).toBe(true);
    expect(toBoolean('')).toBe(false);
    expect(toBoolean('false')).toBe(false);
    expect(toBoolean(undefined)).toBe(false);
    expect(toBoolean('any string')).toBe(true);
  });
});

describe('isCorrectJSON', () => {
  it('parses valid JSON strings', () => {
    const json = '{"key":"value"}';
    expect(isCorrectJSON(json)).toEqual({ key: 'value' });
  });

  it('returns false for invalid JSON strings', () => {
    const json = '{"key":value}';
    expect(isCorrectJSON(json)).toBe(false);
  });

  it('parses JavaScript objects', () => {
    const obj = { key: 'value' };
    expect(isCorrectJSON(obj)).toEqual({ key: 'value' });
  });

  it('returns a stringified version of a valid JSON/object when toString is true', () => {
    const obj = { key: 'value' };
    const json = '{"key":"value"}';
    expect(isCorrectJSON(obj, true)).toBe(json);
    expect(isCorrectJSON(json, true)).toBe(json);
  });

  it('handles non-JSON strings', () => {
    const str = 'Just a string';
    expect(isCorrectJSON(str)).toBe(false);
  });

  it('handles non-object types (e.g., numbers, booleans)', () => {
    expect(isCorrectJSON(123)).toBe(123);
    expect(isCorrectJSON(true)).toBe(true);
  });

  it('correctly parses and stringifies an array when toString is true', () => {
    const arr = [1, 2, 3];
    expect(isCorrectJSON(arr, true)).toBe('[1,2,3]');
  });
});

describe('isObject', () => {
  it('returns true for plain objects', () => {
    expect(isObject({})).toBe(true);
    expect(isObject({ key: 'value' })).toBe(true);
  });

  it('returns false for arrays', () => {
    expect(isObject([])).toBe(false);
    expect(isObject([1, 2, 3])).toBe(false);
  });

  it('returns false for null', () => {
    expect(isObject(null)).toBe(false);
  });

  it('returns false for non-object types', () => {
    expect(isObject(123)).toBe(false);
    expect(isObject('string')).toBe(false);
    expect(isObject(true)).toBe(false);
    expect(isObject(undefined)).toBe(false);
    expect(isObject(() => {})).toBe(false);
  });
});

describe('isObjectEmpty', () => {
  it('returns true for an empty object', () => {
    expect(isObjectEmpty({})).toBe(true);
  });

  it('returns false for a non-empty object', () => {
    expect(isObjectEmpty({ key: 'value' })).toBe(false);
  });

  it('returns false for non-object types, even if "empty"', () => {
    expect(isObjectEmpty(null)).toBe(false); // Even though null is technically an "empty" value, it's not an object.
    expect(isObjectEmpty([])).toBe(false); // Arrays are objects, but this function specifically checks for plain objects.
    expect(isObjectEmpty('')).toBe(false); // A string is not an object.
    expect(isObjectEmpty(0)).toBe(false); // A number is not an object.
  });

  it('handles complex objects correctly', () => {
    expect(isObjectEmpty({ key: undefined })).toBe(false); // An object with a key undefined is still considered not empty.
    expect(isObjectEmpty({ key: null })).toBe(false); // Same for a key with a null value.
  });
});

describe('isPrivateRangeUrlFound', () => {
  it('returns true for URLs with private IP ranges', () => {
    const testCases = [
      'xlink:href="http://localhost/path/to/resource"',
      'xlink:href="https://127.0.0.1/path/to/resource"',
      'xlink:href="http://10.0.0.1/path/to/resource"',
      'xlink:href="http://172.16.0.1/path/to/resource"',
      'xlink:href="https://192.168.1.1/path/to/resource"'
    ];
    testCases.forEach((testCase) => {
      expect(isPrivateRangeUrlFound(testCase)).toBe(true);
    });
  });

  it('returns false for URLs with public IP ranges or non-IP strings', () => {
    const testCases = [
      'xlink:href="https://8.8.8.8/path/to/resource"',
      'xlink:href="http://www.example.com/path/to/resource"',
      'Just a regular string without any URL',
      'xlink:href="https://172.32.0.1/path/to/resource"', // IP outside the private range
      ''
    ];
    testCases.forEach((testCase) => {
      expect(isPrivateRangeUrlFound(testCase)).toBe(false);
    });
  });

  it('returns false for malformed URLs', () => {
    const testCases = [
      'xlink:href="http:///malformed.url"',
      'xlink:href="https://:80"'
    ];
    testCases.forEach((testCase) => {
      expect(isPrivateRangeUrlFound(testCase)).toBe(false);
    });
  });
});
