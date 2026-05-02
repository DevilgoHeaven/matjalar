# ADR-04 — 출처 인덱스 (검증된 공식 문서 / CVE / 2026 커뮤니티)

> 작성일: 2026-05-02 / 출처: plan §14
> 본 문서는 plan의 핵심 결정 근거가 된 출처를 한곳에 정리한다.
> 새 결정 시 출처를 추가하고, 결정 변경 시 supersede 처리.

---

## 보안

- [CVE-2025-29927 NVD](https://nvd.nist.gov/vuln/detail/CVE-2025-29927) — Next.js middleware bypass, CVSS 9.1
- [Vercel Postmortem on CVE-2025-29927](https://nextjs.org/blog/cve-2025-29927) — 공식 패치 안내, 15.2.3+
- [Datadog Security Labs: CVE-2025-29927 분석](https://securitylabs.datadoghq.com/articles/nextjs-middleware-auth-bypass/)

## Supabase 공식 문서

- [Use Supabase with Next.js — 공식](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Setting up Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [PGroonga: Multilingual Full Text Search 공식](https://supabase.com/docs/guides/database/extensions/pgroonga)
- [Supabase Auth Hooks (Custom Access Token Hook)](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook)
- [RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Supabase Service Role 사용 토론](https://github.com/orgs/supabase/discussions/30739)
- [PGroonga 4.0.6 release (2026-04-07)](https://pgroonga.github.io/) — 한국어 형태소 지원 확정

## Next.js / 모노레포

- [Turborepo Next.js 공식 가이드](https://turborepo.dev/docs/guides/frameworks/nextjs)
- [Step-by-Step 2026 Monorepo with Turborepo 2.0 + pnpm + Next.js 15](https://johal.in/step-by-step-set-2026-monorepo-turborepo-20-pnpm-815-stepbystep/)
- [Monorepo Tools 2026 비교](https://viadreams.cc/en/blog/monorepo-tools-2026/)
- [TypeScript Monorepo 2026](https://hsb.horse/en/blog/typescript-monorepo-best-practice-2026/)
- [Serwist + Next.js offline 통합 사례](https://dev.to/sukechris/building-offline-apps-with-nextjs-and-serwist-2cbj)
- [Lefthook vs Husky 성능 비교](https://dev.to/quave/lefthook-benefits-vs-husky-and-how-to-use-30je)
- [Supabase Types in Turborepo](https://philipp.steinroetter.com/posts/supabase-turborepo)

## 한국어 / Unicode

- [Unicode Normalization (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize) — NFC vs NFD
- [Supabase pg_trgm 한국어 한계 토론 (PGroonga vs pg_trgm)](https://pgroonga.github.io/reference/pgroonga-versus-textsearch-and-pg-trgm.html)

## 추가 참조 (참여 에이전트가 발견)

- [Auth.js Supabase Adapter](https://authjs.dev/getting-started/adapters/supabase) — 비교 검토 대상(미채택)
- [Next.js Server Actions Best Practices (공식)](https://nextjs.org/docs/app/guides/authentication)

---

**갱신 정책**: plan 또는 코드에서 새 출처를 인용할 때 본 문서에 추가. 출처가 노후화/이동·삭제 시 archive.org 링크로 대체.
