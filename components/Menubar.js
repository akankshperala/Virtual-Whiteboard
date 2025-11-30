// Menubar.js
"use client";

import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";
import { FaBars, FaTimes, FaPlus, FaSearch, FaEllipsisV, FaShare, FaPencilAlt, FaTrash } from 'react-icons/fa';

export default function Menubar({ setPage, page }) {
  const [isOpen, setIsOpen] = useState(false);
  const [openFileMenu, setOpenFileMenu] = useState(null);

  // Pages state (objects: { pageId, title, updatedAt, createdAt })
  const [recentFiles, setRecentFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search state
  const [query, setQuery] = useState("");
  const { data: session } = useSession();

  // New modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState("Untitled Page");
  const [creating, setCreating] = useState(false);

  // Rename modal state (NEW)
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null); // { pageId, title }
  const [renameTitle, setRenameTitle] = useState("");
  const [renaming, setRenaming] = useState(false);

  const userName = "Varun Joshi ";
  const userInitial = userName.charAt(0).toUpperCase();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      setOpenFileMenu(null);
    }
  };

  const toggleFileMenu = (fileName) => {
    setOpenFileMenu(openFileMenu === fileName ? null : fileName);
  };

  useEffect(() => {
    // load pages on mount
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/pages", {
          method: "GET",
          headers: {
            "user-id": session?.user?.id,
          },
        });


        if (!res.ok) throw new Error("Failed to fetch pages",res);
        const pages = await res.json();
        if (mounted) setRecentFiles(pages);
      } catch (err) {
        console.error("Error fetching pages:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [session]);

  // Create new page (calls POST /api/pages)
  const handleCreateNew = async (title = "Untitled Page") => {
    setCreating(true);
    try {
      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || "Untitled Page", owner: session?.user?.id })
      });
      if (!res.ok) throw new Error("Failed to create page");
      const page = await res.json(); // { pageId, title, createdAt }
      // Prepend
      setRecentFiles(prev => [page, ...prev]);
      // close modal
      setShowNewModal(false);
      setNewTitle("Untitled Page");
    } catch (err) {
      console.error("create page error:", err);
      // keep modal open so user can retry
    } finally {
      setCreating(false);
    }
  };

  // Delete page by pageId
  const handleDelete = async (pageId) => {
    try {
      const res = await fetch(`/api/pages/${pageId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Delete failed");
      setRecentFiles(prev => prev.filter(p => p.pageId !== pageId));
      setOpenFileMenu(null);
    } catch (err) {
      console.error("delete page error:", err);
    }
  };

  // OPEN Rename modal (replaces prompt)
  const openRenameModal = (page1) => {
    setRenameTarget(page1);
    setRenameTitle(page1?.title || "");
    setShowRenameModal(true);
    setOpenFileMenu(null);
  };

  // Submit rename (PATCH)
  const submitRename = async () => {
    if (!renameTarget || !renameTarget.pageId) return;
    const pageId = renameTarget.pageId;
    const newTitleTrim = (renameTitle || "").trim();
    if (!newTitleTrim) return;
    setRenaming(true);
    try {
      const res = await fetch(`/api/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitleTrim })
      });
      if (!res.ok) throw new Error("Rename failed");
      const updated = await res.json(); // { pageId, title, ... }
      setRecentFiles(prev => prev.map(p => p.pageId === pageId ? updated : p));
      setShowRenameModal(false);
      setRenameTarget(null);
      setRenameTitle("");
    } catch (err) {
      console.error("rename page error:", err);
      // keep modal open for retry
    } finally {
      setRenaming(false);
    }
  };

  // Share just copies a URL to clipboard (simple behaviour)
  const handleShare = async (pageId) => {
    const url = `${location.origin}/pages/${pageId}`; // adapt to your routing
    try {
      await navigator.clipboard.writeText(url);
      setOpenFileMenu(null);
      // small visual feedback could be added
    } catch (err) {
      console.error("copy failed", err);
    }
  };

  // Filter pages by search query
  const visibleFiles = recentFiles.filter(p => (p.title || "").toLowerCase().includes(query.toLowerCase()));

  // helper: open the new modal
  const openNewModal = (e) => {
    e?.preventDefault?.();
    setNewTitle("Untitled Page");
    setShowNewModal(true);
  };

  // handle Enter in modal input for new
  const handleNewKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!creating) handleCreateNew(newTitle?.trim() || "Untitled Page");
    }
    if (e.key === "Escape") {
      setShowNewModal(false);
    }
  };

  // handle Enter / Escape for rename input
  const handleRenameKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!renaming) submitRename();
    }
    if (e.key === "Escape") {
      setShowRenameModal(false);
    }
  };

  return (
    <>
      {/* Hamburger menu button */}
      {!isOpen && (
        <button onClick={toggleMenu} className="fixed top-4 left-4 z-50 p-1 w-3 cursor-pointer h-3 text-white rounded-full shadow-md">
          <FaBars size={20} />
        </button>
      )}

      {/* The Sidebar */}
      <aside className={`fixed top-0 text-sm md:text-lg left-0 h-full w-47 md:w-64 bg-gray-950 text-white flex flex-col z-40
          transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Top Section */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">Whiteboard</h1>
          </div>
          <button onClick={toggleMenu} className="p-2">
            <FaTimes size={20} />
          </button>
        </div>

        {/* New Button */}
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={openNewModal}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-700"
          >
            <FaPlus />
            <span className="font-medium">New</span>
          </button>
        </div>

        {/* Recent Files Container */}
        <div className="flex-grow p-4 flex flex-col overflow-hidden">
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm text-white bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          <h3 className="text-sm font-semibold text-gray-400 mb-2">Recent Files</h3>

          <div className="flex-grow overflow-y-auto scrollbar-hide">
            {loading && <div className="text-xs text-gray-400">Loading...</div>}
            {!loading && visibleFiles.length === 0 && (
              <div className="text-xs text-gray-500">No pages yet</div>
            )}
            <ul className="space-y-1">
              {visibleFiles.map((file, index) => (
                <li key={file.pageId || index} className={`relative `}>
                  <span
                    onClick={() => { setPage(file) }}
                    className={`block py-2 px-3 rounded-lg hover:bg-gray-800 flex justify-between items-center cursor-pointer  ${(file.pageId == page?.pageId && "bg-gray-700")}`}
                  >
                    <span>{file.title}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.preventDefault(); toggleFileMenu(file.pageId); }}
                        className="p-2 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white"
                      >
                        <FaEllipsisV />
                      </button>
                    </div>
                  </span>

                  {openFileMenu === file.pageId && (
                    <div className="absolute right-0 top-10 w-36 bg-gray-800 rounded-lg shadow-xl text-white overflow-hidden z-20">
                      {/* <button
                        className="w-full px-3 py-2 text-left hover:bg-gray-700 flex items-center gap-2"
                        onClick={() => handleShare(file.pageId)}
                      >
                        <FaShare size={12} />
                        <span className="text-xs">Share</span>
                      </button> */}
                      <button
                        className="w-full px-3 py-2 text-left hover:bg-gray-700 flex items-center gap-2"
                        onClick={() => openRenameModal(file)}
                      >
                        <FaPencilAlt size={12} />
                        <span className="text-xs">Rename</span>
                      </button>
                      <button
                        className="w-full px-3 py-2 text-left hover:bg-red-700 flex items-center gap-2"
                        onClick={() => handleDelete(file.pageId)}
                      >
                        <FaTrash size={12} />
                        <span className="text-xs">Delete</span>
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* User Info Container */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white text-lg">
                {userInitial}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{session?.user?.username}</span>
                {/* <span className="text-xs text-gray-400">Free</span> */}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay to close menu on outside click */}
      {isOpen && <div onClick={toggleMenu} className="fixed inset-0 bg-black opacity-80 z-30"></div>}

      {/* NEW PAGE MODAL */}
      {showNewModal && (
        <>
          {/* modal backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => { if (!creating) setShowNewModal(false); }}
          />
          <div className="fixed inset-0 z-60 flex items-center justify-center pointer-events-none">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="new-page-title"
              className="pointer-events-auto w-[min(460px,92%)] bg-white rounded-lg shadow-xl p-5"
            >
              <h2 id="new-page-title" className="text-lg font-semibold mb-3 text-gray-900">Create new page</h2>

              <label className="block text-sm text-gray-700 mb-2">Title</label>
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={handleNewKey}
                className="w-full px-3 py-2 border rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex justify-end gap-2">
                <button
                  className="px-3 py-2 rounded-md bg-gray-200 text-sm"
                  onClick={() => { if (!creating) setShowNewModal(false); }}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm flex items-center gap-2"
                  onClick={() => { if (!creating) handleCreateNew(newTitle?.trim() || "Untitled Page"); }}
                  disabled={creating}
                >
                  {creating ? "Creating..." : (
                    <>
                      <FaPlus /> <span>Create</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* RENAME MODAL (replaces prompt) */}
      {showRenameModal && renameTarget && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => { if (!renaming) setShowRenameModal(false); }}
          />
          <div className="fixed inset-0 z-60 flex items-center justify-center pointer-events-none">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="rename-page-title"
              className="pointer-events-auto w-[min(460px,92%)] bg-white rounded-lg shadow-xl p-5"
            >
              <h2 id="rename-page-title" className="text-lg font-semibold mb-3 text-gray-900">Rename page</h2>

              <label className="block text-sm text-gray-700 mb-2">Title</label>
              <input
                autoFocus
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                onKeyDown={handleRenameKey}
                className="w-full px-3 py-2 border rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex justify-end gap-2">
                <button
                  className="px-3 py-2 rounded-md bg-gray-200 text-sm"
                  onClick={() => { if (!renaming) setShowRenameModal(false); }}
                  disabled={renaming}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm"
                  onClick={() => { if (!renaming) submitRename(); }}
                  disabled={renaming}
                >
                  {renaming ? "Renaming..." : "Rename"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
