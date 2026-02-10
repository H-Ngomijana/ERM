/**
 * Skeleton Loaders for Improved Perceived Performance
 * Displays placeholder content while data loads
 */

import React from 'react';
import { cn } from "@/lib/utils";

/**
 * Generic Skeleton component
 * Animated placeholder for loading states
 */
interface SkeletonProps {
  className?: string;
  count?: number;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

function Skeleton({
  className,
  count = 1,
  width = '100%',
  height = '1rem',
  circle = false,
  ...props
}: SkeletonProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "animate-pulse rounded-md bg-muted",
            circle && "rounded-full",
            className
          )}
          style={{
            width: typeof width === 'number' ? `${width}px` : width,
            height: typeof height === 'number' ? `${height}px` : height,
          }}
          {...props}
        />
      ))}
    </>
  );
}

/**
 * Vehicle Card Skeleton
 * Placeholder for VehicleCard component
 */
const VehicleCardSkeleton: React.FC = () => (
  <div className="rounded-lg border border-gray-200 p-4 space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex-1 space-y-2">
        <Skeleton width="80%" height="1.5rem" />
        <Skeleton width="60%" height="1rem" />
      </div>
      <Skeleton width="60px" height="24px" circle />
    </div>
    <div className="pt-2 border-t border-gray-200">
      <Skeleton width="100%" height="0.875rem" />
    </div>
  </div>
);

/**
 * Dashboard Card Skeleton
 * Placeholder for dashboard stat cards
 */
const DashboardCardSkeleton: React.FC = () => (
  <div className="rounded-lg border border-gray-200 p-4 space-y-3">
    <Skeleton width="30%" height="1rem" />
    <Skeleton width="100%" height="2rem" />
    <Skeleton width="50%" height="0.875rem" />
  </div>
);

/**
 * List Skeleton
 * Placeholder for lists with multiple items
 */
interface ListSkeletonProps {
  count?: number;
}

const ListSkeleton: React.FC<ListSkeletonProps> = ({
  count = 5,
}) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, i) => (
      <VehicleCardSkeleton key={i} />
    ))}
  </div>
);

/**
 * Table Skeleton
 * Placeholder for table data
 */
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
}) => (
  <div className="w-full">
    {/* Header */}
    <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} width="100%" height="1.5rem" />
      ))}
    </div>

    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <div
        key={rowIdx}
        className="grid gap-2 mb-2"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {Array.from({ length: columns }).map((_, colIdx) => (
          <Skeleton key={colIdx} width="100%" height="2.5rem" />
        ))}
      </div>
    ))}
  </div>
);

/**
 * Chart Skeleton
 * Placeholder for charts
 */
const ChartSkeleton: React.FC = () => (
  <div className="w-full h-80 rounded-lg border border-gray-200 p-4 space-y-4">
    <Skeleton width="30%" height="1.5rem" />
    <div className="flex items-end justify-between h-64 gap-1">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton
          key={i}
          width="8%"
          height={`${30 + Math.random() * 70}px`}
          className="rounded"
        />
      ))}
    </div>
  </div>
);

/**
 * Form Skeleton
 * Placeholder for form fields
 */
interface FormSkeletonProps {
  fields?: number;
}

const FormSkeleton: React.FC<FormSkeletonProps> = ({
  fields = 4,
}) => (
  <div className="space-y-4">
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton width="30%" height="1rem" />
        <Skeleton width="100%" height="2.5rem" className="rounded" />
      </div>
    ))}
    <Skeleton width="25%" height="2.5rem" className="rounded" />
  </div>
);

/**
 * User Avatar Skeleton
 * Placeholder for user profile picture
 */
const AvatarSkeleton: React.FC<{ size?: number }> = ({
  size = 40,
}) => (
  <Skeleton
    width={size}
    height={size}
    circle
  />
);

/**
 * Page Skeleton
 * Full page loading placeholder
 */
const PageSkeleton: React.FC = () => (
  <div className="space-y-6 p-6">
    {/* Header */}
    <div className="space-y-2">
      <Skeleton width="40%" height="2rem" />
      <Skeleton width="60%" height="1rem" />
    </div>

    {/* Content */}
    <div className="grid gap-6 md:grid-cols-2">
      <DashboardCardSkeleton />
      <DashboardCardSkeleton />
      <DashboardCardSkeleton />
      <DashboardCardSkeleton />
    </div>

    {/* List */}
    <div className="space-y-3">
      <Skeleton width="20%" height="1.5rem" />
      <ListSkeleton count={3} />
    </div>
  </div>
);

/**
 * Loading Spinner
 * Centered spinner for async operations
 */
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message,
}) => {
  const sizeClass = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  }[size];

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className={`${sizeClass} animate-spin rounded-full border-4 border-gray-300 border-t-blue-600`} />
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </div>
  );
};

/**
 * Empty State
 * Displays when no data is available
 */
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: () => void;
  actionLabel?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  actionLabel,
}) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-gray-300 py-12 px-4">
    {icon && <div className="text-4xl opacity-50">{icon}</div>}
    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    {description && <p className="text-sm text-gray-600 text-center max-w-md">{description}</p>}
    {action && actionLabel && (
      <button
        onClick={action}
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

export {
  Skeleton,
  VehicleCardSkeleton,
  DashboardCardSkeleton,
  ListSkeleton,
  TableSkeleton,
  ChartSkeleton,
  FormSkeleton,
  AvatarSkeleton,
  PageSkeleton,
  LoadingSpinner,
  EmptyState,
};
