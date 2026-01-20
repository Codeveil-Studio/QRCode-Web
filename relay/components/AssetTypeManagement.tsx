"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { assetTypesAPI } from "../utils/api";
import {
  Plus,
  Package,
  Download,
  Search,
  Filter,
  X,
  Edit,
  Trash2,
  RotateCcw,
  Eye,
  EyeOff,
} from "lucide-react";

interface AssetType {
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

export function AssetTypeManagement() {
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [systemTypes, setSystemTypes] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAdoptModal, setShowAdoptModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [editingType, setEditingType] = useState<AssetType | null>(null);
  const [deletingType, setDeletingType] = useState<AssetType | null>(null);
  const [reactivatingType, setReactivatingType] = useState<AssetType | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [showOnlyCustom, setShowOnlyCustom] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  // Form state for creating/editing custom type
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
  });

  useEffect(() => {
    fetchAssetTypes();
    fetchSystemTypes();
  }, [showInactive]);

  const fetchAssetTypes = async () => {
    try {
      const result = await assetTypesAPI.getAll(showInactive);
      if (result.success) {
        setAssetTypes(result.data?.assetTypes || []);
      } else {
        toast.error(result.error || "Failed to load asset types");
      }
    } catch (error) {
      console.error("Error fetching asset types:", error);
      toast.error("Failed to load asset types");
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemTypes = async () => {
    try {
      const result = await assetTypesAPI.getSystem();
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
      const result = await assetTypesAPI.create({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category: formData.category.trim() || null,
        isCustom: true,
      });

      if (result.success) {
        setAssetTypes((prev) => [result.data?.assetType, ...prev]);
        setFormData({ name: "", description: "", category: "" });
        setShowCreateModal(false);
        toast.success("Custom asset type created successfully");
      } else {
        toast.error(result.error || "Failed to create asset type");
      }
    } catch (error) {
      console.error("Error creating asset type:", error);
      toast.error("Failed to create asset type");
    }
  };

  const handleAdoptSystemType = async (systemType: AssetType) => {
    try {
      const result = await assetTypesAPI.adopt(systemType.id);

      if (result.success) {
        setAssetTypes((prev) => [result.data?.assetType, ...prev]);
        setSystemTypes((prev) => prev.filter((t) => t.id !== systemType.id));
        toast.success(`${systemType.name} adopted successfully`);
      } else {
        toast.error(result.error || "Failed to adopt asset type");
      }
    } catch (error) {
      console.error("Error adopting asset type:", error);
      toast.error("Failed to adopt asset type");
    }
  };

  const handleEditType = (type: AssetType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      description: type.description || "",
      category: type.category || "",
    });
    setShowEditModal(true);
  };

  const handleUpdateType = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingType || !formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      const result = await assetTypesAPI.update(editingType.id.toString(), {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category: formData.category.trim() || null,
      });

      if (result.success) {
        setAssetTypes((prev) =>
          prev.map((type) =>
            type.id === editingType.id
              ? {
                  ...type,
                  ...result.data,
                  name: formData.name.trim(),
                  description: formData.description.trim() || null,
                  category: formData.category.trim() || null,
                }
              : type
          )
        );
        setFormData({ name: "", description: "", category: "" });
        setEditingType(null);
        setShowEditModal(false);
        toast.success("Asset type updated successfully");
      } else {
        toast.error(result.error || "Failed to update asset type");
      }
    } catch (error) {
      console.error("Error updating asset type:", error);
      toast.error("Failed to update asset type");
    }
  };

  const handleDeleteType = (type: AssetType) => {
    setDeletingType(type);
    setShowDeleteModal(true);
  };

  const confirmDeleteType = async () => {
    if (!deletingType) return;

    try {
      const result = await assetTypesAPI.delete(deletingType.id.toString());

      if (result.success) {
        setAssetTypes((prev) =>
          prev.filter((type) => type.id !== deletingType.id)
        );
        setDeletingType(null);
        setShowDeleteModal(false);
        toast.success("Asset type deleted successfully");
      } else {
        toast.error(result.error || "Failed to delete asset type");
      }
    } catch (error) {
      console.error("Error deleting asset type:", error);
      toast.error("Failed to delete asset type");
    }
  };

  const handleReactivateType = (type: AssetType) => {
    setReactivatingType(type);
    setShowReactivateModal(true);
  };

  const confirmReactivateType = async () => {
    if (!reactivatingType) return;

    try {
      const result = await assetTypesAPI.reactivate(
        reactivatingType.id.toString()
      );

      if (result.success) {
        setAssetTypes((prev) =>
          prev.map((type) =>
            type.id === reactivatingType.id
              ? { ...type, is_active: true }
              : type
          )
        );
        setReactivatingType(null);
        setShowReactivateModal(false);
        toast.success("Asset type reactivated successfully");
      } else {
        toast.error(result.error || "Failed to reactivate asset type");
      }
    } catch (error) {
      console.error("Error reactivating asset type:", error);
      toast.error("Failed to reactivate asset type");
    }
  };

  const categories = [
    ...new Set([
      ...assetTypes.map((t) => t.category).filter(Boolean),
      ...systemTypes.map((t) => t.category).filter(Boolean),
    ]),
  ].filter((category): category is string => category !== null);

  const activeAssetTypes = assetTypes.filter((type) => type.is_active);
  const inactiveAssetTypes = assetTypes.filter((type) => !type.is_active);

  const filteredActiveTypes = activeAssetTypes.filter((type) => {
    const matchesSearch = type.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || type.category === categoryFilter;
    const matchesCustomFilter = !showOnlyCustom || type.is_custom;

    return matchesSearch && matchesCategory && matchesCustomFilter;
  });

  const filteredInactiveTypes = inactiveAssetTypes.filter((type) => {
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
            Asset Type Management
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage your organization's asset types and adopt standard types
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
            placeholder="Search asset types..."
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
              ? "bg-blue-100 text-blue-800 border border-blue-200"
              : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
          }`}
        >
          <Filter className="h-4 w-4" />
          Custom Only
        </button>

        <button
          onClick={() => setShowInactive(!showInactive)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            showInactive
              ? "bg-orange-100 text-orange-800 border border-orange-200"
              : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
          }`}
        >
          {showInactive ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          {showInactive ? "Hide Inactive" : "Show Inactive"}
        </button>
      </div>

      {/* Active Asset Types */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Active Asset Types ({filteredActiveTypes.length})
        </h3>

        {filteredActiveTypes.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No active asset types found</p>
            <p className="text-sm text-gray-400 mt-1">
              Create a custom type or adopt a standard type to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredActiveTypes.map((type) => (
              <div
                key={type.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{type.name}</h4>
                    {type.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {type.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => handleEditType(type)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit asset type"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteType(type)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete asset type"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {type.category && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                      {type.category}
                    </span>
                  )}
                  {type.is_custom ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                      Custom
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                      Adopted
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inactive Asset Types */}
      {showInactive && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Inactive Asset Types ({filteredInactiveTypes.length})
          </h3>

          {filteredInactiveTypes.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No inactive asset types found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInactiveTypes.map((type) => (
                <div
                  key={type.id}
                  className="p-4 border border-gray-200 rounded-lg bg-gray-50 opacity-75"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-700">{type.name}</h4>
                      {type.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {type.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => handleReactivateType(type)}
                        className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                        title="Reactivate asset type"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {type.category && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-200 text-gray-600">
                        {type.category}
                      </span>
                    )}
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800">
                      Inactive
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Custom Type Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 backdrop-blur-lg  flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Create Custom Asset Type
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Server, Laptop, Printer"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Optional description..."
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., IT Equipment, Furniture"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                >
                  Create Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adopt Standard Types Modal */}
      {showAdoptModal && (
        <div className="fixed inset-0 backdrop-blur-lg bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] ">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Adopt Standard Asset Types
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Choose from pre-defined asset types to add to your
                  organization
                </p>
              </div>
              <button
                onClick={() => setShowAdoptModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[60vh]">
              {filteredSystemTypes.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No standard types available</p>
                  <p className="text-sm text-gray-400 mt-1">
                    All standard types have been adopted or none match your
                    search
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
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {type.name}
                          </h4>
                          {type.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {type.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        {type.category && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                            {type.category}
                          </span>
                        )}
                        <button
                          onClick={() => handleAdoptSystemType(type)}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          <Download className="h-3 w-3" />
                          Adopt
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Asset Type Modal */}
      {showEditModal && editingType && (
        <div className="fixed inset-0 backdrop-blur-lg bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Edit Asset Type
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingType(null);
                  setFormData({ name: "", description: "", category: "" });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateType} className="space-y-4">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Server, Laptop, Printer"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Optional description..."
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., IT Equipment, Furniture"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingType(null);
                    setFormData({ name: "", description: "", category: "" });
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Update Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingType && (
        <div className="fixed inset-0 backdrop-blur-lg bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Delete Asset Type
              </h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingType(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete the asset type{" "}
                <span className="font-medium text-gray-900">
                  "{deletingType.name}"
                </span>
                ? This action cannot be undone.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This will only deactivate the asset
                  type. Existing assets using this type will not be affected.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingType(null);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteType}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Type
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reactivate Confirmation Modal */}
      {showReactivateModal && reactivatingType && (
        <div className="fixed inset-0 backdrop-blur-lg bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Reactivate Asset Type
              </h3>
              <button
                onClick={() => {
                  setShowReactivateModal(false);
                  setReactivatingType(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Are you sure you want to reactivate the asset type{" "}
                <span className="font-medium text-gray-900">
                  "{reactivatingType.name}"
                </span>
                ? This will make it available for use again.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  <strong>Note:</strong> This will make the asset type available
                  for creating new assets and will appear in the active types
                  list.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowReactivateModal(false);
                  setReactivatingType(null);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmReactivateType}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Reactivate Type
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
