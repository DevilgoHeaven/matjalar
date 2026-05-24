/* eslint-disable no-console */
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');

const sourceNotes = [
  'Subway Korea order flow: menu -> bread -> topping -> vegetables/sauce -> set.',
  'Community patterns repeatedly favor BMT with ranch/southwest/sweet chili, egg mayo with bacon, chicken teriyaki with egg mayo, and diet variants using wheat + mustard/pepper.',
  'Seed comments are original operator copy; external wording is not copied.',
];

const allVeg = ['양상추', '토마토', '오이', '피망', '양파', '피클', '올리브', '할라피뇨'];
const lightVeg = ['양상추', '토마토', '오이', '피망', '양파'];
const mildVeg = ['양상추', '토마토', '오이', '양파'];
const noPickleVeg = ['양상추', '토마토', '오이', '피망', '양파', '올리브'];
const spicyVeg = ['양상추', '토마토', '피망', '양파', '할라피뇨'];

const combos = [
  c('실패없는 BMT 정석', 'BMT', '15cm', '위트', '슈레드치즈', allVeg, ['사우스웨스트', '랜치'], [], '단품', ['beginner', 'cheap'], '처음이면 BMT에 랜치와 사우스웨스트부터 가면 안전해요.'),
  c('달콤한 치킨 데리야끼 입문', '치킨 데리야끼', '15cm', '파마산오레가노', '아메리칸치즈', allVeg, ['스위트어니언', '랜치'], [], '단품', ['beginner'], '달콤한 치킨에 랜치 한 줄이면 첫 주문도 부담 없어요.'),
  c('고소한 에그마요 기본', '에그마요', '15cm', '위트', '슈레드치즈', mildVeg, ['스위트칠리', '랜치'], [], '단품', ['beginner', 'cheap'], '에그마요는 달콤한 칠리와 랜치가 가장 무난한 출발점이에요.'),
  c('서브웨이 클럽 밸런스', '서브웨이 클럽', '15cm', '화이트', '아메리칸치즈', allVeg, ['스위트어니언', '랜치'], [], '단품', ['beginner'], '고기 맛과 야채 맛이 같이 살아서 메뉴 고르기 어려울 때 좋아요.'),
  c('터키 베이컨 아보카도 산뜻', '터키 베이컨 아보카도', '15cm', '허니오트', '아메리칸치즈', lightVeg, ['올리브오일', '후추'], [], '단품', ['beginner', 'diet'], '아보카도 메뉴는 오일과 후추만으로도 충분히 깔끔해요.'),
  c('BMT 파마산오레가노 입문', 'BMT', '15cm', '파마산오레가노', '아메리칸치즈', allVeg, ['스위트어니언', '랜치'], [], '단품', ['beginner'], '허브향 빵에 달콤고소 소스라 실패 확률이 낮아요.'),
  c('치킨 데리야끼 사우스웨스트', '치킨 데리야끼', '15cm', '위트', '슈레드치즈', allVeg, ['스위트어니언', '사우스웨스트'], [], '단품', ['beginner'], '달콤한 데리야끼에 살짝 매콤한 끝맛을 더했어요.'),
  c('플랫브레드 에그마요', '에그마요', '15cm', '플랫브레드', '아메리칸치즈', mildVeg, ['스위트칠리', '마요네즈'], [], '단품', ['beginner'], '쫀득한 빵과 부드러운 에그마요를 좋아하면 이 조합이에요.'),
  c('서브웨이 클럽 허니바비큐', '서브웨이 클럽', '15cm', '파마산오레가노', '슈레드치즈', noPickleVeg, ['허니머스타드', '바비큐'], [], '단품', ['beginner'], '클럽 샌드위치를 달콤짭짤하게 먹고 싶을 때 좋아요.'),
  c('터키 베이컨 아보카도 담백', '터키 베이컨 아보카도', '15cm', '위트', '슈레드치즈', lightVeg, ['머스타드', '후추'], [], '단품', ['beginner', 'diet'], '느끼함을 줄이고 아보카도 고소함만 살린 조합이에요.'),
  c('워크샵 BMT 30cm 세트', 'BMT', '30cm', '위트', '슈레드치즈', allVeg, ['사우스웨스트', '랜치'], [], '세트', ['beginner', 'hearty'], '둘이 나눠 먹거나 오래 버틸 점심이면 30cm 세트가 든든해요.'),
  c('치킨 데리야끼 30cm 세트', '치킨 데리야끼', '30cm', '위트', '아메리칸치즈', allVeg, ['스위트어니언', '바비큐'], [], '세트', ['beginner', 'hearty'], '달콤한 치킨 조합을 크게 먹고 싶을 때 고르는 세트예요.'),
  c('에그마요 베이컨 입문', '에그마요', '15cm', '허니오트', '슈레드치즈', allVeg, ['랜치', '스위트어니언'], ['베이컨'], '단품', ['beginner', 'popular'], '에그마요에 베이컨을 더하면 고소함과 짭짤함이 확 살아나요.'),
  c('서브웨이 클럽 30cm 클래식', '서브웨이 클럽', '30cm', '화이트', '아메리칸치즈', allVeg, ['랜치', '바비큐'], [], '세트', ['beginner', 'hearty'], '클럽은 30cm로 먹어도 맛이 과하지 않아 점심용으로 무난해요.'),
  c('터키 베이컨 아보카도 30cm', '터키 베이컨 아보카도', '30cm', '허니오트', '아메리칸치즈', noPickleVeg, ['올리브오일', '후추'], [], '세트', ['beginner', 'hearty'], '묵직하지만 소스는 가볍게 잡아 느끼함을 줄였어요.'),

  c('다이어트 클럽 머스타드', '서브웨이 클럽', '15cm', '위트', null, lightVeg, ['머스타드', '후추'], [], '단품', ['diet'], '소스는 머스타드와 후추만, 야채는 넉넉하게 넣는 가벼운 클럽이에요.'),
  c('터키 아보카도 식초오일', '터키 베이컨 아보카도', '15cm', '위트', null, lightVeg, ['머스타드', '레드와인식초'], [], '단품', ['diet'], '아보카도 메뉴를 산뜻하게 먹고 싶을 때 좋은 조합이에요.'),
  c('치킨 데리야끼 머스타드 컷', '치킨 데리야끼', '15cm', '위트', null, lightVeg, ['머스타드', '후추'], [], '단품', ['diet'], '치킨은 살리고 소스는 가볍게 줄인 점심용 조합이에요.'),
  c('BMT 라이트 머스타드', 'BMT', '15cm', '위트', null, lightVeg, ['머스타드', '후추'], [], '단품', ['diet'], 'BMT가 먹고 싶지만 소스 부담은 줄이고 싶을 때 좋아요.'),
  c('에그마요 머스타드 라이트', '에그마요', '15cm', '위트', null, lightVeg, ['머스타드', '후추'], [], '단품', ['diet'], '에그마요의 부드러움은 남기고 소스는 깔끔하게 정리했어요.'),
  c('클럽 30cm 라이트 단품', '서브웨이 클럽', '30cm', '위트', null, lightVeg, ['머스타드', '후추'], [], '단품', ['diet', 'hearty'], '양은 챙기되 치즈와 무거운 소스를 뺀 30cm 선택지예요.'),
  c('터키 아보카도 위트 라이트', '터키 베이컨 아보카도', '15cm', '위트', '아메리칸치즈', lightVeg, ['올리브오일', '후추'], [], '단품', ['diet'], '치즈 한 장만 남기고 소스를 담백하게 잡은 균형형이에요.'),
  c('치킨 데리야끼 산미 조합', '치킨 데리야끼', '15cm', '허니오트', null, lightVeg, ['레드와인식초', '올리브오일', '후추'], [], '단품', ['diet'], '달콤한 치킨에 산미를 더해 무거운 소스를 피했어요.'),
  c('BMT 허니오트 라이트', 'BMT', '15cm', '허니오트', null, lightVeg, ['머스타드', '레드와인식초'], [], '단품', ['diet'], '곡물빵과 산뜻한 소스로 BMT를 가볍게 먹는 방식이에요.'),
  c('클럽 스위트어니언 한 줄', '서브웨이 클럽', '15cm', '위트', '아메리칸치즈', noPickleVeg, ['스위트어니언', '후추'], [], '단품', ['diet', 'beginner'], '단맛은 조금만, 야채와 단백질 균형을 우선한 클럽이에요.'),

  c('핫칠리 BMT', 'BMT', '15cm', '파마산오레가노', '아메리칸치즈', spicyVeg, ['사우스웨스트', '핫칠리'], [], '단품', ['spicy'], 'BMT에 할라피뇨와 핫칠리를 얹어 매운맛을 분명하게 냈어요.'),
  c('BMT 핫마요', 'BMT', '15cm', '화이트', '슈레드치즈', spicyVeg, ['핫칠리', '마요네즈'], [], '단품', ['spicy'], '매운맛을 마요네즈가 살짝 눌러줘서 끝맛이 부드러워요.'),
  c('치킨 데리야끼 치폴레', '치킨 데리야끼', '15cm', '파마산오레가노', '아메리칸치즈', spicyVeg, ['치폴레사우스웨스트', '스위트어니언'], [], '단품', ['spicy'], '달콤한 치킨에 치폴레 매콤함을 더한 조합이에요.'),
  c('매콤 에그마요 랜치', '에그마요', '15cm', '플랫브레드', '슈레드치즈', spicyVeg, ['핫칠리', '랜치'], [], '단품', ['spicy'], '에그마요가 핫칠리의 매운맛을 부드럽게 잡아줘요.'),
  c('매콤 서브웨이 클럽', '서브웨이 클럽', '15cm', '파마산오레가노', '아메리칸치즈', spicyVeg, ['사우스웨스트', '핫칠리'], [], '단품', ['spicy'], '클럽의 담백함에 사우스웨스트와 핫칠리로 포인트를 줬어요.'),
  c('터키 아보카도 치폴레', '터키 베이컨 아보카도', '15cm', '허니오트', '아메리칸치즈', spicyVeg, ['치폴레사우스웨스트', '후추'], [], '단품', ['spicy'], '아보카도의 고소함에 치폴레 향이 잘 붙는 조합이에요.'),
  c('BMT 30cm 매운 세트', 'BMT', '30cm', '파마산오레가노', '아메리칸치즈', spicyVeg, ['사우스웨스트', '핫칠리'], [], '세트', ['spicy', 'hearty'], '매운맛도 양도 확실하게 가고 싶을 때 고르는 BMT예요.'),
  c('치킨 데리야끼 핫바비큐', '치킨 데리야끼', '30cm', '위트', '슈레드치즈', spicyVeg, ['핫칠리', '바비큐'], [], '세트', ['spicy', 'hearty'], '달콤짭짤한 치킨에 매운 바비큐 느낌을 더했어요.'),
  c('에그마요 30cm 핫칠리', '에그마요', '30cm', '화이트', '슈레드치즈', spicyVeg, ['스위트칠리', '핫칠리'], [], '단품', ['spicy'], '부드러운 에그마요를 매콤달콤하게 크게 즐기는 조합이에요.'),
  c('클럽 30cm 치폴레핫', '서브웨이 클럽', '30cm', '화이트', '슈레드치즈', spicyVeg, ['치폴레사우스웨스트', '핫칠리'], [], '단품', ['spicy', 'hearty'], '담백한 클럽을 매운 소스로 확실히 끌어올렸어요.'),

  c('BMT 베이컨 30cm 세트', 'BMT', '30cm', '하티', '아메리칸치즈', allVeg, ['랜치', '사우스웨스트'], ['베이컨'], '세트', ['hearty'], 'BMT에 베이컨과 세트까지 더해 든든함을 우선했어요.'),
  c('치킨 에그마요 30cm 세트', '치킨 데리야끼', '30cm', '파마산오레가노', '슈레드치즈', allVeg, ['스위트어니언', '바비큐'], ['에그마요 추가'], '세트', ['hearty', 'popular'], '치킨 데리야끼에 에그마요를 더한 인기형 든든 조합이에요.'),
  c('클럽 아보카도 30cm 세트', '서브웨이 클럽', '30cm', '화이트', '모차렐라치즈', allVeg, ['랜치', '바비큐'], ['아보카도 추가'], '세트', ['hearty'], '클럽에 아보카도와 세트를 붙여 한 끼 만족감을 높였어요.'),
  c('터키 베이컨 더블 세트', '터키 베이컨 아보카도', '30cm', '허니오트', '슈레드치즈', allVeg, ['스위트어니언', '랜치'], ['베이컨'], '세트', ['hearty'], '기본 베이컨에 한 번 더 짭짤한 포인트를 얹은 조합이에요.'),
  c('에그마요 베이컨 30cm', '에그마요', '30cm', '플랫브레드', '슈레드치즈', allVeg, ['랜치', '스위트칠리'], ['베이컨'], '세트', ['hearty', 'popular'], '에그마요와 베이컨은 크게 먹어도 맛이 흐트러지지 않아요.'),
  c('BMT 미트더블 세트', 'BMT', '15cm', '하티', '슈레드치즈', allVeg, ['바비큐', '랜치'], ['미트 더블'], '세트', ['hearty'], '15cm라도 미트 더블이면 점심 포만감이 확실해요.'),
  c('치킨 치즈추가 세트', '치킨 데리야끼', '15cm', '하티', '아메리칸치즈', allVeg, ['스위트어니언', '사우스웨스트'], ['치즈 추가'], '세트', ['hearty'], '치킨 데리야끼에 치즈를 더해 고소하고 묵직하게 만들었어요.'),
  c('클럽 베이컨 세트', '서브웨이 클럽', '15cm', '파마산오레가노', '모차렐라치즈', allVeg, ['허니머스타드', '바비큐'], ['베이컨'], '세트', ['hearty'], '클럽에 베이컨을 더하면 짭짤한 만족감이 좋아요.'),
  c('터키 아보카도 치즈 세트', '터키 베이컨 아보카도', '15cm', '위트', '모차렐라치즈', allVeg, ['올리브오일', '후추'], ['치즈 추가'], '세트', ['hearty'], '담백한 메뉴에 치즈만 보강해 부담 없는 든든함을 냈어요.'),
  c('에그마요 햄추가 세트', '에그마요', '15cm', '화이트', '아메리칸치즈', allVeg, ['마요네즈', '스위트칠리'], ['햄 추가'], '세트', ['hearty'], '에그마요에 햄을 더하면 부드러움과 짭짤함이 같이 와요.'),

  c('가성비 에그마요 위트', '에그마요', '15cm', '위트', null, lightVeg, ['머스타드'], [], '단품', ['cheap'], '추가 없이 에그마요 기본 맛만 챙기는 저가형 조합이에요.'),
  c('만원 안쪽 BMT 심플', 'BMT', '15cm', '위트', null, ['양상추', '양파', '피클'], ['사우스웨스트'], [], '단품', ['cheap'], '옵션을 줄이고 BMT 본맛과 사우스웨스트만 남겼어요.'),
  c('치킨 데리야끼 심플', '치킨 데리야끼', '15cm', '위트', null, ['양상추', '토마토', '양파'], ['스위트어니언'], [], '단품', ['cheap'], '추가 없이 달콤한 치킨 맛으로 가성비를 맞췄어요.'),
  c('클럽 머스타드 심플', '서브웨이 클럽', '15cm', '위트', null, ['양상추', '토마토', '양파', '오이'], ['머스타드'], [], '단품', ['cheap'], '클럽 기본 단백질에 머스타드만 더한 깔끔한 단품이에요.'),
  c('터키 아보카도 단품 컷', '터키 베이컨 아보카도', '15cm', '위트', null, lightVeg, ['후추', '올리브오일'], [], '단품', ['cheap', 'diet'], '추가 토핑 없이 기본 아보카도 메뉴를 담백하게 먹어요.'),
  c('화이트 에그마요 단품', '에그마요', '15cm', '화이트', '아메리칸치즈', ['양상추', '토마토', '양파'], ['마요네즈'], [], '단품', ['cheap'], '가볍게 먹는 에그마요 기본형, 선택할 게 적어 주문도 쉬워요.'),
  c('BMT 랜치 단품', 'BMT', '15cm', '화이트', '아메리칸치즈', ['양상추', '양파', '피클', '올리브'], ['랜치'], [], '단품', ['cheap'], '소스 하나만 골라 빠르게 주문하는 BMT 단품이에요.'),
  c('치킨 어니언 단품', '치킨 데리야끼', '15cm', '화이트', '아메리칸치즈', ['양상추', '피망', '양파'], ['스위트어니언'], [], '단품', ['cheap'], '치킨 데리야끼와 스위트어니언만으로 달콤함을 충분히 챙겨요.'),
  c('클럽 허니머스타드 단품', '서브웨이 클럽', '15cm', '화이트', '아메리칸치즈', ['양상추', '토마토', '오이'], ['허니머스타드'], [], '단품', ['cheap'], '클럽을 복잡한 추가 없이 달콤새콤하게 먹는 조합이에요.'),
  c('에그마요 30cm 나눔 단품', '에그마요', '30cm', '위트', null, ['양상추', '토마토', '양파', '피클'], ['머스타드'], [], '단품', ['cheap', 'hearty'], '둘이 나눠 먹는 기준이면 30cm 단품이 오히려 편해요.'),

  c('SNS식 BMT 에그베이컨', 'BMT', '15cm', '화이트', '아메리칸치즈', allVeg, ['바비큐', '스위트칠리'], ['에그마요 추가', '베이컨'], '단품', ['popular'], 'BMT에 에그마요와 베이컨을 더한 강한 인기형 조합이에요.'),
  c('치킨 데리야끼 에그마요', '치킨 데리야끼', '15cm', '파마산오레가노', '슈레드치즈', allVeg, ['랜치', '스위트어니언', '바비큐'], ['에그마요 추가'], '단품', ['popular'], '치킨 데리야끼에 에그마요를 더해 달콤고소하게 먹어요.'),
  c('터키 아보카도 오일후추', '터키 베이컨 아보카도', '15cm', '플랫브레드', '아메리칸치즈', allVeg, ['올리브오일', '후추'], [], '단품', ['popular', 'diet'], '아보카도 메뉴는 오일과 후추 조합을 찾는 사람이 많아요.'),
  c('에그마요 베이컨 치즈', '에그마요', '15cm', '위트', '아메리칸치즈', allVeg, ['스위트어니언', '스위트칠리', '허니머스타드'], ['베이컨', '치즈 추가'], '단품', ['popular'], '에그마요에 베이컨과 치즈를 얹어 확실히 고소하게 만들었어요.'),
  c('클럽 아보카도 인기형', '서브웨이 클럽', '15cm', '파마산오레가노', '아메리칸치즈', allVeg, ['랜치', '바비큐', '스위트어니언'], ['아보카도 추가'], '단품', ['popular'], '클럽에 아보카도와 인기 소스 3개를 묶은 풍성한 조합이에요.'),
];

