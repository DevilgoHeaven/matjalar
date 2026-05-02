/**
 * ESLint custom rule: no-img
 *
 * PRD §11 "v1 은 이미지 없이 텍스트/이모지/브랜드 컬러" 강제.
 * - <img> JSX 태그 금지
 * - import('next/image') 금지
 * - JSX style prop 또는 CSS-in-JS 객체 안의 background-image: url('http...') 금지
 *
 * C-3 review fix: 이전 버전은 모든 Literal 노드를 검사해 metadata URL, og:image,
 * Next.js images.remotePatterns 등 합법적 https:// 문자열에 false positive 발생.
 * 이번 fix: JSX 'style' attribute 안의 ObjectExpression 또는 CSS 속성 컨텍스트로만 제한.
 *
 * 허용: SVG 컴포넌트, 이모지 텍스트, 데이터 URL.
 * 우회 필요(manifest icon 등): eslint-disable-next-line 명시.
 */

'use strict';

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'PRD §11: v1 카드/컴포넌트에 외부 이미지 사용 금지. <img>, next/image, 인라인 background-image url(http...) 차단.',
    },
    schema: [],
    messages: {
      noImg:
        '<img> 태그 사용 금지 (PRD §11 / R-14). 카테고리 이모지 또는 SVG 컴포넌트를 사용하세요.',
      noNextImage:
        "next/image import 금지 (PRD §11 / R-14). v1 은 이미지 없이 텍스트·이모지·브랜드 컬러로 차별화.",
      noBgUrl:
        "외부 이미지 background-image url() 금지 (PRD §11 / R-14). 데이터 URL 또는 SVG 만 허용.",
    },
  },

  create(context) {
    // CSS 속성 키 후보 — backgroundImage / 'background-image'
    const BG_PROPS = new Set(['backgroundImage', 'background', 'background-image']);

    /**
     * 주어진 노드가 JSX style attribute 의 ObjectExpression 안인지 판별.
     * style={{ backgroundImage: 'url(http://...)' }} 패턴만 검사하기 위함.
     */
    function isInsideJsxStyleAttr(node) {
      let parent = node.parent;
      while (parent) {
        if (
          parent.type === 'JSXAttribute' &&
          parent.name &&
          parent.name.name === 'style'
        ) {
          return true;
        }
        parent = parent.parent;
      }
      return false;
    }

    return {
      // 1) <img> JSX 태그 차단
      JSXOpeningElement(node) {
        if (node.name && node.name.name === 'img') {
          context.report({ node, messageId: 'noImg' });
        }
      },

      // 2) import 'next/image' 차단
      ImportDeclaration(node) {
        if (node.source && node.source.value === 'next/image') {
          context.report({ node, messageId: 'noNextImage' });
        }
      },

      // 3) JSX style prop 안의 ObjectExpression 에서 backgroundImage: url(http...) 차단
      Property(node) {
        // CSS-in-JS 컨텍스트 (JSX style attribute) 내부만 검사 — false positive 회피
        if (!isInsideJsxStyleAttr(node)) return;

        const key = node.key;
        const keyName =
          key && (key.type === 'Identifier' ? key.name : key.value);
        if (!BG_PROPS.has(keyName)) return;

        const value = node.value;
        if (value && value.type === 'Literal' && typeof value.value === 'string') {
          if (/url\(\s*['"]?https?:\/\//i.test(value.value)) {
            context.report({ node: value, messageId: 'noBgUrl' });
          }
        }
      },
    };
  },
};
