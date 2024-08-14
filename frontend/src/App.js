import React from "react";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import Login from "./pages/Login/Login";
import Signup from "./pages/Login/Signup";
import ProtectedRoute from "./pages/ProtectedRoute";
import { UserAuthContextProvider } from "./context/UserAuthContext";
import "./App.css";
import Home from "./pages/Home";
import Explore from "./pages/Explore/Explore";
import Feed from "./pages/Feed/Feed";
import Messages from "./pages/Messages/Messages";
import Bookmarks from "./pages/Bookmarks/Bookmarks";
import Lists from "./pages/Lists/Lists";
import Profile from "./pages/Profile/Profile";
import Reset from "./pages/Login/Reset";
import More from "./pages/More/More";
import Notifications from "./pages/Notifications/Notifications";
import MyMapComponent from "./pages/Profile/MyMapComponent";
import ChatBot from './pages/ChatBot/ChatBot'

function App() {
  return (
    <div className="app">
      <BrowserRouter>
      <UserAuthContextProvider>
        <Routes>
          <Route path="/" element={<ProtectedRoute> <Home /></ProtectedRoute>} >
            <Route index element={<Feed />} />
          </Route>
          <Route path="/home" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
          >
            <Route path="feed" element={<Feed />} />
            <Route path="explore" element={<Explore />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="messages" element={<Messages />} />
            <Route path="bookmarks" element={<Bookmarks />} />
            <Route path="lists" element={<Lists />} />
            <Route path="profile" element={<Profile />} />
            <Route path="more" element={<More />} />
            <Route path="chatbot" element={<ChatBot/>}/>
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/reset" element={<Reset/>}/>
          <Route path="/signup" element={<Signup />} />
          <Route path="/maps" element={<MyMapComponent/>}/>
        </Routes> 
        </UserAuthContextProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
