/**
 * Vehicle Search Component
 * Implements debounced search with performance optimization
 */

import React, { useState, useMemo } from 'react';
import { useDebounce } from '@/lib/performance';
import { Input } from '@/components/ui/input';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Vehicle {
  id: string;
  plate: string;
  make: string;
  model: string;
  color: string;
  client_id: string;
  created_at: string;
}

interface VehicleSearchProps {
  vehicles: Vehicle[];
  onSelect?: (vehicle: Vehicle) => void;
  placeholder?: string;
  isLoading?: boolean;
  maxResults?: number;
}

/**
 * Efficient vehicle search with debouncing
 * Prevents excessive filtering while user is typing
 * Uses memoization to avoid recalculating results
 */
export const VehicleSearch: React.FC<VehicleSearchProps> = ({
  vehicles,
  onSelect,
  placeholder = 'Search vehicles by plate, make, or model...',
  isLoading = false,
  maxResults = 10,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Memoize search results to avoid recalculations
  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return vehicles.slice(0, maxResults);
    }

    const query = debouncedQuery.toLowerCase();
    return vehicles
      .filter(
        (vehicle) =>
          vehicle.plate.toLowerCase().includes(query) ||
          vehicle.make.toLowerCase().includes(query) ||
          vehicle.model.toLowerCase().includes(query) ||
          vehicle.color.toLowerCase().includes(query)
      )
      .slice(0, maxResults);
  }, [debouncedQuery, vehicles, maxResults]);

  const hasNoResults = debouncedQuery.trim() && searchResults.length === 0;

  return (
    <div className="w-full space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
        )}
      </div>

      {/* Results */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            {debouncedQuery && ` for "${debouncedQuery}"`}
          </CardTitle>
          <CardDescription>
            {isLoading && 'Searching...'}
            {!isLoading && hasNoResults && 'No vehicles found'}
            {!isLoading &&
              !hasNoResults &&
              (debouncedQuery
                ? 'Select a vehicle or refine your search'
                : 'Start typing to search')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-2 max-h-96 overflow-y-auto">
          {hasNoResults && (
            <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>No vehicles match your search. Try a different query.</span>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((vehicle) => (
                <button
                  key={vehicle.id}
                  onClick={() => onSelect?.(vehicle)}
                  className="w-full rounded-lg border border-gray-200 p-3 text-left transition-all hover:border-blue-400 hover:bg-blue-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">
                        {vehicle.plate.toUpperCase()}
                      </div>
                      <div className="text-sm text-gray-600">
                        {vehicle.make} {vehicle.model}
                      </div>
                    </div>
                    <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                      {vehicle.color}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchResults.length === 0 && !hasNoResults && (
            <div className="py-8 text-center text-sm text-gray-500">
              {isLoading ? 'Loading vehicles...' : 'No vehicles available'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Tip */}
      <p className="text-xs text-gray-500">
        💡 Search is debounced for {searchQuery !== debouncedQuery ? 'pending...' : 'instant'} results
      </p>
    </div>
  );
};

export default VehicleSearch;
