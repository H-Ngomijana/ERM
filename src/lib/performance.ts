/**
 * Performance Optimization Utilities
 * - Debounce for search
 * - Throttle for scroll
 * - Memoization helpers
 */

/**
 * Debounce function to delay execution until input stops
 * Prevents excessive database queries during typing
 *
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds (default 300ms)
 * @returns Debounced function
 *
 * @example
 * const debouncedSearch = debounce((query) => {
 *   console.log('Searching for:', query);
 * }, 300);
 *
 * input.addEventListener('input', (e) => {
 *   debouncedSearch(e.target.value);
 * });
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number = 300
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

/**
 * Throttle function to limit execution frequency
 * Prevents excessive scroll/resize event handling
 *
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds (default 300ms)
 * @returns Throttled function
 *
 * @example
 * const throttledScroll = throttle(() => {
 *   console.log('Scrolling');
 * }, 300);
 *
 * window.addEventListener('scroll', throttledScroll);
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number = 300
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Memoize function results based on arguments
 * Useful for expensive computations
 *
 * @param func - Function to memoize
 * @returns Memoized function
 *
 * @example
 * const expensiveCalc = (a, b) => a + b;
 * const memoized = memoize(expensiveCalc);
 *
 * memoized(1, 2); // computed
 * memoized(1, 2); // cached result
 */
export const memoize = <T extends (...args: any[]) => any>(
  func: T
): T => {
  const cache = new Map();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
};

/**
 * React Hook: useDebounce - Debounce a value and return it after delay
 * Great for search inputs
 *
 * @param value - Value to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced value
 *
 * @example
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounce(search, 300);
 *
 * useEffect(() => {
 *   if (debouncedSearch) {
 *     searchVehicles(debouncedSearch);
 *   }
 * }, [debouncedSearch]);
 */
export const useDebounce = <T>(value: T, delay: number = 300): T => {
  const [debouncedValue, setDebouncedValue] = require('react').useState(value);

  require('react').useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

/**
 * React Hook: useThrottle - Throttle a value
 * Great for scroll events
 *
 * @param value - Value to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled value
 */
export const useThrottle = <T>(value: T, limit: number = 300): T => {
  const [throttledValue, setThrottledValue] = require('react').useState(value);
  const lastRanRef = require('react').useRef(Date.now());

  require('react').useEffect(() => {
    const now = Date.now();

    if (now >= lastRanRef.current + limit) {
      setThrottledValue(value);
      lastRanRef.current = now;
    } else {
      const timeout = setTimeout(() => {
        setThrottledValue(value);
        lastRanRef.current = Date.now();
      }, limit - (now - lastRanRef.current));

      return () => clearTimeout(timeout);
    }
  }, [value, limit]);

  return throttledValue;
};

/**
 * Performance: Lazy load images
 * Use with <img> tags to improve load time
 *
 * @example
 * <img
 *   src={imageSrc}
 *   loading="lazy"
 *   onError={(e) => e.currentTarget.src = '/placeholder.png'}
 * />
 */
export const lazyLoadImage = (
  src: string,
  placeholderSrc?: string
): {
  src: string;
  loading: 'lazy' | 'eager';
  onError: (e: any) => void;
} => ({
  src,
  loading: 'lazy',
  onError: (e) => {
    e.currentTarget.src = placeholderSrc || '/placeholder.png';
  },
});

/**
 * Performance: Cache API responses
 * Simple in-memory cache for API calls
 */
export class APICache {
  private static instance: APICache;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 5 * 60 * 1000; // 5 minutes default

  static getInstance(): APICache {
    if (!APICache.instance) {
      APICache.instance = new APICache();
    }
    return APICache.instance;
  }

  set(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    if (ttl) {
      setTimeout(() => this.cache.delete(key), ttl);
    } else {
      setTimeout(() => this.cache.delete(key), this.ttl);
    }
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }
}

/**
 * Performance: Measure function execution time
 * Useful for debugging slow functions
 *
 * @param name - Name of the function
 * @param func - Function to measure
 * @returns Result of function
 *
 * @example
 * const result = measurePerformance('search', () => {
 *   return vehicles.filter(v => v.plate.includes(query));
 * });
 */
export const measurePerformance = <T extends (...args: any[]) => any>(
  name: string,
  func: T
): ReturnType<T> => {
  const start = performance.now();
  const result = func();
  const end = performance.now();

  console.log(`⏱️  ${name} took ${(end - start).toFixed(2)}ms`);
  return result;
};

/**
 * Performance: Batch DOM updates
 * Prevents layout thrashing by batching DOM reads/writes
 *
 * @example
 * batchUpdates(() => {
 *   items.forEach(item => {
 *     item.style.color = 'red';
 *   });
 * });
 */
export const batchUpdates = (callback: () => void): void => {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback);
  } else {
    setTimeout(callback, 0);
  }
};

export default {
  debounce,
  throttle,
  memoize,
  useDebounce,
  useThrottle,
  lazyLoadImage,
  APICache,
  measurePerformance,
  batchUpdates,
};
