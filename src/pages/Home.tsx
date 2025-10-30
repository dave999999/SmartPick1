import { useTranslation } from "react-i18next";

export default function Home() {
  const { t, i18n } = useTranslation();

  return (
    <div className="text-center mt-10">
      <h1 className="text-3xl font-bold">{t("welcome")}</h1>
      <div className="mt-4 space-x-3">
        <button onClick={() => i18n.changeLanguage("en")} className="px-3 py-1 bg-gray-200 rounded">🇬🇧 English</button>
        <button onClick={() => i18n.changeLanguage("ka")} className="px-3 py-1 bg-gray-200 rounded">🇬🇪 ქართული</button>
        <button onClick={() => i18n.changeLanguage("ru")} className="px-3 py-1 bg-gray-200 rounded">🇷🇺 Русский</button>
      </div>
    </div>
  );
}
