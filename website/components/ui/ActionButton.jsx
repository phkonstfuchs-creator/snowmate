import Link from "next/link";

// Restrained hover arrow inspired by Interactive Hover Button on 21st.dev.
export default function ActionButton({ children, href, className = "", variant = "dark", ...props }) {
  const classes = `action-button action-button--${variant} ${className}`;
  return href
    ? <Link href={href} className={classes} {...props}>{children}</Link>
    : <button className={classes} {...props}>{children}</button>;
}
