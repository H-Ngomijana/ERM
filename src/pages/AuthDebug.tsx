import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const AuthDebug = () => {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [status, setStatus] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const testConnection = async () => {
    setLogs([]);
    addLog('🔍 Testing Supabase connection...');
    
    try {
      addLog(`✓ Supabase URL: ${supabase.supabaseUrl}`);
      
      // Test auth availability
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        addLog(`✗ Session check failed: ${error.message}`);
      } else {
        addLog(`✓ Auth session check passed`);
        addLog(`✓ Current session: ${data.session ? 'Active' : 'None'}`);
      }
    } catch (err) {
      addLog(`✗ Connection error: ${err}`);
    }
  };

  const testSignUp = async () => {
    setLogs([]);
    addLog(`📝 Testing sign up with: ${email}`);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
        }
      });

      if (error) {
        addLog(`✗ Sign up error: ${error.message}`);
        addLog(`  Code: ${error.name}`);
      } else {
        addLog(`✓ Sign up successful!`);
        addLog(`✓ User ID: ${data.user?.id}`);
        addLog(`✓ Email confirmed: ${data.user?.email_confirmed_at ? 'Yes' : 'No'}`);
        setStatus('Account created! Try logging in now.');
      }
    } catch (err) {
      addLog(`✗ Sign up exception: ${err}`);
    }
  };

  const testLogin = async () => {
    setLogs([]);
    addLog(`🔐 Testing login with: ${email}`);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        addLog(`✗ Login error: ${error.message}`);
        addLog(`  Code: ${error.name}`);
        addLog(`  Status: ${error.status}`);
      } else {
        addLog(`✓ Login successful!`);
        addLog(`✓ User: ${data.user?.email}`);
        addLog(`✓ Session: ${data.session?.access_token ? 'Valid' : 'Invalid'}`);
        setStatus('✅ Login works!');
        
        // Auto logout for testing
        setTimeout(() => {
          supabase.auth.signOut().then(() => addLog('Auto logged out'));
        }, 2000);
      }
    } catch (err) {
      addLog(`✗ Login exception: ${err}`);
    }
  };

  const checkUser = async () => {
    setLogs([]);
    addLog(`🔎 Checking if user exists: ${email}`);
    
    try {
      // This would need backend access - for now just show RPC call
      const { data, error } = await supabase.rpc('check_user_exists', {
        user_email: email.trim().toLowerCase()
      }).catch(err => {
        addLog('⚠ RPC not available (expected), checking via auth only');
        return { data: null, error: null };
      });

      if (error) {
        addLog(`✗ Check error: ${error.message}`);
      } else {
        addLog(data ? `✓ User exists in system` : '⚠ Could not verify via RPC');
      }

      // Check current auth state
      const { data: { session } } = await supabase.auth.getSession();
      addLog(`Current auth state: ${session ? 'Logged in' : 'Logged out'}`);
    } catch (err) {
      addLog(`✗ Check exception: ${err}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>🔧 Authentication Debugging Tool</CardTitle>
            <CardDescription>Test login functionality and diagnose issues</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Input fields */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Email:</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password:</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password123"
              />
            </div>

            {/* Status */}
            {status && (
              <Alert>
                <AlertDescription>{status}</AlertDescription>
              </Alert>
            )}

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={testConnection} variant="outline">
                1️⃣ Test Connection
              </Button>
              <Button onClick={checkUser} variant="outline">
                2️⃣ Check User Exists
              </Button>
              <Button onClick={testSignUp} variant="outline">
                3️⃣ Test Sign Up
              </Button>
              <Button onClick={testLogin} className="bg-blue-600 hover:bg-blue-700">
                4️⃣ Test Login
              </Button>
            </div>

            {/* Logs */}
            {logs.length > 0 && (
              <div className="mt-6 p-3 bg-gray-900 text-gray-100 rounded font-mono text-sm max-h-64 overflow-y-auto space-y-1">
                {logs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>✓ How to Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>1. Click "Test Connection" to verify Supabase is reachable</p>
            <p>2. Click "Check User Exists" to see if your email is registered</p>
            <p>3. If user doesn't exist, click "Test Sign Up" to create one</p>
            <p>4. Click "Test Login" to verify login works</p>
            <p className="text-gray-600">💡 Share the logs below with your support team to diagnose the issue</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
