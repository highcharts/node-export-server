import { describe, expect, it } from '@jest/globals';

import {
  excludeFromValues,
  possibleValues,
  validateOtherTypes
} from '../../utils/tests_utils.js';
import { c } from '../../../lib/envs.js';
import { scriptsNames } from '../../../lib/schemas/config.js';

/**
 * Infile validator
 */
describe('The infile custom validator', () => {
  it('should accept string values that end with .json or .svg', () => {
    // The .json and .svg should pass
    expect(c.infile().parse('c.json')).toBe('c.json');
    expect(c.infile().parse('c.svg')).toBe('c.svg');
    expect(c.infile().parse('chart.json')).toBe('chart.json');
    expect(c.infile().parse('chart.svg')).toBe('chart.svg');
  });

  it('should accept an empty string value and transform it to null', () => {
    // The null should pass and transform to null
    expect(c.infile().parse('')).toBe(null);
  });

  it('should accept a null value', () => {
    // The null should pass
    expect(c.infile().parse(null)).toBe(null);
  });

  it('should not accept string values that do not end with .json or .svg', () => {
    // The .pdf and .png should fail
    expect(() => c.infile().parse('chart.pdf')).toThrow();
    expect(() => c.infile().parse('chart.png')).toThrow();
  });

  it('should not accept string values that are not at least one character long without the extensions', () => {
    // The .json and .svg should fail
    expect(() => c.infile().parse('.json')).toThrow();
    expect(() => c.infile().parse('.svg')).toThrow();
  });

  it('should not accept values of any other types', () => {
    // Filter the possibleValue object to exclude nullish like values
    const otherValues = excludeFromValues(possibleValues, [
      'string',
      'nullish',
      'stringNullish'
    ]);

    // All other values should pass
    otherValues.forEach((value) => {
      expect(() => c.infile().parse(value)).toThrow();
    });
  });
});

/**
 * Outfile validator
 */
describe('The outfile custom validator', () => {
  it('should accept string values that end with .jpeg, .jpg, .png, .pdf, or .svg', () => {
    // The .jpeg, .jpg, .png, .pdf, or .svg should pass
    expect(c.outfile().parse('c.jpeg')).toBe('c.jpeg');
    expect(c.outfile().parse('c.jpg')).toBe('c.jpg');
    expect(c.outfile().parse('c.png')).toBe('c.png');
    expect(c.outfile().parse('c.pdf')).toBe('c.pdf');
    expect(c.outfile().parse('c.svg')).toBe('c.svg');
    expect(c.outfile().parse('chart.jpeg')).toBe('chart.jpeg');
    expect(c.outfile().parse('chart.jpg')).toBe('chart.jpg');
    expect(c.outfile().parse('chart.png')).toBe('chart.png');
    expect(c.outfile().parse('chart.pdf')).toBe('chart.pdf');
    expect(c.outfile().parse('chart.svg')).toBe('chart.svg');
  });

  it('should accept an empty string value and transform it to null', () => {
    // The null should pass and transform to null
    expect(c.outfile().parse('')).toBe(null);
  });

  it('should accept a null value', () => {
    // The null should pass
    expect(c.outfile().parse(null)).toBe(null);
  });

  it('should not accept string values that do not end with .jpeg, .jpg, .png, .pdf, or .svg', () => {
    // The .json and .txt should fail
    expect(() => c.outfile().parse('chart.json')).toThrow();
    expect(() => c.outfile().parse('chart.txt')).toThrow();
  });

  it('should not accept string values that are not at least one character long without the extensions', () => {
    // The .jpeg, .jpg, .png, .pdf, or .svg should fail
    expect(() => c.outfile().parse('.jpeg')).toThrow();
    expect(() => c.outfile().parse('.jpg')).toThrow();
    expect(() => c.outfile().parse('.png')).toThrow();
    expect(() => c.outfile().parse('.pdf')).toThrow();
    expect(() => c.outfile().parse('.svg')).toThrow();
  });

  it('should not accept values of any other types', () => {
    // Filter the possibleValue object to exclude nullish like values
    const otherValues = excludeFromValues(possibleValues, [
      'string',
      'nullish',
      'stringNullish'
    ]);

    // All other values should fail
    otherValues.forEach((value) => {
      expect(() => c.outfile().parse(value)).toThrow();
    });
  });
});

/**
 * Custom config file validator
 */
