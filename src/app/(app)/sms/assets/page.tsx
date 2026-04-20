"use client";

import { useState, useEffect } from 'react';
import { Search, Download, Filter, Plus, Image as ImageIcon, Edit3, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Asset {
  id: string;
  name: string;
  item_code: string;
  type: string;
  category?: string;
  quantity: number;
  location?: string;
  assigned_to?: string;
  status: 'Available' | 'In Use' | 'Borrowed';
  image_url?: string;
  description?: string;
  createdAt: string;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (assignedFilter) params.append('assigned_to', assignedFilter);
      
      const url = `/api/sms/assets?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setAssets(Array.isArray(data.data) ? data.data : []);
      } else {
        setAssets([]);
      }
    } catch (error) {
      console.error('Failed to fetch assets', error);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchAssets();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search, statusFilter, assignedFilter]);

  const getStatusBadge = (status: Asset['status']) => {
    const colors = {
      'Available': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'In Use': 'bg-amber-100 text-amber-800 border-amber-200',
      'Borrowed': 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status] || 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const availableCount = Array.isArray(assets) ? assets.filter(a => a.status === 'Available').length : 0;
  const inUseCount = Array.isArray(assets) ? assets.filter(a => a.status === 'In Use').length : 0;
  const borrowedCount = Array.isArray(assets) ? assets.filter(a => a.status === 'Borrowed').length : 0;

  const exportToExcel = () => {
    const headers = ['Name', 'Code', 'Type', 'Category', 'Qty', 'Location', 'Assigned', 'Status', 'Created'];
    const csv = [
      headers.join(','),
      ...assets.map(a => ([
        `\"${a.name}\"`,
        a.item_code,
        a.type,
        a.category || '',
        a.quantity,
        a.location || '',
        a.assigned_to || '',
        a.status,
        new Date(a.createdAt).toLocaleDateString(),
      ].join(','))),
    ].join('\\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sms-assets.csv';
    a.click();
  };

  if (loading) {
    return (
      <div className='p-12 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4'></div>
          <p className='text-slate-600'>Loading assets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='p-6 lg:p-8 max-w-7xl mx-auto'>
<div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8'>
        <Link href='/sms' className='inline-flex items-center gap-2 p-2 -m-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-medium transition-all shadow-sm hover:shadow-md bg-white/80 backdrop-blur-sm border hover:border-slate-200 hidden lg:flex'>
          <ArrowLeft className='w-5 h-5' />
          SMS
        </Link>
        <div>
          <h1 className='text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2'>
            SMS Assets
          </h1>
          <p className='text-slate-600'>Manage your inventory and track assignments</p>
        </div>
        <Link 
          href='/sms/assets/create'
          className='bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-8 py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 w-full lg:w-auto justify-center'
        >
          <Plus className='w-5 h-5' />
          Add New Asset
        </Link>
      </div>

      <div className='bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-xl p-6 mb-8'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div className='relative'>
            <Search className='w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400' />
            <input
              type='text'
              placeholder='Search name, code, employee...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-transparent shadow-lg bg-white/50 backdrop-blur-sm transition-all'
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className='px-4 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-transparent shadow-lg bg-white/50 backdrop-blur-sm transition-all'
          >
            <option value=''>All Status</option>
            <option value='Available'>Available</option>
            <option value='In Use'>In Use</option>
            <option value='Borrowed'>Borrowed</option>
          </select>
          <select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
            className='px-4 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-transparent shadow-lg bg-white/50 backdrop-blur-sm transition-all'
          >
            <option value=''>All Employees</option>
            <option value='John'>John Doe</option>
            <option value='Jane'>Jane Smith</option>
            <option value='Bob'>Bob Johnson</option>
          </select>
        </div>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
        <div className='bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-slate-200 shadow-lg text-center'>
          <div className='text-3xl font-bold text-emerald-600'>{assets.length}</div>
          <div className='text-sm text-slate-600 uppercase tracking-wide'>Total Items</div>
        </div>
        <div className='bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-slate-200 shadow-lg text-center'>
          <div className='text-3xl font-bold text-emerald-600'>{availableCount}</div>
          <div className='text-sm text-slate-600 uppercase tracking-wide'>Available</div>
        </div>
        <div className='bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-slate-200 shadow-lg text-center'>
          <div className='text-3xl font-bold text-amber-600'>{inUseCount}</div>
          <div className='text-sm text-slate-600 uppercase tracking-wide'>In Use</div>
        </div>
        <div className='bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-slate-200 shadow-lg text-center'>
          <div className='text-3xl font-bold text-red-600'>{borrowedCount}</div>
          <div className='text-sm text-slate-600 uppercase tracking-wide'>Borrowed</div>
        </div>
      </div>

      <div className='flex flex-col sm:flex-row gap-4 mb-8'>
        <button 
          onClick={exportToExcel}
          className='flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-medium shadow-lg hover:shadow-xl transition-all whitespace-nowrap'
        >
          <Download className='w-4 h-4' />
          Export to Excel
        </button>
        <div className='flex items-center gap-2 text-sm text-slate-500'>
          <Filter className='w-4 h-4' />
          {assets.length} results {statusFilter && ` • Status: ${statusFilter}`} {assignedFilter && ` • Assigned: ${assignedFilter}`}
        </div>
      </div>

      <div className='bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-slate-50/50'>
              <tr>
                <th className='p-6 text-left font-bold text-slate-700 uppercase text-xs tracking-wider'>Item</th>
                <th className='p-6 text-left font-bold text-slate-700 uppercase text-xs tracking-wider'>Details</th>
                <th className='p-6 text-left font-bold text-slate-700 uppercase text-xs tracking-wider'>Location</th>
                <th className='p-6 text-left font-bold text-slate-700 uppercase text-xs tracking-wider'>Status</th>
                <th className='p-6 text-center font-bold text-slate-700 uppercase text-xs tracking-wider'>Qty</th>
                <th className='p-6 text-left font-bold text-slate-700 uppercase text-xs tracking-wider'>Assigned</th>
                <th className='w-24 p-6'></th>
              </tr>
            </thead>
            <tbody>
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={7} className='p-16 text-center text-slate-500'>
                    <ImageIcon className='w-16 h-16 mx-auto mb-4 opacity-40 text-slate-400' />
                    <p className='text-2xl font-medium mb-2'>No assets found</p>
                    <p className='text-lg'>Try adjusting your search or filters</p>
                    <Link href='/sms/assets/create' className='inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl font-bold shadow-lg transition-all mt-4'>
                      <Plus className='w-4 h-4' />
                      Add First Asset
                    </Link>
                  </td>
                </tr>
              ) : (
                assets.map((asset) => (
                  <tr key={asset.id} className='border-t border-slate-100 hover:bg-slate-50/50 transition-colors'>
                    <td className='p-6'>
                      <div className='font-bold text-slate-900 mb-1 leading-tight'>{asset.name}</div>
                      <div className='text-sm font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded-full'>
                        {asset.item_code}
                      </div>
                    </td>
                    <td className='p-6'>
                      <div className='text-sm text-slate-700'>{asset.type}</div>
                      {asset.category && <div className='text-xs text-slate-500'>{asset.category}</div>}
                    </td>
                    <td className='p-6'>
                      <div className='text-sm font-medium text-slate-900'>{asset.location || 'Not set'}</div>
                    </td>
                    <td className='p-6'>
                      <span className={`px-4 py-2 rounded-full text-xs font-bold ${getStatusBadge(asset.status)}`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className='p-6 text-center'>
                      <div className='text-2xl font-bold text-emerald-600 mx-auto w-16'>{asset.quantity}</div>
                    </td>
                    <td className='p-6'>
                      <div className='text-sm font-medium text-slate-900 truncate max-w-32'>
                        {asset.assigned_to || <span className='text-slate-400'>Unassigned</span>}
                      </div>
                    </td>
                    <td className='p-6 text-right space-y-2'>
                      {asset.image_url ? (
                        <Link href={`/sms/assets/${asset.id}`} className='p-2 -m-2 rounded-xl hover:bg-slate-100 transition-colors block w-fit mx-auto'>
                          <ImageIcon className='w-5 h-5 text-slate-500' />
                        </Link>
                      ) : null}
                      <Link 
                        href={`/sms/assets/${asset.id}/edit`}
                        className='p-2 -m-2 rounded-xl hover:bg-emerald-100 hover:text-emerald-700 transition-colors block w-fit mx-auto'
                      >
                        <Edit3 className='w-5 h-5' />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className='mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-200'>
        <div className='text-center text-sm text-slate-500'>
          {assets.length} assets • Page 1 of 1 • Updated {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
}

