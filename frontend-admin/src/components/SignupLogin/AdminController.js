// src/components/AdminController.jsx
import React, { useState, useEffect } from 'react';
import { getPendingAdmins, processAdminAction } from '.././../services/authApi';
import '../../components/../styles/AuthStyles.css';

const AdminController = () => {
  const [pendingAdmins, setPendingAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Fetch all pending admin accounts
  const fetchPendingAdmins = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getPendingAdmins();
      setPendingAdmins(data.users);
      setMessage('');
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch pending admin requests. (Auth issue?)';
      setError(errorMessage);
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingAdmins();
  }, []);

  // Handle approval or rejection
  const handleAction = async (userId, action) => {
    setError('');
    setMessage(`Processing ${action}...`);
    try {
      const data = await processAdminAction(userId, action);

      if (data.success) {
        setMessage(`Admin ${action}d successfully. ${action === 'approve' ? 'The admin has been emailed their final credentials.' : ''}`);
        // Remove the processed admin from the list
        setPendingAdmins(prev => prev.filter(admin => admin._id !== userId));
      } else {
        setError(data.message || `Failed to ${action}.`);
        setMessage('');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || `Error performing ${action}.`;
      setError(errorMessage);
      setMessage('');
      console.error('Action error:', err);
    }
  };

  if (isLoading) return <div className="controller-container loading">Loading admin requests...</div>;

  return (
    <div className="controller-container">
      <h2>Super Admin Control Panel</h2>
      <p>Manage pending Admin access requests.</p>

      {error && <div className="controller-error">{error}</div>}
      {message && <div className="controller-success">{message}</div>}
      
      {pendingAdmins.length === 0 ? (
        <p className="no-requests">No pending admin requests at this time.</p>
      ) : (
        <table className="admin-table">
          {/* ... (Table structure is the same as previous response) ... */}
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Request Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {pendingAdmins.map(admin => (
              <tr key={admin._id}>
                <td>{admin.username}</td>
                <td>{admin.email}</td>
                <td>{new Date(admin.createdAt).toLocaleDateString()}</td>
                <td>
                  <button 
                    className="approve-btn" 
                    onClick={() => handleAction(admin._id, 'approve')}
                    disabled={message.startsWith('Processing')}
                  >
                    Approve
                  </button>
                  <button 
                    className="reject-btn" 
                    onClick={() => handleAction(admin._id, 'reject')}
                    disabled={message.startsWith('Processing')}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button className="refresh-btn" onClick={fetchPendingAdmins} disabled={isLoading}>
        {isLoading ? 'Refreshing...' : 'Refresh List'}
      </button>
    </div>
  );
};

export default AdminController;