// Test Telegram Notification
// Run this in browser console on your app

const testTelegramNotification = async () => {
  try {
    console.log('🧪 Testing Telegram notification...');
    
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        userId: '0f069ba3-2c87-44fe-99a0-97ba74532a86',
        message: '🎉 <b>Test Notification</b>\n\nThis is a test message from SmartPick!\n\nTime: ' + new Date().toLocaleString(),
        type: 'customer'
      }
    });
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log('📊 Response:', data);
    
    if (data.success) {
      console.log('✅ SUCCESS! Check your Telegram');
      alert('✅ Notification sent! Check Telegram');
    } else {
      console.log('⚠️ Failed:', data.message);
      alert('❌ Failed: ' + (data.message || 'Unknown error'));
    }
    
  } catch (err) {
    console.error('💥 Exception:', err);
    alert('💥 Error: ' + err.message);
  }
};

// Run the test
testTelegramNotification();
