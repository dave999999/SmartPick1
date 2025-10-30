import { translationsEn } from "./translationsEn";
import { translationsKa } from "./translationsKa";

export type Language = "ka" | "en";

export const translations: Record<Language, Record<string, any>> = {
  ka: {
    ...translationsKa,
    addProductForm: {
      categoriesTitle: "საქმიანობის კატეგორიები",
      categoriesDescription: "თქვენი ბიზნესის კატეგორიის მიხედვით, შეგიძლიათ შემოგთავაზოთ:",
    },
    orders: {
      myOrders: "ჩემი შეკვეთები",
      noOrders: "შეკვეთები ჯერ არ არის",
      noOrdersDescription: "თქვენ ჯერ არ გაქვთ შეკვეთები. დაიწყეთ ჩვენი პროდუქტების დათვალიერება!",
      browseProducts: "პროდუქტების დათვალიერება",
      errorLoading: "შეკვეთების ჩატვირთვის შეცდომა",
      pageDescription: "იხილეთ თქვენი შეკვეთების ისტორია",
      today: "დღეს",
      yesterday: "გუშინ",
      thisWeek: "ამ კვირაში",
      earlier: "ადრე",
      statusReserved: "დაჯავშნილი",
      statusRedeemed: "აღებული",
      statusExpired: "ვადაგასული",
      statusCancelled: "გაუქმებული",
      quantity: "რაოდენობა",
      totalPrice: "სრული ფასი",
      pickupTime: "აღების დრო",
      unknownDate: "უცნობი თარიღი",
      cancelReservation: "რეზერვაციის გაუქმება",
      cancelling: "გაუქმება...",
      confirmCancel: "დარწმუნებული ხართ, რომ გსურთ ამ რეზერვაციის გაუქმება? ეს მოქმედება შეუქცევადია.",
    },
  },
  en: {
    ...translationsEn,
    addProductForm: {
      categoriesTitle: "Business Categories",
      categoriesDescription: "Based on your business category, you can offer:",
    },
    orders: {
      myOrders: "My Orders",
      noOrders: "No orders yet",
      noOrdersDescription: "You haven't made any orders yet. Start browsing our products!",
      browseProducts: "Browse Products",
      errorLoading: "Error loading orders",
      pageDescription: "View your order history",
      today: "Today",
      yesterday: "Yesterday",
      thisWeek: "This Week",
      earlier: "Earlier",
      statusReserved: "Reserved",
      statusRedeemed: "Redeemed",
      statusExpired: "Expired",
      statusCancelled: "Cancelled",
      quantity: "Quantity",
      totalPrice: "Total Price",
      pickupTime: "Pickup Time",
      unknownDate: "Unknown Date",
      cancelReservation: "Cancel Reservation",
      cancelling: "Cancelling...",
      confirmCancel: "Are you sure you want to cancel this reservation? This action cannot be undone.",
    },
  },
};