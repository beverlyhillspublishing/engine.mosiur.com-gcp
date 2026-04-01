'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { startRegistration } from '@simplewebauthn/browser';
import { Fingerprint, Plus, Trash2, Pencil, Shield, Smartphone, Monitor, Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { passkeyApi, type Passkey } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

export default function SecurityPage() {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['passkeys'],
    queryFn: () => passkeyApi.list().then((r) => r.data.passkeys),
  });

  const passkeys: Passkey[] = data ?? [];

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      // 1. Get registration options from server
      const optionsRes = await passkeyApi.registerOptions();
      const options = optionsRes.data;

      // 2. Trigger platform authenticator
      const credential = await startRegistration(options);

      // 3. Verify with server
      await passkeyApi.registerVerify(credential, name || undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passkeys'] });
      setAddDialogOpen(false);
      setNewKeyName('');
      setStatusMsg('Passkey registered successfully.');
      setTimeout(() => setStatusMsg(''), 3000);
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message || '';
      if (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('abort')) {
        setErrorMsg('Registration was cancelled.');
      } else {
        setErrorMsg('Failed to register passkey. Please try again.');
      }
      setTimeout(() => setErrorMsg(''), 4000);
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => passkeyApi.rename(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passkeys'] });
      setRenameId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => passkeyApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passkeys'] });
    },
  });

  function getDeviceIcon(deviceType: string, transports: string[]) {
    if (transports.includes('internal') || deviceType === 'singleDevice') {
      return <Smartphone className="w-5 h-5 text-slate-500" />;
    }
    return <Monitor className="w-5 h-5 text-slate-500" />;
  }

  function getDeviceLabel(deviceType: string, backedUp: boolean) {
    if (deviceType === 'multiDevice') return backedUp ? 'Multi-device (synced)' : 'Multi-device';
    return 'This device only';
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Security</h1>
        <p className="text-slate-500 mt-1">Manage passkeys and authentication methods.</p>
      </div>

      {/* Status / error banners */}
      {statusMsg && (
        <div className="mb-4 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-4 py-3">
          <Check className="w-4 h-4" /> {statusMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
          {errorMsg}
        </div>
      )}

      {/* Passkeys card */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Fingerprint className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Passkeys</CardTitle>
              <CardDescription>
                Sign in using Face ID, Touch ID, or Windows Hello — no password needed.
              </CardDescription>
            </div>
          </div>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Passkey
          </Button>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : passkeys.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
              <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No passkeys registered yet.</p>
              <p className="text-slate-400 text-xs mt-1">
                Add a passkey to sign in without a password.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {passkeys.map((pk) => (
                <div key={pk.id} className="py-4 flex items-center gap-4">
                  {getDeviceIcon(pk.deviceType, pk.transports)}

                  <div className="flex-1 min-w-0">
                    {renameId === pk.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          renameMutation.mutate({ id: pk.id, name: renameName });
                        }}
                        className="flex gap-2"
                      >
                        <Input
                          value={renameName}
                          onChange={(e) => setRenameName(e.target.value)}
                          className="h-7 text-sm"
                          autoFocus
                        />
                        <Button type="submit" size="sm" variant="outline" disabled={renameMutation.isPending}>
                          Save
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setRenameId(null)}>
                          Cancel
                        </Button>
                      </form>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {pk.name || 'Unnamed passkey'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {getDeviceLabel(pk.deviceType, pk.backedUp)}
                          {pk.lastUsedAt && (
                            <> &middot; Last used {formatDistanceToNow(new Date(pk.lastUsedAt), { addSuffix: true })}</>
                          )}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {pk.backedUp && (
                      <Badge variant="secondary" className="text-xs">Synced</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRenameId(pk.id);
                        setRenameName(pk.name || '');
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (confirm('Delete this passkey? You will no longer be able to use it to sign in.')) {
                          deleteMutation.mutate(pk.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add passkey dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register a Passkey</DialogTitle>
            <DialogDescription>
              Give your passkey a name so you can identify it later, then follow the browser prompt
              to register using your device's biometrics or PIN.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label htmlFor="keyname">Passkey name (optional)</Label>
              <Input
                id="keyname"
                placeholder="e.g. MacBook Touch ID"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => addMutation.mutate(newKeyName)}
                disabled={addMutation.isPending}
              >
                {addMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Waiting for device…</>
                ) : (
                  <><Fingerprint className="w-4 h-4 mr-2" />Register Passkey</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