describe('The customConfig custom validator', () => {
  it('should accept string values that end with .json', () => {
    // The .json and .svg should pass
    expect(c.customConfig().parse('o.json')).toBe('o.json');
    expect(c.customConfig().parse('options.json')).toBe('options.json');
  });

  it('should accept an empty string value and transform it to null', () => {
    // The null should pass and transform to null
    expect(c.customConfig().parse('')).toBe(null);
  });

  it('should accept a null value', () => {
    // The null should pass
    expect(c.customConfig().parse(null)).toBe(null);
  });

  it('should not accept string values that do not end with .json or .svg', () => {
    // The .pdf and .png should fail
    expect(() => c.customConfig().parse('options.pdf')).toThrow();
    expect(() => c.customConfig().parse('options.png')).toThrow();
  });

  it('should not accept string values that are not at least one character long without the extensions', () => {
    // The .json should fail
    expect(() => c.customConfig().parse('.json')).toThrow();
  });

  it('should not accept values of any other types', () => {
    // Filter the possibleValue object to exclude nullish like values
    const otherValues = excludeFromValues(possibleValues, [
      'string',
      'nullish',
      'stringNullish'
    ]);

    // All other values should pass
    otherValues.forEach((value) => {
      expect(() => c.customConfig().parse(value)).toThrow();
    });
  });
});

/**
 * The object of options validator
 */
describe('The optionsObject custom validator', () => {
  it('should accept any object values', () => {
    // The {}, { a: 1 }, and { a: '1', b: { c: 3 } } should pass
    expect(c.optionsObject().parse({})).toEqual({});
    expect(c.optionsObject().parse({ a: 1 })).toEqual({ a: 1 });
    expect(c.optionsObject().parse({ a: '1', b: { c: 3 } })).toEqual({
      a: '1',
      b: { c: 3 }
    });
  });

  it('should accept null value', () => {
    // The null should pass
    expect(c.optionsObject().parse(null)).toBe(null);
  });

  it('should accept an empty string and transform it to null', () => {
    // The '' should pass and transform to null
    expect(c.optionsObject().parse('')).toBe(null);
  });

  it('should accept any string values', () => {
    // The '{}', '{ a: 1 }', and '{ a: "1", b: { c: 3 } }' should pass
    expect(c.optionsObject().parse('{}')).toBe('{}');
    expect(c.optionsObject().parse('{ a: 1 }')).toBe('{ a: 1 }');
    expect(c.optionsObject().parse('{ a: "1", b: { c: 3 } }')).toBe(
      '{ a: "1", b: { c: 3 } }'
    );
  });

  it('should not accept any array values', () => {
    // The [], [1], ['a'], and [{ a: 1 }] should fail
    expect(() => c.optionsObject().parse([])).toThrow();
    expect(() => c.optionsObject().parse([1])).toThrow();
    expect(() => c.optionsObject().parse(['a'])).toThrow();
    expect(() => c.optionsObject().parse([{ a: 1 }])).toThrow();
  });

  it('should not accept any other object based values', () => {
    // The function () {}, () => {}, new Date() should fail
    expect(() => c.optionsObject().parse(function () {})).toThrow();
    expect(() => c.optionsObject().parse(() => {})).toThrow();
    expect(() => c.optionsObject().parse(new Date())).toThrow();
  });

  it('should not accept values of any other types', () => {
    // Filter the possibleValue object to exclude nullish like values
    const otherValues = excludeFromValues(possibleValues, [
      'string',
      'stringBoolean',
      'stringNumber',
      'stringNullish',
      'stringSymbol',
      'stringObject',
      'nullish',
      'object'
    ]);

    // All other values should pass
    otherValues.forEach((value) => {
      expect(() => c.optionsObject().parse(value)).toThrow();
    });
  });
});

/**
 * The resources object validator
 */
describe('The resources custom validator', () => {
  it("should accept an object with properties 'js', 'css', and 'files'", () => {
    expect(
      c.resources().parse({
        js: '',
        css: '',
        files: []
      })
    ).toEqual({
      js: '',
      css: '',
      files: []
    });
  });

  it("should accept an object with properties 'js', 'css', and 'files' with null values and empty array", () => {
    expect(
      c.resources().parse({
        js: null,
        css: null,
        files: []
      })
    ).toEqual({
      js: null,
      css: null,
      files: []
    });
  });

  it("should accept a partial object with some properties from the 'js', 'css', and 'files'", () => {
    expect(
      c.resources().parse({
        js: 'console.log(1);'
      })
    ).toEqual({
      js: 'console.log(1);'
    });
  });

  it('should accept null value', () => {
    expect(c.resources().parse(null)).toEqual(null);
  });

  it('should not accept values of any other types', () => {
    // Filter the possibleValue object to exclude nullish like values
    const otherValues = excludeFromValues(possibleValues, [
      'nullish',
      'object'
    ]);

    // All other values should pass
    otherValues.forEach((value) => {
      expect(() => c.resources().parse(value)).toThrow();
    });
  });
});

