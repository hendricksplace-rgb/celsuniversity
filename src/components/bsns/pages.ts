// The four CelsBSNS interactive pages, split so each lesson loads only its own client code (still server-rendered).
import dynamic from "next/dynamic";

export const InteractiveReading = dynamic(() => import("@/components/reading/InteractiveReading").then((m) => m.InteractiveReading));
export const InteractiveWriting = dynamic(() => import("@/components/writing/InteractiveWriting").then((m) => m.InteractiveWriting));
export const InteractiveResearch = dynamic(() => import("@/components/research/InteractiveResearch").then((m) => m.InteractiveResearch));
export const InteractiveVideo = dynamic(() => import("@/components/video/InteractiveVideo").then((m) => m.InteractiveVideo));
export const InteractiveSpeaking = dynamic(() => import("@/components/speaking/InteractiveSpeaking").then((m) => m.InteractiveSpeaking));
export const InteractiveFeedback = dynamic(() => import("@/components/feedback/InteractiveFeedback").then((m) => m.InteractiveFeedback));
