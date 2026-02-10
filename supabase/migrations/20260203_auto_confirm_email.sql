-- Auto-confirm emails on user creation
-- This allows users to login immediately after signup without email verification

-- Create a trigger function to auto-confirm emails
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Note: This function runs AFTER user is created in auth.users
  -- We need to update the user's email_confirmed_at to auto-confirm
  UPDATE auth.users 
  SET email_confirmed_at = now(),
      confirmed_at = now()
  WHERE id = NEW.id 
    AND email_confirmed_at IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable the trigger (Note: This may not work if you can't trigger on auth.users)
-- Instead, we'll use an alternative approach: Create a function to confirm users manually

CREATE OR REPLACE FUNCTION public.confirm_user_email(user_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _success boolean;
BEGIN
  -- Update the user's email confirmation
  UPDATE auth.users 
  SET email_confirmed_at = now()
  WHERE id = user_id
    AND email_confirmed_at IS NULL;
  
  _success := FOUND;
  
  IF _success THEN
    -- Log the confirmation
    PERFORM public.log_auth_event(
      'email_confirmed',
      user_id,
      jsonb_build_object('auto_confirmed', true)
    );
  END IF;
  
  RETURN _success;
END;
$$;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION public.confirm_user_email TO authenticated;