/**
 * Chart type validator
 */
describe('The chartType custom validator', () => {
  describe('when the envsCheck is false', () => {
    it('should not accept an empty string', () => {
      // The '' should fail
      expect(() => c.chartType().parse('')).toThrow();
    });
  });

  describe('when the envsCheck is true', () => {
    it('should accept an empty stringand transform it to null', () => {
      // The '' should pass and transform to null
      expect(c.chartType(true).parse('')).toBe(null);
    });
  });

  describe('regardless the envsCheck value', () => {
    it("should accept 'jpeg', 'jpg', 'png', 'pdf', and 'svg' values", () => {
      // The 'jpeg', 'jpg', 'png', 'pdf', and 'svg' should pass
      expect(c.chartType().parse('jpeg')).toBe('jpeg');
      expect(c.chartType().parse('jpg')).toBe('jpg');
      expect(c.chartType().parse('png')).toBe('png');
      expect(c.chartType().parse('pdf')).toBe('pdf');
      expect(c.chartType().parse('svg')).toBe('svg');
      expect(c.chartType(true).parse('jpeg')).toBe('jpeg');
      expect(c.chartType(true).parse('jpg')).toBe('jpg');
      expect(c.chartType(true).parse('png')).toBe('png');
      expect(c.chartType(true).parse('pdf')).toBe('pdf');
      expect(c.chartType(true).parse('svg')).toBe('svg');
    });

    it("should not accept string values that are not 'jpeg', 'jpg', 'png', 'pdf', or 'svg'", () => {
      // The json and txt should fail
      expect(() => c.chartType().parse('json')).toThrow();
      expect(() => c.chartType().parse('txt')).toThrow();
      expect(() => c.chartType(true).parse('json')).toThrow();
      expect(() => c.chartType(true).parse('txt')).toThrow();
    });

    it('should not accept values of any other types', () => {
      // Get all the possibleValue object's properties values
      validateOtherTypes(c.chartType);
    });
  });
});

/**
 * Chart constructor validator
 */
describe('The chartConstr custom validator', () => {
  describe('when the envsCheck is false', () => {
    it('should not accept an empty string', () => {
      // The '' should fail
      expect(() => c.chartConstr().parse('')).toThrow();
    });
  });

  describe('when the envsCheck is true', () => {
    it('should accept an empty stringand transform it to null', () => {
      // The '' should pass and transform to null
      expect(c.chartConstr(true).parse('')).toBe(null);
    });
  });

  describe('regardless the envsCheck value', () => {
    it("should accept 'chart', 'stockChart', 'mapChart', and 'ganttChart' values", () => {
      // The 'chart', 'stockChart', 'mapChart', and 'ganttChart' should pass
      expect(c.chartConstr().parse('chart')).toBe('chart');
      expect(c.chartConstr().parse('stockChart')).toBe('stockChart');
      expect(c.chartConstr().parse('mapChart')).toBe('mapChart');
      expect(c.chartConstr().parse('ganttChart')).toBe('ganttChart');
      expect(c.chartConstr(true).parse('chart')).toBe('chart');
      expect(c.chartConstr(true).parse('stockChart')).toBe('stockChart');
      expect(c.chartConstr(true).parse('mapChart')).toBe('mapChart');
      expect(c.chartConstr(true).parse('ganttChart')).toBe('ganttChart');
    });

    it("should not accept string values that are not 'chart', 'stockChart', 'mapChart', or 'ganttChart'", () => {
      // The stock and map should fail
      expect(() => c.chartConstr().parse('stock')).toThrow();
      expect(() => c.chartConstr().parse('map')).toThrow();
      expect(() => c.chartConstr(true).parse('stock')).toThrow();
      expect(() => c.chartConstr(true).parse('map')).toThrow();
    });

    it('should not accept values of any other types', () => {
      // Get all the possibleValue object's properties values
      validateOtherTypes(c.chartConstr);
    });
  });
});

/**
 * Node server environment validator
 */
