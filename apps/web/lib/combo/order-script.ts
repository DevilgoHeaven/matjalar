export interface OrderScriptOption {
  actionType: string;
  groupName: string;
  optionName: string;
  quantity?: number;
}

export interface OrderScriptInput {
  brandName: string;
  menuName: string;
  variantName: string;
  options: OrderScriptOption[];
}

const GROUP_ORDER = ['빵', '치즈', '야채', '소스', '세트'];

export function buildOrderScript(input: OrderScriptInput): string {
  const selected = groupOptions(input.options, 'select');
  const excluded = groupOptions(input.options, 'exclude');
  const added = groupOptions(input.options, 'add');

  const fragments: string[] = [];
  for (const group of GROUP_ORDER) {
    const values = selected.get(group);
    if (!values?.length) continue;
    fragments.push(formatSelectedGroup(group, values));
  }

  const addValues = flattenOptionGroups(added);
  if (addValues.length) {
    fragments.push(`${formatList(addValues)} 추가`);
  }

  for (const [group, values] of excluded) {
    if (!values.length) continue;
    fragments.push(`${group}에서 ${formatList(values)} 빼고`);
  }

  const intro = `${input.brandName}에서 ${input.menuName} ${input.variantName} 주세요.`;
  if (!fragments.length) return intro;

  return `${intro}\n${fragments.join(', ')} 해주세요.`;
}

export function buildOrderSummary(input: OrderScriptInput): string {
  const selected = groupOptions(input.options, 'select');
  const sauces = selected.get('소스') ?? [];
  const bread = selected.get('빵')?.[0];
  const additions = flattenOptionGroups(groupOptions(input.options, 'add'));
  return [input.menuName, input.variantName, bread, sauces.slice(0, 2).join('+'), additions[0]]
    .filter(Boolean)
    .join(' · ');
}

function groupOptions(options: OrderScriptOption[], actionType: string) {
  const grouped = new Map<string, string[]>();
  for (const option of options) {
    if (option.actionType !== actionType) continue;
    const group = normalizeGroupName(option.groupName);
    const current = grouped.get(group) ?? [];
    current.push(formatOptionName(option));
    grouped.set(group, current);
  }
  return grouped;
}

function normalizeGroupName(groupName: string): string {
  if (groupName.includes('빵')) return '빵';
  if (groupName.includes('치즈')) return '치즈';
  if (groupName.includes('야채')) return '야채';
  if (groupName.includes('소스')) return '소스';
  if (groupName.includes('세트')) return '세트';
  if (groupName.includes('추가')) return '추가';
  return groupName;
}

function formatSelectedGroup(group: string, values: string[]) {
  const joined = formatList(values);
  if (group === '빵') return `빵은 ${joined}`;
  if (group === '치즈') return `치즈는 ${joined}`;
  if (group === '야채') return `야채는 ${joined}`;
  if (group === '소스') return `소스는 ${joined}`;
  if (group === '세트') return joined;
  return `${group}은 ${joined}`;
}

function formatOptionName(option: OrderScriptOption) {
  const quantity = option.quantity && option.quantity > 1 ? ` x${option.quantity}` : '';
  return `${option.optionName}${quantity}`;
}

function flattenOptionGroups(groups: Map<string, string[]>) {
  return [...groups.values()].flat();
}

function formatList(values: string[]) {
  return [...new Set(values)].join(' + ');
}
