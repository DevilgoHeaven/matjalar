/**
 * Supabase 자동 생성 타입 placeholder
 *
 * 실제 내용은 M1 에서 다음 명령으로 자동 생성:
 *   pnpm db:types
 *   = supabase gen types typescript --linked > packages/db/src/types/database.ts
 *
 * 이 파일은 git 에 commit 됨 (사용자 환경에서 동일 타입 보장).
 * 마이그레이션 변경 시 lefthook pre-commit 이 자동 갱신.
 */

export type Database = {
  // M1 에서 자동 생성됨
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
