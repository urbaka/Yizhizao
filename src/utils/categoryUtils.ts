type CategoryRule = {
  label: string;
  pattern: RegExp;
};

const AMAP_TYPE_RULES: CategoryRule[] = [
  { label: '咖啡馆', pattern: /咖啡厅|咖啡馆/iu },
  { label: '茶饮', pattern: /冷饮店|茶饮店|奶茶店|饮品店/iu },
  { label: '酒吧', pattern: /酒吧|夜总会|迪厅/iu },
  { label: '火锅', pattern: /火锅店|涮锅店/iu },
  { label: '烘焙甜品', pattern: /糕饼店|蛋糕店|面包店|甜品店/iu },
  { label: '书店', pattern: /书店/iu },
  { label: '健身房', pattern: /健身中心|健身房|瑜伽/iu },
  { label: '宠物店', pattern: /宠物商店|宠物医院|动物诊所|宠物服务/iu },
  { label: '美发沙龙', pattern: /美容美发店|理发店|美发/iu },
  { label: '酒店住宿', pattern: /宾馆酒店|旅馆招待所|住宿服务相关|酒店/iu },
  { label: '服饰鞋帽', pattern: /服装鞋帽皮具店|服装店|鞋帽店/iu },
  { label: '文创', pattern: /工艺美术馆|艺术馆|文化用品店|礼品饰品店/iu },
  {
    label: '餐饮',
    pattern: /中餐厅|外国餐厅|快餐厅|小吃快餐店|餐饮相关场所|餐饮服务/iu,
  },
];

const MERCHANT_NAME_RULES: CategoryRule[] = [
  { label: '咖啡馆', pattern: /咖啡|coffee|starbucks|manner|seesaw|m stand/iu },
  {
    label: '茶饮',
    pattern: /奶茶|茶饮|喜茶|奈雪|霸王茶姬|蜜雪冰城|茶百道|古茗|一点点|coco都可/iu,
  },
  { label: '酒吧', pattern: /酒吧|酒馆|pub|bar|live\s*house/iu },
  { label: '火锅', pattern: /火锅|串串|涮肉|冒菜/iu },
  { label: '烘焙甜品', pattern: /烘焙|蛋糕|面包|糕点|甜品|好利来|鲍师傅/iu },
  { label: '书店', pattern: /书店|书院|书局/iu },
  { label: '健身房', pattern: /健身|瑜伽|普拉提/iu },
  { label: '宠物店', pattern: /宠物|动物医院|猫舍|犬舍/iu },
  { label: '美发沙龙', pattern: /美发|理发|造型|发型/iu },
  { label: '酒店住宿', pattern: /酒店|宾馆|旅馆|客栈|民宿/iu },
  { label: '服饰鞋帽', pattern: /服饰|服装|女装|男装|童装|鞋店|皮具/iu },
  { label: '数码通信', pattern: /手机|数码|通信|华为|苹果|小米|oppo|vivo|荣耀|三星/iu },
  { label: '眼镜视光', pattern: /眼镜|视光|验光/iu },
  { label: '珠宝钟表', pattern: /珠宝|黄金|银饰|钻石|钟表|周大福|周生生/iu },
  { label: '美妆个护', pattern: /美妆|化妆品|护肤|香水|屈臣氏|丝芙兰/iu },
  { label: '母婴用品', pattern: /母婴|孕婴|婴童|奶粉/iu },
  { label: '家居建材', pattern: /家居|家具|灯具|卫浴|建材|地板|瓷砖/iu },
  { label: '运动户外', pattern: /运动|户外|耐克|阿迪达斯|李宁|安踏/iu },
  { label: '食品生鲜', pattern: /生鲜|水果|零食|烟酒|茶叶|特产|粮油/iu },
  { label: '医药健康', pattern: /药房|大药房|药店|医疗器械/iu },
  { label: '汽车服务', pattern: /汽车|轮胎|汽配|4s店/iu },
  { label: '文具办公', pattern: /文具|办公用品|打印|复印/iu },
  { label: '文创', pattern: /文创|艺术商店|创意礼品/iu },
  { label: '手作', pattern: /手作|陶艺|手工坊|diy/iu },
  { label: '餐饮', pattern: /餐厅|饭店|食府|小吃|烧烤|面馆|菜馆/iu },
];

const DINING_NAME_RULES = MERCHANT_NAME_RULES.filter(({ label }) =>
  ['咖啡馆', '茶饮', '酒吧', '火锅', '烘焙甜品'].includes(label)
);

