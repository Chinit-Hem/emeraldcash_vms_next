"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Save, Loader2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

interface Asset {
  id: string;
  name: string;
  item_code: string;
  type: string;
  category?: string;
  quantity: number;
  location?: string;
  assigned_to?: string;
  description?: string;
  status: 'Available' | 'In Use' | 'Borrowed';
  image_url?: string;
}

export default function EditAssetPage() {
  const router = useRouter();
  const params = useParams();
  const assetId = params.id as string;

  const [asset, setAsset] = useState<Asset | null>(null);
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (assetId) {
      fetchAsset();
    }
  }, [assetId]);

  const fetchAsset = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sms/assets/${assetId}`);
      if (response.ok) {
        const data = await response.json();
        const assetData = data.data || data.asset;
        setAsset(assetData);
        setForm({
          name: assetData.name || '',
          itemCode: assetData.item_code || '',
          type: assetData.type || '',
          category: assetData.category || '',
          quantity: assetData.quantity || 1,
          location: assetData.location || '',
          assignedTo: assetData.assigned_to || '',
          description: assetData.description || '',
          status: assetData.status || 'Available',
        });
      } else {
        setError('Asset not found');
      }
    } catch (err) {
      setError('Failed to load asset');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.type) {
      setError('Name and type required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('id', assetId);
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

      const response = await fetch(`/api/sms/assets/${assetId}`, {
        method: 'PUT',
        body: formData,
      });
      if (response.ok) {
        router.push('/sms/assets');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update asset');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className=\"p-6 max-w-2xl mx-auto flex items-center justify-center min-h-[400px]\">
        <div className=\"text-center\">
          <Loader2 className=\"w-8 h-8 animate-spin mx-auto mb-4 text-emerald-600\" />
          <p>Loading asset...</p>
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className=\"p-6 max-w-2xl mx-auto\">
        <Link href=\"/sms/assets\" className=\"inline-flex items-center gap-2 p-2 -m-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 mb-8 font-medium transition-all shadow-sm\">
          <ArrowLeft className=\"w-5 h-5\" />
          Back to Assets
        </Link>
        <div className=\"bg-red-50 border border-red-200 rounded-2xl p-8 text-center\">
          <p className=\"text-red-800 text-lg mb-4\">{error || 'Asset not found'}</p>
          <Link href=\"/sms/assets\" className=\"inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all\">
            Go to Assets List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className=\"p-6 max-w-2xl mx-auto\">
      <Link href=\"/sms/assets\" className=\"inline-flex items-center gap-2 p-2 -m-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 mb-8 font-medium transition-all shadow-sm hover:shadow-md bg-white/80 backdrop-blur-sm border hover:border-slate-200\">
        <ArrowLeft className=\"w-5 h-5\" />
        Assets
      </Link>
      <h1 className=\"text-3xl font-bold mb-8\">Edit Asset</h1>
      <form onSubmit={handleSubmit} className=\"space-y-6 bg-white p-8 rounded-2xl shadow-lg border\">
        <div>
          <label className=\"block text-sm font-medium mb-2\">Name</label>
          <input 
            className=\"w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500\"
            value={form.name}
            onChange={(e) => setForm({...form, name: e.target.value})}
            required
            disabled={saving}
          />
        </div>
        <div className=\"grid grid-cols-2 gap-4\">
          <div>
            <label className=\"block text-sm font-medium mb Ascending 2\">Item Code</label>
            <input 
              className=\"w-full p-3 border rounded-xl\"
              value={form.itemCode}
              onChange={(e) => setForm({...form, itemCode: e.target.value})}
              disabled={saving}
            />
          </div>
          <div>
            <label className=\"block text-sm font-medium mb-2\">Type</label>
            <input 
              className=\"w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500\"
              value={form.type}
              onChange={(e) => setForm({...form, type: e.target.value})}
              required
              disabled={saving}
            />
          </div>
        </div>
        <div className=\"grid grid-cols-2 gap-4\">
          <div>
            <label className=\"block text-sm font-medium mb-2\">Quantity</label>
            <input 
              type=\"number\"
              min=\"1\"
              className=\"w-full p-3 border rounded-xl\"
              value={form.quantity}
              onChange={(e) => setForm({...form, quantity: parseInt(e.target.value) || 1})}
              disabled={saving}
            />
          </div>
          <div>
            <label className=\"block text-sm font-medium mb-2\">Status</label>
            <select 
              className=\"w-full p-3 border rounded-xl\"
              value={form.status}
              onChange={(e) => setForm({...form, status: e.target.value as any})}
              disabled={saving}
            >
              <option value=\"Available\">Available</option>
              <option value=\"In Use\">In Use</option>
              <option value=\"Borrowed\">Borrowed</option>
            </select>
          </div>
        </div>
        <div>
          <label className=\"block text-sm font-medium mb-2\">Location</label>
          <input 
            className=\"w-full p-3 border rounded-xl\"
            value={form.location}
            onChange={(e) => setForm({...form, location: e.target.value})}
            disabled={saving}
          />
        </div>
        <div>
          <label className=\"block text-sm font-medium mb-2\">Assigned To</label>
          <input 
            className=\"w-full p-3 border rounded-xl\"
            value={form.assignedTo}
            onChange={(e) => setForm({...form, assignedTo: e.target.value})}
            disabled={saving}
          />
        </div>
        <div>
          <label className=\"block text-sm font-medium mb-2\">Image</label>
          <input 
            type=\"file\"
            accept=\"image/*\"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className=\"w-full p-3 border border-dashed rounded-xl\"
            disabled={saving}
          />
          {asset.image_url && (
            <div className=\"mt-2\">
              <img src={asset.image_url} alt=\"Current\" className=\"w-24 h-24 object-cover rounded-xl border shadow-sm\" />
            </div>
          )}
        </div>
        <div>
          <label className=\"block text-sm font-medium mb-2\">Description</label>
          <textarea 
            className=\"w-full p-3 border rounded-xl h-24 resize-vertical\"
            value={form.description}
            onChange={(e) => setForm({...form, description: e.target.value})}
            disabled={saving}
          />
        </div>
        {error && <div className=\"p-4 bg-red-100 border border-red-200 rounded-xl text-red-800\">{error}</div>}
        <div className=\"flex gap-4\">
          <button
            type=\"button\"
            onClick={() => router.back()}
            disabled={saving}
            className=\"px-6 py-3 bg-slate-200 text-slate-800 rounded-xl hover:bg-slate-300 disabled:opacity-50 transition-colors\"
          >
            Cancel
          </button>
          <button
            type=\"submit\"
            disabled={saving}
            className=\"flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 transition-all flex items-center gap-2 justify-center\"
          >
            {saving ? (
              <>
                <Loader2 className=\"w-5 h-5 animate-spin\" />
                Saving...
              </>
            ) : (
              <>
                <Save className=\"w-5 h-5\" />
                Update Asset
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
