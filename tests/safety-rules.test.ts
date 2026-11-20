import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyUsAqi,
  classifyEuropeanAqi,
  computeSaferActivityWindow,
  buildDeterministicSafetyBrief,
} from '../src/services/safetyRules.ts';

describe('classifyUsAqi', () => {
  it('classifies all US AQI boundaries correctly', () => {
    assert.equal(classifyUsAqi(50).severity, 'good');
    assert.equal(classifyUsAqi(51).severity, 'moderate');
    assert.equal(classifyUsAqi(101).severity, 'sensitive');
    assert.equal(classifyUsAqi(151).severity, 'poor');
    assert.equal(classifyUsAqi(201).severity, 'very-poor');
    assert.equal(classifyUsAqi(301).severity, 'severe');
  });

  it('handles unavailable or invalid values', () => {
    for (const value of [null, -1, NaN, Infinity]) {
      assert.equal(classifyUsAqi(value).band, 'Data unavailable');
    }
  });
});

describe('classifyEuropeanAqi', () => {
  it('classifies European AQI boundaries correctly', () => {
    assert.match(classifyEuropeanAqi(20), /Good/);
    assert.match(classifyEuropeanAqi(21), /Fair/);
    assert.match(classifyEuropeanAqi(41), /Moderate/);
    assert.match(classifyEuropeanAqi(61), /Poor/);
    assert.match(classifyEuropeanAqi(81), /Very Poor/);
    assert.match(classifyEuropeanAqi(101), /Extremely Poor/);
  });

  it('handles unavailable or invalid values', () => {
    for (const value of [null, -1, NaN, Infinity]) {
      assert.equal(classifyEuropeanAqi(value), 'Data unavailable');
    }
  });
});

describe('computeSaferActivityWindow', () => {
  it('finds the lowest-pollution consecutive daytime window', () => {
    const result = computeSaferActivityWindow([
      { timeIso: '', hourLabel: '10:00', pm25: 40, usAqi: 100 },
      { timeIso: '', hourLabel: '11:00', pm25: 20, usAqi: 80 },
      { timeIso: '', hourLabel: '12:00', pm25: 10, usAqi: 60 },
      { timeIso: '', hourLabel: '13:00', pm25: 30, usAqi: 90 },
    ]);

    assert.ok(result);
    assert.equal(result.startHour, 11);
    assert.equal(result.endHour, 13);
  });

  it('returns null when fewer than two daytime readings are available', () => {
    const result = computeSaferActivityWindow([
      { timeIso: '', hourLabel: '10:00', pm25: 20, usAqi: 50 },
    ]);

    assert.equal(result, null);
  });
});

describe('buildDeterministicSafetyBrief', () => {
  it('builds high-pollution guidance with weather warnings', () => {
    const result = buildDeterministicSafetyBrief({
      usAqi: 250,
      europeanAqi: 90,
      windKmh: 5,
      precipitationMm: 1,
      saferWindowLabel: '14:00–16:00',
      safeIndoorPm25Target: 15,
    });

    assert.equal(result.severity, 'very-poor');
    assert.match(result.ventilationRule, /High ambient burden/);
    assert.match(result.ventilationRule, /Low surface wind/);
    assert.match(result.ventilationRule, /precipitation/);
  });

  it('provides default ventilation guidance when no safer window exists', () => {
    const result = buildDeterministicSafetyBrief({
      usAqi: 50,
      europeanAqi: 20,
      windKmh: null,
      precipitationMm: null,
      saferWindowLabel: null,
      safeIndoorPm25Target: 15,
    });

    assert.match(result.ventilationRule, /could not be determined/);
  });
});