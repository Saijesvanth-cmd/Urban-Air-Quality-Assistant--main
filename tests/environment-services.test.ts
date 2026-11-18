import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchOpenMeteoAirQuality } from '../src/services/airQualityService';
import { searchLocations } from '../src/services/geocodingService';
import { fetchOpenMeteoWeather } from '../src/services/weatherService';
import { classifyEuropeanAqi, classifyUsAqi } from '../src/services/safetyRules';

const originalFetch = globalThis.fetch;

function mockJson(status: number, body: unknown): void {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('weather rejects invalid coordinates before making a request', async () => {
  globalThis.fetch = (() => {
    throw new Error('fetch should not run');
  }) as typeof fetch;
  await assert.rejects(fetchOpenMeteoWeather(91, 0), /Valid latitude and longitude/);
});

test('weather reports malformed successful responses as upstream errors', async () => {
  mockJson(200, { latitude: 17.3 });
  await assert.rejects(fetchOpenMeteoWeather(17.3, 78.4), /invalid weather response/i);
});

test('air quality preserves separate US and European AQI fields', async () => {
  mockJson(200, {
    timezone: 'Asia/Kolkata',
    current: {
      time: '2026-11-18T22:00',
      us_aqi: 134,
      european_aqi: 61,
      pm2_5: 52,
      pm10: 55.8,
      nitrogen_dioxide: 14.1,
      ozone: 98,
      sulphur_dioxide: 18.6,
      carbon_monoxide: 371,
    },
  });
  const snapshot = await fetchOpenMeteoAirQuality(17.3, 78.4);
  assert.equal(snapshot.current.usAqi, 134);
  assert.equal(snapshot.current.europeanAqi, 61);
  assert.equal(snapshot.current.pm25, 52);
  assert.equal(snapshot.isModelEstimate, true);
});

test('air quality marks negative concentration values unavailable', async () => {
  mockJson(200, { current: { time: '2026-11-18T22:00', us_aqi: 20, pm2_5: -1 } });
  const snapshot = await fetchOpenMeteoAirQuality(17.3, 78.4);
  assert.equal(snapshot.current.pm25, null);
});

test('geocoding filters malformed and out-of-range coordinates', async () => {
  mockJson(200, {
    results: [
      { id: 1, name: 'Valid City', latitude: 17.3, longitude: 78.4 },
      { id: 2, name: 'Bad City', latitude: 91, longitude: 0 },
      { id: 3, latitude: 20, longitude: 78 },
    ],
  });
  const results = await searchLocations('  audit-city  ');
  assert.equal(results.length, 1);
  assert.equal(results[0].name, 'Valid City');
});

test('AQI classifications keep US EPA and European scales distinct', () => {
  assert.equal(classifyUsAqi(101).band, 'Unhealthy for Sensitive Groups (US AQI 101–150)');
  assert.equal(classifyEuropeanAqi(61), 'Poor (EAQI 61–80)');
  assert.equal(classifyUsAqi(-1).band, 'Data unavailable');
  assert.equal(classifyEuropeanAqi(-1), 'Data unavailable');
});
