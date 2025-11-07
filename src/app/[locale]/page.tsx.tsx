'use client';
import { useTranslations } from 'next-intl';

export default function HomePage() {
  const t = useTranslations('nav');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center p-6">
      <h1 className="text-3xl font-bold mb-4 text-blue-600">{t('home')}</h1>
      <p className="text-gray-600 text-lg">
        🌍 Welcome / კეთილი იყოს თქვენი მობრძანება
      </p>
    </main>
  );
}
