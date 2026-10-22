import React, { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { AdminPageContainer } from "../../components/common/AdminPageContainer";

export interface Topic {
  id: number;
  name: string;
  code: string;
  chair: string;
  description: string;
  sessionsCount: number;
  abstractsCount: number;
  color: string;
}

const initialTopics: Topic[] = [
  {
    id: 1,
    name: "Surgical Robotics & Haptic AI",
    code: "SURG-AI",
    chair: "Dr. Maya Lin",
    description: "Robotic telesurgery, micro-actuators, force-feedback haptics, and autonomous organ recognition.",
    sessionsCount: 6,
    abstractsCount: 28,
    color: "#AA2D7B",
  },
  {
    id: 2,
    name: "Humanoid Motion Dynamics & Locomotion",
    code: "HUM-DYN",
    chair: "Prof. Hiroshi Tanaka",
    description: "Bipedal and quadruped balance algorithms, high-torque actuators, and reinforcement-learned gait.",
    sessionsCount: 5,
    abstractsCount: 22,
    color: "#55355E",
  },
  {
    id: 3,
    name: "Autonomous Mobility & Edge AI",
    code: "AUTO-MOB",
    chair: "Sophia Zhang",
    description: "Vision-based SLAM, LIDAR fusion, high-efficiency embedded AI hardware, and harsh terrain autonomy.",
    sessionsCount: 4,
    abstractsCount: 19,
    color: "#D85A9A",
  },
  {
    id: 4,
    name: "Neural Engineering & BCI Prosthetics",
    code: "NEURO-BCI",
    chair: "Dr. Elena Rostova",
    description: "Implantable and non-invasive brain-computer interfaces, electromyographic control of bionic limbs.",
    sessionsCount: 4,
    abstractsCount: 16,
    color: "#771c56",
  },
  {
    id: 5,
    name: "AI Ethics, Governance & Safety Protocols",
    code: "ETHICS-GOV",
    chair: "Dr. Vikram Patel",
    description: "Regulatory compliance for medical robotics, safety certifications, and ethical frameworks in robotics.",
    sessionsCount: 3,
    abstractsCount: 14,
    color: "#3f2647",
  },
];

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [chair, setChair] = useState("");
  const [description, setDescription] = useState("");

  const filteredTopics = topics.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.chair.toLowerCase().includes(search.toLowerCase()) ||
      t.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAddModal = () => {
    setEditingTopic(null);
    setName("");
    setCode("");
    setChair("");
    setDescription("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (t: Topic) => {
    setEditingTopic(t);
    setName(t.name);
    setCode(t.code);
    setChair(t.chair);
    setDescription(t.description);
    setIsModalOpen(true);
  };

  const handleSaveTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingTopic) {
      setTopics((prev) =>
        prev.map((t) =>
          t.id === editingTopic.id
            ? {
                ...t,
                name,
                code: code.toUpperCase() || t.code,
                chair,
                description,
              }
            : t
        )
      );
    } else {
      const newTopic: Topic = {
        id: Date.now(),
        name,
        code: code.toUpperCase() || name.slice(0, 4).toUpperCase(),
        chair,
        description,
        sessionsCount: 0,
        abstractsCount: 0,
        color: "#AA2D7B",
      };
      setTopics((prev) => [...prev, newTopic]);
    }

    setIsModalOpen(false);
  };

  const handleDeleteTopic = (id: number) => {
    if (window.confirm("Are you sure you want to remove this topic?")) {
      setTopics((prev) => prev.filter((t) => t.id !== id));
    }
  };

  return (
    <>
      <PageMeta
        title="Topics | Kaizen Con 2027"
        description="Manage Conference Tracks & Topics for Kaizen Con"
      />

      <AdminPageContainer
        title="Topics & Tracks"
        subtitle="Manage conference technical tracks, session themes, and program committee chairs."
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Type to search conference tracks or chairs..."
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
            Add Topic
          </button>
        }
      >
        {filteredTopics.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            No topics or tracks found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-500 font-semibold uppercase tracking-wider text-[11px] bg-gray-50/50 dark:bg-gray-800/40">
                  <th className="py-3 px-4">Track Name</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Track Chair</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-center">Sessions</th>
                  <th className="py-3 px-4 text-center">Abstracts</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredTopics.map((topic) => (
                  <tr
                    key={topic.id}
                    className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: topic.color }}
                        />
                        <span className="font-bold text-gray-900 dark:text-gray-100">
                          {topic.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-500">
                      {topic.code}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-700 dark:text-gray-300">
                      {topic.chair}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 max-w-xs truncate">
                      {topic.description}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-[#faedf5] text-[#55355E]">
                        {topic.sessionsCount} sessions
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-gray-700 dark:text-gray-300">
                      {topic.abstractsCount}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(topic)}
                          className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-[#AA2D7B] transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTopic(topic.id)}
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

      {/* Add / Edit Topic Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 bg-[#faedf5]/30">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                {editingTopic ? "Edit Track" : "Add Conference Track"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTopic} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Track / Topic Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Surgical Robotics & Haptic AI"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#AA2D7B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Track Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="SURG-AI"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#AA2D7B] uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Track Chair
                  </label>
                  <input
                    type="text"
                    value={chair}
                    onChange={(e) => setChair(e.target.value)}
                    placeholder="Dr. Maya Lin"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#AA2D7B]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the topics covered in this track..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#AA2D7B]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#AA2D7B] hover:bg-[#D85A9A] text-white font-semibold transition-colors"
                >
                  {editingTopic ? "Save Changes" : "Create Track"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
