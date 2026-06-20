export default function Import({ 
  width = 20, 
  height = 20, 
  className = "", 
  color = "#525252",
  strokeWidth = 1.5,
  ...props 
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M13.7384 10.7499L17.6404 6.84792C19.0774 5.41092 19.1254 3.12992 17.7474 1.75292C16.3704 0.374925 14.0894 0.422925 12.6524 1.85993L8.75037 5.76193M10.7504 13.7119L6.85837 17.5919C5.42637 19.0219 3.21837 19.2069 1.77637 17.6989C0.334367 16.1919 0.450367 14.0599 1.88337 12.6309L5.77537 8.74993M6.75037 12.7499L12.7504 6.74993"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
