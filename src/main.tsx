import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import IndexPage from './pages/index';
import LoginPage from './pages/login';
import ProfilePage from './pages/profile';

const router = createBrowserRouter([
  { path: '/', element: <IndexPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/profile', element: <ProfilePage /> },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);


