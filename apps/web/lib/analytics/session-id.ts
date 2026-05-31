/**
 * 세션 ID 생성·조회 (events 테이블 session_id 컬럼용)
 * - 클라이언트 cookie 'mzr_sid' 에 UUID v4
 * - 만료 30 일, SameSite=Lax, Secure(production)
 * - HttpOnly 아님 (클라이언트 JS 가 갱신 가능)
 * - SSR 안전 (typeof window 가드)
 */
const COOKIE_NAME = 'mzr_sid';
const MAX_AGE_DAYS = 30;

/** document.cookie 에서 특정 이름의 값을 읽는 헬퍼 (SSR 가드 포함) */
function readCookie(name: string): string | null {
  // 헬퍼 단독 호출 시에도 SSR 안전하도록 모듈 단위 가드 (C-4 review)
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  const pairs = document.cookie.split(';');
  for (const pair of pairs) {
    const trimmed = pair.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

/** document.cookie 에 값을 쓰는 헬퍼 (SSR 가드 포함) */
function writeCookie(name: string, value: string, maxAgeDays: number): void {
  if (typeof document === 'undefined' || typeof location === 'undefined') return;
  const maxAgeSeconds = maxAgeDays * 24 * 60 * 60;
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie =
    `${name}=${encodeURIComponent(value)}` +
    `; Max-Age=${maxAgeSeconds}` +
    `; SameSite=Lax` +
    `; Path=/` +
    secure;
}

/**
 * 현재 세션 ID를 반환한다.
 * - 기존 쿠키가 있으면 그 값을 재사용 (만료 갱신 없음 — 자연 소멸 방식)
 * - 없으면 crypto.randomUUID() 로 새로 생성 후 쿠키에 저장
 * - SSR 환경(window 없음)에서는 빈 문자열 반환
 */
export function getOrCreateSessionId(): string {
  // SSR 안전 가드
  if (typeof window === 'undefined') return '';

  const existing = readCookie(COOKIE_NAME);
  if (existing) return existing;

  // crypto.randomUUID() — 최신 브라우저 및 Node 18+ 지원
  const newId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : // 폴백: Math.random 기반 UUID v4 (구형 환경 대비)
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });

  writeCookie(COOKIE_NAME, newId, MAX_AGE_DAYS);
  return newId;
}
