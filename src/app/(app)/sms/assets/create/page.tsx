"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CreateAssetPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    itemCode: '',
    type: '',
    category: '',
    quantity: 1,
    location: '',
    assignedTo: '',
    description: '',
    status: 'Available' as 'Available' | 'In Use' | 'Borrowed',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.type) {
      setError('Name and type required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('item_code', form.itemCode);
      formData.append('type', form.type);
      formData.append('category', form.category);
      formData.append('quantity', form.quantity.toString());
      formData.append('location', form.location);
      formData.append('assigned_to', form.assignedTo);
      formData.append('description', form.description);
      formData.append('status', form.status);
      if (imageFile) formData.append('image', imageFile);

      const response = await fetch('/api/sms/assets', {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        router.push('/sms/assets');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create asset');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link href="/sms/assets" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8 font-medium transition-colors">
        <ArrowLeft className="w-5 h-5" />
        Assets
      </Link>
      <h1 className="text-3xl font-bold mb-8">New Asset</h1>
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-2xl shadow-lg border">
        <div>
          <label className="block text-sm font-medium mb-2">Name</label>
          <input 
            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            value={form.name}
            onChange={(e) => setForm({...form, name: e.target.value})}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Item Code</label>
            <input 
              className="w-full p-3 border rounded-xl"
              value={form.itemCode}
              onChange={(e) => setForm({...form, itemCode: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <input 
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={form.type}
              onChange={(e) => setForm({...form, type: e.target.value})}
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Quantity</label>
            <input 
              type="number"
              min="1"
              className="w-full p-3 border rounded-xl"
              value={form.quantity}
              onChange={(e) => setForm({...form, quantity: parseInt(e.target.value) || 1})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select 
              className="w-full p-3 border rounded-xl"
              value={form.status}
              onChange={(e) => setForm({...form, status: e.target.value as any})}
            >
              <option value="Available">Available</option>
              <option value="In Use">In Use</option>
              <option value="Borrowed">Borrowed</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Location</label>
          <input 
            className="w-full p-3 border rounded-xl"
            value={form.location}
            onChange={(e) => setForm({...form, location: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Assigned To</label>
          <input 
            className="w-full p-3 border rounded-xl"
            value={form.assignedTo}
            onChange={(e) => setForm({...form, assignedTo: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Image</label>
          <input 
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="w-full p-3 border border-dashed rounded-xl"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea 
            className="w-full p-3 border rounded-xl h-24 resize-vertical"
            value={form.description}
            onChange={(e) => setForm({...form, description: e.target.value})}
          />
        </div>
        {error && <div className="p-4 bg-red-100 border border-red-200 rounded-xl text-red-800">{error}</div>}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading}
            className="px-6 py-3 bg-slate-200 text-slate-800 rounded-xl hover:bg-slate-300 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 transition-all flex items-center gap-2 justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Create Asset
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

