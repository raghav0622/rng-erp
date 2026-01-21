// Stub notificationService for build compatibility
export const notificationService = {
  notify: (msg: string) => {
    if (typeof window !== 'undefined') {
      window.alert(msg);
    } else {
      // eslint-disable-next-line no-console
      console.log('Notification:', msg);
    }
  },
  offlineWarning: (msg: string, title?: string) => {
    if (typeof window !== 'undefined') {
      window.alert((title ? title + ': ' : '') + msg);
    } else {
      // eslint-disable-next-line no-console
      console.log('Offline Warning:', title, msg);
    }
  },
};
