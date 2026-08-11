import mongoose from 'mongoose';

// Set User Schema
const schema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  password: { type: String, default: '' },
  name: { type: String, default: '' },
  surname: { type: String, default: '' },
  country: { type: String, default: '' },
  city: { type: String, default: '' },
  address: { type: String, default: '' },
  code: { type: String, default: '' },
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
  resetTokenHash: { type: String, default: null },
  resetTokenExpires: { type: Date, default: null }
});

export default mongoose.models.user || mongoose.model('user', schema);
