-- Disable email confirmation requirement in Supabase
-- Run this in Supabase SQL Editor to allow users to login without email verification

-- This updates the auth configuration to not require email confirmation
-- Note: You also need to toggle this in the Supabase Dashboard UI:
-- Authentication → Providers → Email → Toggle OFF "Confirm email"

-- Alternative: Force confirm all pending emails
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email_confirmed_at IS NULL;

-- This confirms any unconfirmed emails immediately
-- Now all users can login without verification
