import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
    width: 32,
    height: 32,
};
export const contentType = "image/png";

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, #1a2332 0%, #2a3b4e 100%)",
                    borderRadius: "7px",
                }}
            >
                <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#c8a96e"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    {/* Centre post */}
                    <line x1="12" y1="4" x2="12" y2="20" />
                    {/* Base */}
                    <line x1="8" y1="20" x2="16" y2="20" />
                    {/* Cross-beam */}
                    <line x1="4" y1="8" x2="20" y2="8" />
                    {/* Left pan */}
                    <path d="M4 8 L2 14 Q4 16.5 6 14 Z" fill="#c8a96e" stroke="none" />
                    {/* Right pan */}
                    <path d="M20 8 L18 14 Q20 16.5 22 14 Z" fill="#c8a96e" stroke="none" />
                    {/* Beam-to-post connector */}
                    <circle cx="12" cy="8" r="1" fill="#c8a96e" stroke="none" />
                </svg>
            </div>
        ),
        { ...size }
    );
}