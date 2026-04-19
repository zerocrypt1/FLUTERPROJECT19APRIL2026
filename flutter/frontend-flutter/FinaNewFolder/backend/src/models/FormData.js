const mongoose = require('mongoose');

const formDataSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  occupation: {
    type: String,
    required: [true, 'Occupation is required'],
    trim: true,
    maxlength: [100, 'Occupation cannot exceed 100 characters']
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    match: [/^[0-9]{10,15}$/, 'Please provide a valid phone number']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  age: {
    type: Number,
    required: [true, 'Age is required'],
    min: [18, 'Age must be at least 18'],
    max: [100, 'Age cannot exceed 100']
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: false
  },
  address: {
    type: String,
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  city: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  pinCode: {
    type: String,
    trim: true,
    match: [/^[0-9]{6}$/, 'Please provide a valid 6-digit pin code']
  },
  landmarks: {
    type: String,
    trim: true,
    maxlength: [200, 'Landmarks cannot exceed 200 characters']
  },
  identityProof: {
    type: String,
    enum: ['Aadhar', 'PAN', 'Passport', 'Driving License', 'Voter ID'],
    required: false
  },
  idProofNumber: {
    type: String,
    trim: true
  },
  altPhoneNumber: {
    type: String,
    trim: true,
    match: [/^[0-9]{10,15}$/, 'Please provide a valid alternate phone number']
  },
  timing: {
    type: [String],
    default: []
  },
  blueTicket: {
    type: Boolean,
    default: false
  },
  location: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    },
    altitude: {
      type: Number
    },
    accuracy: {
      type: Number
    },
    formattedAddress: {
      type: String
    }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  verificationStatus: {
    type: String,
    enum: ['unverified', 'verified', 'flagged'],
    default: 'unverified'
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true
});

// Indexes for faster queries
formDataSchema.index({ phoneNumber: 1 });
formDataSchema.index({ email: 1 });
formDataSchema.index({ pinCode: 1 });
formDataSchema.index({ status: 1 });
formDataSchema.index({ verificationStatus: 1 });
formDataSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

module.exports = mongoose.model('FormData', formDataSchema);