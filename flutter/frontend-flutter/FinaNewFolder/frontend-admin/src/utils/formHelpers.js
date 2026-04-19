/**
 * Occupation options list used in the Select component.
 */
export const occupationOptions = [
    { value: "Software Engineer", label: "Software Engineer" },
    { value: "Frontend Developer", label: "Frontend Developer" },
    { value: "Backend Developer", label: "Backend Developer" },
    { value: "Full Stack Developer", label: "Full Stack Developer" },
    { value: "Data Scientist", label: "Data Scientist" },
    { value: "Machine Learning Engineer", label: "Machine Learning Engineer" },
    { value: "Cloud Engineer", label: "Cloud Engineer" },
    { value: "DevOps Engineer", label: "DevOps Engineer" },
    { value: "UI/UX Designer", label: "UI/UX Designer" },
    { value: "Product Manager", label: "Product Manager" },
    { value: "Project Manager", label: "Project Manager" },
    { value: "QA Analyst", label: "QA Analyst" },
    { value: "Other", label: "Other" }
  ];
  
  /**
   * ID proof options list.
   */
  export const idProofOptions = [
    { value: "aadhaar", label: "Aadhaar Card" },
    { value: "pan", label: "PAN Card" },
    { value: "voter", label: "Voter ID" },
    { value: "driving", label: "Driving License" },
    { value: "passport", label: "Passport" },
  ];
  
  /**
   * Function to validate ID proof number based on selected ID type.
   * @param {string} idType - The type of ID (e.g., 'aadhaar', 'pan').
   * @param {string} idNumber - The ID number to validate.
   * @returns {boolean} True if valid, false otherwise.
   */
  export const validateIdProofNumber = (idType, idNumber) => {
    if (!idNumber) return true; 
    idNumber = idNumber.toUpperCase(); // Normalize for PAN/Voter/Passport
  
    switch (idType) {
      case 'aadhaar':
        // 12 digits
        return /^\d{12}$/.test(idNumber);
      case 'pan':
        // 10 alphanumeric (5 letters, 4 digits, 1 letter)
        return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(idNumber);
      case 'voter':
        // Typically 10 chars (3 letters, 7 digits or similar common patterns)
        return /^[A-Z]{3}[0-9]{7}$/.test(idNumber);
      case 'driving':
        // Varies, checking for a common Indian format (e.g., DL01AB1234)
        return /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4,10}$/.test(idNumber); 
      case 'passport':
        // Varies, checking for common pattern (1 letter, 7 digits or more complex)
        return /^[A-Z0-9]{8,15}$/.test(idNumber);
      default:
        return true;
    }
  };
  
  /**
   * Function to get the format hint for the ID proof number.
   * @param {string} idType - The type of ID.
   * @returns {string} The format hint.
   */
  export const getIdProofFormatHint = (idType) => {
    switch (idType) {
      case 'aadhaar':
        return "Format: 12 digits (e.g., 123456789012). Max 12 characters.";
      case 'pan':
        return "Format: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F). Max 10 characters.";
      case 'voter':
        return "Format: 3 letters followed by 7 digits (e.g., ABC1234567). Max 10 characters.";
      case 'driving':
        return "Format: Varies by state (e.g., DL01AB1234). Max 15 characters.";
      case 'passport':
        return "Format: Starts with a letter, followed by numbers/letters. Max 15 characters.";
      default:
        return "Enter the exact ID number (max 15 characters).";
    }
  };
  
  /**
   * Function to get the maximum length allowed for the ID proof number input.
   * This handles the restriction request.
   * @param {string} idType - The type of ID.
   * @returns {number} The max length.
   */
  export const getIdProofMaxLength = (idType) => {
    switch (idType) {
      case 'aadhaar':
        return 12; // Strictly 12
      case 'pan':
        return 10; // Strictly 10
      case 'voter':
        return 10; // Capping at 10 for common format
      case 'driving':
        return 15;
      case 'passport':
        return 15;
      default:
        return 15;
    }
  };