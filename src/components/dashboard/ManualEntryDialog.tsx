import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';

interface Vehicle {
  id: string;
  plate_number: string;
  make: string | null;
  model: string | null;
}

const manualEntrySchema = z.object({
  vehicle_id: z.string().min(1, 'Please select or enter a vehicle'),
  plate_number: z.string().min(1, 'Plate number is required').toUpperCase(),
});

type ManualEntryFormData = z.infer<typeof manualEntrySchema>;

interface ManualEntryDialogProps {
  onEntryAdded?: () => void;
}

export const ManualEntryDialog: React.FC<ManualEntryDialogProps> = ({ onEntryAdded }) => {
  const [open, setOpen] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const { toast } = useToast();

  const form = useForm<ManualEntryFormData>({
    resolver: zodResolver(manualEntrySchema),
    defaultValues: {
      vehicle_id: '',
      plate_number: '',
    },
  });

  useEffect(() => {
    if (open) {
      fetchVehicles();
    }
  }, [open]);

  const fetchVehicles = async () => {
    setIsLoadingVehicles(true);
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, plate_number, make, model')
      .order('plate_number');

    if (error) {
      console.error('Error fetching vehicles:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load vehicles' });
    } else {
      setVehicles(data || []);
    }
    setIsLoadingVehicles(false);
  };

  const handleSubmit = async (data: ManualEntryFormData) => {
    setIsSubmitting(true);

    try {
      // Check if vehicle exists
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id')
        .eq('id', data.vehicle_id)
        .single();

      if (vehicleError || !vehicleData) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Vehicle not found. Please select a vehicle from the list.',
        });
        setIsSubmitting(false);
        return;
      }

      // Create garage entry
      const { error: entryError } = await supabase.from('garage_entries').insert({
        vehicle_id: data.vehicle_id,
        status: 'inside',
        entry_time: new Date().toISOString(),
        notes: 'Manual entry - no camera capture',
      });

      if (entryError) {
        throw entryError;
      }

      toast({
        title: 'Vehicle entry logged',
        description: `${data.plate_number} has been logged as entered`,
      });

      form.reset();
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Manual Entry
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Vehicle Entry</DialogTitle>
          <DialogDescription>
            Manually log a vehicle entry when camera capture is not available
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="vehicle_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a registered vehicle" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingVehicles ? (
                        <div className="p-2 text-center text-sm text-muted-foreground">
                          Loading vehicles...
                        </div>
                      ) : vehicles.length === 0 ? (
                        <div className="p-2 text-center text-sm text-muted-foreground">
                          No vehicles registered
                        </div>
                      ) : (
                        vehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.plate_number} -{' '}
                            {vehicle.make && vehicle.model
                              ? `${vehicle.make} ${vehicle.model}`
                              : 'No details'}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="plate_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plate Number (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="For verification purposes"
                      {...field}
                      readOnly
                      className="bg-muted"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !form.watch('vehicle_id')}
                className="gap-2"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Log Entry
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
