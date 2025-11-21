// Test the password reset Edge Function
// Run this in browser console on your site

const testEmail = 'YOUR_EMAIL_HERE'; // Replace with the email you're testing

fetch('https://ggzhtpaxnhwcilomswtm.supabase.co/functions/v1/send-password-reset-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ANON_KEY'
  },
  body: JSON.stringify({ email: testEmail })
})
.then(res => res.json())
.then(data => console.log('Response:', data))
.catch(err => console.error('Error:', err));
