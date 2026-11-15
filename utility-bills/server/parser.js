// 고지서 텍스트에서 종류·청구월·금액·사용량·납기일·기관명을 추정한다.
// 결과는 "제안값"일 뿐이고, 사용자가 화면에서 확인·수정한 뒤 저장한다.

const KEYWORDS = {
  electricity: [['한국전력', 3], ['한전', 2], ['전기요금', 3], ['전력량', 2], ['kWh', 2], ['전기', 1]],
  water: [['상수도', 3], ['하수도', 2], ['수도요금', 3], ['수도사업', 3], ['물이용부담금', 3], ['상하수도', 3]],
  gas: [['도시가스', 3], ['가스요금', 3], ['가스사용량', 2], ['MJ', 2], ['가스', 1]],
  management: [['관리비', 3], ['관리사무소', 3], ['일반관리', 2], ['장기수선', 2]],
  telecom: [['통신요금', 3], ['인터넷', 2], ['이동전화', 2], ['휴대폰', 2], ['IPTV', 2], ['SK브로드밴드', 3], ['LG U+', 3], ['LGU+', 3], ['KT', 1], ['SKT', 2]],
};

const UNIT_RE = '(kWh|KWH|kwh|㎥|m3|m³|MJ|mj|톤)';

const AMOUNT_LABELS = [
  '청구금액', '납부하실\\s*금액', '납부할\\s*금액', '납부금액', '청구\\s*합계', '당월\\s*청구액',
  '이번\\s*달\\s*요금', '당월\\s*요금', '합계\\s*금액', '총\\s*금액', '결제\\s*금액', '부과\\s*금액', '합\\s*계',
];

const PROVIDERS = [
  '한국전력공사', '한국가스공사', '서울도시가스', '삼천리', '코원에너지서비스', '예스코', '귀뚜라미에너지',
  '대륜이엔에스', '인천도시가스', '경동도시가스', '부산도시가스', 'SK브로드밴드', 'LG유플러스', 'LG U+', 'KT', 'SK텔레콤',
];

const toNumber = (s) => Number(String(s).replace(/,/g, ''));
const pad2 = (n) => String(n).padStart(2, '0');

function validMonth(y, m) {
  return y >= 2000 && y <= 2100 && m >= 1 && m <= 12 ? `${y}-${pad2(m)}` : null;
}

export function detectCategory(text) {
  let best = 'etc';
  let bestScore = 0;
  for (const [cat, words] of Object.entries(KEYWORDS)) {
    let score = 0;
    for (const [w, weight] of words) {
      const n = text.split(w).length - 1;
      score += Math.min(n, 5) * weight;
    }
    if (score > bestScore) {
      best = cat;
      bestScore = score;
    }
  }
  return best;
}

export function detectBillingMonth(text) {
  const patterns = [
    /(\d{4})\s*년\s*(\d{1,2})\s*월\s*분/, // 2026년 10월분
    /(?:청구|사용|부과|고지)\s*년\s*월[^\d]{0,10}(\d{4})\s*[.\-/년]\s*(\d{1,2})/, // 청구년월: 2026.10
    /(\d{4})\s*[.\-/]\s*(\d{1,2})\s*월?\s*분/, // 2026.10월분
    /(\d{4})\s*년\s*(\d{1,2})\s*월/, // 2026년 10월
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const v = validMonth(Number(m[1]), Number(m[2]));
      if (v) return v;
    }
  }
  return null;
}

export function detectAmount(text) {
  for (const label of AMOUNT_LABELS) {
    const re = new RegExp(`${label}[^\\d\\n]{0,20}([\\d]{1,3}(?:,\\d{3})+|\\d+)\\s*원?`);
    const m = text.match(re);
    if (m) {
      const n = toNumber(m[1]);
      if (n > 0) return n;
    }
  }
  // 라벨이 없으면 "원"이 붙은 숫자 중 가장 큰 값
  let max = null;
  for (const m of text.matchAll(/([\d]{1,3}(?:,\d{3})+|\d+)\s*원/g)) {
    const n = toNumber(m[1]);
    if (max === null || n > max) max = n;
  }
  return max;
}

function normalizeUnit(u) {
  const l = u.toLowerCase();
  if (l === 'kwh') return 'kWh';
  if (l === 'mj') return 'MJ';
  if (l === 'm3' || u === 'm³' || u === '㎥' || u === '톤') return '㎥';
  return u;
}

const CATEGORY_UNITS = { electricity: ['kWh'], water: ['㎥'], gas: ['MJ', '㎥'] };

export function detectUsage(text, category) {
  const wanted = CATEGORY_UNITS[category];
  const ok = (unit) => !wanted || wanted.includes(unit);
  const labeled = new RegExp(`(?:사용량|사용\\s*전력량|당월\\s*사용)[^\\d\\n]{0,15}([\\d,]+(?:\\.\\d+)?)\\s*${UNIT_RE}`, 'g');
  for (const m of text.matchAll(labeled)) {
    const unit = normalizeUnit(m[2]);
    if (ok(unit)) return { usage: toNumber(m[1]), unit };
  }
  for (const m of text.matchAll(new RegExp(`([\\d,]+(?:\\.\\d+)?)\\s*${UNIT_RE}`, 'g'))) {
    const unit = normalizeUnit(m[2]);
    const n = toNumber(m[1]);
    if (ok(unit) && n > 0) return { usage: n, unit };
  }
  return { usage: null, unit: null };
}

export function detectDueDate(text) {
  const m = text.match(/(?:납기일|납부\s*기한|납부\s*마감일|납기\s*내|납기)[^\d\n]{0,10}(\d{4})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (!validMonth(y, mo) || d < 1 || d > 31) return null;
  return `${y}-${pad2(mo)}-${pad2(d)}`;
}

export function detectProvider(text) {
  const re = text.match(/[가-힣]{2,} ?(?:상수도사업본부|수도사업소|상수도사업소|도시가스)/);
  if (re) return re[0];
  return PROVIDERS.find((p) => text.includes(p)) ?? null;
}

export function parseBillText(rawText) {
  const text = String(rawText ?? '').replace(/\r/g, '').replace(/[ \t ]+/g, ' ');
  const category = detectCategory(text);
  const { usage, unit } = detectUsage(text, category);
  return {
    category,
    billing_month: detectBillingMonth(text),
    amount: detectAmount(text),
    usage,
    usage_unit: unit,
    due_date: detectDueDate(text),
    provider: detectProvider(text),
  };
}
