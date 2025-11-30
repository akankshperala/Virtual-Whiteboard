'use client';

import { signOut } from 'next-auth/react';
import { useState } from 'react';
import { FaDownload, FaShare, FaSignOutAlt } from 'react-icons/fa';
import { FiMoreVertical } from 'react-icons/fi';

export default function TopBar(page) {
  const [isOpen, setIsOpen] = useState(false);
  const [addUsersOpen, setAddUsersOpen] = useState(false);
  const [usersInput, setUsersInput] = useState("");
  const [busy, setBusy] = useState(false);

  // share fallback UI state
  const [shareFallbackOpen, setShareFallbackOpen] = useState(false);
  const [fallbackBlobUrl, setFallbackBlobUrl] = useState(null);

  const buttonClass = `
    group relative inline-flex items-center justify-center 
    px-3 py-1.5 rounded-full font-semibold text-white text-sm md:text-base
    bg-black/70 border border-purple-500/60
    transition-all duration-300
    hover:border-purple-500 hover:shadow-[0_4px_20px_-4px_rgba(168,85,247,0.5)]
    hover:scale-105 cursor-pointer pointer-events-auto
  `;

  const iconClass = `relative z-10 transition-transform duration-300 group-hover:scale-110`;

  const getPageIdFromUrl = () => {
    return page.page.pageId
  };

  // --- Canvas capture helper: returns Blob (PNG) ---
  async function captureCanvasBlob(scale = 2) {
    // prefer canvas with explicit class if present
    const canvas = document.querySelector("canvas.whiteboard-canvas") || document.querySelector("canvas");
    if (!canvas) throw new Error("Canvas not found");

    // create high-res offscreen canvas
    const off = document.createElement("canvas");
    off.width = Math.max(1, Math.floor(canvas.width * scale));
    off.height = Math.max(1, Math.floor(canvas.height * scale));
    const ctx = off.getContext("2d");

    // white background (so transparent areas become white)
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, off.width, off.height);

    // scale and draw original canvas
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.drawImage(canvas, 0, 0);

    // toBlob (async)
    const blob = await new Promise((resolve) => {
      try {
        off.toBlob((b) => resolve(b), "image/png", 1);
      } catch (e) {
        resolve(null);
      }
    });

    // fallback: dataURL -> blob conversion
    if (!blob) {
      const dataUrl = off.toDataURL("image/png");
      const res = await fetch(dataUrl);
      return await res.blob();
    }
    return blob;
  }

  // --- Share button handler (native share if possible, fallback modal otherwise) ---
  const handleShare = async () => {
    setBusy(true);
    // clean previous fallback blob url
    if (fallbackBlobUrl) {
      URL.revokeObjectURL(fallbackBlobUrl);
      setFallbackBlobUrl(null);
    }
    setShareFallbackOpen(false);

    try {
      const pageId = getPageIdFromUrl();
      const blob = await captureCanvasBlob(2); // 2x for better quality
      const filename = `whiteboard-${pageId || "page"}-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
      const file = new File([blob], filename, { type: "image/png" });

      // canShare + share with files (best)
      const canShareFiles = typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] });
      if (canShareFiles && navigator.share) {
        try {
          await navigator.share({
            files: [file],
            title: `Whiteboard ${pageId || ""}`,
            text: `Sharing whiteboard ${pageId || ""}`,
          });
          setBusy(false);
          return;
        } catch (err) {
          // user canceled or browser threw — fallback below
          console.warn("navigator.share(files) failed:", err);
        }
      }

      // Some browsers support navigator.share(url/text) but not files
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Whiteboard ${pageId || ""}`,
            text: `View whiteboard ${pageId || ""}`,
            url: window.location.href,
          });
          setBusy(false);
          return;
        } catch (err) {
          // fallback
          console.warn("navigator.share(url) failed:", err);
        }
      }

      // Fallback UI: preview + download + copy link
      const url = URL.createObjectURL(blob);
      setFallbackBlobUrl(url);
      setShareFallbackOpen(true);
    } catch (err) {
      console.error("share failed:", err);
      // fallback to download if capture fails
      window.dispatchEvent(new CustomEvent("export-image", { detail: { pageId: getPageIdFromUrl() } }));
    } finally {
      setBusy(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard");
    } catch (e) {
      console.error("copy failed", e);
      alert("Copy failed — please copy the URL manually");
    }
  };

  const handleDownloadFallback = () => {
    if (fallbackBlobUrl) {
      const a = document.createElement("a");
      a.href = fallbackBlobUrl;
      a.download = `whiteboard-${getPageIdFromUrl() || "page"}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // keep blob url alive while modal is open; will revoke when modal closes
    } else {
      window.dispatchEvent(new CustomEvent("export-image", { detail: { pageId: getPageIdFromUrl() } }));
    }
  };

  const closeShareFallback = () => {
    if (fallbackBlobUrl) {
      URL.revokeObjectURL(fallbackBlobUrl);
      setFallbackBlobUrl(null);
    }
    setShareFallbackOpen(false);
  };

  // small inline AddPeople icon
  const AddPeopleIcon = ({ className = "w-4 h-4" }) => (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="7" cy="5" r="3" />
      <path d="M2 16c1.5-2 4-3 5-3s3.5 1 5 3" />
      <path d="M16 5v4" strokeLinecap="round" />
      <path d="M18 7h-4" strokeLinecap="round" />
    </svg>
  );

  // Add-people form submit
  const handleAddPeopleSubmit = async (e) => {
    e.preventDefault();
    const pageId = getPageIdFromUrl();

    const arr = usersInput
      .split(/[,\n;]+/)
      .map(s => s.trim())
      .filter(Boolean);

    if (!arr.length) return alert("Enter at least one email.");

    setBusy(true);
    try {
      await fetch(`/api/pages/${pageId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: arr })
      });
      setAddUsersOpen(false);
      alert("Users added");
    } catch (err) {
      console.error(err);
      alert("Failed to add users");
    }
    setBusy(false);
  };

  return (
    <>
      <div className="absolute top-4 right-10 flex gap-3 pointer-events-none z-40">

        {/* Desktop */}
        <div className="hidden sm:flex gap-3 pointer-events-auto">
          {/* Download PNG (unchanged) */}
          <button className={buttonClass} onClick={() => window.dispatchEvent(new CustomEvent("export-image", { detail: { pageId: null } }))}>
            <FaDownload size={14} className={iconClass} />
          </button>

          {/* Add People */}
          <button className={buttonClass} onClick={() => setAddUsersOpen(true)} title="Add people">
            <AddPeopleIcon />
          </button>

          {/* Share (native) */}
          <button className={buttonClass} onClick={handleShare} title="Share">
            <FaShare size={14} className={iconClass} />
          </button>

          {/* Sign out */}
          <button className={buttonClass} onClick={() => signOut()} title="Sign out">
            <FaSignOutAlt size={14} className={iconClass} />
          </button>
        </div>

        {/* Mobile */}
        <div className="sm:hidden relative pointer-events-auto">
          <button onClick={() => setIsOpen(!isOpen)} className={buttonClass}>
            <FiMoreVertical size={16} />
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-black/90 text-white rounded-lg shadow-lg p-2 z-50">
              <button className="w-full flex items-center gap-2 text-left px-3 py-2 rounded hover:bg-gray-800" onClick={() => { setAddUsersOpen(true); setIsOpen(false); }}>
                <AddPeopleIcon /> Add people
              </button>

              <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-800" onClick={() => { window.dispatchEvent(new CustomEvent("export-image", { detail: { pageId: null } })); setIsOpen(false); }}>
                Download PNG
              </button>

              <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-800" onClick={() => { handleShare(); setIsOpen(false); }}>
                Share
              </button>

              <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-800" onClick={() => { signOut(); setIsOpen(false); }}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add People Modal */}
      {addUsersOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 pointer-events-auto">
          <div className="bg-white rounded-lg w-11/12 max-w-md p-4 shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Add people</h3>

            <form onSubmit={handleAddPeopleSubmit}>
              <textarea value={usersInput} onChange={(e) => setUsersInput(e.target.value)} placeholder="alice@example.com, bob@example.com" className="w-full h-28 p-2 border rounded bg-gray-50 text-black" />

              <div className="mt-3 flex justify-end gap-2">
                <button type="button" className="px-3 py-1 rounded bg-gray-200" onClick={() => setAddUsersOpen(false)}>Cancel</button>
                <button type="submit" className="px-3 py-1 rounded bg-purple-600 text-white" disabled={busy}>{busy ? "Saving..." : "Add"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share fallback modal (preview + download + copy link) */}
      {shareFallbackOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 pointer-events-auto">
          <div className="bg-white rounded-lg w-11/12 max-w-md p-4 shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Share PNG</h3>
            <p className="text-sm text-gray-600 mb-3">Native sharing isnt available — use one of the options below.</p>

            {fallbackBlobUrl && <img src={fallbackBlobUrl} alt="preview" className="w-full mb-3 rounded border" />}

            <div className="flex justify-end gap-2">
              <button onClick={handleCopyLink} className="px-3 py-1 rounded bg-gray-200">Copy link</button>
              <button onClick={handleDownloadFallback} className="px-3 py-1 rounded bg-purple-600 text-white">Download PNG</button>
              <button onClick={closeShareFallback} className="px-3 py-1 rounded bg-gray-100">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