const GENERIC_AMAP_TYPE_LABELS: Record<string, string> = {
  餐饮服务: '餐饮',
  购物服务: '零售购物',
  生活服务: '生活服务',
  体育休闲服务: '体育休闲',
  住宿服务: '酒店住宿',
  医疗保健服务: '医疗健康',
  科教文化服务: '科教文化',
  公司企业: '公司企业',
};

// These are valid Amap categories but do not identify the goods or service
// sold by a merchant. For these only, a clear name keyword may supply a
// concise operating category; otherwise keep Amap's own short label.
const AMBIGUOUS_AMAP_LEAF_TYPES = new Set([
  '专营店',
  '专卖店',
  '购物相关场所',
  '生活服务场所',
]);

const findCategory = (value: string, rules: CategoryRule[]) =>
  rules.find(({ pattern }) => pattern.test(value))?.label;

type AmapSearchRule = {
  query: string;
  expectedCategory?: string;
  type?: string;
};

const AMAP_SEARCH_RULES = new Map<string, AmapSearchRule>([
  ['餐饮', { query: '餐饮', expectedCategory: '餐饮', type: '餐饮服务' }],
  ['咖啡馆', { query: '咖啡', expectedCategory: '咖啡馆', type: '咖啡厅' }],
  ['咖啡店', { query: '咖啡', expectedCategory: '咖啡馆', type: '咖啡厅' }],
  ['咖啡厅', { query: '咖啡', expectedCategory: '咖啡馆', type: '咖啡厅' }],
  ['茶饮', { query: '奶茶', expectedCategory: '茶饮', type: '冷饮店' }],
  ['茶饮店', { query: '奶茶', expectedCategory: '茶饮', type: '冷饮店' }],
  ['奶茶', { query: '奶茶', expectedCategory: '茶饮', type: '冷饮店' }],
  ['奶茶店', { query: '奶茶', expectedCategory: '茶饮', type: '冷饮店' }],
  ['酒吧', { query: '酒吧', expectedCategory: '酒吧', type: '酒吧' }],
  ['火锅', { query: '火锅', expectedCategory: '火锅', type: '火锅店' }],
  [
    '烘焙甜品',
    { query: '蛋糕', expectedCategory: '烘焙甜品', type: '糕饼店|甜品店' },
  ],
  ['烘焙', { query: '蛋糕', expectedCategory: '烘焙甜品', type: '糕饼店|甜品店' }],
  ['糕点', { query: '蛋糕', expectedCategory: '烘焙甜品', type: '糕饼店|甜品店' }],
  ['蛋糕店', { query: '蛋糕', expectedCategory: '烘焙甜品', type: '糕饼店|甜品店' }],
  ['面包店', { query: '面包', expectedCategory: '烘焙甜品', type: '糕饼店' }],
  ['书店', { query: '书店', expectedCategory: '书店', type: '书店' }],
  ['轻食', { query: '轻食', expectedCategory: '餐饮' }],
  ['健身房', { query: '健身', expectedCategory: '健身房', type: '健身中心' }],
  ['健身', { query: '健身', expectedCategory: '健身房', type: '健身中心' }],
  ['宠物店', { query: '宠物', expectedCategory: '宠物店' }],
  ['宠物', { query: '宠物', expectedCategory: '宠物店' }],
  [
    '美发沙龙',
    { query: '美发', expectedCategory: '美发沙龙', type: '美容美发店' },
  ],
  ['理发店', { query: '美发', expectedCategory: '美发沙龙', type: '美容美发店' }],
  ['美发', { query: '美发', expectedCategory: '美发沙龙', type: '美容美发店' }],
  ['酒店住宿', { query: '酒店', expectedCategory: '酒店住宿', type: '宾馆酒店' }],
  ['快捷酒店', { query: '酒店', expectedCategory: '酒店住宿', type: '宾馆酒店' }],
  ['宾馆', { query: '酒店', expectedCategory: '酒店住宿', type: '宾馆酒店' }],
  ['酒店', { query: '酒店', expectedCategory: '酒店住宿', type: '宾馆酒店' }],
  [
    '服饰鞋帽',
    { query: '服装', expectedCategory: '服饰鞋帽', type: '服装鞋帽皮具店' },
  ],
  ['服装店', { query: '服装', expectedCategory: '服饰鞋帽', type: '服装鞋帽皮具店' }],
  ['服装', { query: '服装', expectedCategory: '服饰鞋帽', type: '服装鞋帽皮具店' }],
  ['文创', { query: '文创', expectedCategory: '文创', type: '文化用品店|礼品饰品店' }],
  ['手作', { query: '手工' }],
]);

