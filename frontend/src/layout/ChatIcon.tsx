import { useState } from "react";
import { MessageSquare, X } from "lucide-react";
import ChatOverlay from "./ChatOverlay";

export default function ChatIcon() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && <ChatOverlay onClose={() => setOpen(false)} />}
      <button
        onClick={() => setOpen((v) => !v)}
        title={open ? "Close chat" : "Open chat"}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition flex items-center justify-center ring-4 ring-white/60"
      >
        {open ? <X size={22} /> : <MessageSquare size={22} />}
      </button>
    </>
  );
}
