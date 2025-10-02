import { supabase } from "../lib/supabase";
import webpush from 'web-push';

// src/services/notifications.ts
export class NotificationService {
  static async requestPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  static async subscribe(userId: string): Promise<void> {
    const registration = await navigator.serviceWorker.ready;
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY
    });

    // Save subscription to Supabase
    await supabase.from('push_subscriptions').insert({
      user_id: userId,
      subscription: subscription.toJSON()
    });
  }

  static async sendNotification(
    userId: string,
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    // This runs on your backend/edge function
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId);

    for (const sub of subscriptions || []) {
      await webpush.sendNotification(
        sub.subscription,
        JSON.stringify({ title, body, data })
      );
    }
  }
}