describe('The nodeEnv custom validator', () => {
  describe('when the envsCheck is false', () => {
    it('should not accept an empty string', () => {
      // The '' should fail
      expect(() => c.nodeEnv().parse('')).toThrow();
    });
  });

  describe('when the envsCheck is true', () => {
    it('should accept an empty stringand transform it to null', () => {
      // The '' should pass and transform to null
      expect(c.nodeEnv(true).parse('')).toBe(null);
    });
  });

  describe('regardless the envsCheck value', () => {
    it("should accept 'development', 'production', and 'test' values", () => {
      // The 'development', 'production', and 'test' should pass
      expect(c.nodeEnv().parse('development')).toBe('development');
      expect(c.nodeEnv().parse('production')).toBe('production');
      expect(c.nodeEnv().parse('test')).toBe('test');
      expect(c.nodeEnv(true).parse('development')).toBe('development');
      expect(c.nodeEnv(true).parse('production')).toBe('production');
      expect(c.nodeEnv(true).parse('test')).toBe('test');
    });

    it("should not accept string values that are not 'development', 'production', or 'test'", () => {
      // The staging and dev should fail
      expect(() => c.nodeEnv().parse('staging')).toThrow();
      expect(() => c.nodeEnv().parse('dev')).toThrow();
      expect(() => c.nodeEnv(true).parse('staging')).toThrow();
      expect(() => c.nodeEnv(true).parse('dev')).toThrow();
    });

    it('should not accept values of any other types', () => {
      // Get all the possibleValue object's properties values
      validateOtherTypes(c.nodeEnv);
    });
  });
});

/**
 * Highcharts CDN URL validator
 */
describe('The cdnUrl custom validator', () => {
  describe('when the envsCheck is false', () => {
    it('should not accept an empty string', () => {
      // The '' should fail
      expect(() => c.cdnUrl().parse('')).toThrow();
    });
  });

  describe('when the envsCheck is true', () => {
    it('should accept an empty string', () => {
      // The '' should pass and transform to null
      expect(c.cdnUrl(true).parse('')).toBe(null);
    });
  });

  describe('regardless the envsCheck value', () => {
    it('should accept string values that start with http:// or https://', () => {
      // The http:// and https:// should pass
      expect(c.cdnUrl().parse('http://')).toBe('http://');
      expect(c.cdnUrl().parse('https://')).toBe('https://');
      expect(c.cdnUrl(true).parse('http://')).toBe('http://');
      expect(c.cdnUrl(true).parse('https://')).toBe('https://');
    });

    it('should not accept string values that do not start with http:// or https://', () => {
      // The http and https should fail
      expect(() => c.cdnUrl().parse('http')).toThrow();
      expect(() => c.cdnUrl().parse('https')).toThrow();
      expect(() => c.cdnUrl(true).parse('http')).toThrow();
      expect(() => c.cdnUrl(true).parse('https')).toThrow();
    });

    it('should not accept values of any other types', () => {
      // Get all the possibleValue object's properties values
      validateOtherTypes(c.cdnUrl);
    });
  });
});

/**
 * WebSocket server URL validator
 */
describe('The wsUrl custom validator', () => {
  describe('when the envsCheck is false', () => {
    it('should not accept an empty string', () => {
      // The '' should fail
      expect(() => c.wsUrl().parse('')).toThrow();
    });
  });

  describe('when the envsCheck is true', () => {
    it('should accept an empty string', () => {
      // The '' should pass and transform to null
      expect(c.wsUrl(true).parse('')).toBe(null);
    });
  });

  describe('regardless the envsCheck value', () => {
    it('should accept string values that start with ws:// or wss://', () => {
      // The ws:// and wss:// should pass
      expect(c.wsUrl().parse('ws://')).toBe('ws://');
      expect(c.wsUrl().parse('wss://')).toBe('wss://');
      expect(c.wsUrl(true).parse('ws://')).toBe('ws://');
      expect(c.wsUrl(true).parse('wss://')).toBe('wss://');
    });

    it('should not accept string values that do not start with ws:// or wss://', () => {
      // The ws and wss should fail
      expect(() => c.wsUrl().parse('ws')).toThrow();
      expect(() => c.wsUrl().parse('wss')).toThrow();
      expect(() => c.wsUrl(true).parse('ws')).toThrow();
      expect(() => c.wsUrl(true).parse('wss')).toThrow();
    });

    it('should not accept values of any other types', () => {
      // Get all the possibleValue object's properties values
      validateOtherTypes(c.wsUrl);
    });
  });
});

