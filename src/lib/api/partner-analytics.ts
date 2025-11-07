// Partner analytics API stub
export async function getPartnerAnalytics(partnerId: string) {
  // TODO: Replace with real API call
  return {
    trends: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
      datasets: [{ label: 'Reservations', data: [10, 20, 15, 30, 25] }]
    },
    revenue: 1234.56,
    nextPayout: '2025-11-15'
  };
}

export async function getPartnerPayoutInfo(partnerId: string) {
  // TODO: Replace with real API call
  return {
    totalEarned: 2345.67,
    nextPayoutDate: '2025-11-15',
    bankAccount: 'GE29NB0000000101904917'
  };
}
