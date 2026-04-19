const mongoose = require('mongoose');

// ===============================================
// PRICING CONFIGURATION SCHEMA
// ===============================================

const PricingConfigSchema = new mongoose.Schema({
  // प्लान का नाम (जैसे: Basic, Premium, Enterprise)
  name: {
    type: String,
    required: [true, 'Plan name is required.'],
    unique: true,
    trim: true,
  },
  
  // प्लान का संक्षिप्त विवरण
  description: {
    type: String,
    trim: true,
    default: '',
  },

  // मासिक मूल्य (Rupees/Dollars में, स्ट्रिंग या संख्या के रूप में संग्रहीत)
  // कंट्रोलर इसे paise में बदलने के लिए * 100 का उपयोग करता है।
  price: {
    type: String, 
    required: [true, 'Monthly price is required.'],
  },
  
  // वार्षिक मूल्य (Rupees/Dollars में, स्ट्रिंग या संख्या के रूप में संग्रहीत)
  // यह आमतौर पर मासिक मूल्य पर छूट के साथ सेट किया जाता है।
  annualPrice: {
    type: String,
    // इसे optional बनाया गया है, क्योंकि getSecureAmount इसे संभालता है।
  },
  
  // करेंसी कोड (डिफ़ॉल्ट 'INR' या 'USD' हो सकता है)
  currency: {
    type: String,
    enum: ['INR', 'USD', 'EUR', 'GBP'],
    default: 'INR', 
    required: true,
  },

  // क्या प्लान सक्रिय है?
  isActive: {
    type: Boolean,
    default: true,
  },

  // प्लान की विशेषताएं (Plan features)
  features: {
    type: [String],
    default: [],
  },

}, {
  timestamps: true 
});


// Indexing for faster lookups by plan name
PricingConfigSchema.index({ name: 1 });


const PricingConfig = mongoose.model('PricingConfig', PricingConfigSchema);

module.exports = PricingConfig;

// ===============================================
// EXAMPLE USAGE (Optional: Add an example plan to your database)
/*
{
    "name": "Premium",
    "description": "Full access plan with all features.",
    "price": "999.00", // Monthly
    "annualPrice": "9999.00", // Annual (Discounted)
    "currency": "INR",
    "features": ["Feature A", "Feature B", "Feature C"]
}
*/