/**
 * UI URL of the server validator
 */
describe('The uiRoute custom validator', () => {
  describe('when the envsCheck is false', () => {
    it('should not accept an empty string', () => {
      // The '' should fail
      expect(() => c.uiRoute().parse('')).toThrow();
    });
  });

  describe('when the envsCheck is true', () => {
    it('should accept an empty string', () => {
      // The '' should pass and transform to null
      expect(c.uiRoute(true).parse('')).toBe(null);
    });
  });

  describe('regardless the envsCheck value', () => {
    it('should accept string values that start with /', () => {
      // The / and /ui should pass
      expect(c.uiRoute().parse('/')).toBe('/');
      expect(c.uiRoute().parse('/ui')).toBe('/ui');
      expect(c.uiRoute(true).parse('/')).toBe('/');
      expect(c.uiRoute(true).parse('/ui')).toBe('/ui');
    });

    it('should not accept string values that do not start with /', () => {
      // The ui and chart-ui should fail
      expect(() => c.uiRoute().parse('ui')).toThrow();
      expect(() => c.uiRoute().parse('chart-ui')).toThrow();
      expect(() => c.uiRoute(true).parse('ui')).toThrow();
      expect(() => c.uiRoute(true).parse('chart-ui')).toThrow();
    });

    it('should not accept values of any other types', () => {
      // Get all the possibleValue object's properties values
      validateOtherTypes(c.uiRoute);
    });
  });
});

/**
 * Highcharts version validator
 */
describe('The version custom validator', () => {
  describe('when the envsCheck is false', () => {
    it('should not accept an empty string', () => {
      // The '' should fail
      expect(() => c.version().parse('')).toThrow();
    });
  });

  describe('when the envsCheck is true', () => {
    it('should accept an empty string', () => {
      // The '' should pass and transform to null
      expect(c.version(true).parse('')).toBe(null);
    });
  });

  describe('regardless the envsCheck value', () => {
    it("should accept string values 'latest' and in accepted formats", () => {
      // The 'latest', a major version, or the XX.YY.ZZ format should pass
      expect(c.version().parse('latest')).toBe('latest');
      expect(c.version().parse('1')).toBe('1');
      expect(c.version().parse('1.0')).toBe('1.0');
      expect(c.version().parse('1.10')).toBe('1.10');
      expect(c.version().parse('1.0.0')).toBe('1.0.0');
      expect(c.version().parse('1.10.0')).toBe('1.10.0');
      expect(c.version().parse('1.10.10')).toBe('1.10.10');
      expect(c.version().parse('1.0.10')).toBe('1.0.10');
      expect(c.version(true).parse('latest')).toBe('latest');
      expect(c.version(true).parse('1')).toBe('1');
      expect(c.version(true).parse('1.0')).toBe('1.0');
      expect(c.version(true).parse('1.10')).toBe('1.10');
      expect(c.version(true).parse('1.0.0')).toBe('1.0.0');
      expect(c.version(true).parse('1.10.0')).toBe('1.10.0');
      expect(c.version(true).parse('1.10.10')).toBe('1.10.10');
      expect(c.version(true).parse('1.0.10')).toBe('1.0.10');
    });

    it('should not accept values of any other types', () => {
      // Filter the possibleValue object to exclude number like values
      validateOtherTypes(c.version, ['stringNumber']);
    });
  });
});

/**
 * Scale of chart validator
 */
