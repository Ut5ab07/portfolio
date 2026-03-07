"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import emailjs from "@emailjs/browser";
import { X, Send, CheckCircle, Loader2 } from "lucide-react";
import MagneticButton from "./ui/MagneticButton";

export default function ContactModal({ isOpen, onClose }) {
  const formRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [errorMsg, setErrorMsg] = useState("");
  const [startTime, setStartTime] = useState(0);

  // Focus trap and esc key listener
  useEffect(() => {
    if (isOpen) {
      setStartTime(Date.now());
      document.body.style.overflow = "hidden"; // Prevent background scrolling
    } else {
      document.body.style.overflow = "unset";
      setStatus("idle");
      setErrorMsg("");
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;

    // Empty field validation
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();

    if (!name || !email || !message) {
      setErrorMsg("Please fill out all required fields.");
      setStatus("error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMsg("Please enter a valid email address.");
      setStatus("error");
      return;
    }

    // Honeypot check
    if (form.company.value !== "") {
      console.warn("Honeypot triggered. Silently rejecting.");
      return;
    }

    // Time-based check
    if (Date.now() - startTime < 3000) {
      console.warn("Time-based restriction triggered. Silently rejecting.");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
      const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
      const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

      console.log("EmailJS Config:", {
        serviceId,
        templateId,
        publicKey
      });

      if (!serviceId || !templateId || !publicKey) {
        console.error("EmailJS configuration missing.");
        setErrorMsg("Email service configuration error.");
        setStatus("error");
        return;
      }

      const result = await emailjs.sendForm(
        serviceId,
        templateId,
        form,
        publicKey
      );

      console.log("SUCCESS:", result.text);

      form.reset();
      setStatus("success");

      // Auto-close modal after brief success message
      setTimeout(() => {
        onClose();
        setStatus("idle");
      }, 3000);

    } catch (error) {
      console.error("EmailJS Error:", error);
      setErrorMsg("Something went wrong. Please try again later.");
      setStatus("error");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">

          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="relative w-full max-w-lg bg-slate-900/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h3 className="text-xl font-bold tracking-tight text-white">
                Send a Message
              </h3>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/5 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 sm:p-8">
              {status === "success" ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-10 text-center"
                >
                  <CheckCircle className="w-16 h-16 text-emerald-400 mb-4" />
                  <h4 className="text-xl font-bold text-white mb-2">Message Sent!</h4>
                  <p className="text-gray-400">I&apos;ll get back to you soon.</p>
                </motion.div>
              ) : (
                <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <input type="text" name="company" style={{ display: "none" }} tabIndex="-1" autoComplete="off" />

                  <div className="flex flex-col gap-1.5 text-left">
                    <label htmlFor="name" className="text-xs font-semibold tracking-wider text-gray-400 uppercase ml-1">Name</label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      placeholder="Your name"
                      disabled={status === "loading"}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(91,192,190,0.2)] transition-all duration-300 disabled:opacity-50"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 text-left">
                    <label htmlFor="email" className="text-xs font-semibold tracking-wider text-gray-400 uppercase ml-1">Email</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="your@email.com"
                      disabled={status === "loading"}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(91,192,190,0.2)] transition-all duration-300 disabled:opacity-50"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 text-left">
                    <label htmlFor="message" className="text-xs font-semibold tracking-wider text-gray-400 uppercase ml-1">Message</label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      placeholder="Type your message..."
                      rows="4"
                      disabled={status === "loading"}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(91,192,190,0.2)] transition-all duration-300 disabled:opacity-50 resize-y"
                    ></textarea>
                  </div>

                  {status === "error" && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="text-red-400 text-sm text-center"
                    >
                      {errorMsg}
                    </motion.p>
                  )}

                  <MagneticButton className="flex items-center justify-center gap-2 mt-4 bg-gradient-to-r from-[#5BC0BE] to-[#7C5CFF] text-white py-3.5 rounded-xl border border-transparent hover:shadow-[0_0_20px_rgba(91,192,190,0.4)] disabled:opacity-50 w-full" disabled={status === "loading"}>
                    {status === "loading" ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Send Message <Send className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </MagneticButton>

                </form>
              )}
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
