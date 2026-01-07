package ge.smartpick.app;

import android.os.Bundle;
import android.webkit.WebView;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // SECURITY: WebView debugging disabled in production
        // Enable only during development by uncommenting the line below
        // WebView.setWebContentsDebuggingEnabled(true);
        
        // Create notification channels with custom sound
        createNotificationChannels();
    }
    
    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            
            // Custom sound URI
            Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.notification_sound);
            
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build();
            
            // Default channel for all notifications
            NotificationChannel defaultChannel = new NotificationChannel(
                "fcm_default_channel",
                "SmartPick Notifications",
                NotificationManager.IMPORTANCE_HIGH
            );
            defaultChannel.setDescription("General notifications from SmartPick");
            defaultChannel.setSound(soundUri, audioAttributes);
            defaultChannel.enableVibration(true);
            defaultChannel.setVibrationPattern(new long[]{0, 250, 250, 250});
            notificationManager.createNotificationChannel(defaultChannel);
            
            // Reservations channel
            NotificationChannel reservationsChannel = new NotificationChannel(
                "reservations",
                "Reservations",
                NotificationManager.IMPORTANCE_HIGH
            );
            reservationsChannel.setDescription("Updates about your reservations");
            reservationsChannel.setSound(soundUri, audioAttributes);
            reservationsChannel.enableVibration(true);
            reservationsChannel.setVibrationPattern(new long[]{0, 250, 250, 250});
            notificationManager.createNotificationChannel(reservationsChannel);
            
            // Offers channel
            NotificationChannel offersChannel = new NotificationChannel(
                "offers",
                "New Offers",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            offersChannel.setDescription("New offers from your favorite partners");
            offersChannel.setSound(soundUri, audioAttributes);
            offersChannel.enableVibration(true);
            notificationManager.createNotificationChannel(offersChannel);
            
            // Achievements channel
            NotificationChannel achievementsChannel = new NotificationChannel(
                "achievements",
                "Achievements & Rewards",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            achievementsChannel.setDescription("Achievement unlocks and referral rewards");
            achievementsChannel.setSound(soundUri, audioAttributes);
            achievementsChannel.enableVibration(true);
            notificationManager.createNotificationChannel(achievementsChannel);
        }
    }
}
