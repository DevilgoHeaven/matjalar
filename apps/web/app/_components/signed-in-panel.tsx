/**
 * 임시 검증용 로그인 후 패널 — / 페이지에 노출.
 *
 * 표시 내용:
 *  - auth.users.email + provider
 *  - app_users (handle_new_user trigger 자동 생성 결과) nickname/role/avatar_url
 *  - JWT is_admin claim (Custom Access Token Hook 동작 검증)
 *  - 로그아웃 버튼 (Server Action)
 *
 * 검증 통과 조건:
 *  ✓ appUser 가 null 이 아님 (trigger 동작)
 *  ✓ appUser.role === 'user' (기본값)
 *  ✓ isAdminClaim === 'false' (Hook 동작, role=user 라 false)
 *  ✓ appUser.nickname 이 카카오/구글 raw_user_meta_data 에서 추출됨
 */

import { SignOutButton } from './sign-out-button';

interface Props {
  email: string;
  provider: string;
  appUser: { nickname: string; role: string; avatar_url: string | null } | null;
  isAdminClaim: string | null;
}

export function SignedInPanel({ email, provider, appUser, isAdminClaim }: Props) {
  return (
    <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
      <p className="text-sm font-semibold text-green-700">로그인 됨 ✓</p>

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-gray-500">email</dt>
        <dd className="text-gray-900">{email}</dd>

        <dt className="text-gray-500">provider</dt>
        <dd className="text-gray-900">{provider}</dd>

        <dt className="text-gray-500">app_users.nickname</dt>
        <dd className="text-gray-900">{appUser?.nickname ?? '⚠️ trigger 미동작'}</dd>

        <dt className="text-gray-500">app_users.role</dt>
        <dd className="text-gray-900">{appUser?.role ?? '?'}</dd>

        <dt className="text-gray-500">avatar_url</dt>
        <dd className="break-all text-gray-900">{appUser?.avatar_url ?? '(없음)'}</dd>

        <dt className="text-gray-500">JWT is_admin claim</dt>
        <dd className="text-gray-900">
          {isAdminClaim === null ? '⚠️ Hook 미동작' : isAdminClaim}
        </dd>
      </dl>

      <div className="mt-4">
        <SignOutButton />
      </div>
    </div>
  );
}
