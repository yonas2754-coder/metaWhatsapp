"use client";

import { useState } from "react";

export default function Contact() {
  const [success, setSuccess] = useState(false);

  const handleSubmit = (
    e: React.FormEvent
  ) => {
    e.preventDefault();
    setSuccess(true);
  };

  return (
    <section
      id="contact"
      className="py-24"
    >
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-4xl font-bold mb-8">
          Contact Us
        </h2>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <input
            className="w-full border p-4 rounded"
            placeholder="Full Name"
          />

          <input
            className="w-full border p-4 rounded"
            placeholder="Email"
          />

          <textarea
            className="w-full border p-4 rounded"
            rows={5}
            placeholder="Message"
          />

          <button
            className="bg-blue-600 text-white px-8 py-4 rounded"
          >
            Send Message
          </button>

          {success && (
            <p className="text-green-600">
              Message submitted successfully.
            </p>
          )}
        </form>
      </div>
    </section>
  );
}