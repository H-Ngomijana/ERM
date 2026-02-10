/**
 * Performance Monitoring Hook
 * Tracks Core Web Vitals, page performance, and custom metrics
 */

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Performance metrics type
 */
export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number;  // Largest Contentful Paint
  fid?: number;  // First Input Delay
  cls?: number;  // Cumulative Layout Shift
  fcp?: number;  // First Contentful Paint
  
  // Navigation Timing
  navigationStart?: number;
  domContentLoaded?: number;
  loadComplete?: number;
  
  // Custom metrics
  customMetrics?: Record<string, number>;
}

/**
 * usePerformanceMonitor Hook
 * Automatically collect and track performance metrics
 * 
 * @param componentName - Name of component for logging
 * @param onMetrics - Callback when metrics are collected
 * 
 * @example
 * usePerformanceMonitor('Dashboard', (metrics) => {
 *   console.log('Dashboard metrics:', metrics);
 *   // Send to analytics
 *   analytics.track('dashboard_performance', metrics);
 * });
 */
export const usePerformanceMonitor = (
  componentName: string,
  onMetrics?: (metrics: PerformanceMetrics) => void
) => {
  const metricsRef = useRef<PerformanceMetrics>({});
  const observersRef = useRef<PerformanceObserver[]>([]);

  useEffect(() => {
    const metrics: PerformanceMetrics = {};

    // Get navigation timing
    const onPageLoad = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        metrics.navigationStart = navigation.fetchStart;
        metrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
        metrics.loadComplete = navigation.loadEventEnd - navigation.fetchStart;
      }

      // Get FCP (First Contentful Paint)
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(p => p.name === 'first-contentful-paint');
      if (fcpEntry) {
        metrics.fcp = fcpEntry.startTime;
      }
    };

    // Get FID (First Input Delay)
    if ('PerformanceObserver' in window) {
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if ('processingStart' in entry && 'startTime' in entry) {
              metrics.fid = (entry as any).processingStart - entry.startTime;
            }
          }
        });
        fidObserver.observe({ type: 'first-input', buffered: true });
        observersRef.current.push(fidObserver);
      } catch (e) {
        console.warn('FID observer not supported');
      }

      // Get LCP (Largest Contentful Paint)
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          metrics.lcp = lastEntry.startTime;
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        observersRef.current.push(lcpObserver);
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      // Get CLS (Cumulative Layout Shift)
      try {
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if ('hadRecentInput' in entry && !(entry as any).hadRecentInput) {
              metrics.cls = (metrics.cls || 0) + (entry as any).value;
            }
          }
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
        observersRef.current.push(clsObserver);
      } catch (e) {
        console.warn('CLS observer not supported');
      }
    }

    // Collect navigation timing on load
    if (document.readyState === 'complete') {
      onPageLoad();
    } else {
      window.addEventListener('load', onPageLoad);
    }

    // Report metrics after 3 seconds
    const reportTimeout = setTimeout(() => {
      metricsRef.current = metrics;
      console.log(`[${componentName}] Performance Metrics:`, metrics);
      onMetrics?.(metrics);
    }, 3000);

    return () => {
      clearTimeout(reportTimeout);
      window.removeEventListener('load', onPageLoad);
      observersRef.current.forEach(observer => observer.disconnect());
      observersRef.current = [];
    };
  }, [componentName, onMetrics]);

  return metricsRef.current;
};

/**
 * usePageLoadTime Hook
 * Measures total page load time from navigation start
 * 
 * @example
 * const loadTime = usePageLoadTime();
 * console.log(`Page loaded in ${loadTime}ms`);
 */
export const usePageLoadTime = (onComplete?: (loadTime: number) => void) => {
  const startTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    const onLoad = () => {
      const loadTime = performance.now() - startTimeRef.current;
      console.log(`⏱️ Page load time: ${loadTime.toFixed(2)}ms`);
      onComplete?.(loadTime);
    };

    if (document.readyState === 'complete') {
      onLoad();
    } else {
      window.addEventListener('load', onLoad);
      return () => window.removeEventListener('load', onLoad);
    }
  }, [onComplete]);
};

/**
 * useMeasureRender Hook
 * Measures how long a component takes to render
 * 
 * @example
 * useMeasureRender('ExpensiveList');
 */
export const useMeasureRender = (componentName: string) => {
  const renderTimeRef = useRef<number>(performance.now());

  // Log when component has rendered (in layout effect, after DOM is updated)
  useEffect(() => {
    const renderTime = performance.now() - renderTimeRef.current;
    console.log(`🎨 ${componentName} rendered in ${renderTime.toFixed(2)}ms`);
  }, [componentName]);

  return () => {
    renderTimeRef.current = performance.now();
  };
};

