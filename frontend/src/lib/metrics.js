import { Zap, Activity, Bolt, Database, Waves, Gauge } from 'lucide-react';
import { fmt } from './format';

const COS_PHI_ZONES = [
  { from: 0, to: 0.85, color: 'rgba(220,38,38,0.3)' },
  { from: 0.85, to: 0.95, color: 'rgba(234,179,8,0.25)' }
];

const FREQUENCY_ZONES = [
  { from: 0, to: 0.45, color: 'rgba(220,38,38,0.18)' },
  { from: 0.55, to: 1, color: 'rgba(220,38,38,0.18)' }
];

export const METRICS = [
  {
    key: 'voltage',
    title: 'Voltage',
    icon: Zap,
    color: '#0284c7',
    rgb: '2,132,199',
    unit: 'V',
    decimals: 1,
    chartDecimals: 1,
    min: 0,
    max: 500,
    zones: [],
    display: (v) => (v == null ? { value: null, unit: 'V', decimals: 1 } : { value: v, unit: 'V', decimals: 1 }),
    rangeLabel: (m) => `0 – ${fmt(m, 0)} V`
  },
  {
    key: 'current',
    title: 'Current',
    icon: Activity,
    color: '#d97706',
    rgb: '217,119,6',
    unit: 'A',
    decimals: 1,
    chartDecimals: 1,
    min: 0,
    max: 400,
    zones: [],
    display: (v) => (v == null ? { value: null, unit: 'A', decimals: 1 } : { value: v, unit: 'A', decimals: 1 }),
    rangeLabel: (m) => `0 – ${fmt(m, 0)} A`
  },
  {
    key: 'power',
    title: 'Active Power',
    icon: Bolt,
    color: '#059669',
    rgb: '5,150,105',
    unit: 'kW',
    decimals: 2,
    chartDecimals: 2,
    min: 0,
    max: 250,
    zones: [],
    display: (v) =>
      v == null
        ? { value: null, unit: 'kW', decimals: 2 }
        : { value: v / 1000, unit: 'kW', decimals: 2 },
    rangeLabel: (m) => `0 – ${fmt(m, 0)} kW`
  },
  {
    key: 'energy',
    title: 'Energy',
    icon: Database,
    color: '#4f46e5',
    rgb: '79,70,229',
    unit: 'kWh',
    decimals: 2,
    chartDecimals: 2,
    min: 0,
    max: 100,
    zones: [],
    display: (v) =>
      v == null
        ? { value: null, unit: 'kWh', decimals: 2 }
        : { value: v, unit: 'kWh', decimals: v > 10000 ? 0 : 2 },
    rangeLabel: () => 'Cumulative'
  },
  {
    key: 'frequency',
    title: 'Frequency',
    icon: Waves,
    color: '#2563eb',
    rgb: '37,99,235',
    unit: 'Hz',
    decimals: 2,
    chartDecimals: 2,
    min: 45,
    max: 55,
    zones: FREQUENCY_ZONES,
    display: (v) => (v == null ? { value: null, unit: 'Hz', decimals: 2 } : { value: v, unit: 'Hz', decimals: 2 }),
    rangeLabel: () => '45 – 55 Hz'
  },
  {
    key: 'cosPhi',
    title: 'Power Factor · cos φ',
    icon: Gauge,
    color: '#7c3aed',
    rgb: '124,58,237',
    unit: 'cos φ',
    decimals: 2,
    chartDecimals: 2,
    min: 0,
    max: 1,
    zones: COS_PHI_ZONES,
    display: (v) =>
      v == null
        ? { value: null, unit: 'cos φ', decimals: 2 }
        : { value: Math.abs(v), unit: 'cos φ', decimals: 2 },
    rangeLabel: () => '0 – 1'
  }
];