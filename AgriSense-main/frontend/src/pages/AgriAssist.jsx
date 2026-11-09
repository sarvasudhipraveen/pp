import { useState, useRef, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import API_URL from "../api";
import "./AgriAssist.css";

const enSuggestedPrompts = [
  {
    icon: "🌱",
    title: "Soil Health",
    question: "How can I manage soil nitrogen balance for cereal crops?",
  },
  {
    icon: "💧",
    title: "Irrigation",
    question: "What irrigation schedule works best for Kharif season?",
  },
  {
    icon: "🌾",
    title: "Crop History",
    question: "Show top historical crops recorded in this district",
  },
  {
    icon: "📊",
    title: "Production Trends",
    question: "Show the historical production trend for this crop",
  },
];

const teSuggestedPrompts = [
  {
    icon: "🌱",
    title: "నేల సారం",
    question: "వరి లేదా తృణధాన్యాల పంటలలో నత్రజని లోపాన్ని ఎలా సరిదిద్దాలి?",
  },
  {
    icon: "💧",
    title: "నీటి యాజమాన్యం",
    question: "ఖరీఫ్ కాలంలో పంటలకు సరైన నీటి యాజమాన్య పద్ధతులు ఏమిటి?",
  },
  {
    icon: "🌾",
    title: "పంటల రికార్డులు",
    question: "ఈ జిల్లాలో గతంలో అత్యధిక ఉత్పత్తి సాధించిన పంటల వివరాలు తెలపండి",
  },
  {
    icon: "📊",
    title: "చీడపీడల నివారణ",
    question: "పత్తి మరియు మిరప పంటలలో చీడపీడల సహజ నివారణ మార్గాలు ఏమిటి?",
  },
];

export default function AgriAssist() {
  const { t, lang } = useLanguage();

  const initialGreeting =
    lang === "te"
      ? "నమస్కారం! నేను అగ్రిఅసిస్ట్ 🌱. నేల ఆరోగ్యం, ఎరువులు, నీటి యాజమాన్యం, పంట రక్షణ మరియు చారిత్రక వ్యవసాయ వివరాలపై మీ ప్రశ్నలకు సమాధానాలు ఇవ్వగలను. మీకు ఎలాంటి సహాయం కావాలి?"
      : "Hello! I'm AgriAssist 🌱. I can help answer agronomic questions about soil health, fertilizers, irrigation, crop seasons, or retrieve verified district crop production history (1997–2014). What would you like to explore?";

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: initialGreeting,
      source: "agrisense_assistant",
    },
  ]);
  const [message, setMessage] = useState("");
  const [stateName, setStateName] = useState("Andhra Pradesh");
  const [district, setDistrict] = useState("ANANTAPUR");
  const [season, setSeason] = useState("Kharif");
  const [crop, setCrop] = useState("Groundnut");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const suggestedPrompts = lang === "te" ? teSuggestedPrompts : enSuggestedPrompts;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading]);

  async function sendMessage(questionText, isRetry = false) {
    const question = (questionText || message).trim();

    if (!question || loading) return;

    let previousMessages = messages.filter(
      (item) =>
        (item.role === "user" || item.role === "assistant") &&
        !item.isError
    );

    if (isRetry) {
      const lastUserIndex = previousMessages
        .map((item) => item.role)
        .lastIndexOf("user");

      if (
        lastUserIndex !== -1 &&
        previousMessages[lastUserIndex].content === question
      ) {
        previousMessages = previousMessages.filter(
          (_, index) => index !== lastUserIndex
        );
      }
    }

    const conversationHistory = previousMessages
      .slice(-10)
      .map((item) => ({
        role: item.role,
        content: item.content,
      }));

    if (!isRetry) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: question },
      ]);
    }

    setMessage("");
    setLoading(true);

    try {
      const baseUrl = API_URL.replace(/\/+$/, "");

      const response = await fetch(`${baseUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: question,
          state: stateName.trim(),
          district: district.trim(),
          season,
          crop: crop.trim(),
          history: conversationHistory,
        }),
      });

      let data = {};

      try {
        data = await response.json();
      } catch {
        throw new Error(
          lang === "te"
            ? "సర్వర్ నుండి సమాధానం సరిగా అందలేదు. దయచేసి మళ్లీ ప్రయత్నించండి."
            : "The server returned an invalid response. Please try again."
        );
      }

      if (!response.ok) {
        const detail =
          typeof data.detail === "string"
            ? data.detail
            : data.detail?.message ||
              data.message ||
              (lang === "te" ? "ప్రశ్నను ప్రాసెస్ చేయడం సాధ్యం కాలేదు." : "The chatbot could not process your question.");

        throw new Error(detail);
      }

      if (!data.reply || typeof data.reply !== "string") {
        throw new Error(
          lang === "te" ? "ఖాళీ సమాధానం వచ్చింది. దయచేసి మళ్లీ అడగండి." : "AgriAssist received an empty response. Please try again."
        );
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          source: data.source || "gemini",
        },
      ]);
    } catch (error) {
      let errorMessage = error.message;

      if (
        error instanceof TypeError &&
        error.message.toLowerCase().includes("fetch")
      ) {
        errorMessage =
          lang === "te"
            ? "అగ్రిఅసిస్ట్ సర్వర్‌తో కనెక్ట్ కాలేకపోయాము. బ్యాకెండ్ రన్ అవుతోందో లేదో సరిచూసుకోండి."
            : "Unable to connect to the AgriAssist backend. Please check that your FastAPI server is running and the API URL is correct.";
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `${lang === "te" ? "సహాయక నోటీసు" : "Assistance Notice"}: ${
            errorMessage || (lang === "te" ? "ఊహించని లోపం ఏర్పడింది." : "An unexpected error occurred.")
          }`,
          isError: true,
          retryQuestion: question,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    sendMessage();
  }

  function getSourceLabel(source) {
    if (source === "gemini_with_historical_data") {
      return lang === "te" ? "చారిత్రక డేటా + జెమిని AI" : "Regional Historical Data + Gemini";
    }

    if (source === "gemini") {
      return lang === "te" ? "వ్యవసాయ శాస్త్ర విజ్ఞానం" : "General Agronomic Knowledge";
    }

    if (source === "agrisense_assistant") {
      return "AgriAssist";
    }

    return source?.replaceAll("_", " ") || "AgriAssist";
  }

  function clearConversation() {
    if (loading) return;

    setMessages([
      {
        role: "assistant",
        content: initialGreeting,
        source: "agrisense_assistant",
      },
    ]);
    setMessage("");
    inputRef.current?.focus();
  }

  return (
    <section className="agriassist-page">
      {/* Page Heading */}
      <header className="agriassist-heading">
        <div className="agriassist-heading-content">
          <span className="section-eyebrow">
            <span className="heading-eyebrow-icon">✦</span>
            {lang === "te" ? "AI వ్యవసాయ సలహా సేవలు" : "INTELLIGENT AGRICULTURAL ASSISTANCE"}
          </span>

          <h1>
            {lang === "te" ? "అగ్రిఅసిస్ట్ " : "Meet "}
            <span>AgriAssist.</span>
          </h1>

          <p>{t("chatSubtitle")}</p>
        </div>

        <div className="agriassist-heading-icon">
          <span>🌿</span>
        </div>
      </header>

      {/* Main Layout */}
      <div className="agriassist-layout">
        {/* Regional Context Panel */}
        <aside className="agriassist-context-panel">
          <div className="context-card-header">
            <div className="context-heading-icon">⌖</div>

            <div>
              <h3>{lang === "te" ? "ప్రాంతీయ సమాచారం" : "Regional Context"}</h3>
              <p>{lang === "te" ? "మీ వ్యవసాయ ప్రాంతాన్ని ఎంచుకోండి" : "Customize your agricultural region"}</p>
            </div>
          </div>

          <div className="context-grounding-note">
            <span className="grounding-icon">✓</span>
            <p>
              {lang === "te"
                ? "ప్రాంతీయ ఫిల్టర్లు మీ ప్రశ్నలకు సంబంధిత చారిత్రక రికార్డులను శోధించడంలో తోడ్పడతాయి."
                : "Regional filters help retrieve relevant historical production records for your questions."}
            </p>
          </div>

          <div className="context-inputs-column">
            <label>
              <span>{t("predState")}</span>
              <input
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                placeholder="Enter state name"
              />
            </label>

            <label>
              <span>{t("predDistrict")}</span>
              <input
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Enter district name"
              />
            </label>

            <label>
              <span>{t("predSeason")}</span>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
              >
                {[
                  "Kharif",
                  "Rabi",
                  "Whole Year",
                  "Summer",
                  "Winter",
                  "Autumn",
                ].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>{lang === "te" ? "ఆసక్తి గల పంట" : "Crop of Interest"}</span>
              <input
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                placeholder="e.g. Groundnut"
              />
            </label>
          </div>

          {/* Suggested Questions */}
          <div className="agriassist-prompts-section">
            <div className="prompts-heading">
              <div>
                <h4>{lang === "te" ? "తరచూ అడిగే ప్రశ్నలు" : "Explore Questions"}</h4>
                <p>{lang === "te" ? "ఒక అంశాన్ని ఎంచుకోండి" : "Start with a suggested topic"}</p>
              </div>
              <span className="prompts-count">04</span>
            </div>

            <div className="prompt-list">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt.title}
                  type="button"
                  className="prompt-chip-btn"
                  disabled={loading}
                  onClick={() => setMessage(prompt.question)}
                >
                  <span className="prompt-icon">{prompt.icon}</span>

                  <span className="prompt-text">
                    <strong>{prompt.title}</strong>
                    <small>{prompt.question}</small>
                  </span>

                  <span className="prompt-arrow">↗</span>
                </button>
              ))}
            </div>
          </div>

          <div className="context-history-note">
            <span>📚</span>
            <div>
              <strong>{lang === "te" ? "చారిత్రక డేటా లభ్యం" : "Historical Data Available"}</strong>
              <p>{lang === "te" ? "1997–2014 జిల్లా పంటల ఉత్పత్తి రికార్డులు." : "District crop production records from 1997–2014."}</p>
            </div>
          </div>
        </aside>

        {/* Chat Interface */}
        <div className="agriassist-chat-card">
          {/* Chat Header */}
          <div className="agriassist-chat-topbar">
            <div className="chat-profile">
              <div className="chat-profile-avatar">🌱</div>

              <div className="chat-profile-info">
                <strong>AgriAssist</strong>
                <span>
                  <i className="agriassist-status-dot" />
                  {lang === "te" ? "AI వ్యవసాయ సహాయకుడు" : "AI Agricultural Assistant"}
                </span>
              </div>
            </div>

            <div className="chat-model-info">
              <span className="model-status-icon">✦</span>
              Gemini AI
            </div>

            <button
              type="button"
              className="clear-chat-btn"
              onClick={clearConversation}
              disabled={loading}
              title={lang === "te" ? "సంభాషణను తొలగించండి" : "Clear conversation"}
              aria-label="Clear conversation"
            >
              {lang === "te" ? "చాట్ క్లియర్" : "Clear Chat"}
            </button>
          </div>

          {/* Chat Messages */}
          <div
            className="agriassist-messages-container"
            aria-live="polite"
            aria-busy={loading}
          >
            <div className="chat-date-label">
              <span>{lang === "te" ? "మీ వ్యవసాయ AI సహాయకుడు" : "YOUR AGRICULTURAL ASSISTANT"}</span>
            </div>

            {messages.map((item, index) => {
              const isAssistant = item.role === "assistant";

              return (
                <div
                  className={`chat-message-row ${item.role} ${
                    item.isError ? "error-msg" : ""
                  }`}
                  key={index}
                >
                  <div className="chat-avatar">
                    {isAssistant ? "🌱" : "👤"}
                  </div>

                  <div className="chat-bubble-content">
                    <div className="chat-message-name">
                      {isAssistant ? "AgriAssist" : (lang === "te" ? "మీరు" : "You")}
                    </div>

                    <div className="chat-bubble">
                      {item.content}
                    </div>

                    {item.source && (
                      <span className="chat-source-tag">
                        <span>✦</span>
                        {getSourceLabel(item.source)}
                      </span>
                    )}

                    {item.isError && item.retryQuestion && (
                      <button
                        className="retry-chat-btn"
                        type="button"
                        disabled={loading}
                        onClick={() =>
                          sendMessage(item.retryQuestion, true)
                        }
                      >
                        ↻ {lang === "te" ? "మళ్లీ ప్రయత్నించండి" : "Retry sending question"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="chat-message-row assistant">
                <div className="chat-avatar">🌱</div>

                <div className="chat-bubble-content">
                  <div className="chat-message-name">
                    {lang === "te" ? "ఆలోచిస్తున్నాను..." : "AgriAssist is thinking"}
                  </div>

                  <div className="chat-bubble thinking">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form
            className="agriassist-input-bar"
            onSubmit={handleFormSubmit}
          >
            <div className="chat-input-wrapper">
              <span className="chat-input-icon">✎</span>

              <input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("chatPlaceholder")}
                maxLength={1000}
                aria-label="Your agricultural question"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="chat-send-btn"
              disabled={loading || !message.trim()}
            >
              {loading ? (
                t("loading")
              ) : (
                <>
                  {t("chatSend")} <span>➤</span>
                </>
              )}
            </button>
          </form>

          <div className="chat-input-footer">
            <span>✦ Powered by Gemini AI</span>
            <span>{lang === "te" ? "గరిష్టంగా 1000 అక్షరాలు" : "Maximum 1000 characters"}</span>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="agriassist-disclaimer-card">
        <span className="disclaimer-icon">ⓘ</span>

        <div>
          <strong>{lang === "te" ? "వ్యవసాయ సలహా నిబంధనలు" : "Agricultural Guidance Disclaimer"}</strong>
          <p>{t("chatDisclaimer")}</p>
        </div>
      </div>
    </section>
  );
}
