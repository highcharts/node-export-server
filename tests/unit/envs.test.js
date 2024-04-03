import { Config } from '../../lib/envs';

describe('Environment variables should be correctly parsed', () => {
  test('HIGHCHARTS_VERSION accepts latests and not unrelated strings', () => {
    const env = { HIGHCHARTS_VERSION: 'string-other-than-latest' };
    expect(() => Config.parse(env)).toThrow();

    env.HIGHCHARTS_VERSION = 'latest';
    expect(Config.parse(env).HIGHCHARTS_VERSION).toEqual('latest');
  });

  test('HIGHCHARTS_VERSION accepts proper version strings like XX.YY.ZZ', () => {
    const env = { HIGHCHARTS_VERSION: '11' };
    expect(Config.parse(env).HIGHCHARTS_VERSION).toEqual('11');

    env.HIGHCHARTS_VERSION = '11.0.0';
    expect(Config.parse(env).HIGHCHARTS_VERSION).toEqual('11.0.0');

    env.HIGHCHARTS_VERSION = '9.1';
    expect(Config.parse(env).HIGHCHARTS_VERSION).toEqual('9.1');

    env.HIGHCHARTS_VERSION = '11a.2.0';
    expect(() => Config.parse(env)).toThrow();
  });

  test('HIGHCHARTS_CDN_URL should start with http:// or https://', () => {
    const env = { HIGHCHARTS_CDN_URL: 'http://example.com' };
    expect(Config.parse(env).HIGHCHARTS_CDN_URL).toEqual('http://example.com');

    env.HIGHCHARTS_CDN_URL = 'https://example.com';
    expect(Config.parse(env).HIGHCHARTS_CDN_URL).toEqual('https://example.com');

    env.HIGHCHARTS_CDN_URL = 'example.com';
    expect(() => Config.parse(env)).toThrow();
  });

  test('CORE_SCRIPTS, MODULES, INDICATORS should be arrays', () => {
    const env = {
      HIGHCHARTS_CORE_SCRIPTS: 'core1, core2',
      HIGHCHARTS_MODULES: 'module1, module2',
      HIGHCHARTS_INDICATORS: 'indicator1, indicator2'
    };

    const parsed = Config.parse(env);

    expect(parsed.HIGHCHARTS_CORE_SCRIPTS).toEqual(['core1', 'core2']);
    expect(parsed.HIGHCHARTS_MODULES).toEqual(['module1', 'module2']);
    expect(parsed.HIGHCHARTS_INDICATORS).toEqual(['indicator1', 'indicator2']);
  });

  test('HIGHCHARTS_FORCE_FETCH should be a boolean', () => {
    const env = { HIGHCHARTS_FORCE_FETCH: 'true' };
    expect(Config.parse(env).HIGHCHARTS_FORCE_FETCH).toEqual(true);

    env.HIGHCHARTS_FORCE_FETCH = 'false';
    expect(Config.parse(env).HIGHCHARTS_FORCE_FETCH).toEqual(false);
  });
});
