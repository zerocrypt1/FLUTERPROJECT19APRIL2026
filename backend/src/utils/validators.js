const validator = require('validator');

class Validators {
  // Email validation
  static isValidEmail(email) {
    return validator.isEmail(email);
  }

  // Phone number validation (supports international formats)
  static isValidPhone(phone) {
    const phoneRegex = /^[0-9]{10,15}$/;
    return phoneRegex.test(phone);
  }

  // Strong password validation
  static isStrongPassword(password) {
    // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
  }

  // URL validation
  static isValidURL(url) {
    return validator.isURL(url, {
      protocols: ['http', 'https'],
      require_protocol: true
    });
  }

  // MongoDB ObjectId validation
  static isValidObjectId(id) {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  // PIN code validation (6 digits)
  static isValidPinCode(pinCode) {
    return /^[0-9]{6}$/.test(pinCode);
  }

  // Aadhar number validation
  static isValidAadhar(aadhar) {
    return /^[0-9]{12}$/.test(aadhar);
  }

  // PAN card validation
  static isValidPAN(pan) {
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
  }

  // Latitude validation
  static isValidLatitude(lat) {
    const latitude = parseFloat(lat);
    return !isNaN(latitude) && latitude >= -90 && latitude <= 90;
  }

  // Longitude validation
  static isValidLongitude(lng) {
    const longitude = parseFloat(lng);
    return !isNaN(longitude) && longitude >= -180 && longitude <= 180;
  }

  // Sanitize string (remove special characters)
  static sanitizeString(str) {
    return str.replace(/[^\w\s-]/gi, '').trim();
  }

  // Validate age range
  static isValidAge(age, min = 18, max = 100) {
    const ageNum = parseInt(age);
    return !isNaN(ageNum) && ageNum >= min && ageNum <= max;
  }

  // Credit card validation
  static isValidCreditCard(cardNumber) {
    return validator.isCreditCard(cardNumber);
  }

  // Check if string contains only alphabets and spaces
  static isAlphaWithSpaces(str) {
    return /^[a-zA-Z\s]+$/.test(str);
  }

  // Check if string is alphanumeric
  static isAlphanumeric(str) {
    return validator.isAlphanumeric(str);
  }

  // Validate date format
  static isValidDate(date) {
    return validator.isDate(date);
  }

  // Check if value is empty
  static isEmpty(value) {
    return validator.isEmpty(value);
  }

  // Validate currency code
  static isValidCurrency(currency) {
    const validCurrencies = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD'];
    return validCurrencies.includes(currency.toUpperCase());
  }

  // Validate IP address
  static isValidIP(ip) {
    return validator.isIP(ip);
  }

  // Validate username (alphanumeric, underscore, hyphen)
  static isValidUsername(username) {
    return /^[a-zA-Z0-9_-]{3,20}$/.test(username);
  }

  // File extension validation
  static isValidFileExtension(filename, allowedExtensions) {
    const ext = filename.split('.').pop().toLowerCase();
    return allowedExtensions.includes(ext);
  }

  // Validate file size (in MB)
  static isValidFileSize(sizeInBytes, maxSizeMB) {
    const sizeMB = sizeInBytes / (1024 * 1024);
    return sizeMB <= maxSizeMB;
  }
}

module.exports = Validators;