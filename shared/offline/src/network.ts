export function getCurrentNetworkStatus(): boolean {
  return window.navigator.onLine;
}

export function subscribeToNetworkStatus(listener: (isOnline: boolean) => void): () => void {
  const handleOnline = () => listener(true);
  const handleOffline = () => listener(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
