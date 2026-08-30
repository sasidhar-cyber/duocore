// Browser Push / Web Notification Service

export function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return Promise.resolve('unsupported');
  }

  if (Notification.permission === 'default') {
    return Notification.requestPermission();
  }

  return Promise.resolve(Notification.permission);
}

export function showBrowserNotification(title, options = {}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        icon: options.icon || '/favicon.ico',
        badge: '/favicon.ico',
        body: options.body || '',
        silent: true, // Respect sound mute
        tag: options.tag || 'duocore-chat',
        renotify: true,
        ...options
      });

      if (options.onClick) {
        notification.onclick = () => {
          window.focus();
          options.onClick();
          notification.close();
        };
      }

      // Auto close after 5 seconds
      setTimeout(() => {
        try {
          notification.close();
        } catch (e) {}
      }, 5000);

      return notification;
    } catch (err) {
      console.warn('[Notification] Could not display browser notification:', err);
    }
  }
}
