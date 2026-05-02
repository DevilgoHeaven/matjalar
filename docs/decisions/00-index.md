# 의사결정 문서 인덱스 (Architecture Decision Records)

> 본 디렉터리는 맛잘알 v1 구현의 **모든 핵심 결정사항**을 기록한다.
> 결정이 변경되면 새 ADR을 추가(이전 결정을 superseded로 표시)하지, 기존 ADR을 수정하지 않는다.
> 원본 plan 파일: `C:\Users\imtpr\.claude\plans\prd-md-inherited-muffin.md`
> PRD 원본: `C:\workspace\맛잘알\PRD.md`

## 파일 구성

| 파일 | 내용 |
|---|---|
| `01-interview-log.md` | 12개 영역 인터뷰 결정 로그(사용자 답변·이유·트레이드오프) |
| `02-risk-mitigation.md` | 위험·완화 매트릭스 (R-01 ~ R-21) |
| `03-event-naming.md` | events 테이블 type enum + KPI 매핑표 |
| `04-references.md` | 검증된 공식 문서 / CVE / 2026 커뮤니티 자료 출처 인덱스 |
| `05-coding-conventions.md` | 코딩 컨벤션 — 한글 주석 정책, 모듈화 원칙, 네이밍 |

## 결정 변경 절차

1. 새 ADR 파일을 추가(예: `06-search-engine-change.md`)
2. 영향 받는 기존 ADR 상단에 `> Superseded by 06-search-engine-change.md (날짜)` 라인 추가
3. plan 파일과 코드의 관련 부분 동시 갱신
4. PR 제목에 `[ADR-06]` 등 prefix 명시