describe('The scale custom validator', () => {
  describe('when the envsCheck is false', () => {
    it('should accept number values between 0.1 and 5.0', () => {
      // The 0.1, 1, 1.1, 5, and 5.0 should pass
      expect(c.scale().parse(0.1)).toBe(0.1);
      expect(c.scale().parse(1)).toBe(1);
      expect(c.scale().parse(1.1)).toBe(1.1);
      expect(c.scale().parse(5)).toBe(5);
      expect(c.scale().parse(5.0)).toBe(5.0);
    });

    it('should accept null value', () => {
      // The null should pass
      expect(c.scale().parse(null)).toBe(null);
    });

    it('should not accept stringified number values between 0.1 and 5.0', () => {
      // The '0.1', '1', '1.1', '5', and '5.0' should fail
      expect(() => c.scale().parse('0.1')).toThrow();
      expect(() => c.scale().parse('1')).toThrow();
      expect(() => c.scale().parse('1.1')).toThrow();
      expect(() => c.scale().parse('5')).toThrow();
      expect(() => c.scale().parse('5.0')).toThrow();
    });

    it('should not accept an empty string, as it will be 0 after coercion', () => {
      // The '' should fail
      expect(() => c.scale().parse('')).toThrow();
    });
  });

  describe('when the envsCheck is true', () => {
    it('should accept stringified number values between 0.1 and 5.0', () => {
      // The '0.1', '1', '1.1', '5', and '5.0' should pass
      expect(c.scale(true).parse('0.1')).toBe(0.1);
      expect(c.scale(true).parse('1')).toBe(1);
      expect(c.scale(true).parse('1.1')).toBe(1.1);
      expect(c.scale(true).parse('5')).toBe(5);
      expect(c.scale(true).parse('5.0')).toBe(5);
    });

    it('should accept an empty string, and transform it to null', () => {
      // The '' should pass and transform to null
      expect(c.scale(true).parse('')).toBe(null);
    });

    it('should not accept number values between 0.1 and 5.0', () => {
      // The 0.1, 1, 1.1, 5, and 5.0 should fail
      expect(() => c.scale(true).parse(0.1)).toThrow();
      expect(() => c.scale(true).parse(1)).toThrow();
      expect(() => c.scale(true).parse(1.1)).toThrow();
      expect(() => c.scale(true).parse(5)).toThrow();
      expect(() => c.scale(true).parse(5.0)).toThrow();
    });
  });

  describe('regardless the envsCheck value', () => {
    it('should not accept number and stringified number values that fall outside the 0.1 and 5.0 range', () => {
      // The -1.1, 0, 5.5, '-1.1', '0', and '5.5' should fail
      expect(() => c.scale().parse(-1.1)).toThrow();
      expect(() => c.scale().parse(0)).toThrow();
      expect(() => c.scale().parse(5.5)).toThrow();
      expect(() => c.scale().parse('-1.1')).toThrow();
      expect(() => c.scale().parse('0')).toThrow();
      expect(() => c.scale().parse('5.5')).toThrow();
      expect(() => c.scale(true).parse(-1.1)).toThrow();
      expect(() => c.scale(true).parse(0)).toThrow();
      expect(() => c.scale(true).parse(5.5)).toThrow();
      expect(() => c.scale(true).parse('-1.1')).toThrow();
      expect(() => c.scale(true).parse('0')).toThrow();
      expect(() => c.scale(true).parse('5.5')).toThrow();
    });

    it('should not accept values of any other types', () => {
      // Filter the possibleValue object to exclude number and nullish like
      // values
      validateOtherTypes(c.scale, ['number', 'stringNumber', 'nullish']);
    });
  });
});

/**
 * Logging level validator
 */
