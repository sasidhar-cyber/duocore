// Browser & Mobile Native Push Notification Service for DuoCore

export function getNotificationPermissionStatus() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('[Notification] Permission request failed:', err);
    return Notification.permission || 'denied';
  }
}

export async function showBrowserNotification(title, options = {}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;

  if (Notification.permission !== 'granted') {
    return null;
  }

  const notifOptions = {
    icon: options.icon || '/favicon.ico',
    badge: options.badge || '/favicon.ico',
    body: options.body || '',
    silent: options.silent ?? false,
    tag: options.tag || 'duocore-notification',
    renotify: true,
    data: options.data || {},
    ...options
  };

  // 1. Try Service Worker showNotification (Works reliably on Android Chrome & Desktop)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) {
        await reg.showNotification(title, notifOptions);
        return true;
      }
    } catch (swErr) {
      // Fallback to window Notification constructor
    }
  }

  // 2. Standard Window Notification constructor (Desktop Browsers)
  try {
    const notification = new Notification(title, notifOptions);

    if (options.onClick) {
      notification.onclick = () => {
        window.focus();
        options.onClick();
        notification.close();
      };
    }

    // Auto close after 6 seconds
    setTimeout(() => {
      try {
        notification.close();
      } catch (e) {}
    }, 6000);

    return notification;
  } catch (err) {
    // If constructor throws Illegal Constructor on mobile and no SW, try ready registration
    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
      try {
        const readyReg = await navigator.serviceWorker.ready;
        if (readyReg) {
          await readyReg.showNotification(title, notifOptions);
          return true;
        }
      } catch (readyErr) {
        console.warn('[Notification] Mobile notification fallback error:', readyErr);
      }
    }
    console.warn('[Notification] Could not display browser notification:', err);
  }
  return null;
}
