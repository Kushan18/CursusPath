import ModulePlaceholder from "../components/ModulePlaceholder";

export default function Chat() {
  return (
    <ModulePlaceholder
      eyebrow="Module 5 · AI Agent"
      title="Chatbot"
      description="Ask career questions directly, or ask it to act — verify an offer, check your tracked internships, or start a mock interview, all from one chat."
      phaseNote="Ships in Phase 6: LangGraph decides which module to call; ChromaDB gives it memory of your past offers and resumes."
      ringVariant="agent"
      ringSublabel="Confidence"
    />
  );
}
