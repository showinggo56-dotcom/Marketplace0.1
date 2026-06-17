import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  Store, ArrowRight, CheckCircle, Loader2, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function BecomeMerchantPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isMerchant } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    shopName: '',
    shopDescription: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    phone: '',
    categories: [] as string[],
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
  });

  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-medium mb-2">Please sign in first</h2>
        <Link to="/login">
          <Button className="bg-indigo-600">Sign In</Button>
        </Link>
      </div>
    );
  }

  if (isMerchant) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-medium mb-2">You are already a merchant!</h2>
        <p className="text-gray-500 mb-4">Your shop is set up and ready.</p>
        <Button onClick={() => navigate('/merchant-dashboard')} className="bg-indigo-600">
          Go to Dashboard
        </Button>
      </div>
    );
  }

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await authAPI.becomeMerchant({
        shopName: formData.shopName,
        shopDescription: formData.shopDescription,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
          country: 'India',
        },
        contactInfo: {
          phone: formData.phone,
          email: '',
        },
        bankDetails: {
          accountHolderName: formData.accountHolderName,
          accountNumber: formData.accountNumber,
          ifscCode: formData.ifscCode,
          bankName: formData.bankName,
        },
        categories: formData.categories,
      });
      toast.success(response.data.message);
      navigate('/merchant-dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create merchant profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Store className="w-8 h-8 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Become a Seller</h1>
        <p className="text-gray-500 mt-1">Set up your shop and start selling on MarketPlace</p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {step > s ? <CheckCircle className="w-5 h-5" /> : s}
            </div>
            {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-indigo-600' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border p-6">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Shop Information</h2>
            <div>
              <Label>Shop Name *</Label>
              <Input
                value={formData.shopName}
                onChange={(e) => setFormData(prev => ({ ...prev, shopName: e.target.value }))}
                placeholder="Your shop name"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Shop Description</Label>
              <textarea
                value={formData.shopDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, shopDescription: e.target.value }))}
                placeholder="Describe what you sell"
                className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                rows={3}
              />
            </div>
            <div>
              <Label>Categories (comma separated)</Label>
              <Input
                value={formData.categories.join(', ')}
                onChange={(e) => setFormData(prev => ({ ...prev, categories: e.target.value.split(',').map(c => c.trim()).filter(Boolean) }))}
                placeholder="e.g. Clothing, Accessories, Handmade"
                className="mt-1"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Shop Address</h2>
            <div>
              <Label>Street Address *</Label>
              <Input
                value={formData.street}
                onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
                placeholder="Street address"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>City *</Label>
                <Input value={formData.city} onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))} placeholder="City" className="mt-1" />
              </div>
              <div>
                <Label>State *</Label>
                <Input value={formData.state} onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))} placeholder="State" className="mt-1" />
              </div>
              <div>
                <Label>PIN Code *</Label>
                <Input value={formData.postalCode} onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))} placeholder="PIN" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Contact Phone *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Phone number"
                className="mt-1"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Bank Details for Payouts</h2>
            <div>
              <Label>Account Holder Name *</Label>
              <Input
                value={formData.accountHolderName}
                onChange={(e) => setFormData(prev => ({ ...prev, accountHolderName: e.target.value }))}
                placeholder="Account holder name"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Account Number *</Label>
              <Input
                value={formData.accountNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                placeholder="Account number"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>IFSC Code *</Label>
                <Input value={formData.ifscCode} onChange={(e) => setFormData(prev => ({ ...prev, ifscCode: e.target.value }))} placeholder="IFSC" className="mt-1" />
              </div>
              <div>
                <Label>Bank Name *</Label>
                <Input value={formData.bankName} onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))} placeholder="Bank name" className="mt-1" />
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>
          ) : (
            <div />
          )}
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} className="bg-indigo-600">
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading} className="bg-indigo-600">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : 'Create Shop'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
