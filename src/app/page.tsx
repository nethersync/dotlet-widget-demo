"use client";

import { useState, useEffect, Suspense } from "react";

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iframeHeight, setIframeHeight] = useState<string | number>("720px");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const startCheckout = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setEmbedUrl(null);

    try {
      const response = await fetch("/api/create-domain-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: "demo_user_123",
          accountId: "demo_workspace_456",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create session");
      }

      if (data.embed_url) {
        setEmbedUrl(data.embed_url);
      } else {
        throw new Error("No embed_url returned from session endpoint");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check for URL parameters from a checkout return
    const handleCheckoutReturn = () => {
      if (typeof window === 'undefined') return;

      const searchParams = new URLSearchParams(window.location.search);
      const checkoutStatus = searchParams.get('checkout_status');
      const orderId = searchParams.get('order_id');
      const hostedSessionId = searchParams.get('hosted_session_id');

      // If we have the required params for a successful return
      if (checkoutStatus && orderId && hostedSessionId) {
        const baseUrl = process.env.NEXT_PUBLIC_DOTLET_WIDGET_URL || 'https://checkout.dotlet.net';
        const returnUrl = new URL(`/embed/sessions/${encodeURIComponent(hostedSessionId)}`, baseUrl);
        
        // Pass all relevant params to the widget
        returnUrl.searchParams.set('checkout_status', checkoutStatus);
        returnUrl.searchParams.set('order_id', orderId);
        returnUrl.searchParams.set('hosted_session_id', hostedSessionId);

        const returnToken = searchParams.get('return_token');
        if (returnToken) {
          returnUrl.searchParams.set('return_token', returnToken);
        }

        const token = searchParams.get('token');
        if (token) {
          returnUrl.searchParams.set('token', token);
        }

        const stripeSessionId = searchParams.get('session_id');
        if (stripeSessionId) {
          returnUrl.searchParams.set('session_id', stripeSessionId);
        }

        // Set the embed URL to render the iframe with the return state
        setEmbedUrl(returnUrl.toString());

        // Cleanup URL params
        cleanupUrlParams(searchParams);
      } else if (orderId && !hostedSessionId) {
        // Handle cancel case where we only get order_id
        setError("Checkout was cancelled.");
        cleanupUrlParams(searchParams);
      }
    };

    const cleanupUrlParams = (searchParams: URLSearchParams) => {
      const url = new URL(window.location.href);
      const removedKeys = [
        'checkout_status',
        'order_id',
        'hosted_session_id',
        'return_token',
        'token',
        'session_id'
      ];

      let changed = false;
      for (const key of removedKeys) {
        if (url.searchParams.has(key)) {
          url.searchParams.delete(key);
          changed = true;
        }
      }

      if (changed) {
        const nextSearch = url.searchParams.toString();
        const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`;
        window.history.replaceState({}, document.title, nextUrl);
      }
    };

    handleCheckoutReturn();

    const handleMessage = (event: MessageEvent) => {
      // In production, we'd verify event.origin
      const data = event.data;

      if (!data || data.source !== "dotlet-checkout") return;

      console.log("Received message from Dotlet iframe:", data);

      switch (data.type) {
        case "ready":
          console.log("Widget is ready");
          break;
        case "resize":
          if (data.height) {
            setIframeHeight(
              typeof data.height === "number" ? `${data.height}px` : data.height
            );
          }
          break;
        case "success":
          // According to option A, we don't immediately close the widget.
          // The widget will show its own success UI.
          // setSuccessMessage(`Domain flow completed successfully! Order ID: ${data.orderId || "N/A"}`);
          // setEmbedUrl(null); 
          break;
        case "cancel":
          console.log("User cancelled checkout");
          setError("Checkout was cancelled.");
          setEmbedUrl(null); // Close the iframe
          break;
        case "error":
          setError(data.message || "An error occurred in the checkout widget");
          setEmbedUrl(null);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Acme SaaS Platform
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            This is a demo of how a customer integrates the Dotlet Hosted Domain flow.
          </p>
        </div>

        <div className="bg-white shadow sm:rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            {!embedUrl && !successMessage && (
              <div className="text-center py-12">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Connect a custom domain
                </h3>
                <button
                  onClick={startCheckout}
                  disabled={isLoading}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isLoading ? "Starting Session..." : "Buy a Domain"}
                </button>

                {error && (
                  <div className="mt-4 p-4 bg-red-50 rounded-md">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
              </div>
            )}

            {successMessage && (
              <div className="text-center py-12">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">Success!</h3>
                <p className="text-sm text-gray-500 mb-6">{successMessage}</p>
                <button
                  onClick={() => setSuccessMessage(null)}
                  className="text-indigo-600 hover:text-indigo-900 font-medium"
                >
                  Purchase another domain
                </button>
              </div>
            )}

            {embedUrl && (
              <div className="w-full transition-all duration-300">
                <div className="mb-4 flex justify-between items-center px-2">
                  <h3 className="text-lg font-medium text-gray-900">Domain Checkout</h3>
                  <button 
                    onClick={() => setEmbedUrl(null)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
                <iframe
                  src={embedUrl}
                  style={{
                    width: "100%",
                    height: iframeHeight,
                    border: 0,
                    borderRadius: "12px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    backgroundColor: "#f9fafb"
                  }}
                  allow="payment"
                  loading="lazy"
                  title="Dotlet Domain Checkout"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
