import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL_EFFECTIVE_DATE, getLegalSiteInfo } from '@/lib/legal/site-info';

export const metadata: Metadata = {
  title: '개인정보 처리방침 - 맛잘알',
};

export default function PrivacyPage() {
  const info = getLegalSiteInfo();

  return (
    <main className="min-h-dvh bg-[#FAFAFA] px-5 py-10 text-action">
      <article className="mx-auto max-w-3xl">
        <header className="border-b border-stone-200 pb-6">
          <Link
            href="/"
            className="text-sm font-bold text-stone-500 underline-offset-4 hover:underline"
          >
            맛잘알
          </Link>
          <p className="mt-5 text-xs font-bold text-stone-500">개인정보 보호</p>
          <h1 className="mt-2 text-3xl font-black tracking-normal">
            개인정보 처리방침
          </h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            {info.serviceName}이 어떤 개인정보를 어떤 목적으로 처리하는지
            설명합니다.
          </p>
        </header>

        <section className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
          이 문서는 2025.4 개인정보 처리방침 작성지침을 참고한 출시 전
          초안입니다. 실제 공개 전 수집 항목, 보유 기간, 책임자 정보를 운영
          환경과 일치시키고 법률 검토를 완료해야 합니다.
        </section>

        <PrivacySection title="1. 개인정보의 처리 목적">
          <p>{info.serviceName}은 다음 목적을 위해 개인정보를 처리합니다.</p>
          <ul>
            <li>회원 가입 및 로그인 상태 유지</li>
            <li>조합 등록, 따봉, 찜, 후기, 신고 등 회원 기능 제공</li>
            <li>부정 이용 방지, 신고 처리, 계정 정지 등 서비스 안전성 확보</li>
            <li>서비스 이용 통계, 오류 분석, 품질 개선</li>
          </ul>
        </PrivacySection>

        <PrivacySection title="2. 처리하는 개인정보 항목">
          <p className="text-xs text-stone-500">
            개인정보 보호법 제15조 1항에 따라 처리 목적·항목·보유기간을 함께 고지합니다.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-xs text-stone-500">
                  <th className="py-2 pr-3">구분</th>
                  <th className="py-2 pr-3">항목</th>
                  <th className="py-2 pr-3">처리 목적</th>
                  <th className="py-2 pr-3">보유 기간</th>
                </tr>
              </thead>
              <tbody className="[&_tr]:border-b [&_tr]:border-stone-100">
                <tr>
                  <td className="py-3 pr-3 font-bold">OAuth 로그인</td>
                  <td className="py-3 pr-3">
                    <span className="font-bold">(필수)</span> OAuth 제공자 식별자(UID), 닉네임
                    <br />
                    <span className="font-bold">(선택)</span> 이메일, 프로필 이미지 URL
                  </td>
                  <td className="py-3 pr-3">회원 식별, 프로필 표시, 운영 공지</td>
                  <td className="py-3 pr-3">회원 탈퇴 시까지 (탈퇴 후 즉시 파기)</td>
                </tr>
                <tr>
                  <td className="py-3 pr-3 font-bold">회원 활동</td>
                  <td className="py-3 pr-3">조합, 후기, 평점, 따봉, 찜, 신고 사유</td>
                  <td className="py-3 pr-3">서비스 기능 제공, 신고·관리 처리</td>
                  <td className="py-3 pr-3">서비스 운영 기간 (탈퇴 후 익명화 또는 파기)</td>
                </tr>
                <tr>
                  <td className="py-3 pr-3 font-bold">이용 기록</td>
                  <td className="py-3 pr-3">페이지 경로, 이벤트 종류, 세션 식별자, 오류 정보</td>
                  <td className="py-3 pr-3">통계, 오류 분석, 악용 방지</td>
                  <td className="py-3 pr-3">최대 1년 (집계 후 원본 파기)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded-lg border border-stone-200 bg-white p-4 text-xs leading-6 text-stone-600">
            <p className="font-bold text-action">선택 항목 동의 거부권</p>
            <p className="mt-1">
              이용자는 카카오 로그인 시 이메일·프로필 이미지에 대한 동의를 거부할 수
              있습니다. 필수 항목(OAuth UID, 닉네임) 동의 거부 시 회원 가입이
              제한되며, 이메일 거부 시 운영 공지·문의 회신·계정 복구가 제한될 수
              있습니다.
            </p>
          </div>
        </PrivacySection>

        <PrivacySection title="3. 개인정보의 보유 및 이용 기간">
          <ul>
            <li>회원 정보: 회원 탈퇴 또는 계정 삭제 처리 시까지</li>
            <li>조합·후기 등 회원 작성 콘텐츠: 서비스 운영상 필요한 기간 동안 보관</li>
            <li>신고 및 운영 처리 기록: 분쟁 대응과 서비스 안전성 확보를 위해 필요한 기간</li>
            <li>법령상 보존 의무가 있는 경우 해당 기간 동안 보관</li>
          </ul>
        </PrivacySection>

        <PrivacySection title="4. 개인정보의 제3자 제공">
          <p>
            {info.serviceName}은 이용자의 개인정보를 법령상 근거가 있거나
            이용자의 동의가 있는 경우를 제외하고 제3자에게 제공하지 않습니다.
          </p>
        </PrivacySection>

        <PrivacySection title="5. 개인정보 처리 위탁 및 외부 서비스">
          <p>서비스 제공을 위해 다음 외부 서비스를 사용할 수 있습니다.</p>
          <ul>
            <li>Supabase (Supabase Inc.): 인증, 데이터베이스, 세션 관리</li>
            <li>Vercel (Vercel Inc.) 또는 동등한 호스팅 서비스: 웹 서비스 배포와 운영</li>
            <li>
              카카오 (㈜카카오): OAuth 로그인 인증. 위탁 항목: OAuth UID, 닉네임,
              프로필 이미지 URL, 이메일. 이용자가 카카오 로그인 버튼을 누른
              시점에 이용자 본인이 직접 카카오에 제공한 정보를 본 서비스가 인증
              토큰으로 수신합니다.
            </li>
            <li>구글 (Google LLC): OAuth 로그인 인증. 위탁 항목 동일.</li>
            <li>Discord webhook: 운영 알림 전송, 설정된 경우에 한함</li>
          </ul>
        </PrivacySection>

        <PrivacySection title="6. 개인정보의 파기">
          <p>
            처리 목적이 달성되거나 보유 기간이 종료된 개인정보는 지체 없이
            파기합니다. 전자적 파일은 복구가 어렵도록 삭제하고, 출력물은 분쇄
            또는 이에 준하는 방식으로 파기합니다.
          </p>
        </PrivacySection>

        <PrivacySection title="7. 이용자와 법정대리인의 권리">
          <p>
            이용자는 개인정보 열람, 정정, 삭제, 처리정지 요청을 할 수 있습니다.
            요청은 {info.privacyOfficerEmail}로 접수할 수 있으며, 운영자는 관련
            법령에 따라 처리합니다.
          </p>
        </PrivacySection>

        <PrivacySection title="8. 안전성 확보 조치">
          <ul>
            <li>Supabase RLS 기반 접근 통제</li>
            <li>관리자 기능의 서버 전용 service role 사용과 클라이언트 번들 누출 검사</li>
            <li>계정 상태 기반 이용 제한과 관리자 권한 재검증</li>
            <li>오류·이벤트 기록을 통한 이상 징후 확인</li>
          </ul>
        </PrivacySection>

        <PrivacySection title="9. 개인정보 보호책임자">
          <dl className="grid gap-2 rounded-lg border border-stone-200 bg-white p-4">
            <div>
              <dt className="text-xs font-bold text-stone-500">책임자</dt>
              <dd className="mt-1 font-bold">{info.privacyOfficerName}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-stone-500">이메일</dt>
              <dd className="mt-1 font-bold">{info.privacyOfficerEmail}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-stone-500">운영자</dt>
              <dd className="mt-1 font-bold">{info.operatorName}</dd>
            </div>
          </dl>
        </PrivacySection>

        <PrivacySection title="10. 처리방침의 변경">
          <p>
            이 처리방침은 {LEGAL_EFFECTIVE_DATE}부터 적용됩니다. 내용 변경 시
            서비스 화면을 통해 변경 사항과 적용일을 안내합니다.
          </p>
        </PrivacySection>

        <section className="mt-10 border-t border-stone-200 pt-6 text-xs leading-6 text-stone-500">
          <h2 className="font-black text-stone-600">작성 참고 기준</h2>
          <p className="mt-2">
            개인정보보호위원회 개인정보 포털의 개인정보 처리방침 작성지침
            2025.4 자료와 현재 서비스의 실제 데이터 흐름을 기준으로 작성한
            운영 초안입니다.
          </p>
        </section>
      </article>
    </main>
  );
}

function PrivacySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 text-sm leading-7 text-stone-700">
      <h2 className="text-lg font-black text-action">{title}</h2>
      <div className="mt-3 space-y-2 [&_li]:ml-5 [&_li]:list-disc">{children}</div>
    </section>
  );
}
