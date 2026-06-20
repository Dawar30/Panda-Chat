export default function LeftArrow({ 
  width = 14, 
  height = 11, 
  className = "", 
  color = "#1A1A1A",
  strokeWidth = 2,
  ...props 
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 14 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M13 5.5L1 5.5M5.5 10L1 5.5L5.5 1"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
