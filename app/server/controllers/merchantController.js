import Merchant from '../models/Merchant.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * @desc   Get merchant profile
 * @route  GET /api/merchants/profile
 * @access Private (Merchant)
 */
export const getMerchantProfile = asyncHandler(async (req, res) => {
  const merchant = await Merchant.findOne({ owner: req.user._id })
    .populate('owner', 'fullName email profileImage');

  if (!merchant) {
    return res.status(404).json({
      success: false,
      message: 'Merchant profile not found.',
    });
  }

  res.status(200).json({
    success: true,
    merchant,
  });
});

/**
 * @desc   Update merchant profile
 * @route  PUT /api/merchants/profile
 * @access Private (Merchant)
 */
export const updateMerchantProfile = asyncHandler(async (req, res) => {
  const {
    shopName,
    shopDescription,
    shopLogo,
    shopBanner,
    address,
    contactInfo,
    categories,
    businessHours,
  } = req.body;

  const merchant = await Merchant.findOneAndUpdate(
    { owner: req.user._id },
    {
      ...(shopName && { shopName }),
      ...(shopDescription && { shopDescription }),
      ...(shopLogo && { shopLogo }),
      ...(shopBanner && { shopBanner }),
      ...(address && { address }),
      ...(contactInfo && { contactInfo }),
      ...(categories && { categories }),
      ...(businessHours && { businessHours }),
    },
    { new: true, runValidators: true }
  );

  if (!merchant) {
    return res.status(404).json({
      success: false,
      message: 'Merchant profile not found.',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Merchant profile updated successfully.',
    merchant,
  });
});

/**
 * @desc   Update bank details
 * @route  PUT /api/merchants/bank-details
 * @access Private (Merchant)
 */
export const updateBankDetails = asyncHandler(async (req, res) => {
  const { bankDetails } = req.body;

  if (!bankDetails || !bankDetails.accountHolderName || !bankDetails.accountNumber || !bankDetails.ifscCode) {
    return res.status(400).json({
      success: false,
      message: 'Please provide complete bank details.',
    });
  }

  const merchant = await Merchant.findOneAndUpdate(
    { owner: req.user._id },
    { bankDetails },
    { new: true }
  );

  if (!merchant) {
    return res.status(404).json({
      success: false,
      message: 'Merchant profile not found.',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Bank details updated successfully.',
    bankDetails: merchant.bankDetails,
  });
});

/**
 * @desc   Get all merchants (public)
 * @route  GET /api/merchants
 * @access Public
 */
export const getMerchants = asyncHandler(async (req, res) => {
  const { verified, category, page = 1, limit = 20, search } = req.query;

  const filter = { isActive: true };
  if (verified === 'true') filter.verificationStatus = 'verified';
  if (category) filter.categories = { $in: [category] };
  if (search) {
    filter.$or = [
      { shopName: { $regex: search, $options: 'i' } },
      { shopDescription: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [merchants, totalCount] = await Promise.all([
    Merchant.find(filter)
      .select('-bankDetails -documents')
      .populate('owner', 'fullName profileImage')
      .sort({ rating: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Merchant.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    merchants,
    pagination: {
      currentPage: Number(page),
      totalPages: Math.ceil(totalCount / Number(limit)),
      totalCount,
    },
  });
});

/**
 * @desc   Get single merchant (public)
 * @route  GET /api/merchants/:id
 * @access Public
 */
export const getMerchant = asyncHandler(async (req, res) => {
  const merchant = await Merchant.findById(req.params.id)
    .select('-bankDetails -documents')
    .populate('owner', 'fullName profileImage')
    .populate({
      path: 'products',
      match: { status: 'active' },
      select: 'title subtitle images price rating ratingCount stockStatus',
      options: { sort: { createdAt: -1 }, limit: 20 },
    });

  if (!merchant) {
    return res.status(404).json({
      success: false,
      message: 'Merchant not found.',
    });
  }

  res.status(200).json({
    success: true,
    merchant,
  });
});

/**
 * @desc   Upload verification documents
 * @route  POST /api/merchants/documents
 * @access Private (Merchant)
 */
export const uploadDocuments = asyncHandler(async (req, res) => {
  const { documents } = req.body;

  if (!documents || !Array.isArray(documents) || documents.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide documents to upload.',
    });
  }

  const merchant = await Merchant.findOne({ owner: req.user._id });

  if (!merchant) {
    return res.status(404).json({
      success: false,
      message: 'Merchant profile not found.',
    });
  }

  // Add new documents
  documents.forEach(doc => {
    merchant.documents.push({
      type: doc.type,
      url: doc.url,
      verified: false,
    });
  });

  // Update verification status
  if (merchant.verificationStatus === 'pending') {
    merchant.verificationStatus = 'under_review';
  }

  await merchant.save();

  res.status(200).json({
    success: true,
    message: 'Documents uploaded successfully.',
    documents: merchant.documents,
    verificationStatus: merchant.verificationStatus,
  });
});

export default {
  getMerchantProfile,
  updateMerchantProfile,
  updateBankDetails,
  getMerchants,
  getMerchant,
  uploadDocuments,
};
