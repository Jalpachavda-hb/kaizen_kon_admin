import React, { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { AdminPageContainer } from "../../components/common/AdminPageContainer";

interface GroupItem {
  id: number;
  name: string;
  code: string;
  description: string;
  permissions: string[];
  userCount: number;
  isSystem?: boolean;
}

const initialGroups: GroupItem[] = [
  {
    id: 1,
    name: "Administrators",
    code: "ADMIN",
    description: "Full superuser access to all conference modules, system settings, and user groups.",
    permissions: ["All Permissions", "User Management", "Conference Management", "Finance"],
    userCount: 3,
    isSystem: true,
  },
  {
    id: 2,
    name: "Conference Managers",
    code: "CONF_MGR",
    description: "Manages speakers, session timetables, topics/tracks, and venue halls.",
    permissions: ["Manage Speakers", "Manage Sessions", "Manage Topics", "View Reports"],
    userCount: 6,
  },
  {
    id: 3,
    name: "Speaker Liaisons",
    code: "SPEAKER_LIAISON",
    description: "Responsible for speaker communication, collecting presentation decks and bios.",
    permissions: ["View Speakers", "Edit Speaker Bios", "View Sessions"],
    userCount: 4,
  },
  {
    id: 4,
    name: "Reviewers & Program Committee",
    code: "REVIEWERS",
    description: "Evaluates submitted robotics & AI paper abstracts and suggests tracks.",
    permissions: ["Review Abstracts", "Rate Papers", "View Topics"],
    userCount: 12,
  },
  {
    id: 5,
    name: "Staff & Operations",
    code: "STAFF",
    description: "On-site check-in coordination, badge printing, and attendee assistance.",
    permissions: ["Check-in Attendees", "View Schedule"],
    userCount: 15,
  },
];

const availablePermissions = [
  "Manage Speakers",
  "Manage Sessions",
  "Manage Topics",
  "User Management",
  "Review Abstracts",
  "View Reports",
  "Check-in Attendees",
  "Finance & Tickets",
];

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupItem[]>(initialGroups);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupItem | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.description.toLowerCase().includes(search.toLowerCase()) ||
      g.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAddModal = () => {
    setEditingGroup(null);
    setName("");
    setCode("");
    setDescription("");
    setSelectedPermissions(["View Reports"]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (group: GroupItem) => {
    setEditingGroup(group);
    setName(group.name);
    setCode(group.code);
    setDescription(group.description);
    setSelectedPermissions([...group.permissions]);
    setIsModalOpen(true);
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingGroup) {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === editingGroup.id
            ? {
                ...g,
                name,
                code: code.toUpperCase() || g.code,
                description,
                permissions: selectedPermissions,
              }
            : g
        )
      );
    } else {
      const newGroup: GroupItem = {
        id: Date.now(),
        name,
        code: code.toUpperCase() || name.replace(/\s+/g, "_").toUpperCase(),
        description,
        permissions: selectedPermissions.length > 0 ? selectedPermissions : ["View Schedule"],
        userCount: 0,
      };
      setGroups((prev) => [...prev, newGroup]);
    }

    setIsModalOpen(false);
  };

  const handleDeleteGroup = (id: number) => {
    if (window.confirm("Are you sure you want to remove this group?")) {
      setGroups((prev) => prev.filter((g) => g.id !== id));
    }
  };

  const togglePermission = (perm: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  return (
    <>
      <PageMeta
        title="Groups | Kaizen Con Administration"
        description="Manage Authentication and Authorization Groups for Kaizen Con"
      />

      <AdminPageContainer
        title="Groups"
        subtitle="Manage authorization groups, permission policies, and role-based assignments."
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Type to search groups..."
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
            Add Group
          </button>
        }
      >
        {filteredGroups.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              No groups found
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Try adjusting your search query or create a new group.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-500 font-semibold uppercase tracking-wider text-[11px] bg-gray-50/50 dark:bg-gray-800/40">
                  <th className="py-3 px-4">Group Name</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Permissions</th>
                  <th className="py-3 px-4 text-center">Members</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredGroups.map((group) => (
                  <tr
                    key={group.id}
                    className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#AA2D7B]" />
                        <span>{group.name}</span>
                        {group.isSystem && (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">
                            System
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-500">
                      {group.code}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300 max-w-xs truncate">
                      {group.description}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-sm">
                        {group.permissions.slice(0, 3).map((perm) => (
                          <span
                            key={perm}
                            className="inline-block px-2 py-0.5 rounded text-[11px] bg-[#faedf5] text-[#55355E] dark:bg-[#55355E]/40 dark:text-[#f5d8e9] font-medium"
                          >
                            {perm}
                          </span>
                        ))}
                        {group.permissions.length > 3 && (
                          <span className="text-[10px] text-gray-400 self-center">
                            +{group.permissions.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                        {group.userCount} users
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(group)}
                          className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-[#AA2D7B] dark:text-gray-400 dark:hover:text-[#D85A9A] transition-colors"
                        >
                          Edit
                        </button>
                        {!group.isSystem && (
                          <button
                            onClick={() => handleDeleteGroup(group.id)}
                            className="px-2 py-1 text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPageContainer>

      {/* Add / Edit Group Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-fadeIn my-auto">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 bg-[#faedf5]/30 dark:bg-gray-800/40 shrink-0">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                {editingGroup ? "Edit Group" : "Create New Group"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
              <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Conference Reviewers"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:border-[#AA2D7B] focus:ring-1 focus:ring-[#AA2D7B]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Identifier Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. REVIEWERS"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:border-[#AA2D7B] focus:ring-1 focus:ring-[#AA2D7B] font-mono text-xs uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the responsibility and permissions scope..."
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:border-[#AA2D7B] focus:ring-1 focus:ring-[#AA2D7B]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Assign Permissions
                </label>
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 max-h-36 overflow-y-auto">
                  {availablePermissions.map((perm) => (
                    <label
                      key={perm}
                      className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300 text-[11px]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(perm)}
                        onChange={() => togglePermission(perm)}
                        className="rounded text-[#AA2D7B] focus:ring-[#AA2D7B]"
                      />
                      <span>{perm}</span>
                    </label>
                  ))}
                </div>
              </div>

              </div>

              <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-800 shrink-0 bg-gray-50/80 dark:bg-gray-800/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#AA2D7B] hover:bg-[#D85A9A] text-white font-semibold transition-colors shadow-xs cursor-pointer"
                >
                  {editingGroup ? "Save Changes" : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
