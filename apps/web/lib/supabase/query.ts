/**
 * Supabase 쿼리 빌더 경량 타입 보정.
 *
 * 현재 생성된 Database 타입과 설치된 supabase-js 타입 조합이 select 결과를
 * `never` 로 좁히는 경우가 있어, 호출부에서 명시한 Row 타입을 보존한다.
 */
export interface SupabaseQueryResult<T> {
  data: T;
  error: { message: string } | null;
}

export interface SupabaseQuery<T> extends PromiseLike<SupabaseQueryResult<T>> {
  eq(column: string, value: unknown): SupabaseQuery<T>;
  ilike(column: string, pattern: string): SupabaseQuery<T>;
  in(column: string, values: readonly unknown[]): SupabaseQuery<T>;
  order(
    column: string,
    options?: { ascending?: boolean; referencedTable?: string; foreignTable?: string }
  ): SupabaseQuery<T>;
  limit(
    count: number,
    options?: { referencedTable?: string; foreignTable?: string }
  ): SupabaseQuery<T>;
  maybeSingle(): Promise<
    SupabaseQueryResult<T extends readonly (infer Item)[] ? Item | null : T | null>
  >;
  single(): Promise<
    SupabaseQueryResult<T extends readonly (infer Item)[] ? Item : T>
  >;
}

export interface SupabaseQueryTable {
  select<T>(columns: string): SupabaseQuery<T[]>;
  insert(values: unknown): SupabaseQuery<unknown>;
  update(values: unknown): SupabaseQuery<unknown>;
  delete(): SupabaseQuery<unknown>;
}

export interface SupabaseQueryClient {
  from(table: string): SupabaseQueryTable;
  rpc<T>(fn: string, args?: unknown): Promise<SupabaseQueryResult<T>>;
}

export function asSupabaseQueryClient(client: unknown): SupabaseQueryClient {
  return client as SupabaseQueryClient;
}
