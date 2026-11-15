import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseBillText } from '../server/parser.js';

const sample = (name) => fs.readFileSync(new URL(`../samples/${name}`, import.meta.url), 'utf8');

test('전기 고지서', () => {
  assert.deepEqual(parseBillText(sample('전기_2026-10.txt')), {
    category: 'electricity', billing_month: '2026-10', amount: 58420, usage: 312, usage_unit: 'kWh',
    due_date: '2026-11-25', provider: '한국전력공사',
  });
});

test('수도 고지서', () => {
  assert.deepEqual(parseBillText(sample('수도_2026-10.txt')), {
    category: 'water', billing_month: '2026-10', amount: 23220, usage: 18, usage_unit: '㎥',
    due_date: '2026-11-30', provider: '서울특별시 상수도사업본부',
  });
});

test('가스 고지서', () => {
  assert.deepEqual(parseBillText(sample('가스_2026-10.txt')), {
    category: 'gas', billing_month: '2026-10', amount: 27750, usage: 1245, usage_unit: 'MJ',
    due_date: '2026-11-20', provider: '서울도시가스',
  });
});

test('라벨 없는 금액은 가장 큰 원 단위 숫자', () => {
  const r = parseBillText('인터넷 이용료 22,000원 할인 -3,000원 부가세 1,900원');
  assert.equal(r.category, 'telecom');
  assert.equal(r.amount, 22000);
});

test('빈 텍스트', () => {
  const r = parseBillText('');
  assert.equal(r.amount, null);
  assert.equal(r.billing_month, null);
});
