"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { itemTypesAPI } from "../utils/api";
import { Plus, Package, Download, Search, Filter, X } from "lucide-react";

interface ItemType {
  id: number;
  uid: string;
  name: string;
  description: string | null;
  category: string | null;
  icon: string | null;
  is_active: boolean;
  org_id: string | null;
  is_custom: boolean;
  created_by: string | null;
  created_at: string;
}

export function ItemTypeManagement() {
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [systemTypes, setSystemTypes] = useState<ItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAdoptModal, setShowAdoptModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [showOnlyCustom, setShowOnlyCustom] = useState(false);

  // Form state for creating custom type
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
  });

  useEffect(() => {
    fetchItemTypes();
    fetchSystemTypes();
  }, []);

  const fetchItemTypes = async () => {
    try {
      const result = await itemTypesAPI.getAll();
      if (result.success) {
        setItemTypes(result.data?.itemTypes || []);
      } else {
        toast.error(result.error || "Failed to load item types");
      }
    } catch (error) {
      console.error("Error fetching item types:", error);
      toast.error("Failed to load item types");
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemTypes = async () => {
    try {
      const result = await itemTypesAPI.getSystem();
      if (result.success) {
        setSystemTypes(result.data?.systemTypes || []);
      } else {
        console.error("Failed to fetch system types:", result.error);
      }
    } catch (error) {
      console.error("Error fetching system types:", error);
    }
  };

  const handleCreateCustomType = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      const result = await itemTypesAPI.create({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category: formData.category.trim() || null,
        isCustom: true,
      });

      if (result.success) {
        setItemTypes((prev) => [result.data?.itemType, ...prev]);
        setFormData({ name: "", description: "", category: "" });
        setShowCreateModal(false);
        toast.success("Custom item type created successfully");
      } else {
        toast.error(result.error || "Failed to create item type");
      }
    } catch (error) {
      console.error("Error creating item type:", error);
      toast.error("Failed to create item type");
    }
  };

  const handleAdoptSystemType = async (systemType: ItemType) => {
    try {
      const result = await itemTypesAPI.adopt(systemType.id);

      if (result.success) {
        setItemTypes((prev) => [result.data?.itemType, ...prev]);
        setSystemTypes((prev) => prev.filter((t) => t.id !== systemType.id));
        toast.success(`${systemType.name} adopted successfully`);
      } else {
        toast.error(result.error || "Failed to adopt item type");
      }
    } catch (error) {
      console.error("Error adopting item type:", error);
      toast.error("Failed to adopt item type");
    }
  };

  const categories = [
    ...new Set([
      ...itemTypes.map((t) => t.category).filter(Boolean),
      ...systemTypes.map((t) => t.category).filter(Boolean),
    ]),
  ].filter((category): category is string => category !== null);

  const filteredItemTypes = itemTypes.filter((type) => {
    const matchesSearch = type.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || type.category === categoryFilter;
    const matchesCustomFilter = !showOnlyCustom || type.is_custom;

    return matchesSearch && matchesCategory && matchesCustomFilter;
  });

  const filteredSystemTypes = systemTypes.filter((type) => {
    const matchesSearch = type.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || type.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Item Type Management
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage your organization's item types and adopt standard types
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdoptModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Adopt Standard Types
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Custom Type
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search item types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <button
          onClick={() => setShowOnlyCustom(!showOnlyCustom)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            showOnlyCustom
              ? "bg-purple-100 text-purple-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Filter className="h-4 w-4" />
          Custom Only
        </button>
      </div>

      {/* Your Item Types */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Your Item Types ({filteredItemTypes.length})
        </h3>

        {filteredItemTypes.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No item types found</p>
            <p className="text-sm text-gray-400">
              Create a custom type or adopt a standard one
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItemTypes.map((type) => (
              <div
                key={type.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{type.name}</h4>
                    {type.category && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {type.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {type.is_custom ? (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        Custom
                      </span>
                    ) : (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        Standard
                      </span>
                    )}
                  </div>
                </div>

                {type.description && (
                  <p className="text-sm text-gray-600 mb-3">
                    {type.description}
                  </p>
                )}

                <div className="text-xs text-gray-400">
                  Created {new Date(type.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Custom Type Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Create Custom Item Type
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomType} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Laptop, Printer, Desk"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Electronics, Furniture, Equipment"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adopt Standard Types Modal */}
      {showAdoptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Adopt Standard Item Types
                </h3>
                <p className="text-sm text-gray-600">
                  Choose from pre-defined item types to add to your organization
                </p>
              </div>
              <button
                onClick={() => setShowAdoptModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredSystemTypes.length === 0 ? (
                <div className="text-center py-8">
                  <Download className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    No standard types available to adopt
                  </p>
                  <p className="text-sm text-gray-400">
                    All standard types have been adopted or no types match your
                    filters
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredSystemTypes.map((type) => (
                    <div
                      key={type.id}
                      className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {type.name}
                          </h4>
                          {type.category && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {type.category}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleAdoptSystemType(type)}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          <Download className="h-3 w-3" />
                          Adopt
                        </button>
                      </div>

                      {type.description && (
                        <p className="text-sm text-gray-600">
                          {type.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
