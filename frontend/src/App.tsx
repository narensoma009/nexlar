import { BrowserRouter, Route, Routes } from "react-router-dom";
import ChatIcon from "./layout/ChatIcon";
import QuotesList from "./pages/QuotesList";
import QuoteWorkspace from "./pages/QuoteWorkspace";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<QuotesList />} />
        <Route path="/quotes/:id" element={<QuoteWorkspace />} />
      </Routes>
      <ChatIcon />
    </BrowserRouter>
  );
}
