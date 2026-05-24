import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL_EFFECTIVE_DATE, getLegalSiteInfo } from '@/lib/legal/site-info';

export const metadata: Metadata = {
  title: '이용약관 - 맛잘알',
};

export default function TermsPage() {
  const info = getLegalSiteInfo();

  return (
    <main className="min-h-dvh bg-[#FAFAFA] px-5 py-10 text-action">
      <article className="mx-auto max-w-3xl">
        <LegalHeader
          eyebrow="서비스 정책"
          title="이용약관"
          description={`${info.serviceName} 서비스 이용 조건과 회원의 권리·의무를 정리한 문서입니다.`}
        />

        <section className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
          이 문서는 출시 전 운영 초안입니다. 실제 공개 전 사업자 정보, 연락처,
          운영 정책, 법률 검토를 완료해야 합니다.
        </section>

        <LegalSection title="제1조 목적">
          <p>
            본 약관은 {info.operatorName}이 운영하는 {info.serviceName}에서
            제공하는 프랜차이즈 메뉴 조합 정보, 검색, 저장, 후기, 신고 및 관련
            서비스의 이용 조건과 절차, 이용자와 운영자의 권리·의무 및 책임
            사항을 정하는 것을 목적으로 합니다.
          </p>
        </LegalSection>

        <LegalSection title="제2조 정의">
          <ul>
            <li>서비스: {info.serviceName} 웹/PWA 및 이에 부수하는 기능</li>
            <li>이용자: 회원 또는 비회원으로 서비스를 이용하는 사람</li>
            <li>회원: Supabase Auth 기반 OAuth 로그인으로 계정을 생성한 사람</li>
            <li>조합: 메뉴, 옵션, 태그, 예상가, 후기 등을 포함한 추천 카드</li>
            <li>콘텐츠: 이용자가 등록한 조합, 후기, 신고 사유 등 입력 정보</li>
          </ul>
        </LegalSection>

        <LegalSection title="제3조 약관의 게시와 변경">
          <p>
            운영자는 본 약관을 서비스 내에서 쉽게 확인할 수 있도록 게시합니다.
            운영상 또는 법령상 필요한 경우 약관을 변경할 수 있으며, 중요한
            변경은 적용일 전 서비스 화면 또는 공지 수단으로 안내합니다.
          </p>
        </LegalSection>

        <LegalSection title="제4조 서비스의 제공">
          <ul>
            <li>비회원은 공개 조합 조회, 브랜드 페이지, 검색, 상세 페이지를 이용할 수 있습니다.</li>
            <li>회원은 조합 등록, 따봉, 찜, 후기, 후기 따봉, 신고 등 상호작용 기능을 이용할 수 있습니다.</li>
            <li>관리자 승인이 필요한 콘텐츠는 승인 전까지 공개되지 않을 수 있습니다.</li>
            <li>서비스는 외부 프랜차이즈와 제휴되지 않은 독립 정보 서비스입니다.</li>
          </ul>
        </LegalSection>

        <LegalSection title="제5조 회원 계정">
          <p>
            회원은 본인의 OAuth 계정을 안전하게 관리해야 하며, 계정 사용으로
            발생하는 활동에 대해 책임을 집니다. 운영자는 보안, 악용 방지,
            정책 위반 대응을 위해 계정의 서비스 이용을 제한할 수 있습니다.
          </p>
        </LegalSection>

        <LegalSection title="제6조 콘텐츠 등록과 관리">
          <ul>
            <li>회원이 등록한 조합은 승인 대기 상태로 저장되며, 관리자 검토 후 공개될 수 있습니다.</li>
            <li>후기는 한 줄 후기와 평점을 포함할 수 있으며, 허위·비방·광고성 내용은 숨김 처리될 수 있습니다.</li>
            <li>운영자 seed 문구는 실제 사용자 후기와 구분하여 표시합니다.</li>
            <li>가격과 옵션 정보는 참고용이며, 실제 매장·앱·시점에 따라 달라질 수 있습니다.</li>
          </ul>
        </LegalSection>

        <LegalSection title="제7조 금지 행위">
          <ul>
            <li>타인의 권리, 명예, 개인정보를 침해하는 행위</li>
            <li>허위 정보, 광고, 스팸, 자동화된 대량 요청 또는 서비스 방해 행위</li>
            <li>승인·신고·평점 시스템을 조작하거나 우회하는 행위</li>
            <li>공식 브랜드와의 제휴 관계가 있는 것처럼 오인시키는 행위</li>
          </ul>
        </LegalSection>

        <LegalSection title="제8조 신고와 이용 제한">
          <p>
            이용자는 부적절한 조합 또는 후기를 신고할 수 있습니다. 운영자는
            신고된 콘텐츠를 검토하여 숨김, 신고 처리, 계정 정지 등 필요한
            조치를 할 수 있습니다.
          </p>
        </LegalSection>

        <LegalSection title="제9조 서비스 변경과 중단">
          <p>
            운영자는 운영상 필요에 따라 서비스의 일부 또는 전부를 변경하거나
            중단할 수 있습니다. 장애, 점검, 외부 서비스 장애 등 불가피한 사유가
            있을 수 있습니다.
          </p>
        </LegalSection>

        <LegalSection title="제10조 책임의 제한">
          <p>
            서비스에 표시되는 조합, 가격, 옵션, 평점, 후기 정보는 이용자의
            선택을 돕기 위한 참고 정보입니다. 운영자는 고의 또는 중대한 과실이
            없는 한 이용자가 해당 정보를 이용해 발생한 손해에 대해 책임을
            부담하지 않습니다.
          </p>
        </LegalSection>

        <LegalSection title="제11조 문의">
          <p>
            서비스 이용 문의는 {info.operatorEmail}로 접수합니다. 운영자 주소는
            {` ${info.operatorAddress}`}입니다.
          </p>
        </LegalSection>

        <LegalSection title="부칙">
          <p>본 약관은 {LEGAL_EFFECTIVE_DATE}부터 적용됩니다.</p>
        </LegalSection>

        <ReferenceLinks />
      </article>
    </main>
  );
}

function LegalHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="border-b border-stone-200 pb-6">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-md px-1 text-sm font-bold text-stone-500 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
      >
        맛잘알
      </Link>
      <p className="mt-5 text-xs font-bold text-stone-500">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-black tracking-normal">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-stone-600">{description}</p>
    </header>
  );
}

function LegalSection({
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

function ReferenceLinks() {
  return (
    <section className="mt-10 border-t border-stone-200 pt-6 text-xs leading-6 text-stone-500">
      <h2 className="font-black text-stone-600">작성 참고 기준</h2>
      <p className="mt-2">
        공정거래위원회 표준약관 자료와 서비스 실제 기능 범위를 참고한 운영
        초안입니다. 전자상거래 판매 기능을 열기 전에는 별도 약관 검토가
        필요합니다.
      </p>
    </section>
  );
}
