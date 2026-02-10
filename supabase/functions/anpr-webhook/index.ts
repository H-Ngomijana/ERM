import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ANPRPayload {
  plate_number: string;
  camera_id: string;
  timestamp?: string;
  snapshot_url?: string;
  event_type: "entry" | "exit";
}

interface VehicleRecord {
  id: string;
  is_flagged: boolean;
  client_id: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: ANPRPayload = await req.json();
    console.log("ANPR webhook received:", payload);

    const { plate_number, camera_id, timestamp, snapshot_url, event_type } = payload;

    if (!plate_number || !event_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: plate_number, event_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedPlate = plate_number.toUpperCase().replace(/\s+/g, " ").trim();

    // Get garage settings (with fallback to defaults)
    let capacity = 50;
    let operatingHours = { start: "08:00", end: "20:00" };

    try {
      const { data: capacitySetting, error: capacityError } = await supabase
        .from("garage_settings")
        .select("value")
        .eq("key", "capacity")
        .maybeSingle();

      const { data: hoursSetting, error: hoursError } = await supabase
        .from("garage_settings")
        .select("value")
        .eq("key", "operating_hours")
        .maybeSingle();

      if (!capacityError && capacitySetting) {
        capacity = parseInt(capacitySetting.value as string);
      }
      
      if (!hoursError && hoursSetting) {
        operatingHours = JSON.parse(hoursSetting.value as string);
      }
    } catch (error) {
      console.warn("Could not fetch garage settings, using defaults:", error);
      // Use default values above
    }

    // Check if vehicle exists
    const { data: existingVehicle } = await supabase
      .from("vehicles")
      .select("id, is_flagged, client_id")
      .eq("plate_number", normalizedPlate)
      .maybeSingle();

    let vehicle: VehicleRecord | null = existingVehicle;

    // Handle ENTRY event
    if (event_type === "entry") {
      // Check for duplicate entry (already inside)
      if (vehicle) {
        const { data: existingEntry } = await supabase
          .from("garage_entries")
          .select("id")
          .eq("vehicle_id", vehicle.id)
          .neq("status", "exited")
          .maybeSingle();

        if (existingEntry) {
          // Create duplicate entry alert
          await supabase.from("alerts").insert({
            vehicle_id: vehicle.id,
            type: "duplicate_entry",
            severity: "critical",
            message: `Duplicate entry attempt for ${normalizedPlate}`,
          });

          console.log("Duplicate entry blocked:", normalizedPlate);
          return new Response(
            JSON.stringify({ 
              success: false, 
              reason: "duplicate_entry",
              message: `Vehicle ${normalizedPlate} is already inside the garage` 
            }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Check capacity
      const { count: currentOccupancy } = await supabase
        .from("garage_entries")
        .select("*", { count: "exact", head: true })
        .neq("status", "exited");

      if ((currentOccupancy || 0) >= capacity) {
        await supabase.from("alerts").insert({
          type: "capacity_warning",
          severity: "critical",
          message: `Capacity exceeded. Entry blocked for ${normalizedPlate}`,
        });

        return new Response(
          JSON.stringify({ 
            success: false, 
            reason: "capacity_exceeded",
            message: "Garage capacity exceeded" 
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check after-hours entry
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      const isAfterHours = currentTime < operatingHours.start || currentTime > operatingHours.end;

      // Create vehicle if unknown
      if (!vehicle) {
        const { data: newVehicle, error: vehicleError } = await supabase
          .from("vehicles")
          .insert({ plate_number: normalizedPlate })
          .select("id, is_flagged, client_id")
          .single();

        if (vehicleError || !newVehicle) {
          console.error("Error creating vehicle:", vehicleError);
          return new Response(
            JSON.stringify({ error: "Failed to register vehicle" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        vehicle = newVehicle;

        // Alert for unknown plate
        await supabase.from("alerts").insert({
          vehicle_id: vehicle.id,
          type: "unknown_plate",
          severity: "info",
          message: `New vehicle registered: ${normalizedPlate}`,
        });
      }

      // Create entry record
      const { data: entry, error: entryError } = await supabase
        .from("garage_entries")
        .insert({
          vehicle_id: vehicle.id,
          status: "inside",
          entry_time: timestamp || new Date().toISOString(),
          camera_id,
          snapshot_url,
        })
        .select("id")
        .single();

      if (entryError || !entry) {
        console.error("Error creating entry:", entryError);
        return new Response(
          JSON.stringify({ error: "Failed to create entry record" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create after-hours alert if applicable
      if (isAfterHours) {
        await supabase.from("alerts").insert({
          garage_entry_id: entry.id,
          vehicle_id: vehicle.id,
          type: "after_hours",
          severity: "warning",
          message: `After-hours entry: ${normalizedPlate} at ${currentTime}`,
        });
      }

      // Create audit log
      await supabase.from("audit_logs").insert({
        action: "vehicle_entry",
        entity_type: "garage_entry",
        entity_id: entry.id,
        details: { plate_number: normalizedPlate, camera_id, is_after_hours: isAfterHours },
      });

      console.log("Entry recorded:", normalizedPlate, entry.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          entry_id: entry.id,
          vehicle_id: vehicle.id,
          is_new_vehicle: !vehicle.client_id,
          is_after_hours: isAfterHours,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle EXIT event
    if (event_type === "exit") {
      if (!vehicle) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            reason: "unknown_vehicle",
            message: `Unknown vehicle: ${normalizedPlate}` 
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find active entry
      const { data: activeEntry } = await supabase
        .from("garage_entries")
        .select("id, status")
        .eq("vehicle_id", vehicle.id)
        .neq("status", "exited")
        .order("entry_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!activeEntry) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            reason: "no_active_entry",
            message: `No active entry found for ${normalizedPlate}` 
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check for pending approval
      const { data: pendingApproval } = await supabase
        .from("approvals")
        .select("id")
        .eq("garage_entry_id", activeEntry.id)
        .eq("status", "pending")
        .maybeSingle();

      // Block exit if status is awaiting_approval or has pending approval
      if (activeEntry.status === "awaiting_approval" || pendingApproval) {
        await supabase.from("alerts").insert({
          garage_entry_id: activeEntry.id,
          vehicle_id: vehicle.id,
          type: "unapproved_exit",
          severity: "critical",
          message: `Exit blocked for ${normalizedPlate}: pending approval`,
        });

        return new Response(
          JSON.stringify({ 
            success: false, 
            reason: "pending_approval",
            message: `Exit blocked: ${normalizedPlate} has pending approval` 
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Allow exit
      const { error: exitError } = await supabase
        .from("garage_entries")
        .update({
          status: "exited",
          exit_time: timestamp || new Date().toISOString(),
        })
        .eq("id", activeEntry.id);

      if (exitError) {
        console.error("Error updating exit:", exitError);
        return new Response(
          JSON.stringify({ error: "Failed to record exit" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create audit log
      await supabase.from("audit_logs").insert({
        action: "vehicle_exit",
        entity_type: "garage_entry",
        entity_id: activeEntry.id,
        details: { plate_number: normalizedPlate, camera_id },
      });

      console.log("Exit recorded:", normalizedPlate, activeEntry.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          entry_id: activeEntry.id,
          message: `Exit recorded for ${normalizedPlate}` 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid event_type. Must be 'entry' or 'exit'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("ANPR webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
