"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';

export default function TransferPage() {
  const router = useRouter();
  const [form, setForm] = useState({ assetId: '', senderId: 1, receiverId: 2, location: '', remark: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/sms/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (response.ok) {
        alert('Transfer created!');
        router.push('/sms');
      } else {
        alert('Failed to create transfer');
      }
    } catch (error) {
      alert('Error creating transfer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link href="/sms" className="inline-flex items-center gap-2 p-2 -m-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 mb-8 font-medium transition-all shadow-sm hover:shadow-md bg-white/80 backdrop-blur-sm border hover:border-slate-200">
        <ArrowLeft className="w-5 h-5" />
        SMS
      </Link>
      <h1 className="text-3xl font-bold mb-8">New Transfer</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-8 rounded-xl shadow-sm border">
        <div>
          <label className="block text-sm font-medium mb Ascending">Asset ID</label>
          <input 
            className="w-full p-3 border rounded-lg"
            value={form.assetId}
            onChange={(e) => setForm({...form, assetId: e.target.value})}
            required 
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Receiver ID</label>
          <input 
            type="number"
            className="w-full p-3 border rounded-lg"
            value={form.receiverId}
            onChange={(e) => setForm({...form, receiverId: parseInt(e.target.value)})}
            required
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <input 
            className="w-full p-3 border rounded-lg"
            value={form.location}
            onChange={(e) => setForm({...form, location: e.target.value})}
            required
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Remark</label>
          <textarea 
            className="w-full p-3 border rounded-lg h-24"
            value={form.remark}
onChange={(e) => setForm({...form, remark: e.target.value})}
            disabled={loading}
          />
        </div>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading}
className="flex Ascending px-4 py-2 bg-slate-200 text-slate Ascending rounded-lg hover:bg-slate-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Transfer'}
          </button>
        </div>
      </form>
    </div>
  );
}
