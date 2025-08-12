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

// PWA Service Worker 등록
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// PWA 설치 프롬프트 처리
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('PWA 설치 프롬프트 준비됨');
  e.preventDefault();
  
  // 사용자에게 설치 버튼을 보여줄 수 있음
  // 여기서는 콘솔에만 로그를 남김
  console.log('앱을 홈 화면에 추가할 수 있습니다!');
});

// PWA 설치 완료 후
window.addEventListener('appinstalled', () => {
  console.log('PWA가 성공적으로 설치되었습니다!');
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);


