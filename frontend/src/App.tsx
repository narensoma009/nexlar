import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";
import ChatIcon from "./layout/ChatIcon";
import LoginPage from "./pages/LoginPage";
import QuotesList from "./pages/QuotesList";
import QuoteWorkspace from "./pages/QuoteWorkspace";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <QuotesList />
              </RequireAuth>
            }
          />
          <Route
            path="/quotes/:id"
            element={
              <RequireAuth>
                <QuoteWorkspace />
              </RequireAuth>
            }
          />
        </Routes>
        <AuthedChat />
      </AuthProvider>
    </BrowserRouter>
  );
}

function AuthedChat() {
  const { user } = useAuth();
  if (!user) return null;
  return <ChatIcon />;
}
