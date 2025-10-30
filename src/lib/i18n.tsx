import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Language = 'en' | 'ka' | 'ru';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Header
    'header.signIn': 'Sign In',
    'header.signOut': 'Sign Out',
    'header.becomePartner': 'Become a Partner',
    'header.myPicks': 'My Picks',
    'header.partner': 'Partner',
    'header.admin': 'Admin',
    'header.tagline': 'Be Smart. Pick Smart.',

    // Hero Section
    'hero.title1': 'Smart food. Smart people.',
    'hero.title2': 'SmartPick',
    'hero.subtitle': 'Fresh meals, ready to go — from the places you love, at the perfect time.',
    'hero.description': 'Your city\'s freshest finds, for those who know where to look.',
    'hero.findButton': 'Find Smart Picks Near You',

    // How It Works
    'howItWorks.title': 'How It Works',
    'howItWorks.subtitle': 'Three simple steps to fresh, local meals',
    'howItWorks.step1.title': 'Find Nearby Offers',
    'howItWorks.step1.description': 'Discover fresh meals around you',
    'howItWorks.step2.title': 'Reserve Your Pick',
    'howItWorks.step2.description': 'Secure your meal instantly',
    'howItWorks.step3.title': 'Walk, Pick, Enjoy',
    'howItWorks.step3.description': 'Get moving and taste your city',
    'howItWorks.explore': 'Explore what\'s fresh near you 🍞',

    // Browse Section
    'browse.title': 'Browse Smart Picks',
    'browse.subtitle': 'Filter by category to find exactly what you\'re looking for',
    'browse.all': 'All',
    'browse.smartPicks': 'Smart Picks',
    'browse.available': 'available',
    'browse.nearYou': 'near you',
    'browse.loading': 'Loading Smart Picks...',
    'browse.noOffers': 'No offers available at the moment.',
    'browse.checkBack': 'Check back soon for new Smart Picks!',
  // Categories
  'category.BAKERY': 'Bakery',
  'category.RESTAURANT': 'Restaurant',
  'category.CAFE': 'Café',
  'category.GROCERY': 'Grocery',

    // Map View
    'map.mapView': 'Map View',
    'map.listView': 'List View',
    'map.nearMe': 'Near Me',
    'map.showingNear': 'Smart Picks near you',
    'map.showingAvailable': 'Smart Picks available',

    // Why It Matters
    'why.title': 'When you pick, you make your city smarter.',
    'why.point1': 'More freshness shared',
    'why.point2': 'More people walking',
    'why.point3': 'Stronger local shops',
    'why.point4': 'A better rhythm of living',
    'why.tagline': 'Every SmartPick is a moment of connection — between you, your city, and what\'s fresh.',

    // Manifesto
    'manifesto.title': 'We believe in freshness, movement, and mindful living.',
    'manifesto.line1': 'SmartPick isn\'t just an app — it\'s a rhythm.',
    'manifesto.line2': 'A way to live lighter, walk more, and connect with the real taste of your city.',
    'manifesto.line3': 'Every time you walk, pick, and share, you become part of something smarter.',
    'manifesto.line4': 'Together, we keep the circle flowing — fresh, simple, and real.',

    // Footer
    'footer.description': 'SmartPick helps local businesses share more of what they create, and less of it go to waste — naturally.',
    'footer.copyright': '© 2025 SmartPick. All rights reserved.',
  },
  ka: {
    // Header
    'header.signIn': 'შესვლა',
    'header.signOut': 'გასვლა',
    'header.becomePartner': 'გახდი პარტნიორი',
    'header.myPicks': 'ჩემი არჩევანი',
    'header.partner': 'პარტნიორი',
    'header.admin': 'ადმინი',
    'header.tagline': 'იყავი ჭკვიანი. აირჩიე ჭკვიანურად.',

    // Hero Section
    'hero.title1': 'ჭკვიანი საკვები. ჭკვიანი ხალხი.',
    'hero.title2': 'SmartPick',
    'hero.subtitle': 'ახალი კერძები, მზადაა წასასვლელად — შენთვის საყვარელი ადგილებიდან, სწორ დროს.',
    'hero.description': 'შენი ქალაქის ყველაზე ახალი შეთავაზებები, მათთვის ვინც იცის სად უნდა ეძებოს.',
    'hero.findButton': 'იპოვე SmartPick შენს მახლობლად',

    // How It Works
    'howItWorks.title': 'როგორ მუშაობს SmartPick',
    'howItWorks.subtitle': 'შესანიშნავი შეთავაზებების პოვნა ისეთივე ადვილია, როგორც 1, 2, 3.',
    'howItWorks.step1.title': 'ძებნა',
    'howItWorks.step1.description': 'აღმოაჩინე ახლომახლო შეთავაზებები შენთან ახლოს',
    'howItWorks.step2.title': 'დაჯავშნე',
    'howItWorks.step2.description': 'დაიჯავშნე შენი კერძი 30 წუთით',
    'howItWorks.step3.title': 'აიღე',
    'howItWorks.step3.description': 'აიყვანე QR და აიღე შენი მარაგი',
    'howItWorks.explore': 'რა არის ახალი შენს გარშემო 🍞',

    // Browse Section
    'browse.title': 'დაათვალიერე SmartPick',
    'browse.subtitle': 'გაფილტრე კატეგორიის მიხედვით, რომ იპოვო ზუსტად ის რაც გჭირდება',
    'browse.all': 'ყველა',
    'browse.smartPicks': 'SmartPick',
    'browse.available': 'ხელმისაწვდომია',
    'browse.nearYou': 'შენს მახლობლად',
    'browse.loading': 'იტვირთება SmartPick...',
    'browse.noOffers': 'ამ მომენტში შეთავაზებები არ არის ხელმისაწვდომი.',
    'browse.checkBack': 'შემოწმდი მალე ახალი SmartPick-ებისთვის!',
  // Categories
  'category.BAKERY': 'ფუნთუშეული',
  'category.RESTAURANT': 'რესტორანი',
  'category.CAFE': 'კაფე',
  'category.GROCERY': 'სურსათის მაღაზია',

    // Map View
    'map.mapView': 'რუკის ხედი',
    'map.listView': 'სიის ხედი',
    'map.nearMe': 'ჩემთან ახლოს',
    'map.showingNear': 'SmartPick შენს მახლობლად',
    'map.showingAvailable': 'SmartPick ხელმისაწვდომია',

    // Why It Matters
    'why.title': 'როცა აირჩევ, შენ ხდი ქალაქს უფრო ჭკვიანს.',
    'why.point1': 'მეტი სიახლე გაზიარებული',
    'why.point2': 'მეტი ხალხი დადის',
    'why.point3': 'უფრო ძლიერი ადგილობრივი მაღაზიები',
    'why.point4': 'ცხოვრების უკეთესი რიტმი',
    'why.tagline': 'ყოველი SmartPick არის კავშირის მომენტი — შენს, შენს ქალაქსა და სიახლეს შორის.',

    // Manifesto
    'manifesto.title': 'ჩვენ გვჯერა სიახლის, მოძრაობისა და გონივრული ცხოვრების.',
    'manifesto.line1': 'SmartPick არ არის მხოლოდ აპლიკაცია — ეს არის რიტმი.',
    'manifesto.line2': 'გზა მსუბუქად ცხოვრებისთვის, მეტი სიარულისთვის და შენი ქალაქის რეალურ გემოსთან დაკავშირებისთვის.',
    'manifesto.line3': 'ყოველ ჯერზე როცა დადიხარ, აირჩევ და უზიარებ, ხდები რაღაც უფრო ჭკვიანის ნაწილი.',
    'manifesto.line4': 'ერთად, ჩვენ ვინახავთ წრეს მიმოქცევაში — ახალი, მარტივი და რეალური.',

    // Footer
    'footer.description': 'SmartPick ეხმარება ადგილობრივ ბიზნესებს გაუზიარონ მეტი იმისა რასაც ქმნიან, და ნაკლები დაიკარგოს — ბუნებრივად.',
    'footer.copyright': '© 2025 SmartPick. ყველა უფლება დაცულია.',
  },
  ru: {
    // Header
    'header.signIn': 'Войти',
    'header.signOut': 'Выйти',
    'header.becomePartner': 'Стать партнёром',
    'header.myPicks': 'Мои заказы',
    'header.partner': 'Партнёр',
    'header.admin': 'Админ',
    'header.tagline': 'Будь умным. Выбирай умно.',

    // Hero Section
    'hero.title1': 'Умная еда. Умные люди.',
    'hero.title2': 'SmartPick',
    'hero.subtitle': 'Свежие блюда, готовые к выдаче — из любимых мест, в идеальное время.',
    'hero.description': 'Самые свежие находки вашего города для тех, кто знает, где искать.',
    'hero.findButton': 'Найти SmartPick рядом',

    // How It Works
    'howItWorks.title': 'Как это работает',
    'howItWorks.subtitle': 'Три простых шага к свежим местным блюдам',
    'howItWorks.step1.title': 'Найди предложения',
    'howItWorks.step1.description': 'Открой для себя свежие блюда рядом',
    'howItWorks.step2.title': 'Забронируй',
    'howItWorks.step2.description': 'Зарезервируй блюдо мгновенно',
    'howItWorks.step3.title': 'Иди, забери, наслаждайся',
    'howItWorks.step3.description': 'Двигайся и пробуй свой город',
    'howItWorks.explore': 'Узнай, что свежего рядом 🍞',

    // Browse Section
    'browse.title': 'Просмотр SmartPick',
    'browse.subtitle': 'Фильтруй по категории, чтобы найти именно то, что ищешь',
    'browse.all': 'Все',
    'browse.smartPicks': 'SmartPick',
    'browse.available': 'доступно',
    'browse.nearYou': 'рядом с вами',
    'browse.loading': 'Загрузка SmartPick...',
    'browse.noOffers': 'На данный момент предложений нет.',
    'browse.checkBack': 'Заходите позже за новыми SmartPick!',
  // Categories
  'category.BAKERY': 'Пекарня',
  'category.RESTAURANT': 'Ресторан',
  'category.CAFE': 'Кафе',
  'category.GROCERY': 'Продукты',

    // Map View
    'map.mapView': 'Карта',
    'map.listView': 'Список',
    'map.nearMe': 'Рядом со мной',
    'map.showingNear': 'SmartPick рядом с вами',
    'map.showingAvailable': 'SmartPick доступно',

    // Why It Matters
    'why.title': 'Когда ты выбираешь, ты делаешь свой город умнее.',
    'why.point1': 'Больше свежести делится',
    'why.point2': 'Больше людей ходят пешком',
    'why.point3': 'Сильнее местные магазины',
    'why.point4': 'Лучший ритм жизни',
    'why.tagline': 'Каждый SmartPick — это момент связи между вами, вашим городом и тем, что свежо.',

    // Manifesto
    'manifesto.title': 'Мы верим в свежесть, движение и осознанную жизнь.',
    'manifesto.line1': 'SmartPick — это не просто приложение, это ритм.',
    'manifesto.line2': 'Способ жить легче, больше ходить и соединяться с настоящим вкусом вашего города.',
    'manifesto.line3': 'Каждый раз, когда вы идёте, выбираете и делитесь, вы становитесь частью чего-то умного.',
    'manifesto.line4': 'Вместе мы поддерживаем круг — свежий, простой и настоящий.',

    // Footer
    'footer.description': 'SmartPick помогает местному бизнесу делиться тем, что они создают, и меньше пропадать — естественно.',
    'footer.copyright': '© 2025 SmartPick. Все права защищены.',
  },
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('smartpick-language');
    return (saved as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('smartpick-language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