describe('The logLevel custom validator', () => {
  describe('when the envsCheck is false', () => {
    it('should accept integer number values between 1 and 5', () => {
      // The 1, 3, and 5 should pass
      expect(c.logLevel().parse(1)).toBe(1);
      expect(c.logLevel().parse(3)).toBe(3);
      expect(c.logLevel().parse(5)).toBe(5);
    });

    it('should accept null value', () => {
      // The null should pass
      expect(c.logLevel().parse(null)).toBe(null);
    });

    it('should not accept float number values between 1 and 5', () => {
      // The 1.1, 3.1, and 4.1 should fail
      expect(() => c.logLevel().parse(1.1)).toThrow();
      expect(() => c.logLevel().parse(3.1)).toThrow();
      expect(() => c.logLevel().parse(4.1)).toThrow();
    });

    it('should not accept stringified integer number values between 1 and 5', () => {
      // The '1', '3', and '5' should fail
      expect(() => c.logLevel().parse('1')).toThrow();
      expect(() => c.logLevel().parse('3')).toThrow();
      expect(() => c.logLevel().parse('5')).toThrow();
    });

    it('should not accept an empty string, as it will be 0 after coercion', () => {
      // The '' should fail
      expect(() => c.logLevel().parse('')).toThrow();
    });
  });

  describe('when the envsCheck is true', () => {
    it('should accept stringified integer number values between 1 and 5', () => {
      // The '1', '3', and '5' should pass
      expect(c.logLevel(true).parse('1')).toBe(1);
      expect(c.logLevel(true).parse('3')).toBe(3);
      expect(c.logLevel(true).parse('5')).toBe(5);
    });

    it('should accept an empty string, and transform it to null', () => {
      // The '' should pass and transform to null
      expect(c.logLevel(true).parse('')).toBe(null);
    });

    it('should not accept stringified float number values between 1 and 5', () => {
      // The '1.1', '3.1', and '4.1' should fail
      expect(() => c.logLevel(true).parse('1.1')).toThrow();
      expect(() => c.logLevel(true).parse('3.1')).toThrow();
      expect(() => c.logLevel(true).parse('4.1')).toThrow();
    });

    it('should not accept integer number values between 1 and 5', () => {
      // The 1, 3, and 5 should fail
      expect(() => c.logLevel(true).parse(1)).toThrow();
      expect(() => c.logLevel(true).parse(3)).toThrow();
      expect(() => c.logLevel(true).parse(5)).toThrow();
    });
  });

  describe('regardless the envsCheck value', () => {
    it('should not accept number and stringified number values that fall outside the 1 and 5 range', () => {
      // The -1.1, 0, 5.5, '-1.1', '0', and '5.5' should fail
      expect(() => c.logLevel().parse(-1)).toThrow();
      expect(() => c.logLevel().parse(0)).toThrow();
      expect(() => c.logLevel().parse(6)).toThrow();
      expect(() => c.logLevel().parse('-1')).toThrow();
      expect(() => c.logLevel().parse('0')).toThrow();
      expect(() => c.logLevel().parse('6')).toThrow();
      expect(() => c.logLevel(true).parse(-1)).toThrow();
      expect(() => c.logLevel(true).parse(0)).toThrow();
      expect(() => c.logLevel(true).parse(6)).toThrow();
      expect(() => c.logLevel(true).parse('-1')).toThrow();
      expect(() => c.logLevel(true).parse('0')).toThrow();
      expect(() => c.logLevel(true).parse('6')).toThrow();
    });

    it('should not accept values of any other types', () => {
      // Filter the possibleValue object to exclude number and nullish like
      // values
      validateOtherTypes(c.logLevel, ['number', 'stringNumber', 'nullish']);
    });
  });
});

/**
 * The Highcharts scripts array validator
 */
describe('The scriptsArray custom validator', () => {
  describe('when the envsCheck is false', () => {
    it('should filter scripts arrays and resolve to only arrays of accepted scripts', () => {
      // Get all possibile values to check
      const allTypesValues = excludeFromValues(possibleValues);

      // Mix up the values for unfiltered arrays
      const unfilteredScripts = {
        core: [
          'highcharts',
          'text',
          'highcharts-more',
          ...allTypesValues,
          'highcharts-3d'
        ],
        modules: [
          'data',
          'data-tools',
          ...allTypesValues,
          'draggable-points',
          'static-scale',
          'broken-axis',
          'heatmap',
          'text'
        ],
        indicators: [...allTypesValues, 'indicators-all']
      };

      // The core array should be filtered
      expect(
        c.scriptsArray(scriptsNames.core).parse(unfilteredScripts.core)
      ).toEqual(['highcharts', 'highcharts-more', 'highcharts-3d']);

      // The modules array should be filtered
      expect(
        c.scriptsArray(scriptsNames.modules).parse(unfilteredScripts.modules)
      ).toEqual([
        'data',
        'data-tools',
        'draggable-points',
        'static-scale',
        'broken-axis',
        'heatmap'
      ]);

      // The indicators array should be filtered
      expect(
        c
          .scriptsArray(scriptsNames.indicators)
          .parse(unfilteredScripts.indicators)
      ).toEqual(['indicators-all']);
    });

    it('should allow an empty array', () => {
      // The core, modules, and indicators arrays should be filtered
      expect(c.scriptsArray(scriptsNames.core).parse([])).toEqual([]);
      expect(c.scriptsArray(scriptsNames.modules).parse([])).toEqual([]);
      expect(c.scriptsArray(scriptsNames.indicators).parse([])).toEqual([]);
    });
  });

  describe('when the envsCheck is true', () => {
    it('should filter scripts strings and resolve to only arrays of accepted scripts', () => {
      // Mix up the values for unfiltered strings
      const unfilteredScripts = {
        core: 'highcharts,highcharts-more, false, true, undefined, void 0,null,NaN,1,1.1,Symbol("symbol"),{},[],function () {},"false","true","undefined","void 0","null","NaN","1","1.1","Symbol("symbol")","{}","[]","function () {}",highcharts-3d',
        modules:
          'data , false, true, undefined, void 0,null,NaN,1,1.1,Symbol("symbol"),{},[],function () {},"false","true","undefined","void 0","null","NaN","1","1.1","Symbol("symbol")","{}","[]","function () {},data-tools, text',
        indicators:
          'text1, text2 ,indicators-all , false, true, undefined, void 0,null,NaN,1,1.1,Symbol("symbol"),{},[],function () {},"false","true","undefined","void 0","null","NaN","1","1.1","Symbol("symbol")","{}","[]","function () {},'
      };

      // The core string should be filtered and transformed to an array
      expect(
        c.scriptsArray(scriptsNames.core, true).parse(unfilteredScripts.core)
      ).toEqual(['highcharts', 'highcharts-more', 'highcharts-3d']);

      // The modules string should be filtered and transformed to an array
      expect(
        c
          .scriptsArray(scriptsNames.modules, true)
          .parse(unfilteredScripts.modules)
      ).toEqual(['data', 'data-tools']);

      // The indicators string should be filtered and transformed to an array
      expect(
        c
          .scriptsArray(scriptsNames.indicators, true)
          .parse(unfilteredScripts.indicators)
      ).toEqual(['indicators-all']);
    });

    it('should allow an empty array', () => {
      // The core, modules, and indicators strings should be filtered
      // and transformed to empty arrays
      expect(c.scriptsArray(scriptsNames.core, true).parse('')).toEqual([]);
      expect(c.scriptsArray(scriptsNames.modules, true).parse('')).toEqual([]);
      expect(c.scriptsArray(scriptsNames.indicators, true).parse('')).toEqual(
        []
      );
    });
  });

  describe('regardless the envsCheck value', () => {
    it('should accept values of any other types and parse them to string', () => {
      // Filter the possibleValue object to exclude string and object like
      // values
      validateOtherTypes(
        c.scriptsArray,
        [
          'string',
          'stringBoolean',
          'stringNumber',
          'stringNullish',
          'stringSymbol',
          'stringObject',
          'object'
        ],
        [
          ...scriptsNames.core,
          ...scriptsNames.modules,
          ...scriptsNames.indicators
        ]
      );
    });
  });
});

