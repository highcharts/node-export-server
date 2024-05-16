import { Config } from '../../lib/envs';

describe('Environment variables should be correctly parsed', () => {
  test('HIGHCHARTS_VERSION accepts latests and not unrelated strings', () => {
    const env = { HIGHCHARTS_VERSION: 'string-other-than-latest' };
    expect(() => Config.partial().parse(env)).toThrow();

    env.HIGHCHARTS_VERSION = 'latest';
    expect(Config.partial().parse(env).HIGHCHARTS_VERSION).toEqual('latest');
  });

  test('HIGHCHARTS_VERSION accepts proper version strings like XX.YY.ZZ', () => {
    const env = { HIGHCHARTS_VERSION: '11' };
    expect(Config.partial().parse(env).HIGHCHARTS_VERSION).toEqual('11');

    env.HIGHCHARTS_VERSION = '11.0.0';
    expect(Config.partial().parse(env).HIGHCHARTS_VERSION).toEqual('11.0.0');

    env.HIGHCHARTS_VERSION = '9.1';
    expect(Config.partial().parse(env).HIGHCHARTS_VERSION).toEqual('9.1');

    env.HIGHCHARTS_VERSION = '11a.2.0';
    expect(() => Config.partial().parse(env)).toThrow();
  });

  test('HIGHCHARTS_CDN_URL should start with http:// or https://', () => {
    const env = { HIGHCHARTS_CDN_URL: 'http://example.com' };
    expect(Config.partial().parse(env).HIGHCHARTS_CDN_URL).toEqual(
      'http://example.com'
    );

    env.HIGHCHARTS_CDN_URL = 'https://example.com';
    expect(Config.partial().parse(env).HIGHCHARTS_CDN_URL).toEqual(
      'https://example.com'
    );

    env.HIGHCHARTS_CDN_URL = 'example.com';
    expect(() => Config.partial().parse(env)).toThrow();
  });

  test('CORE, MODULE, INDICATOR scripts should be arrays', () => {
    const env = {
      HIGHCHARTS_CORE_SCRIPTS: 'core1, core2, highcharts',
      HIGHCHARTS_MODULE_SCRIPTS: 'module1, map, module2',
      HIGHCHARTS_INDICATOR_SCRIPTS: 'indicators-all, indicator1, indicator2'
    };

    const parsed = Config.partial().parse(env);

    expect(parsed.HIGHCHARTS_CORE_SCRIPTS).toEqual(['highcharts']);
    expect(parsed.HIGHCHARTS_MODULE_SCRIPTS).toEqual(['map']);
    expect(parsed.HIGHCHARTS_INDICATOR_SCRIPTS).toEqual(['indicators-all']);
  });

  test('HIGHCHARTS_FORCE_FETCH should be a boolean', () => {
    const env = { HIGHCHARTS_FORCE_FETCH: 'true' };
    expect(Config.partial().parse(env).HIGHCHARTS_FORCE_FETCH).toEqual(true);

    env.HIGHCHARTS_FORCE_FETCH = 'false';
    expect(Config.partial().parse(env).HIGHCHARTS_FORCE_FETCH).toEqual(false);
  });
});
