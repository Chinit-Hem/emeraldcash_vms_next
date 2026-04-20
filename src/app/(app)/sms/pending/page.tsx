"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

interface User {
  username: string;
  full_name?: string;
  role?: string;
  email?: string;
  phone?: string;
  profile_picture?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

interface PendingTransfer {
  id: string;
  assetId: string;
  asset?: { name: string; item_code: string };
  senderId: number;
  receiverId: number;
  location: string;
  status: 'pending';
  remark?: string;
  createdAt: string;
}

export default function PendingPage() {
  const [pending, setPending] = useState<PendingTransfer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/auth/users');
      const data = await res.json();
      if (data.ok && data.users) {
        setUsers(data.users);
      } else {
        console.warn('Failed to fetch users:', data);
      }
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };

  const getUserName = (userId: number) => {
    const userIndex = userId - 1;
    const user = users[userIndex];
    return user ? (user.full_name || user.username) : `User ${userId}`;
  };

  useEffect(() => {
    fetchUsers();
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sms/transfers');
      const data = await res.json();
      if (data.success) {
        setPending(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch pending transfers', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (transferId: string, action: 'accept' | 'reject', remark?: string) => {
    setActionLoading(transferId);
    try {
      const url = `/api/sms/transfers/${action === 'accept' ? '' : 'reject'}`;
      const body = action === 'reject' ? { remark } : {};
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transferId, ...body }),
      });
      if (res.ok) {
        alert(`${action.toUpperCase()}d successfully`);
        fetchPending();
      } else {
        const error = await res.json();
        alert(error.error || 'Action failed');
      }
    } catch (error) {
      alert('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
<div className="flex items-center gap-4 mb-8">
        <Link href="/sms" className="inline-flex items-center gap-2 p-2 -m-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-medium transition-all shadow-sm hover:shadow-md bg-white/80 backdrop-blur-sm border hover:border-slate-200">
          <ArrowLeft className="w-5 h-5" />
          SMS
        </Link>
        <h1 className="text-3xl font-bold">Pending Transfers ({pending.length})</h1>
        <Link href="/sms/transfer" className="ml-auto bg-emerald-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-emerald-700">
          + New Transfer
        </Link>
      </div>

      <div className="space-y-4">
        {pending.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-slate-500">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">No Pending Transfers</h3>
              <p>Great! All transfers are processed.</p>
              <Link href="/sms/transfer" className="mt-6 inline-block bg-emerald-600 text-white px-6 py-2 rounded-xl font-medium">
                Create Transfer
              </Link>
            </CardContent>
          </Card>
        ) : (
          pending.map((transfer) => (
            <Card key={transfer.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="font-bold text-lg">Transfer #{transfer.id.slice(-8)}</CardTitle>
                    <p className="text-sm text-slate-600">
                      {transfer.asset ? `${transfer.asset.name} (${transfer.asset.item_code})` : 'Asset'}
                    </p>
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">From:</span>{' '}
                    <Link href="/settings#users" className="hover:underline font-medium">
                      {getUserName(transfer.senderId)}
                    </Link>
                  </div>
                  <div>
                    <span className="text-slate-500">To:</span>{' '}
                    <Link href="/settings#users" className="hover:underline font-medium">
                      {getUserName(transfer.receiverId)}
                    </Link>
                  </div>
                  <div>
                    <span className="text-slate-500">Location:</span> {transfer.location}
                  </div>
                  <div>
                    <span className="text-slate-500">Created:</span> {new Date(transfer.createdAt).toLocaleString()}
                  </div>
                </div>
              </CardContent>
              <div className="flex gap-3 p-6 border-t bg-slate-50">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="default" disabled={actionLoading === transfer.id}>
                      Accept
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Accept Transfer</AlertDialogTitle>
                      <AlertDialogDescription>
                        Accept transfer from{' '}
                        <Link href="/settings#users" className="hover:underline font-medium">
                          {getUserName(transfer.senderId)}
                        </Link>{' '}
                        to{' '}
                        <Link href="/settings#users" className="hover:underline font-medium">
                          {getUserName(transfer.receiverId)}
                        </Link>
                        ?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleAction(transfer.id, 'accept')} disabled={actionLoading === transfer.id}>
                        Accept
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={actionLoading === transfer.id}>
                      Reject
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reject Transfer</AlertDialogTitle>
                      <AlertDialogDescription>
                        Reject transfer from{' '}
                        <Link href="/settings#users" className="hover:underline font-medium">
                          {getUserName(transfer.senderId)}
                        </Link>
                        ?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleAction(transfer.id, 'reject')} disabled={actionLoading === transfer.id}>
                        Reject
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

