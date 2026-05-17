import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMenuChanges,
  buildOptionChanges,
  buildSelectorErrors,
  parseFreshOptions,
  parseSandwichMenus,
} from './crawl-subway-catalog.mjs';

const BRAND = {
  id: '00000000-0000-0000-0000-000000000001',
  slug: 'subway',
};

test('parseSandwichMenus extracts official menu rows and ignores topping rows', () => {
  const menus = parseSandwichMenus(
    `
    <ul>
      <li class="ITEM_SANDWICH.NEW">
        <strong class="tit">오이 샌드위치</strong>
        <span class="eng">Cucumber</span>
        <div class="summary"><p>화이트 브레드에<br />오이 &amp; 랜치</p></div>
        <a href="#" data-category="sandwich" data-menuitemidx="1578"></a>
      </li>
      <li class="ITEM_SANDWICH.TOPPING">
        <strong class="tit">페퍼로니</strong>
        <span class="eng">Pepperoni</span>
        <a href="#" data-menuitemidx="1389"></a>
      </li>
      <li class="ITEM_SANDWICH.CLASSIC">
        <strong class="tit">에그마요</strong>
        <span class="eng">Egg Mayo</span>
        <div class="summary"><p>부드러운 에그마요</p></div>
        <a href="#" data-category="sandwich" data-menuitemidx="1530"></a>
      </li>
      <li class="ITEM_SANDWICH.NEW">
        <strong class="tit">오이 샌드위치 중복</strong>
        <span class="eng">Cucumber Duplicate</span>
        <a href="#" data-menuitemidx="1578"></a>
      </li>
    </ul>
    `,
    'https://www.subway.co.kr/menuList/sandwich'
  );

  assert.equal(menus.length, 2);
  assert.deepEqual(
    menus.map((menu) => menu.externalId),
    ['1578', '1530']
  );
  assert.equal(menus[0].name, '오이 샌드위치');
  assert.equal(menus[0].slug, 'cucumber');
  assert.equal(menus[0].summary, '화이트 브레드에 오이 & 랜치');
  assert.equal(
    menus[0].sourceUrl,
    'https://www.subway.co.kr/menuView/sandwich?menuItemIdx=1578'
  );
});

test('parseFreshOptions extracts visible ingredient rows and strips comments', () => {
  const options = parseFreshOptions(`
    <ul>
      <li class="bread">
        <div class="img"><img alt="화이트" src="../images/menu/img_recipe_b05.jpg" /></div>
        <strong class="tit">화이트</strong>
        <span class="eng">White</span>
        <span class="cal">195 kcal</span>
        <div class="summary"><p>부드러운 식감</p></div>
      </li>
      <li class="vegetable">
        <strong class="tit">양상추</strong>
        <span class="eng">Lettuce</span>
        <span class="cal">2.9 kcal</span>
      </li>
      <li class="cheese">
        <strong class="tit">아메리칸 치즈</strong>
        <span class="eng">American Cheese</span>
      </li>
      <!--
      <li class="sauce">
        <strong class="tit">와사비 마요</strong>
        <span class="eng">Wasabi Mayo</span>
      </li>
      -->
      <li class="sauce">
        <strong class="tit">랜치</strong>
        <span class="eng">Ranch</span>
        <span class="cal">116 kcal</span>
      </li>
    </ul>
  `);

  assert.equal(options.length, 4);
  assert.deepEqual(
    options.map((option) => option.groupName),
    ['빵 종류', '야채', '치즈', '소스']
  );
  assert.equal(options[0].externalId, 'bread:white');
  assert.equal(options[0].summary, '부드러운 식감');
  assert.equal(
    options.some((option) => option.name === '와사비 마요'),
    false
  );
});

test('buildSelectorErrors creates non-approvable failure changes for bad selector counts', () => {
  const errors = buildSelectorErrors({
    brandId: BRAND.id,
    fetchedMenus: [{ externalId: '1578' }],
    fetchedOptions: [],
    menuUrl: 'https://www.subway.co.kr/menuList/sandwich',
    freshUrl: 'https://www.subway.co.kr/freshInfo',
    menuMinCount: 2,
    freshMinCount: 1,
  });

  assert.equal(errors.length, 2);
  assert.deepEqual(
    errors.map((error) => `${error.targetType}:${error.changeType}`),
    ['menu:selector_error', 'option_item:selector_error']
  );
  assert.equal(errors[0].afterData.expected_min_count, 2);
});

test('buildMenuChanges updates matched menus and keeps missing disabled by default', () => {
  const fetchedMenus = [
    {
      externalId: '1530',
      name: '에그마요',
      slug: 'egg-mayo',
      categoryKind: 'sandwich',
      status: 'active',
      sourceUrl: 'https://www.subway.co.kr/menuView/sandwich?menuItemIdx=1530',
    },
  ];
  const existingMenus = [
    {
      id: '10000000-0000-0000-0000-000000000005',
      brand_id: BRAND.id,
      external_id: '5',
      name: '에그마요',
      slug: 'egg-mayo',
      category_kind: 'sandwich',
      status: 'active',
      source_url: 'https://www.subway.co.kr/menuView/sandwich?menuItemIdx=5',
    },
    {
      id: '10000000-0000-0000-0000-000000000999',
      brand_id: BRAND.id,
      external_id: '999',
      name: '테스트 샌드위치',
      slug: 'test',
      category_kind: 'sandwich',
      status: 'active',
      source_url: null,
    },
  ];

  const defaultChanges = buildMenuChanges({
    brand: BRAND,
    fetchedMenus,
    existingMenus,
    includeMissing: false,
  });

  assert.equal(defaultChanges.length, 1);
  assert.equal(defaultChanges[0].changeType, 'updated');
  assert.equal(
    defaultChanges.some((change) => change.changeType === 'missing'),
    false
  );

  const missingChanges = buildMenuChanges({
    brand: BRAND,
    fetchedMenus,
    existingMenus,
    includeMissing: true,
  });

  assert.equal(missingChanges.length, 2);
  assert.equal(missingChanges[1].changeType, 'missing');
});

test('buildOptionChanges preserves existing price data and emits group selector errors', () => {
  const optionGroups = [
    {
      id: '30000000-0000-0000-0000-000000000001',
      brand_id: BRAND.id,
      name: '빵 종류',
    },
  ];
  const optionItems = [
    {
      id: '580ea228-7101-420f-8fb9-dcae6e5636a0',
      option_group_id: optionGroups[0].id,
      external_id: null,
      name: '화이트',
      alias_names: ['화이트브레드'],
      price_delta: 0,
      is_available: true,
      sort_order: 60,
    },
  ];

  const changes = buildOptionChanges({
    brand: BRAND,
    fetchedOptions: [
      {
        groupKey: 'bread',
        groupName: '빵 종류',
        externalId: 'bread:white',
        name: '화이트',
        englishName: 'White',
      },
      {
        groupKey: 'sauce',
        groupName: '소스',
        externalId: 'sauce:ranch',
        name: '랜치',
        englishName: 'Ranch',
      },
    ],
    optionGroups,
    optionItems,
    includeMissing: false,
  });

  assert.equal(changes.length, 2);
  assert.equal(changes[0].changeType, 'updated');
  assert.equal(changes[0].afterData.price_delta, 0);
  assert.deepEqual(changes[0].afterData.alias_names, ['화이트브레드']);
  assert.equal(changes[1].targetType, 'option_group');
  assert.equal(changes[1].changeType, 'selector_error');
});
