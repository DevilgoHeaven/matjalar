export const LEGAL_EFFECTIVE_DATE = '2026-05-16';

export interface LegalSiteInfo {
  serviceName: string;
  operatorName: string;
  operatorEmail: string;
  operatorAddress: string;
  privacyOfficerName: string;
  privacyOfficerEmail: string;
}

export function getLegalSiteInfo(): LegalSiteInfo {
  return {
    serviceName: '맛잘알',
    operatorName: readEnv('LEGAL_OPERATOR_NAME', '운영자 정보 입력 필요'),
    operatorEmail: readEnv('LEGAL_OPERATOR_EMAIL', 'contact@example.com'),
    operatorAddress: readEnv('LEGAL_OPERATOR_ADDRESS', '운영지 주소 입력 필요'),
    privacyOfficerName: readEnv('LEGAL_PRIVACY_OFFICER_NAME', '개인정보 보호책임자 입력 필요'),
    privacyOfficerEmail: readEnv('LEGAL_PRIVACY_OFFICER_EMAIL', 'privacy@example.com'),
  };
}

function readEnv(key: string, fallback: string) {
  const value = process.env[key]?.trim();
  return value ? value : fallback;
}
