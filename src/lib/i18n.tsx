import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Language = 'en' | 'ka';

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
    'header.tagline': 'SmartPick every day',

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
  'category.All': 'All',
  'category.BAKERY': 'Bakery',
  'category.RESTAURANT': 'Restaurant',
  'category.CAFE': 'Café',
  'category.GROCERY': 'Grocery',
  'category.FAST_FOOD': 'Fast Food',
  'category.ALCOHOL': 'Alcohol & Wine',

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
  // Toasts and receipts
  'toast.signInToViewPicks': 'Please sign in to view your picks',
  'toast.failedLoadPicks': 'Failed to load your picks',
  'toast.failedLoadReservations': 'Failed to load reservations',
  'toast.failedGenerateQr': 'Failed to generate QR code',
  'toast.reservationCancelled': 'Reservation cancelled successfully',
  'toast.failedCancelReservation': 'Failed to cancel reservation',
  'toast.locationNotAvailable': 'Location information not available',
  'toast.reservationRemoved': 'Reservation removed successfully',
  'toast.failedRemoveReservation': 'Failed to remove reservation',
  'toast.ratingThanks': 'Thank you for your rating!',
  'toast.failedSubmitRating': 'Failed to submit rating',
  'toast.receiptDownloaded': 'Receipt downloaded successfully!',

  'receipt.title': 'SmartPick Receipt',
  'receipt.reservationId': 'Reservation ID',
  'receipt.partner': 'Partner',
  'receipt.item': 'Item',
  'receipt.quantity': 'Quantity',
  'receipt.totalPrice': 'Total Price',
  'receipt.pickupDate': 'Pickup Date',
  'receipt.status': 'Status',
  'receipt.partnerContact': 'Partner Contact:',
  'receipt.email': 'Email:',
  'receipt.phone': 'Phone:',

  // Timer / confirmations / status
  'timer.expired': 'Expired',
  'confirm.cancelReservation': 'Are you sure you want to cancel this reservation?',
  'confirm.removeReservation': 'Are you sure you want to remove this reservation?',
  'status.ACTIVE': 'Active',
  'status.PICKED_UP': 'Picked Up',
  'status.EXPIRED': 'Expired',
  'status.CANCELLED': 'Cancelled',
  // Offer / reservation related
  'toast.failedLoadOffer': 'Failed to load offer',
  'toast.signInToReserve': 'Please sign in to reserve',
  'penalty.lifted': 'Penalty lifted!',
  'toast.underPenalty': 'You are under penalty. Time remaining:',
  'toast.notEnoughQuantity': 'Not enough quantity available',
  'toast.maxUnits': 'Maximum 3 units allowed per reservation',
  'toast.reservationCreated': 'Reservation created successfully!',
  'offer.loading': 'Loading offer...',
  'offer.notFound': 'Offer not found',
  'header.backToOffers': 'Back to Offers',
  'offer.selectQuantity': 'Select Quantity (Max 3 per offer)',
  'offer.smartPricePerUnit': 'Smart Price per unit',
  'offer.hurry': 'Hurry!',
  // Fallbacks
  'fallback.unknown': 'Unknown',
  'fallback.unknownPartner': 'Unknown Partner',
  // Reservation detail / labels
  'toast.reservationNotFound': 'Reservation not found',
  'toast.failedLoadReservation': 'Failed to load reservation',
  'button.backToMyPicks': 'Back to My Picks',
  'qr.showAtPickup': 'Show this QR code at pickup',
  'timer.timeRemaining': 'Time remaining',
  'timer.waiting': 'Your SmartPick is waiting!',
  'label.quantity': 'Quantity',
  'label.totalPrice': 'Total Price',
  'label.reservedAt': 'Reserved At',
  'label.pickupWindow': 'Pickup Window',
  'label.pickupLocation': 'Pickup Location',
  'button.getDirections': 'Get Directions',
  'contact.partner': 'Contact Partner',

  // Maintenance Mode
  'maintenance.title': 'Under Construction',
  'maintenance.subtitle': 'We\'re working on something amazing!',
  'maintenance.message': 'Our site is currently undergoing scheduled maintenance to bring you new features and improvements. We\'ll be back soon!',

  // Search and Filters
  'search.placeholder': 'Search offers...',
  'filter.title': 'Filters',
  'filter.distance': 'Distance',
  'filter.maxDistance': 'Max Distance (km)',
  'filter.priceRange': 'Price Range',
  'filter.minPrice': 'Min Price (₾)',
  'filter.maxPrice': 'Max Price (₾)',
  'filter.apply': 'Apply Filters',
  'filter.clear': 'Clear All',
  'sort.title': 'Sort By',
  'sort.nearest': 'Nearest First',
  'sort.cheapest': 'Cheapest First',
  'sort.expiring': 'Ending Soon',
  'sort.newest': 'Newest First',
  },
  ka: {
    // Header
    'header.signIn': 'შესვლა',
    'header.signOut': 'გასვლა',
    'header.becomePartner': 'გახდი პარტნიორი',
    'header.myPicks': 'ჩემი არჩევანი',
    'header.partner': 'პარტნიორი',
    'header.admin': 'ადმინი',
    'header.tagline': 'გონივრული არჩევანი ყოველდღე',

    // Hero Section
    'hero.title1': 'ჭკვიანი საკვები. ჭკვიანი ხალხი.',
    'hero.title2': 'SmartPick',
    'hero.subtitle': 'ახალი კერძები, მზადაა წასასვლელად — შენთვის საყვარელი ადგილებიდან, სწორ დროს.',
    'hero.description': 'შენი ქალაქის ყველაზე ახალი შეთავაზებები, მათთვის ვინც იცის სად უნდა ეძებოს.',
    'hero.findButton': 'იპოვე გონივრული შეთავაზებები',

    // How It Works
    'howItWorks.title': 'როგორ მუშაობს SmartPick',
    'howItWorks.subtitle': 'შესანიშნავი შეთავაზებების პოვნა ისეთივე ადვილია, როგორც 1, 2, 3.',
    'howItWorks.step1.title': 'შეარჩიე სასურველი შეთავაზება',
    'howItWorks.step1.description': 'აირჩიე სასურველი შეთავაზება შენთან ახლოს',
    'howItWorks.step2.title': 'დაარეზერვე სასურველი შეთავაზება',
    'howItWorks.step2.description': 'შეთავაზება დარეზერვდება მომდენვო 30 წუთი',
    'howItWorks.step3.title': 'მიდი ლოკაციაზე, გაანაღდე. ისიამოვნე',
    'howItWorks.step3.description': 'დაიწყე მოძრაობა და გაანაღდე პროდუქტი',
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
  'category.All': 'ყველა',
  'category.BAKERY': 'ფუნთუშეული',
  'category.RESTAURANT': 'რესტორანი',
  'category.CAFE': 'კაფე',
  'category.GROCERY': 'სურსათის მაღაზია',
  'category.FAST_FOOD': 'ფასთ ფუდი',
  'category.ALCOHOL': 'ალკოჰოლი და ღვინო',

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
  // Toasts and receipts
  'toast.signInToViewPicks': 'გთხოვთ შეიყვანოთ სისტემა რათა ნახოთ თქვენს შეძენები',
  'toast.failedLoadPicks': 'შეტყობინებების დატვირთვა არ მოხერხდა',
  'toast.failedLoadReservations': 'ბრუნების (პარამეტრების) დატვირთვა ვერ მოხერხდა',
  'toast.failedGenerateQr': 'QR კოდის გენერაცია ვერ მოხერხდა',
  'toast.reservationCancelled': 'რეზერვაცია წარმატებით გაუქმდა',
  'toast.failedCancelReservation': 'რეზერვაციის გაუქმება ვერ მოხერხდა',
  'toast.locationNotAvailable': 'ადგილმდებარეობის ინფორმაცია არ არის ხელმისაწვდომი',
  'toast.reservationRemoved': 'რეზერვაცია წარმატებით წაიშალა',
  'toast.failedRemoveReservation': 'რეზერვაციის წაშლა ვერ მოხერხდა',
  'toast.ratingThanks': 'გმადლობთ შეფასებისთვის!',
  'toast.failedSubmitRating': 'შეფასების გაგზავნა ვერ მოხერხდა',
  'toast.receiptDownloaded': 'চეკი ჩამოტვირთულია!',

  'receipt.title': 'SmartPick საფუძველი',
  'receipt.reservationId': 'ბეჭდვის ID',
  'receipt.partner': 'პარტნიორი',
  'receipt.item': 'ნივთი',
  'receipt.quantity': 'რაოდენობა',
  'receipt.totalPrice': 'სრული ფასი',
  'receipt.pickupDate': 'გადამოწმების თარიღი',
  'receipt.status': 'სტატუსი',
  'receipt.partnerContact': 'პარტნიორის კონტაქტი:',
  'receipt.email': 'ელ.ფოსტა:',
  'receipt.phone': 'ტელეფონი:',

  // Timer / confirmations / status
  'timer.expired': 'ვადა გავიდა',
  'confirm.cancelReservation': 'დარწმუნებული ხართ, რომ გინდათ ამ რეზერვაციის გაუქმება?',
  'confirm.removeReservation': 'დარწმუნებული ხართ, რომ გინდათ ამ რეზერვაციის წაშლა?',
  'status.ACTIVE': 'აქტიური',
  'status.PICKED_UP': 'გადაღებულია',
  'status.EXPIRED': 'ვადა გავიდა',
  'status.CANCELLED': 'გაუქმებულია',
  // Offer / reservation related
  'toast.failedLoadOffer': 'შეთავაზების ჩამოტვირთვა ვერ მოხერხდა',
  'toast.signInToReserve': 'გთხოვთ შეიყვანოთ სისტემა რათა დაარეზერვოთ',
  'penalty.lifted': 'პენალტი მოხსნილია!',
  'toast.underPenalty': 'თქვენ პენალტის ქვეშ ხართ. დარჩენილი დრო:',
  'toast.notEnoughQuantity': 'არ არის საკმარისად რაოდენობა',
  'toast.maxUnits': 'მაქსიმუმ 3 ერთეული კარგად',
  'toast.reservationCreated': 'რეზერვაცია წარმატებით შეიქმნა!',
  'offer.loading': 'იტვირთება შეთავაზება...',
  'offer.notFound': 'შეთავაზება ვერ მოიძებნა',
  'header.backToOffers': 'უკან შეთავაზებებზე',
  'offer.selectQuantity': 'აირჩიეთ რაოდენობა (მაქსიმუმ 3 თითო შეთავაზებაზე)',
  'offer.smartPricePerUnit': 'Smart ფასბი ერთეულზე',
  'offer.hurry': 'საჩქაროა!',
  // Fallbacks
  'fallback.unknown': 'უცნობია',
  'fallback.unknownPartner': 'უცნობი პარტნიორი',
  // Reservation detail / labels
  'toast.reservationNotFound': 'რეზერვაცია ვერ მოიძებნა',
  'toast.failedLoadReservation': 'რეზერვაციის ჩატვირთვა ვერ მოხერხდა',
  'button.backToMyPicks': 'უკან ჩემს არჩევანზე',
  'qr.showAtPickup': 'აჩვენეთ ეს QR კოდი აღებისას',
  'timer.timeRemaining': 'დარჩენილი დრო',
  'timer.waiting': 'თქვენი SmartPick გელოდება!',
  'label.quantity': 'რაოდენობა',
  'label.totalPrice': 'სრული ფასი',
  'label.reservedAt': 'დაჯავშნილია',
  'label.pickupWindow': 'აღების ფანჯარა',
  'label.pickupLocation': 'აღების ადგილმდებარეობა',
  'button.getDirections': 'მიიღე ინსტრუქციები',
  'contact.partner': 'დაგვიკავშირდით პარტნიორს',

  // Maintenance Mode
  'maintenance.title': 'მიმდინარეობს სამუშაოები',
  'maintenance.subtitle': 'ჩვენ ვმუშაობთ რაღაც შესანიშნავზე!',
  'maintenance.message': 'ჩვენი საიტი ამჟამად გადის დაგეგმილ ტექნიკურ მოვლას, რათა მოგიტანოთ ახალი ფუნქციები და გაუმჯობესებები. მალე დავბრუნდებით!',

  // Search and Filters
  'search.placeholder': 'მოძებნე შეთავაზებები...',
  'filter.title': 'ფილტრები',
  'filter.distance': 'დისტანცია',
  'filter.maxDistance': 'მაქს. დისტანცია (კმ)',
  'filter.priceRange': 'ფასის დიაპაზონი',
  'filter.minPrice': 'მინ. ფასი (₾)',
  'filter.maxPrice': 'მაქს. ფასი (₾)',
  'filter.apply': 'გამოყენება',
  'filter.clear': 'გასუფთავება',
  'sort.title': 'დალაგება',
  'sort.nearest': 'ყველაზე ახლოს',
  'sort.cheapest': 'ყველაზე იაფი',
  'sort.expiring': 'მალე იწურება',
  'sort.newest': 'უახლესი',
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
