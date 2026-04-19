const crypto = require('crypto');

class Helpers {
  // Generate random string
  static generateRandomString(length = 16) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate secure random password
  static generateSecurePassword(length = 16) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '@$!%*?&#';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    let password = '';
    
    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  // Hash data using SHA256
  static hashData(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Format currency
  static formatCurrency(amount, currency = 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency
    }).format(amount);
  }

  // Format date
  static formatDate(date, locale = 'en-IN') {
    return new Date(date).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Format date and time
  static formatDateTime(date, locale = 'en-IN') {
    return new Date(date).toLocaleString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Calculate distance between two coordinates (Haversine formula)
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance; // Distance in kilometers
  }

  // Convert degrees to radians
  static toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Paginate results
  static paginate(page = 1, limit = 10) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    const skip = (pageNum - 1) * limitNum;
    
    return { skip, limit: limitNum };
  }

  // Generate pagination metadata
  static getPaginationMeta(total, page, limit) {
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    return {
      total,
      page,
      limit,
      totalPages,
      hasNextPage,
      hasPrevPage
    };
  }

  // Sleep/delay function
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Capitalize first letter
  static capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  // Generate receipt number
  static generateReceiptNumber(prefix = 'RCP') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `${prefix}${timestamp}${random}`;
  }

  // Mask email
  static maskEmail(email) {
    const [username, domain] = email.split('@');
    const maskedUsername = username.substring(0, 2) + '*'.repeat(username.length - 2);
    return `${maskedUsername}@${domain}`;
  }

  // Mask phone number
  static maskPhone(phone) {
    if (phone.length < 4) return phone;
    return '*'.repeat(phone.length - 4) + phone.slice(-4);
  }

  // Check if object is empty
  static isEmptyObject(obj) {
    return Object.keys(obj).length === 0;
  }

  // Remove undefined/null values from object
  static removeEmpty(obj) {
    return Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v != null)
    );
  }

  // Generate unique ID
  static generateUniqueId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Calculate percentage
  static calculatePercentage(value, total) {
    return ((value / total) * 100).toFixed(2);
  }

  // Check if date is expired
  static isExpired(expiryDate) {
    return new Date(expiryDate) < new Date();
  }

  // Get time difference in readable format
  static getTimeDifference(date1, date2 = new Date()) {
    const diff = Math.abs(date2 - new Date(date1));
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  }

  // Truncate string
  static truncate(str, length = 50, suffix = '...') {
    if (str.length <= length) return str;
    return str.substring(0, length) + suffix;
  }

  // Generate slug from string
  static generateSlug(str) {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Deep clone object
  static deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // Retry function with exponential backoff
  static async retry(fn, maxAttempts = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxAttempts) throw error;
        await this.sleep(delay * Math.pow(2, attempt - 1));
      }
    }
  }

  // Generate verification token
  static generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Encode base64
  static encodeBase64(str) {
    return Buffer.from(str).toString('base64');
  }

  // Decode base64
  static decodeBase64(str) {
    return Buffer.from(str, 'base64').toString('utf-8');
  }
}

module.exports = Helpers;