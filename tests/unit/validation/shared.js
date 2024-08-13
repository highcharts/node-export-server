import { expect, it } from '@jest/globals';

const devoidValuesTests = {
  allow: (schema, property) => {
    it('should accept an empty string and transform it to null', () => {
      const obj = { [property]: '' };

      // accepts '' and transforms it to null
      expect(schema.parse(obj)[property]).toBe(null);
    });

    it('should accept a stringified null and transform it to null', () => {
      const obj = { [property]: 'null' };

      // accepts 'null' and transforms it to null
      expect(schema.parse(obj)[property]).toBe(null);
    });

    it('should accept null', () => {
      const obj = { [property]: null };

      // accepts null
      expect(schema.parse(obj)[property]).toBe(null);
    });
  },

  dontAllow: (schema, property) => {
    it('should not accept an empty string', () => {
      const obj = { [property]: '' };

      // throws error
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should not accept a stringified null', () => {
      const obj = { [property]: 'null' };

      // throws error
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should not accept null', () => {
      const obj = { [property]: null };

      // throws error
      expect(() => schema.parse(obj)).toThrow();
    });
  }
};

export const sharedTests = (schema) => ({
  /**
   * Boolean validator
   */
  boolean: (property, envCheck = false) => {
    it('should accept a boolean value', () => {
      const obj = { [property]: true };

      // accepts true
      expect(schema.parse(obj)[property]).toBe(true);

      // accepts false
      obj[property] = false;
      expect(schema.parse(obj)[property]).toBe(false);
    });

    if (envCheck) {
      it('should accept a stringified boolean value and transform it to a boolean', () => {
        const obj = { [property]: 'true' };

        // accepts 'true'
        expect(schema.parse(obj)[property]).toBe(true);

        // accepts 'false'
        obj[property] = 'false';
        expect(schema.parse(obj)[property]).toBe(false);
      });

      // Test possibilities of a value being empty
      devoidValuesTests.allow(schema, property);
    } else {
      it('should not accept a stringified boolean value', () => {
        const obj = { [property]: 'true' };

        // throws error
        expect(() => schema.parse(obj)).toThrow();

        // throws error
        obj[property] = 'false';
        expect(() => schema.parse(obj)).toThrow();
      });

      // Test possibilities of a value being empty
      devoidValuesTests.dontAllow(schema, property);
    }
  },

  /**
   * Enum validator
   */
  enum: (property, correctValues, incorrectValues, envCheck = false) => {
    it(`should accept the following ${correctValues.join(', ')} values`, () => {
      // accepts correctValues
      correctValues.forEach((value) => {
        expect(schema.parse({ [property]: value })[property]).toBe(value);
      });
    });

    it(`should not accept the following ${incorrectValues.join(', ')} values`, () => {
      // does not accept incorrectValues
      incorrectValues.forEach((value) => {
        expect(() => schema.parse({ [property]: value })).toThrow();
      });
    });

    if (envCheck) {
      // Test possibilities of a value being empty
      devoidValuesTests.allow(schema, property);
    } else {
      // Test possibilities of a value being empty
      devoidValuesTests.dontAllow(schema, property);
    }
  },

  /**
   * Strict string validator
   */
  strictString: (property) => {
    it('should accept a string value', () => {
      const obj = { [property]: 'text' };

      // accepts 'text'
      expect(schema.parse(obj)[property]).toBe('text');

      // accepts 'some-other-text'
      obj[property] = 'some-other-text';
      expect(schema.parse(obj)[property]).toBe('some-other-text');
    });

    it("should not accept 'false', 'undefined', 'void 0', 'NaN', 'null', '' values", () => {
      const obj = { [property]: 'false' };

      // throws error
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = 'undefined';
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = 'void 0';
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = 'NaN';
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = 'null';
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = '';
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should not accept null', () => {
      const obj = { [property]: null };

      // throws error
      expect(() => schema.parse(obj)).toThrow();
    });
  },

  /**
   * Nullish string validator
   */
  nullishString: (property) => {
    it('should accept a string value', () => {
      const obj = { [property]: 'text' };

      // accepts 'text'
      expect(schema.parse(obj)[property]).toBe('text');

      // accepts 'some-other-text'
      obj[property] = 'some-other-text';
      expect(schema.parse(obj)[property]).toBe('some-other-text');
    });

    it("should accept 'false', 'undefined', 'void 0', 'NaN', 'null', '' values and trasform to null", () => {
      const obj = { [property]: 'false' };

      // accepts 'false'
      expect(schema.parse(obj)[property]).toBe(null);

      // accepts 'undefined'
      obj[property] = 'undefined';
      expect(schema.parse(obj)[property]).toBe(null);

      // accepts 'void 0'
      obj[property] = 'void 0';
      expect(schema.parse(obj)[property]).toBe(null);

      // accepts 'NaN'
      obj[property] = 'NaN';
      expect(schema.parse(obj)[property]).toBe(null);

      // accepts 'null'
      obj[property] = 'null';
      expect(schema.parse(obj)[property]).toBe(null);

      // accepts ''
      obj[property] = '';
      expect(schema.parse(obj)[property]).toBe(null);
    });

    it('should accept null', () => {
      const obj = { [property]: null };

      // accepts null
      expect(schema.parse(obj)[property]).toBe(null);
    });
  },

  /**
   * Positive number validator
   */
  positiveNum: (property, envCheck = false) => {
    it('should accept a positive number value', () => {
      const obj = { [property]: 0.1 };

      // accepts 0.1
      expect(schema.parse(obj)[property]).toBe(0.1);

      // accepts 100.5
      obj[property] = 100.5;
      expect(schema.parse(obj)[property]).toBe(100.5);

      // accepts 750
      obj[property] = 750;
      expect(schema.parse(obj)[property]).toBe(750);
    });

    it('should not accept negative and non-positive number value', () => {
      const obj = { [property]: 0 };

      // throws error
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = -100;
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should not accept stringified negative and non-positive number value', () => {
      const obj = { [property]: '0' };

      // throws error
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = '-100';
      expect(() => schema.parse(obj)).toThrow();
    });

    if (envCheck) {
      it('should accept a stringified positive number value', () => {
        const obj = {
          [property]: '0.1'
        };

        // accepts '0.1'
        expect(schema.parse(obj)[property]).toBe(0.1);

        // accepts '100.5'
        obj[property] = '100.5';
        expect(schema.parse(obj)[property]).toBe(100.5);

        // accepts '750'
        obj[property] = '750';
        expect(schema.parse(obj)[property]).toBe(750);
      });

      // Test possibilities of a value being empty
      devoidValuesTests.allow(schema, property);
    } else {
      it('should not accept a stringified positive number value', () => {
        const obj = {
          [property]: '0.1'
        };

        // throws error
        expect(() => schema.parse(obj)).toThrow();

        // throws error
        obj[property] = '100.5';
        expect(() => schema.parse(obj)).toThrow();

        // throws error
        obj[property] = '750';
        expect(() => schema.parse(obj)).toThrow();
      });

      // Test possibilities of a value being empty
      devoidValuesTests.dontAllow(schema, property);
    }
  },

  /**
   * Nullable positive number validator
   */
  nullablePositiveNum: (property, envCheck = false) => {
    it('should accept a positive number value', () => {
      const obj = { [property]: 0.1 };

      // accepts 0.1
      expect(schema.parse(obj)[property]).toBe(0.1);

      // accepts 100.5
      obj[property] = 100.5;
      expect(schema.parse(obj)[property]).toBe(100.5);

      // accepts 750
      obj[property] = 750;
      expect(schema.parse(obj)[property]).toBe(750);
    });

    it('should not accept negative and non-positive number value', () => {
      const obj = { [property]: 0 };

      // throws error
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = -100;
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should not accept stringified negative and non-positive number value', () => {
      const obj = { [property]: '0' };

      // throws error
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = '-100';
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should accept null', () => {
      const obj = { [property]: null };

      // accepts null
      expect(schema.parse(obj)[property]).toBe(null);
    });

    if (envCheck) {
      it('should accept a stringified positive number value', () => {
        const obj = {
          [property]: '0.1'
        };

        // accepts '0.1'
        expect(schema.parse(obj)[property]).toBe(0.1);

        // accepts '100.5'
        obj[property] = '100.5';
        expect(schema.parse(obj)[property]).toBe(100.5);

        // accepts '750'
        obj[property] = '750';
        expect(schema.parse(obj)[property]).toBe(750);
      });

      it('should accept an empty string and transform it to null', () => {
        const obj = { [property]: '' };

        // accepts '' and transforms it to null
        expect(schema.parse(obj)[property]).toBe(null);
      });

      it('should accept a stringified null and transform it to null', () => {
        const obj = { [property]: 'null' };

        // accepts 'null' and transforms it to null
        expect(schema.parse(obj)[property]).toBe(null);
      });
    } else {
      it('should not accept a stringified positive number value', () => {
        const obj = {
          [property]: '0.1'
        };

        // throws error
        expect(() => schema.parse(obj)).toThrow();

        // throws error
        obj[property] = '100.5';
        expect(() => schema.parse(obj)).toThrow();

        // throws error
        obj[property] = '750';
        expect(() => schema.parse(obj)).toThrow();
      });

      it('should not accept an empty string', () => {
        const obj = { [property]: '' };

        // throws error
        expect(() => schema.parse(obj)).toThrow();
      });

      it('should not accept a stringified null', () => {
        const obj = { [property]: 'null' };

        // throws error
        expect(() => schema.parse(obj)).toThrow();
      });
    }
  },

  /**
   * Non-negative number validator
   */
  nonNegativeNum: (property, envCheck = false) => {
    it('should accept a non-negative number value', () => {
      const obj = { [property]: 0 };

      // accepts 0
      expect(schema.parse(obj)[property]).toBe(0);

      // accepts 1000
      obj[property] = 1000;
      expect(schema.parse(obj)[property]).toBe(1000);
    });

    it('should not accept a negative number value', () => {
      const obj = { [property]: -1000 };

      // throws error
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should not accept a stringified negative number value', () => {
      const obj = { [property]: '-1000' };

      // throws error
      expect(() => schema.parse(obj)).toThrow();
    });

    if (envCheck) {
      it('should accept a stringified non-negative number value', () => {
        const obj = { [property]: '0' };

        // accepts '0'
        expect(schema.parse(obj)[property]).toBe(0);

        // accepts '1000'
        obj[property] = '1000';
        expect(schema.parse(obj)[property]).toBe(1000);
      });

      // Test possibilities of a value being empty
      devoidValuesTests.allow(schema, property);
    } else {
      it('should not accept a stringified non-negative number value', () => {
        const obj = { [property]: '0' };

        // throws error
        expect(() => schema.parse(obj)).toThrow();

        // throws error
        obj[property] = '1000';
        expect(() => schema.parse(obj)).toThrow();
      });

      // Test possibilities of a value being empty
      devoidValuesTests.dontAllow(schema, property);
    }
  },

  /**
   * Nullable non-negative number validator
   */
  nullableNonNegativeNum: (property, envCheck = false) => {
    it('should accept a non-negative number value', () => {
      const obj = { [property]: 0 };

      // accepts 0
      expect(schema.parse(obj)[property]).toBe(0);

      // accepts 1000
      obj[property] = 1000;
      expect(schema.parse(obj)[property]).toBe(1000);
    });

    it('should not accept a negative number value', () => {
      const obj = { [property]: -1000 };

      // throws error
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should not accept a stringified negative number value', () => {
      const obj = { [property]: '-1000' };

      // throws error
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should accept null', () => {
      const obj = { [property]: null };

      // accepts null
      expect(schema.parse(obj)[property]).toBe(null);
    });

    if (envCheck) {
      it('should accept a stringified non-negative number value', () => {
        const obj = { [property]: '0' };

        // accepts '0'
        expect(schema.parse(obj)[property]).toBe(0);

        // accepts '1000'
        obj[property] = '1000';
        expect(schema.parse(obj)[property]).toBe(1000);
      });

      it('should accept an empty string and transform it to null', () => {
        const obj = { [property]: '' };

        // accepts '' and transforms it to null
        expect(schema.parse(obj)[property]).toBe(null);
      });

      it('should accept a stringified null and transform it to null', () => {
        const obj = { [property]: 'null' };

        // accepts 'null' and transforms it to null
        expect(schema.parse(obj)[property]).toBe(null);
      });
    } else {
      it('should not accept a stringified non-negative number value', () => {
        const obj = { [property]: '0' };

        // throws error
        expect(() => schema.parse(obj)).toThrow();

        // throws error
        obj[property] = '1000';
        expect(() => schema.parse(obj)).toThrow();
      });

      it('should not accept an empty string', () => {
        const obj = { [property]: '' };

        // throws error
        expect(() => schema.parse(obj)).toThrow();
      });

      it('should not accept a stringified null', () => {
        const obj = { [property]: 'null' };

        // throws error
        expect(() => schema.parse(obj)).toThrow();
      });
    }
  },

  /**
   * String that starts with validator
   */
  startsWith: (property, correctValues, incorrectValues, envCheck = false) => {
    it(`should accept the following ${correctValues.join(', ')} values`, () => {
      // accepts correctValues
      correctValues.forEach((value) => {
        expect(schema.parse({ [property]: value })[property]).toBe(value);
      });
    });

    it(`should not accept the following ${incorrectValues.join(', ')} values`, () => {
      // does not accept incorrectValues
      incorrectValues.forEach((value) => {
        expect(() => schema.parse({ [property]: value })).toThrow();
      });
    });

    if (envCheck) {
      // Test possibilities of a value being empty
      devoidValuesTests.allow(schema, property);
    } else {
      // Test possibilities of a value being empty
      devoidValuesTests.dontAllow(schema, property);
    }
  },

  /**
   * Array of Highcharts scripts validator
   */
  scriptsArray: (property, scripts, filteredScripts, envCheck = false) => {
    it('should filter a string or an array of strings and resolve it to an array of accepted scripts', () => {
      const obj = {
        [property]: scripts
      };

      // accepts a scripts string and transform it to a filtered array
      expect(schema.parse(obj)[property]).toEqual(filteredScripts);
    });

    if (envCheck) {
      it("should filter a string value from '[' and ']' and resolve it to arrays of accepted scripts", () => {
        const obj = {
          [property]: `[${scripts}]`
        };

        // accepts a scripts string and transform it to a filtered array
        expect(schema.parse(obj)[property]).toEqual(filteredScripts);
      });

      it('should accept an empty string and transform it to an empty array', () => {
        const obj = {
          [property]: ''
        };

        // accepts an empty string and transform it to an empty array
        expect(schema.parse(obj)[property]).toEqual([]);
      });
    } else {
      it('should accept an empty array and transform it to an empty array', () => {
        const obj = {
          [property]: []
        };

        // accepts an empty string and transform it to an empty array
        expect(schema.parse(obj)[property]).toEqual([]);
      });
    }
  },

  /**
   * Array of strings validator
   */
  stringArray: (property, values) => {
    it('should accept an array of string values', () => {
      const obj = {
        [property]: values
      };

      // accepts values
      expect(schema.parse(obj)[property]).toEqual(values);
    });

    it('should accept an empty array', () => {
      const obj = {
        [property]: []
      };

      // accepts []
      expect(schema.parse(obj)[property]).toEqual([]);
    });

    it('should accept null', () => {
      const obj = {
        [property]: null
      };

      // accepts null
      expect(schema.parse(obj)[property]).toBe(null);
    });

    it('should not accept an empty string value', () => {
      const obj = {
        [property]: ''
      };

      // The '' should fail
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should not accept an object based value or an array of such values (except array of strings and an empty array)', () => {
      // Should fail for all below
      [
        {},
        { a: 1 },
        { a: '1' },
        [1],
        function () {},
        () => {},
        new Date(),
        new RegExp('abc'),
        new Error('')
      ].forEach((value) => {
        const obj = {
          [property]: value
        };

        expect(() => schema.parse(obj)).toThrow();
      });
    });
  },

  /**
   * The infile option validator
   */
  infile: (property) => {
    it('should accept string values that end with .json or .svg', () => {
      const obj = { [property]: 'chart.json' };

      // accepts .json
      expect(schema.parse(obj)[property]).toBe('chart.json');

      // accepts .svg
      obj[property] = 'chart.svg';
      expect(schema.parse(obj)[property]).toBe('chart.svg');
    });

    it('should not accept string values that do not end with .json or .svg', () => {
      const obj = { [property]: 'chart.pdf' };

      // throws error
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = 'chart.png';
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should not accept string values that are not at least one character long without the extensions', () => {
      const obj = { [property]: '.json' };

      // throws error
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = '.svg';
      expect(() => schema.parse(obj)).toThrow();
    });

    // Test possibilities of a value being empty
    devoidValuesTests.allow(schema, property);
  },

  /**
   * The outfile option validator
   */
  outfile: (property) => {
    it('should accept string values that end with .jpeg, .jpg, .png, .pdf, or .svg', () => {
      const obj = { [property]: 'chart.jpeg' };

      // accepts .jpeg
      expect(schema.parse(obj)[property]).toBe('chart.jpeg');

      // accepts .jpg
      obj[property] = 'chart.jpg';
      expect(schema.parse(obj)[property]).toBe('chart.jpg');

      // accepts .png
      obj[property] = 'chart.png';
      expect(schema.parse(obj)[property]).toBe('chart.png');

      // accepts .pdf
      obj[property] = 'chart.pdf';
      expect(schema.parse(obj)[property]).toBe('chart.pdf');

      // accepts .svg
      obj[property] = 'chart.svg';
      expect(schema.parse(obj)[property]).toBe('chart.svg');
    });

    it('should not accept string values that do not end with .jpeg, .jpg, .png, .pdf, or .svg', () => {
      const obj = { [property]: 'chart.json' };

      // throws error
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = 'chart.txt';
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should not accept string values that are not at least one character long without the extensions', () => {
      const obj = { [property]: '.jpeg' };

      // throws error
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = '.jpg';
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = '.png';
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = '.pdf';
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = '.svg';
      expect(() => schema.parse(obj)).toThrow();
    });

    // Test possibilities of a value being empty
    devoidValuesTests.allow(schema, property);
  },

  /**
   * The customConfig option validator
   */
  customConfig: (property) => {
    it('should accept string values that end with .json', () => {
      const obj = { [property]: 'chart.json' };

      // accepts .json
      expect(schema.parse(obj)[property]).toBe('chart.json');
    });

    it('should not accept string values that do not end with .json or .svg', () => {
      const obj = { [property]: 'chart.pdf' };

      // throws error
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = 'chart.png';
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should not accept string values that are not at least one character long without the extensions', () => {
      const obj = { [property]: '.json' };

      // throws error
      expect(() => schema.parse(obj)).toThrow();
    });

    // Test possibilities of a value being empty
    devoidValuesTests.allow(schema, property);
  },

  /**
   * The object option validator
   */
  object: (property) => {
    it('should accept any object values', () => {
      const obj = { [property]: {} };

      // accepts {}
      expect(schema.parse(obj)[property]).toEqual({});

      // accepts { a: 1 }
      obj[property] = { a: 1 };
      expect(schema.parse(obj)[property]).toEqual({ a: 1 });

      // accepts { a: '1', b: { c: 3 } }
      obj[property] = { a: '1', b: { c: 3 } };
      expect(schema.parse(obj)[property]).toEqual({ a: '1', b: { c: 3 } });
    });

    it('should accept an empty string and transform it to null', () => {
      const obj = { [property]: '' };

      // accepts '' and transforms it to null
      expect(schema.parse(obj)[property]).toEqual(null);
    });

    it('should accept a stringified null and transform it to null', () => {
      const obj = { [property]: 'null' };

      // accepts 'null' and transforms it to null
      expect(schema.parse(obj)[property]).toEqual(null);
    });

    it('should accept null value', () => {
      const obj = { [property]: null };

      // accepts null
      expect(schema.parse(obj)[property]).toEqual(null);
    });

    it('should accept a string value', () => {
      const obj = { [property]: '{}' };

      // accepts '{}'
      expect(schema.parse(obj)[property]).toEqual('{}');

      // accepts '{ a: 1 }'
      obj[property] = '{ a: 1 }';
      expect(schema.parse(obj)[property]).toEqual('{ a: 1 }');

      // accepts '{ a: '1', b: { c: 3 } }'
      obj[property] = '{ a: "1", b: { c: 3 } }';
      expect(schema.parse(obj)[property]).toEqual('{ a: "1", b: { c: 3 } }');
    });

    it('should not accept any array values', () => {
      const obj = { [property]: [] };

      // throws error
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = [1];
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = ['a'];
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = [{ a: 1 }];
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should not accept any other object based values', () => {
      const obj = { [property]: function () {} };

      // throws error
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = () => {};
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = new Date();
      expect(() => schema.parse(obj)).toThrow();
    });
  },

  /**
   * The resources option validator
   */
  resources: (property) => {
    it("should accept an object with properties 'js', 'css', and 'files'", () => {
      const obj = {
        [property]: {
          js: '',
          css: '',
          files: []
        }
      };

      // accepts { js: '', css: '', files: [] }
      expect(schema.parse(obj)[property]).toEqual({
        js: null,
        css: null,
        files: []
      });
    });

    it("should accept an object with properties 'js', 'css', and 'files' with null values", () => {
      const obj = {
        [property]: {
          js: null,
          css: null,
          files: null
        }
      };

      // accepts { js: null, css: null, files: null }
      expect(schema.parse(obj)[property]).toEqual({
        js: null,
        css: null,
        files: null
      });
    });

    it("should accept a partial object with some properties from the 'js', 'css', and 'files'", () => {
      const obj = {
        [property]: {
          js: 'console.log(1);'
        }
      };

      // accepts { js: 'console.log(1);' }
      expect(schema.parse(obj)[property]).toEqual({
        js: 'console.log(1);'
      });
    });

    it('should accept null value', () => {
      const obj = {
        [property]: null
      };

      // accepts { js: 'console.log(1);' }
      expect(schema.parse(obj)[property]).toEqual(null);
    });
  },

  /**
   * The version option validator
   */
  version: (property, envCheck = false) => {
    it("should accept the 'latest' value", () => {
      const obj = { [property]: 'latest' };

      // accepts 'latest'
      expect(schema.parse(obj)[property]).toBe('latest');
    });

    it('should accept a value in XX, XX.YY, XX.YY.ZZ formats', () => {
      const obj = { [property]: '1' };

      // accepts XX format
      expect(schema.parse(obj)[property]).toBe('1');
      obj[property] = '11';
      expect(schema.parse(obj)[property]).toBe('11');

      // accepts XX.YY format
      obj[property] = '1.1';
      expect(schema.parse(obj)[property]).toBe('1.1');
      obj[property] = '1.11';
      expect(schema.parse(obj)[property]).toBe('1.11');
      obj[property] = '11.1';
      expect(schema.parse(obj)[property]).toBe('11.1');
      obj[property] = '11.11';
      expect(schema.parse(obj)[property]).toBe('11.11');

      // accepts XX.YY.ZZ format
      obj[property] = '1.1.1';
      expect(schema.parse(obj)[property]).toBe('1.1.1');
      obj[property] = '1.1.11';
      expect(schema.parse(obj)[property]).toBe('1.1.11');
      obj[property] = '1.11.1';
      expect(schema.parse(obj)[property]).toBe('1.11.1');
      obj[property] = '1.11.11';
      expect(schema.parse(obj)[property]).toBe('1.11.11');
      obj[property] = '11.1.1';
      expect(schema.parse(obj)[property]).toBe('11.1.1');
      obj[property] = '11.1.11';
      expect(schema.parse(obj)[property]).toBe('11.1.11');
      obj[property] = '11.11.1';
      expect(schema.parse(obj)[property]).toBe('11.11.1');
      obj[property] = '11.11.11';
      expect(schema.parse(obj)[property]).toBe('11.11.11');
    });

    it('should not accept other string value', () => {
      const obj = { [property]: 'string-other-than-latest' };

      // throws error
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = '11a.2.0';
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = '11.2.123';
      expect(() => schema.parse(obj)).toThrow();
    });

    if (envCheck) {
      // Test possibilities of a value being empty
      devoidValuesTests.allow(schema, property);
    } else {
      // Test possibilities of a value being empty
      devoidValuesTests.dontAllow(schema, property);
    }
  },

  /**
   * The scale option validator
   */
  scale: (property, envCheck = false) => {
    it('should accept number values between the 0.1 and 5.0', () => {
      const obj = { [property]: 0.1 };

      // accepts 0.1
      expect(schema.parse(obj)[property]).toBe(0.1);

      // accepts 1
      obj[property] = 1;
      expect(schema.parse(obj)[property]).toBe(1);

      // accepts 1.5
      obj[property] = 1.5;
      expect(schema.parse(obj)[property]).toBe(1.5);

      // accepts 5
      obj[property] = 5;
      expect(schema.parse(obj)[property]).toBe(5);
    });

    it('should not accept number values outside the 0.1 and 5.0', () => {
      const obj = { [property]: -1.1 };

      // throws error
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = 0;
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = 5.5;
      expect(() => schema.parse(obj)).toThrow();
    });

    if (envCheck) {
      it('should accept stringified number values between the 0.1 and 5.0', () => {
        const obj = { [property]: '0.1' };

        // accepts '0.1'
        expect(schema.parse(obj)[property]).toBe(0.1);

        // accepts '1'
        obj[property] = '1';
        expect(schema.parse(obj)[property]).toBe(1);

        // accepts '1.5'
        obj[property] = '1.5';
        expect(schema.parse(obj)[property]).toBe(1.5);

        // accepts '5'
        obj[property] = '5';
        expect(schema.parse(obj)[property]).toBe(5);
      });

      it('should not accept stringified number values outside the 0.1 and 5.0', () => {
        const obj = { [property]: '-1.1' };

        // throws error
        expect(() => schema.parse(obj)).toThrow();

        // throws error
        obj[property] = '0';
        expect(() => schema.parse(obj)).toThrow();

        // throws error
        obj[property] = '5.5';
        expect(() => schema.parse(obj)).toThrow();
      });

      // Test possibilities of a value being empty
      devoidValuesTests.allow(schema, property);
    } else {
      // Test possibilities of a value being empty
      devoidValuesTests.dontAllow(schema, property);
    }
  },

  /**
   * The scale option validator
   */
  nullableScale: (property, envCheck = false) => {
    it('should accept number values between the 0.1 and 5.0', () => {
      const obj = { [property]: 0.1 };

      // accepts 0.1
      expect(schema.parse(obj)[property]).toBe(0.1);

      // accepts 1
      obj[property] = 1;
      expect(schema.parse(obj)[property]).toBe(1);

      // accepts 1.5
      obj[property] = 1.5;
      expect(schema.parse(obj)[property]).toBe(1.5);

      // accepts 5
      obj[property] = 5;
      expect(schema.parse(obj)[property]).toBe(5);
    });

    it('should not accept number values outside the 0.1 and 5.0', () => {
      const obj = { [property]: -1.1 };

      // throws error
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = 0;
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = 5.5;
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should accept null', () => {
      const obj = { [property]: null };

      // accepts null
      expect(schema.parse(obj)[property]).toBe(null);
    });

    if (envCheck) {
      it('should accept stringified number values between the 0.1 and 5.0', () => {
        const obj = { [property]: '0.1' };

        // accepts '0.1'
        expect(schema.parse(obj)[property]).toBe(0.1);

        // accepts '1'
        obj[property] = '1';
        expect(schema.parse(obj)[property]).toBe(1);

        // accepts '1.5'
        obj[property] = '1.5';
        expect(schema.parse(obj)[property]).toBe(1.5);

        // accepts '5'
        obj[property] = '5';
        expect(schema.parse(obj)[property]).toBe(5);
      });

      it('should not accept stringified number values outside the 0.1 and 5.0', () => {
        const obj = { [property]: '-1.1' };

        // throws error
        expect(() => schema.parse(obj)).toThrow();

        // throws error
        obj[property] = '0';
        expect(() => schema.parse(obj)).toThrow();

        // throws error
        obj[property] = '5.5';
        expect(() => schema.parse(obj)).toThrow();
      });

      it('should accept an empty string and transform it to null', () => {
        const obj = { [property]: '' };

        // accepts '' and transforms it to null
        expect(schema.parse(obj)[property]).toBe(null);
      });

      it('should accept a stringified null and transform it to null', () => {
        const obj = { [property]: 'null' };

        // accepts 'null' and transforms it to null
        expect(schema.parse(obj)[property]).toBe(null);
      });
    } else {
      it('should not accept an empty string', () => {
        const obj = { [property]: '' };

        // throws error
        expect(() => schema.parse(obj)).toThrow();
      });

      it('should not accept a stringified null', () => {
        const obj = { [property]: 'null' };

        // throws error
        expect(() => schema.parse(obj)).toThrow();
      });
    }
  },

  /**
   * The logLevel option validator
   */
  logLevel: (property, envCheck = false) => {
    it('should accept integer number values between the 1 and 5', () => {
      const obj = { [property]: 1 };

      // accepts 1
      expect(schema.parse(obj)[property]).toBe(1);

      // accepts 3
      obj[property] = 3;
      expect(schema.parse(obj)[property]).toBe(3);

      // accepts 5
      obj[property] = 5;
      expect(schema.parse(obj)[property]).toBe(5);
    });

    it('should not accept float number values between the 1 and 5', () => {
      const obj = { [property]: 1.1 };

      // throws error
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = 3.1;
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = 4.1;
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should not accept number values that fall outside the 1 and 5 range', () => {
      const obj = { [property]: -1.1 };

      // throws error
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = 0;
      expect(() => schema.parse(obj)).toThrow();

      // throws error
      obj[property] = 6;
      expect(() => schema.parse(obj)).toThrow();
    });

    if (envCheck) {
      it('should accept stringified number values between the 1 and 5', () => {
        const obj = { [property]: '1' };

        // accepts '1'
        expect(schema.parse(obj)[property]).toBe(1);

        // accepts '3'
        obj[property] = '3';
        expect(schema.parse(obj)[property]).toBe(3);

        // accepts '5'
        obj[property] = '5';
        expect(schema.parse(obj)[property]).toBe(5);
      });

      it('should not accept stringified float number values between the 1 and 5', () => {
        const obj = { [property]: '1.1' };

        // throws error
        expect(() => schema.parse(obj)).toThrow();

        // throws error
        obj[property] = '3.1';
        expect(() => schema.parse(obj)).toThrow();

        // throws error
        obj[property] = '4.1';
        expect(() => schema.parse(obj)).toThrow();
      });

      it('should not accept stringified number number values that fall outside the 1 and 5 range', () => {
        const obj = { [property]: '-1.1' };

        // throws error
        expect(() => schema.parse(obj)).toThrow();

        // throws error
        obj[property] = '0';
        expect(() => schema.parse(obj)).toThrow();

        // throws error
        obj[property] = '6';
        expect(() => schema.parse(obj)).toThrow();
      });

      // Test possibilities of a value being empty
      devoidValuesTests.allow(schema, property);
    } else {
      // Test possibilities of a value being empty
      devoidValuesTests.dontAllow(schema, property);
    }
  }
});