function c(title, menu, variant, bread, cheese, vegetables, sauces, adds, set, tags, seedComment) {
  return { title, menu, variant, bread, cheese, vegetables, sauces, adds, set, tags, seedComment };
}

function loadEnv() {
  const envPath = path.join(appRoot, '.env.local');
  if (!existsSync(envPath)) throw new Error(`Missing env file: ${envPath}`);

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (!/^\s*[^#][^=]+=/.test(line)) continue;
    const [key, ...rest] = line.split('=');
    process.env[key.trim()] = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function signature(input) {
  const parts = input.options
    .map((option) =>
      `${option.actionType}:${option.optionGroupId.normalize('NFC')}:${option.optionItemId.normalize('NFC')}`
    )
    .sort()
    .join('|');
  const text = `${input.brandId.normalize('NFC')}:${input.menuVariantId.normalize('NFC')}:${parts}`;
  return createHash('sha256').update(text.normalize('NFC'), 'utf8').digest('hex');
}

function cardSummary(combo, selections) {
  const firstSauce = selections.filter((s) => s.group.name === '소스' && s.actionType !== 'exclude');
  const sauce = firstSauce.length > 1 ? `${firstSauce[0].item.name} 외 ${firstSauce.length - 1}` : firstSauce[0]?.item.name;
  return [combo.menu + ' ' + combo.variant, combo.bread, sauce].filter(Boolean).join(' · ').normalize('NFC');
}

function estimatedPrice(variant, selections) {
  return selections.reduce((sum, selection) => {
    if (selection.actionType === 'add' || selection.group.option_role === 'meta') {
      return sum + selection.item.price_delta;
    }
    return sum;
  }, variant.base_price);
}

function searchText(input) {
  return [
    input.combo.title,
    input.combo.seedComment,
    input.brand.name,
    input.combo.menu,
    input.combo.variant,
    ...input.selections.flatMap((selection) => [selection.group.name, selection.item.name]),
    ...input.tags.map((tag) => tag.label),
  ]
    .filter(Boolean)
    .join(' ')
    .normalize('NFC');
}

function key(...parts) {
  return parts.join('|');
}

async function loadCatalog(supabase) {
  const [
    { data: brands, error: brandsError },
    { data: menus, error: menusError },
    { data: variants, error: variantsError },
    { data: groups, error: groupsError },
    { data: items, error: itemsError },
    { data: tags, error: tagsError },
    { data: existing, error: existingError },
  ] = await Promise.all([
    supabase.from('brands').select('id, name, slug').eq('slug', 'subway').limit(1),
    supabase.from('menus').select('id, brand_id, name').eq('status', 'active'),
    supabase.from('menu_variants').select('id, menu_id, name, base_price'),
    supabase.from('option_groups').select('id, name, option_role, selection_mode, min_select, max_select, is_required, sort_order'),
    supabase.from('option_items').select('id, option_group_id, name, price_delta, sort_order').eq('is_available', true),
    supabase.from('tags').select('id, slug, label'),
    supabase.from('combos').select('id, title, combo_signature'),
  ]);

  for (const error of [brandsError, menusError, variantsError, groupsError, itemsError, tagsError, existingError]) {
    if (error) throw new Error(error.message);
  }

  const brand = brands?.[0];
  if (!brand) throw new Error('subway brand not found');

  const menuByName = new Map(menus.map((menu) => [menu.name, menu]));
  const menuById = new Map(menus.map((menu) => [menu.id, menu]));
  const variantByKey = new Map(
    variants
      .map((variant) => [key(menuById.get(variant.menu_id)?.name, variant.name), variant])
      .filter(([variantKey]) => !variantKey.startsWith('undefined|'))
  );
  const groupByName = new Map(groups.map((group) => [group.name, group]));
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const itemByKey = new Map(
    items.map((item) => [key(groupById.get(item.option_group_id)?.name, item.name), item])
  );
  const tagBySlug = new Map(tags.map((tag) => [tag.slug, tag]));
  const existingSignatures = new Set(existing.map((combo) => combo.combo_signature).filter(Boolean));
  const existingTitles = new Set(existing.map((combo) => combo.title));

  return {
    brand,
    menuByName,
    variantByKey,
    groupByName,
    itemByKey,
    tagBySlug,
    existingSignatures,
    existingTitles,
  };
}

function normalizeCombo(combo, catalog) {
  const menu = catalog.menuByName.get(combo.menu);
  if (!menu) throw new Error(`Unknown menu: ${combo.menu}`);

  const variant = catalog.variantByKey.get(key(combo.menu, combo.variant));
  if (!variant) throw new Error(`Unknown variant: ${combo.menu} ${combo.variant}`);

  const selected = [
    ['빵 종류', combo.bread, 'select'],
    ...(combo.cheese ? [['치즈', combo.cheese, 'select']] : []),
    ...combo.vegetables.map((item) => ['야채', item, 'select']),
    ...combo.sauces.map((item) => ['소스', item, 'select']),
    ...combo.adds.map((item) => ['추가 토핑', item, 'add']),
    ['세트여부', combo.set, 'select'],
  ];

  const selections = selected.map(([groupName, itemName, actionType]) => {
    const group = catalog.groupByName.get(groupName);
    const item = catalog.itemByKey.get(key(groupName, itemName));
    if (!group || !item) throw new Error(`Unknown option: ${groupName} / ${itemName}`);
    return { group, item, actionType };
  });

  const countByGroup = new Map();
  for (const selection of selections) {
    countByGroup.set(selection.group.name, (countByGroup.get(selection.group.name) ?? 0) + 1);
  }
  for (const group of catalog.groupByName.values()) {
    const count = countByGroup.get(group.name) ?? 0;
    if (group.is_required && count < group.min_select) {
      throw new Error(`${combo.title}: ${group.name} is required`);
    }
    if (count > group.max_select) {
      throw new Error(`${combo.title}: ${group.name} max ${group.max_select}, got ${count}`);
    }
  }

  const tags = combo.tags.map((slug) => {
    const tag = catalog.tagBySlug.get(slug);
    if (!tag) throw new Error(`Unknown tag: ${slug}`);
    return tag;
  });

  const signatureOptions = selections.map((selection) => ({
    actionType: selection.actionType,
    optionGroupId: selection.group.id,
    optionItemId: selection.item.id,
  }));
  const comboSignature = signature({
    brandId: catalog.brand.id,
    menuVariantId: variant.id,
    options: signatureOptions,
  });

  return {
    combo,
    menu,
    variant,
    tags,
    selections,
    signatureOptions,
    comboSignature,
    comboInsert: {
      id: randomUUID(),
      brand_id: catalog.brand.id,
      primary_menu_id: menu.id,
      menu_variant_id: variant.id,
      creator_id: null,
      title: combo.title.normalize('NFC'),
      seed_comment: combo.seedComment.normalize('NFC'),
      card_summary: cardSummary(combo, selections),
      combo_signature: comboSignature,
      estimated_price: estimatedPrice(variant, selections),
      price_status: 'approx',
      search_text: searchText({ combo, brand: catalog.brand, selections, tags }),
      status: 'published',
      published_at: new Date().toISOString(),
    },
  };
}

async function insertCombo(supabase, normalized) {
  const comboOptions = normalized.selections.map((selection, index) => ({
    combo_id: normalized.comboInsert.id,
    option_group_id: selection.group.id,
    option_item_id: selection.item.id,
    action_type: selection.actionType,
    group_name_snapshot: selection.group.name,
    option_name_snapshot: selection.item.name,
    price_delta_snapshot: selection.item.price_delta,
    quantity: 1,
    sort_order: index + 1,
  }));
  const comboTags = normalized.tags.map((tag) => ({
    combo_id: normalized.comboInsert.id,
    tag_id: tag.id,
  }));

  const { error: comboError } = await supabase.from('combos').insert(normalized.comboInsert);
  if (comboError) throw new Error(comboError.message);

  try {
    const { error: optionsError } = await supabase.from('combo_options').insert(comboOptions);
    if (optionsError) throw new Error(optionsError.message);

    const { error: tagsError } = await supabase.from('combo_tags').insert(comboTags);
    if (tagsError) throw new Error(tagsError.message);
  } catch (error) {
    await supabase.from('combos').delete().eq('id', normalized.comboInsert.id);
    throw error;
  }
}

async function main() {
  loadEnv();

  const supabase = createClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const catalog = await loadCatalog(supabase);
  const normalized = combos.map((combo) => normalizeCombo(combo, catalog));

  const seedSignatures = new Set();
  const duplicateInSeed = normalized.find((entry) => {
    if (seedSignatures.has(entry.comboSignature)) return true;
    seedSignatures.add(entry.comboSignature);
    return false;
  });
  if (duplicateInSeed) {
    throw new Error(`Duplicate seed signature in file: ${duplicateInSeed.combo.title}`);
  }

  let inserted = 0;
  let skipped = 0;
  for (const entry of normalized) {
    if (
      catalog.existingSignatures.has(entry.comboSignature) ||
      catalog.existingTitles.has(entry.combo.title)
    ) {
      skipped += 1;
      continue;
    }
    if (!dryRun) await insertCombo(supabase, entry);
    inserted += 1;
  }

  console.log(`source notes: ${sourceNotes.length}`);
  console.log(`validated seed rows: ${normalized.length}`);
  console.log(`${dryRun ? 'would insert' : 'inserted'}: ${inserted}`);
  console.log(`skipped existing: ${skipped}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