const DINING_BUSINESS_CATEGORIES = new Set([
  '餐饮',
  '咖啡馆',
  '茶饮',
  '酒吧',
  '火锅',
  '烘焙甜品',
]);

const AMAP_NAME_RELEVANCE_RULES = new Map<string, RegExp>([
  ['轻食', /轻食|轻餐|简餐|沙拉|brunch|三明治|全麦|低卡|低脂|减脂|健康餐/iu],
  ['手作', /手作|手工|diy|陶艺|编织|皮艺|银饰制作|体验工坊/iu],
]);

/**
 * Convert UI category labels into short search terms understood reliably by
 * Amap. Free-form merchant names and brand keywords are intentionally kept
 * unchanged so an exact user query never gets broadened unexpectedly.
 */
export function normalizeAmapSearchKeyword(value: string): string {
  const keyword = value.trim();
  return AMAP_SEARCH_RULES.get(keyword.toLocaleLowerCase('zh-CN'))?.query ?? keyword;
}

/** Return an Amap-authored POI type expression for known UI categories. */
export function getAmapSearchType(value: string): string | undefined {
  return AMAP_SEARCH_RULES.get(value.trim().toLocaleLowerCase('zh-CN'))?.type;
}

/**
 * For known UI categories, reject fuzzy Amap hits whose authoritative POI
 * category is unrelated. Brand names and arbitrary free text stay unfiltered.
 */
export function isAmapBusinessCategoryMatch(
  matchedKeyword: string,
  resolvedCategory: string,
  merchantName = ''
): boolean {
  const normalizedKeyword = matchedKeyword.trim().toLocaleLowerCase('zh-CN');
  const expectedCategory = AMAP_SEARCH_RULES.get(normalizedKeyword)?.expectedCategory;
  const nameRule = AMAP_NAME_RELEVANCE_RULES.get(normalizedKeyword);

  if (nameRule && !nameRule.test(merchantName)) return false;
  if (!expectedCategory) return true;
  if (expectedCategory === '餐饮') {
    return DINING_BUSINESS_CATEGORIES.has(resolvedCategory);
  }
  return resolvedCategory === expectedCategory;
}

/**
 * Resolve a concise business category from Amap's hierarchical `type` field.
 * API taxonomy is authoritative; merchant-name rules are only a fallback when
 * Amap returns an empty or overly generic category.
 */
export function resolveAmapBusinessCategory(
  merchantName: string,
  rawType: string,
  matchedKeyword = ''
): string {
  const typeGroups = rawType
    .split('|')
    .map((group) => group.trim())
    .filter(Boolean);
  const primaryType = typeGroups[0] ?? '';
  const typeParts = primaryType
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
  const normalizedType = typeParts.join(';');
  const nameCategory = findCategory(merchantName, MERCHANT_NAME_RULES);

  // Amap may return several type hierarchies for one POI. When the merchant
  // name clearly identifies its business, prefer that signal over a secondary
  // category (for example a hotel that also exposes a coffee-service type).
  if (typeGroups.length > 1 && nameCategory) return nameCategory;

  const typeCategory = findCategory(normalizedType, AMAP_TYPE_RULES);
  if (typeCategory === '餐饮') {
    return findCategory(merchantName, DINING_NAME_RULES) ?? typeCategory;
  }
  if (typeCategory) return typeCategory;

  const mostSpecificType = typeParts.at(-1);
  if (mostSpecificType && !GENERIC_AMAP_TYPE_LABELS[mostSpecificType]) {
    if (AMBIGUOUS_AMAP_LEAF_TYPES.has(mostSpecificType)) {
      return findCategory(merchantName, MERCHANT_NAME_RULES) ?? mostSpecificType;
    }
    return mostSpecificType;
  }

  if (nameCategory) return nameCategory;

  if (mostSpecificType) {
    return GENERIC_AMAP_TYPE_LABELS[mostSpecificType] ?? mostSpecificType;
  }

  return findCategory(matchedKeyword, MERCHANT_NAME_RULES) ?? (matchedKeyword.trim() || '其他');
}
