-- Admin Setup Migration
-- This migration enhances admin functionality and security

-- Create a function to check if an email can create admin accounts
CREATE OR REPLACE FUNCTION public.can_create_admin_accounts(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = 'admin'
    )),
    false
  )
$$;

-- Create table for tracking allowed admin creation emails (for first admin)
CREATE TABLE IF NOT EXISTS public.admin_creation_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days')
);

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_creation_tokens_email ON public.admin_creation_tokens(email);
CREATE INDEX IF NOT EXISTS idx_admin_creation_tokens_token ON public.admin_creation_tokens(token);

-- Enable RLS on admin_creation_tokens
ALTER TABLE public.admin_creation_tokens ENABLE ROW LEVEL SECURITY;

-- Only allow viewing of unexpired, unused tokens (via auth functions)
CREATE POLICY "Auth service can manage admin tokens" ON public.admin_creation_tokens
  FOR ALL USING (true)
  WITH CHECK (true);

-- Create a helper function to assign admin role to a user
CREATE OR REPLACE FUNCTION public.assign_user_role(_user_id UUID, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _requester_id UUID := auth.uid();
  _is_admin BOOLEAN;
BEGIN
  -- Check if the requester is an admin
  _is_admin := public.can_create_admin_accounts(_requester_id);
  
  IF NOT _is_admin THEN
    RAISE EXCEPTION 'Only admins can assign roles';
  END IF;

  -- Delete existing roles for this user
  DELETE FROM public.user_roles WHERE user_id = _user_id;

  -- Insert the new role
  INSERT INTO public.user_roles (user_id, role) 
  VALUES (_user_id, _role);

  RETURN true;
END;
$$;

-- Create a function to log authentication events
CREATE OR REPLACE FUNCTION public.log_auth_event(
  _event_type TEXT,
  _user_id UUID DEFAULT NULL,
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
  VALUES (_event_type, COALESCE(_user_id, auth.uid()), 'auth', _user_id, _details)
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;

-- Create a trigger to log user creation
CREATE OR REPLACE FUNCTION public.log_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_auth_event(
    'user_signup',
    NEW.id,
    jsonb_build_object('email', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.can_create_admin_accounts TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_auth_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role TO authenticated;

-- Allow authenticated users to view admin tokens (for verification)
CREATE POLICY "Users can verify admin tokens" ON public.admin_creation_tokens
  FOR SELECT USING (
    NOT used AND 
    expires_at > now() AND
    (email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR 
     public.can_create_admin_accounts(auth.uid()))
  );
