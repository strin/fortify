"use client";

import { useEffect } from 'react';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { SessionStorage } from '@/lib/session-storage';

/**
 * PageStateManager component helps maintain application state during tab switches
 * and prevents unnecessary page refreshes by optimizing resource usage.
 */
export default function PageStateManager({ 
  children 
}: { 
  children: React.ReactNode;
}) {
  const isPageVisible = usePageVisibility();

  useEffect(() => {
    // Save timestamp when page becomes hidden to detect potential tab discarding
    if (!isPageVisible) {
      SessionStorage.save('app_last_hidden_timestamp', Date.now());
    } else {
      // Check if page was restored from tab discard
      const lastHidden = SessionStorage.load<number>('app_last_hidden_timestamp');
      if (lastHidden && Date.now() - lastHidden > 30000) { // 30 seconds
        // Page was likely restored from tab discard
        console.log('Page restored from potential tab discard');
        
        // Trigger any necessary state restoration here
        // This could include refreshing data, restoring form state, etc.
        
        // Optional: Show a subtle notification that state was restored
        // You could dispatch an event here that other components can listen to
        const event = new CustomEvent('pageRestored', { 
          detail: { restoredAfter: Date.now() - lastHidden } 
        });
        window.dispatchEvent(event);
      }
      
      // Clear the timestamp when page is visible
      SessionStorage.remove('app_last_hidden_timestamp');
    }
  }, [isPageVisible]);

  useEffect(() => {
    // Handle beforeunload to save any critical state
    const handleBeforeUnload = () => {
      // Save current path to restore navigation state
      SessionStorage.save('app_current_path', window.location.pathname);
      SessionStorage.save('app_session_timestamp', Date.now());
    };

    // Save application state when page is hidden or unloaded
    const handlePageHide = () => {
      SessionStorage.save('app_current_path', window.location.pathname);
      SessionStorage.save('app_session_timestamp', Date.now());
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  // Optional: Add memory usage monitoring in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const memoryMonitor = () => {
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          const used = Math.round(memory.usedJSHeapSize / 1048576); // MB
          const total = Math.round(memory.totalJSHeapSize / 1048576); // MB
          
          // Warn if memory usage is high (might trigger tab discarding)
          if (used > 100) { // 100MB threshold
            console.warn(`High memory usage detected: ${used}MB / ${total}MB`);
          }
        }
      };

      const interval = setInterval(memoryMonitor, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, []);

  return <>{children}</>;
}