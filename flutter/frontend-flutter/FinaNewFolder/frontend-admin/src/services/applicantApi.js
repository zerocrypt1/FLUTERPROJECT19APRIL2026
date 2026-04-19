import axios from 'axios';

// Ensure the environment variable is loaded (e.g., via process.env.REACT_APP_API_BASE_URL)
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5050';

const applicantAPI = {
    /**
     * Fetches details for a single applicant by ID.
     * @param {string} id - The MongoDB ObjectId of the applicant.
     * @returns {Promise<object>} The applicant data object.
     */
    fetchApplicant: async (id) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/forms/${id}`);
            
            if (response.data.success) {
                return { success: true, data: response.data.data };
            } else {
                return { success: false, message: response.data.error || 'Failed to retrieve applicant.' };
            }
        } catch (error) {
            console.error('API Error fetching applicant:', error);
            // Throw a custom error message for the caller
            throw new Error(error.response?.data?.error || 'Network error or server failed to respond.');
        }
    }
};

export default applicantAPI;