/**
 * The custom scripts array validator
 */
describe('The customScriptsArray custom validator', () => {
  describe('when the envsCheck is false', () => {
    it('should filter custom scripts array and resolve to only an array of accepted scripts', () => {
      // Get all possibile values to check
      const allTypesValues = excludeFromValues(possibleValues);

      // Mix up the values for unfiltered arrays
      const unfilteredScripts = {
        custom: [
          'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js',
          ...allTypesValues,
          'text',
          'https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.45/moment-timezone-with-data.min.js'
        ]
      };

      // The custom array should be filtered
      expect(c.customScriptsArray().parse(unfilteredScripts.custom)).toEqual([
        'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.45/moment-timezone-with-data.min.js'
      ]);
    });

    it('should allow an empty array', () => {
      // The core, modules, indicators, and custom arrays should be filtered
      expect(c.customScriptsArray().parse([])).toEqual([]);
    });
  });

  describe('when the envsCheck is true', () => {
    it('should filter custom scripts string and resolve to only an array of accepted scripts', () => {
      // Mix up the values for unfiltered strings
      const unfilteredScripts = {
        custom:
          'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js, undefined, NaN, null, false, true,https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.45/moment-timezone-with-data.min.js,  false, true, undefined, void 0,null,NaN,1,1.1,Symbol("symbol"),{},[],function () {},"false","true","undefined","void 0","null","NaN","1","1.1","Symbol("symbol")","{}","[]","function () {},'
      };

      // The custom string should be filtered and transformed to an array
      expect(
        c.customScriptsArray(true).parse(unfilteredScripts.custom)
      ).toEqual([
        'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.45/moment-timezone-with-data.min.js'
      ]);
    });

    it('should allow an empty array', () => {
      // The custom string should be filtered and transformed to an empty array
      expect(c.scriptsArray(scriptsNames.custom, true).parse('')).toEqual([]);
    });
  });

  describe('regardless the envsCheck value', () => {
    it('should accept values of any other types and parse them to string', () => {
      // Filter the possibleValue object to exclude string and object like
      // values
      validateOtherTypes(
        c.scriptsArray,
        [
          'string',
          'stringBoolean',
          'stringNumber',
          'stringNullish',
          'stringSymbol',
          'stringObject',
          'object'
        ],
        [...scriptsNames.custom]
      );
    });
  });
});
