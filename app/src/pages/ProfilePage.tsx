import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  User, MapPin, Plus, Trash2, Wallet, CreditCard, Store,
  Pencil, Save, X, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isMerchant, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [addressData, setAddressData] = useState({
    label: 'Home', street: '', city: '', state: '', postalCode: '', phone: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleUpdateProfile = async () => {
    if (!fullName.trim()) return;
    setLoading(true);
    try {
      const response = await authAPI.updateProfile({ fullName });
      setUser(response.data.user);
      setEditing(false);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async () => {
    if (!addressData.street || !addressData.city || !addressData.state || !addressData.postalCode) {
      toast.error('Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      const response = await authAPI.addAddress(addressData);
      setUser(prev => prev ? { ...prev, addresses: response.data.addresses } : null);
      setShowAddressForm(false);
      setAddressData({ label: 'Home', street: '', city: '', state: '', postalCode: '', phone: '' });
      toast.success('Address added');
    } catch {
      toast.error('Failed to add address');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAddress = async (addressId: string) => {
    setLoading(true);
    try {
      const response = await authAPI.removeAddress(addressId);
      setUser(prev => prev ? { ...prev, addresses: response.data.addresses } : null);
      toast.success('Address removed');
    } catch {
      toast.error('Failed to remove address');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

      <div className="space-y-6">
        {/* Profile Info */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                {user.profileImage ? (
                  <img src={user.profileImage} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-indigo-600" />
                )}
              </div>
              <div>
                {editing ? (
                  <div className="flex items-center gap-2">
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-48" />
                    <Button size="sm" onClick={handleUpdateProfile} disabled={loading}>
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setFullName(user.fullName); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      {user.fullName}
                      <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-indigo-600">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </h2>
                  </>
                )}
                <p className="text-gray-500 text-sm">{user.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="capitalize">{user.role}</Badge>
                  {user.isEmailVerified && (
                    <Badge className="bg-green-100 text-green-700 border-green-200">Verified</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wallet */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Wallet Balance</p>
                <p className="text-2xl font-bold text-gray-900">Rs.{user.walletBalance?.toLocaleString() || 0}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate('/checkout')}>
              <CreditCard className="w-4 h-4 mr-2" /> Add Money
            </Button>
          </div>
        </div>

        {/* Merchant Profile */}
        {isMerchant && user.merchantProfile && (
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <Store className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Shop</p>
                  <p className="font-bold text-gray-900">{user.merchantProfile.shopName}</p>
                </div>
              </div>
              <Badge className={`capitalize ${
                user.merchantProfile.verificationStatus === 'verified'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {user.merchantProfile.verificationStatus}
              </Badge>
            </div>
            <Button onClick={() => navigate('/merchant-dashboard')} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full">
              Go to Dashboard
            </Button>
          </div>
        )}

        {/* Addresses */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-600" /> Saved Addresses
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddressForm(!showAddressForm)}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Address
            </Button>
          </div>

          {/* Add Address Form */}
          {showAddressForm && (
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Label</Label>
                  <select
                    value={addressData.label}
                    onChange={(e) => setAddressData(prev => ({ ...prev, label: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  >
                    <option>Home</option>
                    <option>Work</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input
                    placeholder="Phone number"
                    value={addressData.phone}
                    onChange={(e) => setAddressData(prev => ({ ...prev, phone: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Street Address *</Label>
                <Input
                  placeholder="Street address"
                  value={addressData.street}
                  onChange={(e) => setAddressData(prev => ({ ...prev, street: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">City *</Label>
                  <Input
                    placeholder="City"
                    value={addressData.city}
                    onChange={(e) => setAddressData(prev => ({ ...prev, city: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">State *</Label>
                  <Input
                    placeholder="State"
                    value={addressData.state}
                    onChange={(e) => setAddressData(prev => ({ ...prev, state: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">PIN Code *</Label>
                  <Input
                    placeholder="PIN"
                    value={addressData.postalCode}
                    onChange={(e) => setAddressData(prev => ({ ...prev, postalCode: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddAddress} disabled={loading} className="bg-indigo-600">
                  {loading ? 'Saving...' : 'Save Address'}
                </Button>
                <Button variant="ghost" onClick={() => setShowAddressForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Address List */}
          {user.addresses?.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No saved addresses</p>
          ) : (
            <div className="space-y-3">
              {user.addresses?.map((addr: any) => (
                <div key={addr._id} className="flex items-start justify-between p-4 border rounded-xl">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{addr.label}</span>
                      {addr.isDefault && <Badge variant="outline" className="text-xs">Default</Badge>}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{addr.street}</p>
                    <p className="text-sm text-gray-600">{addr.city}, {addr.state} {addr.postalCode}</p>
                    {addr.phone && <p className="text-sm text-gray-500">{addr.phone}</p>}
                  </div>
                  <button
                    onClick={() => handleRemoveAddress(addr._id)}
                    className="text-gray-400 hover:text-red-500 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
