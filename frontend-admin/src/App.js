// src/App.js (FIXED)

import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from 'react-router-dom';

import { AuthProvider, useAuth } from './components/AuthContext';

// Public
import AuthForm from './components/SignupLogin/AuthForm';

// Super Admin / Shared Dashboard
import SuperAdminDashboard from './components/Admin/SuperAdminDashboard'; 

// Admin / Shared
import Desktop1 from './components/Desktop1/Desktop1';
import Desktop2 from './components/Desktop2/Desktop2';
import Desktop3 from './components/Desktop2/Desktop3';
import Location from './components/Desktop1/Location';
import ViewApplicant from './components/Desktop2/ViewApplicant';
import Settings from './components/Settings/Settings'; 

/* =========================================================
   STANDARD AUTH PROTECTION (ALL AUTH USERS)
   ========================================================= */
const ProtectedRoute = () => {
  const { isAuthenticated, initialized } = useAuth();

  if (!initialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20%' }}>
        Loading...
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

/* =========================================================
   NOTE: SuperAdminRoute is no longer needed since the dashboard 
   is shared, but leaving it here for reference/if it protects 
   other purely Super Admin routes.
   ========================================================= */
const SuperAdminRoute = () => {
  const { isAuthenticated, initialized, hasRole } = useAuth();

  if (!initialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20%' }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // NOTE: If this SuperAdminRoute is ONLY to be used for the dashboard, 
  // you must remove this role check. Assuming it protects other paths:
  // if (!hasRole('superadmin')) {
  //   return <Navigate to="/desktop2" replace />;
  // }
  
  return <Outlet />;
};

/* =========================================================
   MAIN APP
   ========================================================= */
function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>

          {/* ================= PUBLIC ================= */}
          <Route path="/login" element={<AuthForm />} />

          {/* ================= AUTHENTICATED USERS ================= */}
          <Route element={<ProtectedRoute />}>
            
            {/* FIX: Move Dashboard under standard protection */}
            <Route
              path="/admin-controller"
              element={<SuperAdminDashboard />} // Shared Dashboard
            />
            
            {/* Default landing after login */}
            <Route path="/" element={<Navigate to="/desktop2" replace />} />

            <Route path="/desktop1" element={<Desktop1 />} />
            <Route path="/desktop2" element={<Desktop2 />} />
            <Route path="/desktop3" element={<Desktop3 />} />
            <Route path="/location" element={<Location />} />
            <Route path="/view/:id" element={<ViewApplicant />} />

            <Route path="/settings" element={<Settings />} />
          </Route>
          
          {/* NOTE: If SuperAdminRoute is not protecting any other route, you can remove it entirely. 
             If it is, keep the block below, but ensure the routes inside are *only* for Super Admin.
             Since you only had one route here before, I've moved it up and left this empty/removed.
          */}
          {/* <Route element={<SuperAdminRoute />}> </Route> */}


          {/* ================= FALLBACK ================= */}
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;