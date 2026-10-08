import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/auth";
import { useChatStore } from "./store/chat";
import { getSocket } from "./lib/socket";
import SplashScreen from "./pages/SplashScreen";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import VerifyPhone from "./pages/auth/VerifyPhone";
import VerifyEmail from "./pages/auth/VerifyEmail";
import MainApp from "./pages/MainApp";

function App() {
  const { user, initialized, init } = useAuthStore();
  const { receiveMessage, setTyping } = useChatStore();

  useEffect(() => {
    init();
  }, [init]);

  // Socket listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user) return;

    const onNewMessage = (data: any) => {
      receiveMessage(data.message);
    };
    const onTypingStart = (data: { userId: string }) => setTyping(data.userId, true);
    const onTypingStop = (data: { userId: string }) => setTyping(data.userId, false);
    const onUserStatus = (data: { userId: string; isOnline: boolean }) => {
      // Update conversation list online status
    };

    socket.on("message:new", onNewMessage);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);
    socket.on("user:status", onUserStatus);

    return () => {
      socket.off("message:new", onNewMessage);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
      socket.off("user:status", onUserStatus);
    };
  }, [user, receiveMessage, setTyping]);

  if (!initialized) return <SplashScreen />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
        <Route path="/verify-phone" element={user ? <Navigate to="/" /> : <VerifyPhone />} />
        <Route path="/verify-email" element={user ? <Navigate to="/" /> : <VerifyEmail />} />
        <Route path="/*" element={user ? <MainApp /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
