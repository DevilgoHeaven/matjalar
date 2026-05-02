/**
 * 클래스 이름 합성 유틸 (clsx + tailwind-merge)
 * Tailwind 충돌 클래스를 자동 해결.
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
