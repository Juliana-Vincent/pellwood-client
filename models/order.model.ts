import mongoose from 'mongoose';

// Set Order Schema
const schema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  name: { type: String, default: '' },
  surname: { type: String, default: '' },
  currency: { type: String, default: '' },
  country: { type: String, default: '' },
  city: { type: String, default: '' },
  address: { type: String, default: '' },
  code: { type: String, default: '' },
  anotherAddressCheck: { type: Boolean, default: false },
  companyDataCheck: { type: Boolean, default: false },
  anotherAdress: {
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    name: { type: String, default: '' },
    surname: { type: String, default: '' },
    country: { type: String, default: '' },
    city: { type: String, default: '' },
    address: { type: String, default: '' },
    code: { type: String, default: '' }
  },
  companyData: {
    companyName: { type: String, default: '' },
    ico: { type: String, default: '' },
    dic: { type: String, default: '' }
  },
  idOrder: Number,
  status: { type: String, default: '' },
  state: { type: String, default: 'new' },
  note: { type: String, default: '' },
  basket: { type: Object },
  sum: { type: String, default: '' },
  paymentMethod: { type: String, default: '' },
  paymentPrice: { type: String, default: '' },
  payOnline: { type: Boolean, default: false },
  deliveryMethod: { type: String, default: '' },
  deliveryPrice: { type: String, default: '' },
  notified: { type: Boolean, default: false }
});

export default mongoose.models.order || mongoose.model('order', schema);
