"use client";

import { useId, useRef, useState } from "react";

const finishes = [
  { body: "#d9ee8b", side: "#9dad5b", ink: "#253525" },
  { body: "#91b3e5", side: "#5275a8", ink: "#1d3456" },
  { body: "#e6a083", side: "#b87359", ink: "#492b22" },
  { body: "#bba7d8", side: "#87749f", ink: "#352645" },
];

function Cabin({ index, label, uid }) {
  const color = finishes[index];
  return <svg viewBox="0 0 280 360" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#304c50"/><stop offset="1" stopColor="#172d31"/></linearGradient>
      <linearGradient id={`${uid}-metal`}><stop stopColor="#b2bdb5"/><stop offset=".5" stopColor="#edf1e7"/><stop offset="1" stopColor="#64776e"/></linearGradient>
    </defs>
    <g fill="none" strokeLinecap="round"><path d="M137 13V62Q137 75 153 84L163 92V123" stroke="#263c34" strokeWidth="12"/><path d="M137 18V62Q137 75 153 84" stroke="#9eada1" strokeWidth="4"/></g>
    <path d="M105 7H162L177 16L167 27H110L99 18Z" fill="#35483e"/><circle cx="116" cy="16" r="6" fill="#8e9e90"/><circle cx="154" cy="16" r="6" fill="#8e9e90"/>
    <g className="cabin-body">
      <path d="M191 122L251 143Q265 149 265 169V286Q264 304 244 316L213 330L191 293Z" fill={color.side}/>
      <path d="M60 125Q40 128 36 150L25 281Q24 310 48 320L187 335Q220 338 229 308L241 172Q243 149 219 140Z" fill={color.body} stroke={color.side} strokeWidth="2"/>
      <path d="M48 139L214 153L232 145L200 127L74 114Z" fill={`url(#${uid}-metal)`}/>
      <path d="M53 151L126 158L118 251L42 244Z" fill={`url(#${uid}-glass)`}/>
      <path d="M137 159L222 167L214 259L129 252Z" fill={`url(#${uid}-glass)`}/>
      <path d="M242 166L255 173V266L233 276Z" fill="#29434a"/>
      <path d="M66 155L95 158L45 229L47 202Z M158 162L177 164L133 230L135 199Z" fill="#dcefe9" opacity=".16"/>
      <path d="M131 158L119 317" stroke={color.side} strokeWidth="2"/><path d="M125 269L124 283" stroke={color.ink} strokeWidth="3" strokeLinecap="round"/>
      <path d="M40 298Q116 324 220 312" fill="none" stroke={color.side} strokeWidth="3"/>
      <text x="50" y="284" fill={color.ink} fontSize="26" fontWeight="800" letterSpacing="-2">pistl.</text>
      <text x="170" y="288" fill={color.ink} fontSize="13" fontFamily="monospace">0{index + 1}</text>
      <text x="133" y="348" textAnchor="middle" fill={color.ink} fontSize="12" fontWeight="600">{label}</text>
    </g>
  </svg>;
}

/* Where each cabin hangs relative to the one in front: 0 centre, ±1 the
   neighbours, ±2 out of sight. The line runs in a loop, so after the last
   function comes the first again. A cabin that leaves on one side and
   has to come in on the other jumps there while out of sight. */
function placeCabins(count, active, direction) {
  return Array.from({ length: count }, (_, index) => {
    const ahead = (((index - active) % count) + count) % count;
    if (ahead === 0) return 0;
    if (ahead < count / 2) return ahead;
    if (ahead > count / 2) return ahead - count;
    return direction > 0 ? -ahead : ahead;
  });
}

export default function GondolaCarousel({ items, active, onChange }) {
  const uid = useId().replaceAll(":", "");
  const stage = useRef(null);
  const gesture = useRef(null);
  const dragged = useRef(false);
  const [offsets, setOffsets] = useState(() => placeCabins(items.length, active, 1));
  const [jumping, setJumping] = useState([]);
  function go(next, direction) {
    const target = placeCabins(items.length, next, direction);
    /* Cabins that would cross the whole stage go round out of sight first. */
    const crossing = target.flatMap((offset, index) => (Math.abs(offset - offsets[index]) > 1 ? [index] : []));
    if (crossing.length) {
      setJumping(crossing);
      setOffsets(offsets.map((offset, index) => (crossing.includes(index) ? Math.sign(target[index]) * 2 : offset)));
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setJumping([]);
        setOffsets(target);
      }));
    } else {
      setOffsets(target);
    }
    onChange(next);
  }
  const move = (direction) => go((active + direction + items.length) % items.length, direction);
  function start(event) {
    if (!event.isPrimary || event.button !== 0) return;
    gesture.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    dragged.current = false;
  }
  function drag(event) {
    const from = gesture.current;
    if (!from || from.id !== event.pointerId) return;
    if (event.buttons === 0) { finish(event, true); return; }
    const dx = event.clientX - from.x;
    const dy = event.clientY - from.y;
    if (!dragged.current && Math.max(Math.abs(dx), Math.abs(dy)) <= 8) return;
    if (!dragged.current && Math.abs(dy) > Math.abs(dx)) { gesture.current = null; return; }
    if (Math.abs(dx) > 8) {
      dragged.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      stage.current.style.setProperty("--drag", `${Math.max(-100, Math.min(100, dx * .5))}px`);
      stage.current.dataset.dragging = "true";
    }
  }
  function finish(event, cancelled = false) {
    const from = gesture.current;
    gesture.current = null;
    stage.current.style.setProperty("--drag", "0px");
    delete stage.current.dataset.dragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!cancelled && from && dragged.current && Math.abs(event.clientX - from.x) > 40) move(event.clientX < from.x ? 1 : -1);
  }
  return <div className="gondola-carousel">
    <div className="gondola-stage" ref={stage} role="group" aria-label="Gondeln mit Pistl-Funktionen. Mit den Pfeiltasten wechseln." tabIndex={0}
      onPointerLeave={(event) => { if (!dragged.current) finish(event, true); }}
      onPointerDown={start} onPointerMove={drag} onPointerUp={finish} onPointerCancel={(event) => finish(event, true)}
      onKeyDown={(event) => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); } }}>
      <div className="gondola-cable" aria-hidden="true"/>
      <div className="gondola-ground" aria-hidden="true"/>
      {items.map((item, index) => {
        const offset = offsets[index];
        return <button type="button" key={item.id} className="gondola" tabIndex={-1} aria-label={item.label} aria-pressed={index === active}
          data-hidden={Math.abs(offset) > 1 ? "true" : undefined} data-jumping={jumping.includes(index) ? "true" : undefined}
          style={{ "--offset": offset, "--scale": Math.max(.5, 1 - Math.abs(offset) * .24), zIndex: 10 - Math.abs(offset) }}
          onClick={() => { if (!dragged.current && index !== active) go(index, Math.sign(offset)); }}>
          <Cabin index={index} label={item.label} uid={`${uid}-${index}`}/>
        </button>;
      })}
    </div>
    <div className="gondola-navigation">
      <span className="gondola-hint">Ziehen & entdecken</span>
      <div className="gondola-arrows"><button type="button" aria-label="Vorherige Funktion" onClick={() => move(-1)}>←</button><button type="button" aria-label="Nächste Funktion" onClick={() => move(1)}>→</button></div>
    </div>
    <span className="sr-only" aria-live="polite" aria-atomic="true">{items[active].label}, {active + 1} von {items.length}</span>
  </div>;
}
