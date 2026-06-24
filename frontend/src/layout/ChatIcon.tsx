import { useState } from "react";
import ChatOverlay from "./ChatOverlay";

export default function ChatIcon() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && <ChatOverlay onClose={() => setOpen(false)} />}
      <button
        onClick={() => setOpen((v) => !v)}
        title={open ? "Close chat" : "Open chat"}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 flex items-center justify-center"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {open ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          )}
        </svg>
      </button>
    </>
  );
}
