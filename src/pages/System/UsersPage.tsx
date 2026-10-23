import React, { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { AdminPageContainer } from "../../components/common/AdminPageContainer";

interface SystemUser {
  id: number;
  name: string;
  email: string;
  role: string;
  groups: string[];
  status: "Active" | "Inactive";
  lastLogin: string;
}

const initialUsers: SystemUser[] = [
  {
    id: 1,
    name: "Dr. Jalpa Chavda",
    email: "jalpa.chavda@kaizencon.com",
    role: "Super Administrator",
    groups: ["Administrators"],
    status: "Active",
    lastLogin: "Just now",
  },
  {
    id: 2,
    name: "Siddharth Mehta",
    email: "siddharth@kaizencon.com",
    role: "Conference Director",
    groups: ["Administrators", "Conference Managers"],
    status: "Active",
    lastLogin: "2 hours ago",
  },
  {
    id: 3,
    name: "Priya Nair",
    email: "priya.nair@kaizencon.com",
    role: "Speaker Program Coordinator",
    groups: ["Speaker Liaisons", "Conference Managers"],
    status: "Active",
    lastLogin: "Yesterday",
  },
  {
    id: 4,
    name: "Prof. Kenneth Clark",
    email: "k.clark@robotics-ai.org",
    role: "Lead Paper Reviewer",
    groups: ["Reviewers & Program Committee"],
    status: "Active",
    lastLogin: "3 days ago",
  },
  {
    id: 5,
    name: "Rohan Varma",
    email: "rohan.v@kaizencon.com",
    role: "Registration Desk Lead",
    groups: ["Staff & Operations"],
    status: "Inactive",
    lastLogin: "1 week ago",
  },
];

export default function UsersPage() {
  const [users, setUsers] = useState<SystemUser[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Conference Manager");
  const [group, setGroup] = useState("Conference Managers");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setName("");
    setEmail("");
    setRole("Conference Manager");
    setGroup("Conference Managers");
    setStatus("Active");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u: SystemUser) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setGroup(u.groups[0] || "Administrators");
    setStatus(u.status);
    setIsModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    if (editingUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                name,
                email,
                role,
                groups: [group],
                status,
              }
            : u
        )
      );
    } else {
      const newUser: SystemUser = {
        id: Date.now(),
        name,
        email,
        role,
        groups: [group],
        status,
        lastLogin: "Never",
      };
      setUsers((prev) => [newUser, ...prev]);
    }

    setIsModalOpen(false);
  };

  const handleDeleteUser = (id: number) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
  };

  return (
    <>
      <PageMeta
        title="Users | Kaizen Con Administration"
        description="Manage System Users and Administrators for Kaizen Con"
      />

      <AdminPageContainer
        title="Users"
        subtitle="Manage administrator accounts, coordinators, and member access permissions."
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Type to search users by name, email, or role..."
        actionButton={
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#AA2D7B] hover:bg-[#D85A9A] rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add User
          </button>
        }
      >
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              No users found matching your search.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-500 font-semibold uppercase tracking-wider text-[11px] bg-gray-50/50 dark:bg-gray-800/40">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Assigned Group</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#faedf5] text-[#55355E] flex items-center justify-center font-bold text-xs uppercase border border-[#AA2D7B]/20">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {user.name}
                          </div>
                          <div className="text-[11px] text-gray-500 font-mono">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-700 dark:text-gray-300">
                      {user.role}
                    </td>
                    <td className="py-3.5 px-4">
                      {user.groups.map((g) => (
                        <span
                          key={g}
                          className="inline-block px-2 py-0.5 rounded text-[11px] bg-[#faedf5] text-[#55355E] font-medium mr-1"
                        >
                          {g}
                        </span>
                      ))}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          user.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-gray-100 text-gray-600 border border-gray-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            user.status === "Active" ? "bg-emerald-500" : "bg-gray-400"
                          }`}
                        />
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 text-[11px]">
                      {user.lastLogin}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-[#AA2D7B] transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="px-2 py-1 text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPageContainer>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-fadeIn my-auto">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 bg-[#faedf5]/30 shrink-0">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                {editingUser ? "Edit User Account" : "Add New System User"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
              <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. John Doe"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#AA2D7B]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@kaizencon.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#AA2D7B]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    System Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#AA2D7B]"
                  >
                    <option value="Super Administrator">Super Administrator</option>
                    <option value="Conference Director">Conference Director</option>
                    <option value="Conference Manager">Conference Manager</option>
                    <option value="Speaker Program Coordinator">Speaker Program Coordinator</option>
                    <option value="Staff & Operations">Staff & Operations</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Assign Authorization Group
                  </label>
                  <select
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#AA2D7B]"
                  >
                    <option value="Administrators">Administrators</option>
                    <option value="Conference Managers">Conference Managers</option>
                    <option value="Speaker Liaisons">Speaker Liaisons</option>
                    <option value="Reviewers & Program Committee">Reviewers & Program Committee</option>
                    <option value="Staff & Operations">Staff & Operations</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        checked={status === "Active"}
                        onChange={() => setStatus("Active")}
                        className="text-[#AA2D7B]"
                      />
                      <span>Active</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        checked={status === "Inactive"}
                        onChange={() => setStatus("Inactive")}
                        className="text-[#AA2D7B]"
                      />
                      <span>Inactive</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 shrink-0 bg-gray-50/80 dark:bg-gray-800/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#AA2D7B] hover:bg-[#D85A9A] text-white font-semibold transition-colors cursor-pointer"
                >
                  {editingUser ? "Save Changes" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