/**
 * useSlowRenderDetection Hook
 * Warns when component renders take > threshold milliseconds
 * 
 * @param componentName - Component name for warning
 * @param thresholdMs - Threshold in milliseconds (default 16ms for 60fps)
 * 
 * @example
 * useSlowRenderDetection('Dashboard', 16);
 */
export const useSlowRenderDetection = (
  componentName: string,
  thresholdMs: number = 16
) => {
  const renderStartRef = useRef<number>(performance.now());

  useEffect(() => {
    const renderTime = performance.now() - renderStartRef.current;
    
    if (renderTime > thresholdMs) {
      console.warn(
        `⚠️ [${componentName}] Slow render detected: ${renderTime.toFixed(2)}ms (threshold: ${thresholdMs}ms)`
      );
    }
  }, [componentName, thresholdMs]);
};

/**
 * useMemoryMonitor Hook
 * Tracks memory usage (if available in browser)
 * 
 * @example
 * const memory = useMemoryMonitor();
 * if (memory) console.log(`Using ${(memory.usedJSHeapSize / 1048576).toFixed(2)}MB`);
 */
export const useMemoryMonitor = (intervalMs: number = 5000) => {
  const memoryRef = useRef<any>(null);

  useEffect(() => {
    const checkMemory = () => {
      if ('memory' in performance) {
        const mem = (performance as any).memory;
        memoryRef.current = {
          usedMemory: (mem.usedJSHeapSize / 1048576).toFixed(2) + 'MB',
          totalMemory: (mem.totalJSHeapSize / 1048576).toFixed(2) + 'MB',
          limit: (mem.jsHeapSizeLimit / 1048576).toFixed(2) + 'MB',
          percentage: ((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100).toFixed(2) + '%',
        };
        
        if (parseFloat(memoryRef.current.percentage) > 75) {
          console.warn('⚠️ High memory usage:', memoryRef.current);
        }
      }
    };

    checkMemory();
    const interval = setInterval(checkMemory, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return memoryRef.current;
};

/**
 * useInteractionMetrics Hook
 * Tracks user interactions (clicks, keyboard input)
 * 
 * @example
 * const metrics = useInteractionMetrics();
 */
export const useInteractionMetrics = () => {
  const metricsRef = useRef({
    clicks: 0,
    keyPresses: 0,
    totalInteractions: 0,
  });

  const recordClick = useCallback(() => {
    metricsRef.current.clicks++;
    metricsRef.current.totalInteractions++;
  }, []);

  const recordKeyPress = useCallback(() => {
    metricsRef.current.keyPresses++;
    metricsRef.current.totalInteractions++;
  }, []);

  useEffect(() => {
    window.addEventListener('click', recordClick);
    window.addEventListener('keypress', recordKeyPress);

    return () => {
      window.removeEventListener('click', recordClick);
      window.removeEventListener('keypress', recordKeyPress);
    };
  }, [recordClick, recordKeyPress]);

  return metricsRef.current;
};

/**
 * useNetworkStatus Hook
 * Monitors network connection status
 * 
 * @example
 * const { online, effectiveType } = useNetworkStatus();
 */
export const useNetworkStatus = (onStatusChange?: (status: boolean) => void) => {
  const [status, setStatus] = useState({
    online: navigator.onLine,
    effectiveType: (navigator as any).connection?.effectiveType || 'unknown',
    downlink: (navigator as any).connection?.downlink || 0,
    rtt: (navigator as any).connection?.rtt || 0,
    saveData: (navigator as any).connection?.saveData || false,
  });

  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, online: true }));
      onStatusChange?.(true);
      console.log('🌐 Network: Online');
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, online: false }));
      onStatusChange?.(false);
      console.log('🌐 Network: Offline');
    };

    const handleConnectionChange = () => {
      const conn = (navigator as any).connection;
      if (conn) {
        setStatus(prev => ({
          ...prev,
          effectiveType: conn.effectiveType,
          downlink: conn.downlink,
          rtt: conn.rtt,
          saveData: conn.saveData,
        }));
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    (navigator as any).connection?.addEventListener?.('change', handleConnectionChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      (navigator as any).connection?.removeEventListener?.('change', handleConnectionChange);
    };
  }, [onStatusChange]);

  return status;
};

/**
 * Performance Monitoring Utilities
 * Collection of hooks and functions for measuring app performance
 */
export default {
  usePerformanceMonitor,
  usePageLoadTime,
  useMeasureRender,
  useSlowRenderDetection,
  useMemoryMonitor,
  useInteractionMetrics,
  useNetworkStatus,
};
