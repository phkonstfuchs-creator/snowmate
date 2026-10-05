// A softened version of 21st.dev's Jade Sky gradient, used as atmosphere over
// the alpine panorama. Keep this decorative layer behind readable content.
export function JadeSky({ className = "" }) {
  return <div aria-hidden="true" className={className} style={{ position: "absolute", inset: 0, overflow: "hidden", containerType: "size", pointerEvents: "none" }}>
    <div className="jade-sky-wash" />
  </div>;
}
