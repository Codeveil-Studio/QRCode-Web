"use client";

import { useState } from "react";
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  FileText,
  Search,
  Send,
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { supportAPI } from "@/utils/api";

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
  priority: "low" | "medium" | "high";
}

const faqs: FAQ[] = [
  {
    question: "How do I add a new asset to my inventory?",
    answer:
      "To add a new asset, click the 'Add New Asset' button on the Assets page or use the quick action on the dashboard. Fill in the required details such as name, type, location, and status, then click 'Add Asset' to save it to your inventory.",
    category: "Getting Started",
  },
  {
    question: "How do I report an issue with an asset?",
    answer:
      "You can report an issue by clicking on the asset in your inventory and selecting 'Report Issue'. Fill in the issue details including type, urgency, and description. The issue will be tracked in the Issues page.",
    category: "Issues",
  },
  {
    question: "What do the different asset statuses mean?",
    answer:
      "Assets can have the following statuses: Active (in use), Maintenance Needed (requires attention), Inactive (not in use), and Archived (no longer tracked). You can update an asset's status at any time.",
    category: "Assets",
  },
  {
    question: "How do I export my inventory data?",
    answer:
      "You can export your inventory data by going to the Reports page and clicking the 'Export Report' button. Choose your preferred format (CSV or PDF) and the data will be downloaded to your device.",
    category: "Reports",
  },
  {
    question: "Can I customize the notification settings?",
    answer:
      "Yes, you can customize your notification preferences in the Settings page. Choose which alerts you want to receive and how you want to be notified (email, in-app, or both).",
    category: "Settings",
  },
];

const categories = [
  "Getting Started",
  "Assets",
  "Issues",
  "Reports",
  "Settings",
  "Account",
];

export default function HelpPage() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showContactForm, setShowContactForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [contactForm, setContactForm] = useState<ContactForm>({
    name: "",
    email: "",
    subject: "",
    message: "",
    priority: "medium",
  });

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = selectedCategory
      ? faq.category === selectedCategory
      : true;
    const matchesSearch = searchQuery
      ? faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCategory && matchesSearch;
  });

  const handleContactFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Generate unique subject with timestamp
      const uniqueSubject = `[SUPPORT-${Date.now()}] ${contactForm.subject}`;

      const result = await supportAPI.submitContactForm({
        ...contactForm,
        subject: uniqueSubject,
      });

      if (result.success) {
        setSubmitSuccess(true);
        setContactForm({
          name: "",
          email: "",
          subject: "",
          message: "",
          priority: "medium",
        });
        setTimeout(() => {
          setShowContactForm(false);
          setSubmitSuccess(false);
        }, 3000);
      } else {
        throw new Error(result.error || "Failed to submit");
      }
    } catch (error) {
      console.error("Error submitting contact form:", error);
      alert("Failed to submit your message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
      />
      <div
        className={`transition-all duration-300 ${
          sidebarExpanded ? "ml-64" : "ml-20"
        }`}
      >
        <main className="p-8 max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Help & Support
              </h1>
              <p className="text-gray-600">
                Find answers to common questions and get support
              </p>
            </div>
          </div>

          {/* Search and Contact */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Search Bar */}
            <div className="lg:col-span-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for help..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pl-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Contact Form Button */}
            <div>
              <button
                onClick={() => setShowContactForm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
              >
                <Mail className="h-5 w-5" />
                <span className="text-sm font-medium">Contact Support</span>
              </button>
            </div>
          </div>

          {/* Contact Form Modal */}
          {showContactForm && (
            <div className="fixed inset-0 backdrop-blur-lg bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Contact Support
                    </h2>
                    <button
                      onClick={() => setShowContactForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </div>

                  {submitSuccess ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                          className="w-8 h-8 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Message Sent!
                      </h3>
                      <p className="text-gray-600">
                        We'll get back to you as soon as possible.
                      </p>
                    </div>
                  ) : (
                    <form
                      onSubmit={handleContactFormSubmit}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          required
                          value={contactForm.name}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              name: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          required
                          value={contactForm.email}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              email: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Subject
                        </label>
                        <input
                          type="text"
                          required
                          value={contactForm.subject}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              subject: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Priority
                        </label>
                        <select
                          value={contactForm.priority}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              priority: e.target.value as
                                | "low"
                                | "medium"
                                | "high",
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Message
                        </label>
                        <textarea
                          required
                          rows={4}
                          value={contactForm.message}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              message: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                        />
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          type="button"
                          onClick={() => setShowContactForm(false)}
                          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? (
                            <LoadingSpinner />
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              Send Message
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Categories Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Categories
                </h2>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() =>
                        setSelectedCategory(
                          selectedCategory === category ? null : category
                        )
                      }
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedCategory === category
                          ? "bg-black text-white"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* FAQs */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">
                  Frequently Asked Questions
                </h2>
                <div className="space-y-4">
                  {filteredFaqs.map((faq, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() =>
                          setExpandedFaq(expandedFaq === index ? null : index)
                        }
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-sm font-medium text-gray-900">
                          {faq.question}
                        </span>
                        {expandedFaq === index ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                      {expandedFaq === index && (
                        <div className="p-4 bg-gray-50 border-t border-gray-200">
                          <p className="text-sm text-gray-600">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Section - Only Phone Support */}
          <div className="mt-8 max-w-md ">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Phone className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Phone Support
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Available Monday to Friday, 9am - 5pm EST
              </p>
              <a
                href="tel:+447747551718"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                +44 7747551718
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
