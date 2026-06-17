import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  selected: {
    type: Boolean,
    default: true, // Checked for checkout by default
  },
  variant: {
    color: { type: String },
    size: { type: String },
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  items: [cartItemSchema],
  // Coupon applied
  couponCode: {
    type: String,
    default: null,
  },
  couponDiscount: {
    type: Number,
    default: 0,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for total items count
cartSchema.virtual('totalItems').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Virtual for selected items count
cartSchema.virtual('selectedItemsCount').get(function () {
  return this.items.filter(item => item.selected).reduce((sum, item) => sum + item.quantity, 0);
});

// Virtual for estimated total (selected items only)
cartSchema.virtual('estimatedTotal').get(function () {
  return this.items
    .filter(item => item.selected)
    .reduce((sum, item) => sum + (item.quantity * (item.product?.price || 0)), 0);
});

// Method to add item to cart
cartSchema.methods.addItem = async function (productId, quantity = 1, variant = {}) {
  const existingItem = this.items.find(
    item => item.product.toString() === productId.toString() &&
    item.variant?.color === variant.color &&
    item.variant?.size === variant.size
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    this.items.push({
      product: productId,
      quantity,
      variant,
      selected: true,
    });
  }

  this.lastUpdated = new Date();
  await this.save();
};

// Method to remove item
cartSchema.methods.removeItem = async function (itemId) {
  this.items = this.items.filter(item => item._id.toString() !== itemId.toString());
  this.lastUpdated = new Date();
  await this.save();
};

// Method to update item quantity
cartSchema.methods.updateQuantity = async function (itemId, quantity) {
  const item = this.items.id(itemId);
  if (!item) throw new Error('Cart item not found');

  if (quantity <= 0) {
    this.items = this.items.filter(i => i._id.toString() !== itemId.toString());
  } else {
    item.quantity = quantity;
  }

  this.lastUpdated = new Date();
  await this.save();
};

// Method to toggle item selection
cartSchema.methods.toggleSelection = async function (itemId) {
  const item = this.items.id(itemId);
  if (!item) throw new Error('Cart item not found');
  item.selected = !item.selected;
  this.lastUpdated = new Date();
  await this.save();
};

// Method to select/deselect all
cartSchema.methods.setAllSelection = async function (selected) {
  this.items.forEach(item => { item.selected = selected; });
  this.lastUpdated = new Date();
  await this.save();
};

// Method to get selected items for checkout
cartSchema.methods.getSelectedItems = function () {
  return this.items.filter(item => item.selected);
};

// Method to clear selected items after checkout
cartSchema.methods.clearSelected = async function () {
  this.items = this.items.filter(item => !item.selected);
  this.lastUpdated = new Date();
  await this.save();
};

const Cart = mongoose.model('Cart', cartSchema);
export default Cart;
