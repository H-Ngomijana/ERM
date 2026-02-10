-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'operator');

-- Create vehicle status enum
CREATE TYPE public.vehicle_status AS ENUM ('inside', 'in_service', 'awaiting_approval', 'ready', 'exited');

-- Create approval status enum
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected', 'expired');

-- Create alert type enum
CREATE TYPE public.alert_type AS ENUM ('overdue', 'unapproved_exit', 'unknown_plate', 'after_hours', 'capacity_warning', 'duplicate_entry');

-- Create alert severity enum
CREATE TYPE public.alert_severity AS ENUM ('info', 'warning', 'critical');

-- ========================================
-- PROFILES TABLE (for user information)
-- ========================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========================================
-- USER ROLES TABLE (separate for security)
-- ========================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'operator',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- ========================================
-- CLIENTS TABLE
-- ========================================
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    whatsapp_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========================================
-- VEHICLES TABLE
-- ========================================
CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plate_number TEXT NOT NULL UNIQUE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    make TEXT,
    model TEXT,
    color TEXT,
    year INTEGER,
    notes TEXT,
    is_flagged BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========================================
-- GARAGE ENTRIES TABLE
-- ========================================
CREATE TABLE public.garage_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
    status vehicle_status NOT NULL DEFAULT 'inside',
    entry_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    exit_time TIMESTAMP WITH TIME ZONE,
    camera_id TEXT,
    snapshot_url TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========================================
-- APPROVALS TABLE
-- ========================================
CREATE TABLE public.approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    garage_entry_id UUID REFERENCES public.garage_entries(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    status approval_status NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    responded_at TIMESTAMP WITH TIME ZONE,
    response_notes TEXT,
    sent_via TEXT DEFAULT 'sms',
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========================================
-- ALERTS TABLE
-- ========================================
CREATE TABLE public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    garage_entry_id UUID REFERENCES public.garage_entries(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
    type alert_type NOT NULL,
    severity alert_severity NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========================================
-- AUDIT LOGS TABLE (immutable)
-- ========================================
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    actor_id UUID REFERENCES auth.users(id),
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========================================
-- GARAGE SETTINGS TABLE
-- ========================================
CREATE TABLE public.garage_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default garage settings
INSERT INTO public.garage_settings (key, value, description) VALUES
('capacity', '50', 'Maximum number of vehicles'),
('operating_hours', '{"start": "08:00", "end": "20:00"}', 'Operating hours'),
('overdue_threshold_hours', '24', 'Hours before vehicle is considered overdue'),
('critical_threshold_hours', '48', 'Hours before vehicle triggers critical alert');

-- ========================================
-- SECURITY DEFINER FUNCTION FOR ROLE CHECK
-- ========================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user has any admin role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'manager', 'operator')
  )
$$;

-- ========================================
-- ENABLE ROW LEVEL SECURITY
-- ========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garage_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garage_settings ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS POLICIES
-- ========================================

-- Profiles: Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Roles: Only admins can manage, all authenticated can read their own
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Clients: All staff can view and manage
CREATE POLICY "Staff can view clients" ON public.clients FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Staff can insert clients" ON public.clients FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Staff can update clients" ON public.clients FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete clients" ON public.clients FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Vehicles: All staff can view and manage
CREATE POLICY "Staff can view vehicles" ON public.vehicles FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Staff can insert vehicles" ON public.vehicles FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Staff can update vehicles" ON public.vehicles FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete vehicles" ON public.vehicles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Garage Entries: All staff can view and manage
CREATE POLICY "Staff can view entries" ON public.garage_entries FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Staff can insert entries" ON public.garage_entries FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Staff can update entries" ON public.garage_entries FOR UPDATE USING (public.is_admin(auth.uid()));

-- Approvals: All staff can view and manage
CREATE POLICY "Staff can view approvals" ON public.approvals FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Staff can insert approvals" ON public.approvals FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Staff can update approvals" ON public.approvals FOR UPDATE USING (public.is_admin(auth.uid()));

-- Alerts: All staff can view, manage their own resolutions
CREATE POLICY "Staff can view alerts" ON public.alerts FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Staff can insert alerts" ON public.alerts FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Staff can update alerts" ON public.alerts FOR UPDATE USING (public.is_admin(auth.uid()));

-- Audit Logs: All staff can view, only system can insert (no delete/update allowed)
CREATE POLICY "Staff can view audit logs" ON public.audit_logs FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- Garage Settings: Staff can view, only admins can modify
CREATE POLICY "Staff can view settings" ON public.garage_settings FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update settings" ON public.garage_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- ========================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_garage_entries_updated_at BEFORE UPDATE ON public.garage_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_approvals_updated_at BEFORE UPDATE ON public.approvals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- FUNCTION TO CREATE AUDIT LOG
-- ========================================
CREATE OR REPLACE FUNCTION public.create_audit_log(
    _action TEXT,
    _entity_type TEXT,
    _entity_id UUID,
    _details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (action, actor_id, entity_type, entity_id, details)
    VALUES (_action, auth.uid(), _entity_type, _entity_id, _details)
    RETURNING id INTO _log_id;
    
    RETURN _log_id;
END;
$$;

-- ========================================
-- ENABLE REALTIME FOR KEY TABLES
-- ========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.garage_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.approvals;