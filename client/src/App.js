import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Context
import { AuthProvider } from './context/AuthContext';

// Components
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import ProductForm from './pages/ProductForm';
import Profile from './pages/Profile';
import MyProducts from './pages/MyProducts';
import MyRentals from './pages/MyRentals';
import ChatList from './pages/ChatList';
import ChatRoom from './pages/ChatRoom';

// Private Route Component
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <div className="container">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              
              <Route path="/products/new" element={
                <PrivateRoute>
                  <ProductForm />
                </PrivateRoute>
              } />
              
              <Route path="/products/edit/:id" element={
                <PrivateRoute>
                  <ProductForm />
                </PrivateRoute>
              } />
              
              <Route path="/profile/:id" element={<Profile />} />
              
              <Route path="/my-products" element={
                <PrivateRoute>
                  <MyProducts />
                </PrivateRoute>
              } />
              
              <Route path="/my-rentals" element={
                <PrivateRoute>
                  <MyRentals />
                </PrivateRoute>
              } />
              
              <Route path="/chats" element={
                <PrivateRoute>
                  <ChatList />
                </PrivateRoute>
              } />
              
              <Route path="/chats/:roomId" element={
                <PrivateRoute>
                  <ChatRoom />
                </PrivateRoute>
              } />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

