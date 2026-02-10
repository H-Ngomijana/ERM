import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AlertCircle, Loader2, QrCode } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface QuickEntryDialogProps {
  onEntryAdded?: () => void;
}

export const QuickEntryDialog: React.FC<QuickEntryDialogProps> = ({ onEntryAdded }) => {
  const [open, setOpen] = useState(false);
  const [plateNumber, setPlateNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [foundVehicle, setFoundVehicle] = useState<any | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const { toast } = useToast();

  const handlePlateChange = async (value: string) => {
    const upperValue = value.toUpperCase();
    setPlateNumber(upperValue);
    setFoundVehicle(null);
    setShowWarning(false);

    // Search for vehicle if plate number is valid
    if (upperValue.length >= 3) {
      const { data } = await supabase
        .from('vehicles')
        .select('id, plate_number, make, model, clients(name)')
        .eq('plate_number', upperValue)
        .single();

      if (data) {
        setFoundVehicle(data);
      } else {
        setShowWarning(true); // Vehicle not registered
      }
    }
  };

  const handleSubmit = async () => {
    if (!plateNumber.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a plate number' });
      return;
    }

    setIsSubmitting(true);

    try {
      let vehicleId = foundVehicle?.id;

      // If vehicle not found in system, create a temporary entry
      if (!vehicleId) {
        // Try to create a temporary vehicle record
        const { data: tempVehicle, error: createError } = await supabase
          .from('vehicles')
          .insert({
            plate_number: plateNumber.toUpperCase(),
            make: null,
            model: 'Unknown',
            color: null,
            year: null,
          })
          .select('id')
          .single();

        if (createError && createError.code !== '23505') {
          // 23505 is unique constraint violation
          throw createError;
        }

        if (tempVehicle) {
          vehicleId = tempVehicle.id;
        } else {
          // Vehicle already exists, fetch it
          const { data: existing } = await supabase
            .from('vehicles')
            .select('id')
            .eq('plate_number', plateNumber.toUpperCase())
            .single();

          vehicleId = existing?.id;
        }
      }

      if (!vehicleId) {
        throw new Error('Could not find or create vehicle');
      }

      // Create garage entry
      const { error: entryError } = await supabase.from('garage_entries').insert({
        vehicle_id: vehicleId,
        status: 'inside',
        entry_time: new Date().toISOString(),
        notes: showWarning
          ? `Manual entry - vehicle not registered (${plateNumber})`
          : 'Manual entry - quick entry',
      });

      if (entryError) throw entryError;

      toast({
        title: 'Vehicle entry logged',
        description: `${plateNumber.toUpperCase()}${foundVehicle ? ` (${foundVehicle.clients?.name || 'No client'})` : ' [unregistered]'} has been logged as entered`,
      });

      // Reset and close
      setPlateNumber('');
      setFoundVehicle(null);
      setShowWarning(false);
      setOpen(false);
      onEntryAdded?.();
    } catch (error: any) {
      console.error('Error creating entry:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to log vehicle entry',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && plateNumber.trim() && !isSubmitting) {
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <QrCode className="h-4 w-4" />
          Quick Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Vehicle Entry</DialogTitle>
          <DialogDescription>
            Enter plate number to log vehicle entry instantly
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input */}
          <div>
            <label className="text-sm font-medium">Plate Number</label>
            <Input
              type="text"
              placeholder="Enter plate number..."
              value={plateNumber}
              onChange={(e) => handlePlateChange(e.target.value)}
              onKeyPress={handleKeyPress}
              autoFocus
              className="mt-2 text-lg tracking-widest uppercase font-mono"
            />
          </div>

          {/* Vehicle Found Info */}
          {foundVehicle && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                <div className="font-semibold">✓ Vehicle Found</div>
                <div className="text-sm mt-1">
                  {foundVehicle.make} {foundVehicle.model || 'Unknown'}
                </div>
                {foundVehicle.clients?.name && (
                  <div className="text-sm">Owner: {foundVehicle.clients.name}</div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Vehicle Not Found Warning */}
          {showWarning && !foundVehicle && plateNumber.length >= 3 && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 ml-2">
                ⚠ Vehicle not registered. Will create new entry as "Unknown Vehicle"
              </AlertDescription>
            </Alert>
          )}

          {/* Buttons */}
          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!plateNumber.trim() || isSubmitting}
              className="gap-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Log Entry
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
