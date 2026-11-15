// 공과금 종류. 이 순서가 곧 그래프 색상 순서다(색은 public/style.css의 --cat-* 변수).
export const CATEGORIES = [
  { key: 'electricity', label: '전기', unit: 'kWh' },
  { key: 'water', label: '수도', unit: '㎥' },
  { key: 'gas', label: '가스', unit: 'MJ' },
  { key: 'management', label: '관리비', unit: '' },
  { key: 'telecom', label: '통신', unit: '' },
  { key: 'etc', label: '기타', unit: '' },
];

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);
